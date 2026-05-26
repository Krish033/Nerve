/**
 * KERNEL CORE
 * 
 * The central orchestration layer of the platform.
 * Responsible for module lifecycle, event coordination, and system infrastructure.
 */

import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  IKernel,
  IModule,
  IModuleRegistry,
  IEventBus,
  IPermissionSystem,
  IConfigService,
  IKernelLogger,
  IQueueService,
  ITenantService,
  ModuleManifest,
  HealthStatus,
  ModuleActivationContext,
} from '../contracts/module.contract';
import { ModuleRegistry } from './module-registry';
import { EventBus } from './event-bus';
import { PermissionSystem } from './permission-system';
import { ConfigService } from './config-service';
import { KernelLogger } from './kernel-logger';
import { QueueService } from './queue-service';
import { TenantService } from './tenant-service';

@Injectable()
export class Kernel implements IKernel, OnApplicationBootstrap, OnApplicationShutdown {
  private readonly nestLogger = new Logger(Kernel.name);
  private modulesMap = new Map<string, IModule>();
  private initialized = false;

  // Core services - exposed as IKernel interface properties
  readonly modules: IModuleRegistry;
  readonly events: IEventBus;
  readonly permissions: IPermissionSystem;
  readonly config: IConfigService;
  readonly logger: IKernelLogger;
  readonly queue: IQueueService;
  readonly tenant: ITenantService;

  constructor(
    private readonly moduleRegistry: ModuleRegistry,
    private readonly eventBus: EventBus,
    private readonly permissionSystem: PermissionSystem,
    private readonly configService: ConfigService,
    private readonly kernelLogger: KernelLogger,
    private readonly queueService: QueueService,
    private readonly tenantService: TenantService,
  ) {
    this.modules = moduleRegistry;
    this.events = eventBus;
    this.permissions = permissionSystem;
    this.config = configService;
    this.logger = kernelLogger;
    this.queue = queueService;
    this.tenant = tenantService;

    // Wire up kernel reference to services
    moduleRegistry.setKernel(this);
    eventBus.setKernel(this);
    permissionSystem.setKernel(this);
    queueService.setKernel(this);
    tenantService.setKernel(this);
    kernelLogger.setKernel(this);
  }

  /**
   * Application bootstrap - called by NestJS on startup
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.info('🚀 Kernel initializing...');

    try {
      // 1. Initialize core infrastructure first
      await this.initializeInfrastructure();

      // 2. Auto-discover and load modules
      await this.discoverAndLoadModules();

      // 3. Initialize all loaded modules
      await this.initializeModules();

      // 4. Start queue processing
      await this.queueService.start();

      this.initialized = true;
      this.logger.info('✅ Kernel initialized successfully');

      // 5. Emit system ready event
      await this.events.emit('kernel.ready', {
        timestamp: Date.now(),
        modules: Array.from(this.modulesMap.keys()),
      });
    } catch (error) {
      this.logger.error('❌ Kernel initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Application shutdown - called by NestJS on shutdown
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.info('🛑 Kernel shutting down...');

    // Shutdown all modules in reverse dependency order
    const sortedModules = this.getShutdownOrder();

    for (const module of sortedModules) {
      try {
        await module.shutdown();
        this.logger.info(`📦 Module ${module.manifest.id} shut down`);
      } catch (error) {
        this.logger.error(
          `Failed to shutdown module ${module.manifest.id}`,
          error as Error,
        );
      }
    }

    await this.queueService.stop();
    this.initialized = false;
    this.logger.info('👋 Kernel shutdown complete');
  }

  /**
   * Register a module with the kernel
   */
  async registerModule(module: IModule): Promise<void> {
    const manifest = module.manifest;

    if (this.modulesMap.has(manifest.id)) {
      throw new Error(`Module ${manifest.id} is already registered`);
    }

    // Validate dependencies
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.modulesMap.has(dep)) {
          throw new Error(
            `Module ${manifest.id} requires dependency ${dep} which is not registered`,
          );
        }
      }
    }

    // Register module
    this.modulesMap.set(manifest.id, module);
    this.moduleRegistry.register(module);

    this.logger.info(`📦 Module registered: ${manifest.id} v${manifest.version}`);

    // Emit module registered event
    await this.events.emit('module.registered', {
      moduleId: manifest.id,
      name: manifest.name,
      version: manifest.version,
    });
  }

  /**
   * Unregister a module
   */
  async unregisterModule(moduleId: string): Promise<void> {
    const module = this.modulesMap.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Check if other modules depend on this
    for (const [id, mod] of this.modulesMap) {
      if (id === moduleId) continue;
      if (mod.manifest.dependencies?.includes(moduleId)) {
        throw new Error(`Cannot unregister module ${moduleId}: ${id} depends on it`);
      }
    }

    // Shutdown module
    await module.shutdown();

    // Remove from registry
    this.modulesMap.delete(moduleId);
    this.moduleRegistry.unregister(moduleId);

    this.logger.info(`📦 Module unregistered: ${moduleId}`);

    await this.events.emit('module.unregistered', { moduleId });
  }

  /**
   * Get a module by ID
   */
  getModule<T extends IModule>(moduleId: string): T | undefined {
    return this.modulesMap.get(moduleId) as T | undefined;
  }

  /**
   * Check if kernel is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get kernel health status
   */
  async healthCheck(): Promise<HealthStatus> {
    const checks: Record<string, boolean> = {
      registry: true,
      eventBus: true,
      permissions: true,
      queue: await this.queueService.isHealthy(),
      tenant: true,
    };

    // Check all modules
    for (const [id, module] of this.modulesMap) {
      try {
        const moduleHealth = await module.healthCheck();
        checks[`module:${id}`] = moduleHealth.status === 'healthy';
      } catch (error) {
        checks[`module:${id}`] = false;
      }
    }

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: Date.now(),
    };
  }

  /**
   * Activate a module for a specific tenant
   */
  async activateModuleForTenant(
    moduleId: string,
    context: ModuleActivationContext,
  ): Promise<void> {
    const module = this.modulesMap.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Set tenant context
    if (context.tenantId) {
      this.tenant.setContext(context.tenantId);
    }

    try {
      // Initialize module with tenant context
      await module.initialize(this);

      // Register module menus for tenant
      if (module.manifest.menus) {
        for (const menu of module.manifest.menus) {
          this.moduleRegistry.registerMenuForTenant(moduleId, menu, context.tenantId);
        }
      }

      // Register module routes for tenant
      if (module.manifest.routes) {
        for (const route of module.manifest.routes) {
          this.moduleRegistry.registerRouteForTenant(moduleId, route, context.tenantId);
        }
      }

      this.logger.info(
        `✅ Module ${moduleId} activated for tenant ${context.tenantId}`,
      );

      await this.events.emit('module.activated', {
        moduleId,
        tenantId: context.tenantId,
        userId: context.userId,
      });
    } finally {
      this.tenant.clearContext();
    }
  }

  /**
   * Deactivate a module for a tenant
   */
  async deactivateModuleForTenant(
    moduleId: string,
    tenantId: string,
  ): Promise<void> {
    const module = this.modulesMap.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    this.tenant.setContext(tenantId);

    try {
      // Unregister menus and routes
      this.moduleRegistry.unregisterMenusForTenant(moduleId, tenantId);
      this.moduleRegistry.unregisterRoutesForTenant(moduleId, tenantId);

      await this.events.emit('module.deactivated', {
        moduleId,
        tenantId,
      });

      this.logger.info(`⏸️ Module ${moduleId} deactivated for tenant ${tenantId}`);
    } finally {
      this.tenant.clearContext();
    }
  }

  // Private methods

  private async initializeInfrastructure(): Promise<void> {
    // Initialize core services in order
    await this.configService.initialize();
    await this.tenantService.initialize();
    await this.permissionSystem.initialize();
    await this.eventBus.initialize();
    await this.queueService.initialize();
    this.kernelLogger.initialize();

    this.logger.info('🔧 Infrastructure initialized');
  }

  private async discoverAndLoadModules(): Promise<void> {
    // Auto-discover modules from modules/ directory
    // This would scan the filesystem for manifest.json files
    // For now, modules are loaded via dependency injection
    this.logger.info('🔍 Module discovery complete');
  }

  private async initializeModules(): Promise<void> {
    // Sort modules by dependency order
    const sortedModules = this.getInitializationOrder();

    for (const module of sortedModules) {
      try {
        await module.initialize(this);
        this.logger.info(`✅ Module initialized: ${module.manifest.id}`);
      } catch (error) {
        this.logger.error(
          `❌ Module ${module.manifest.id} failed to initialize`,
          error as Error,
        );
        throw error;
      }
    }
  }

  private getInitializationOrder(): IModule[] {
    const modules = Array.from(this.modulesMap.values());
    const sorted: IModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (module: IModule) => {
      if (visited.has(module.manifest.id)) return;
      if (visiting.has(module.manifest.id)) {
        throw new Error(
          `Circular dependency detected in module ${module.manifest.id}`,
        );
      }

      visiting.add(module.manifest.id);

      // Visit dependencies first
      if (module.manifest.dependencies) {
        for (const depId of module.manifest.dependencies) {
          const dep = this.modulesMap.get(depId);
          if (dep) visit(dep);
        }
      }

      visiting.delete(module.manifest.id);
      visited.add(module.manifest.id);
      sorted.push(module);
    };

    for (const module of modules) {
      visit(module);
    }

    return sorted;
  }

  private getShutdownOrder(): IModule[] {
    // Reverse of initialization order
    return this.getInitializationOrder().reverse();
  }

  // Expose the modules map for internal use
  getInternalModulesMap(): Map<string, IModule> {
    return this.modulesMap;
  }
}

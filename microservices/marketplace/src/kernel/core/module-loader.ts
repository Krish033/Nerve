/**
 * MODULE LOADER
 * 
 * Auto-discovers and loads modules from the filesystem.
 * Supports dynamic loading, hot-reload, and manifest validation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  IKernel,
  IModule,
  ModuleManifest,
  MenuRegistration,
  RouteRegistration,
  WidgetRegistration,
} from '../contracts/module.contract';

// Manifest validation schema
const ManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Module ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver (e.g., 1.0.0)'),
  author: z.string().optional(),
  icon: z.string().optional(),
  enabledByDefault: z.boolean().default(true),
  dependencies: z.array(z.string()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
  menus: z.array(z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    path: z.string().optional(),
    parent: z.string().optional(),
    order: z.number().optional(),
    permissions: z.array(z.string()).optional(),
    featureFlag: z.string().optional(),
  })).optional(),
  routes: z.array(z.object({
    id: z.string(),
    path: z.string(),
    component: z.string(),
    layout: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
  })).optional(),
  widgets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    component: z.string(),
    category: z.enum(['dashboard', 'sidebar', 'page', 'modal']),
    permissions: z.array(z.string()).optional(),
    defaultConfig: z.record(z.any()).optional(),
  })).optional(),
  apis: z.array(z.object({
    id: z.string(),
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    handler: z.string(),
    permissions: z.array(z.string()).optional(),
  })).optional(),
  events: z.array(z.object({
    name: z.string(),
    description: z.string(),
    payload: z.record(z.enum(['string', 'number', 'boolean', 'object', 'array'])).optional(),
  })).optional(),
  workflows: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    triggers: z.array(z.string()),
    actions: z.array(z.string()),
  })).optional(),
  migrations: z.array(z.string()).optional(),
  featureFlags: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  settings: z.record(z.any()).optional(),
});

interface DiscoveredModule {
  path: string;
  manifest: ModuleManifest;
  manifestPath: string;
  backendPath?: string;
  frontendPath?: string;
}

@Injectable()
export class ModuleLoader {
  private readonly logger = new Logger(ModuleLoader.name);
  private kernel: IKernel | undefined;
  private readonly modulesDir: string;
  private discoveredModules = new Map<string, DiscoveredModule>();
  private loadedModules = new Map<string, IModule>();

  constructor() {
    // Default modules directory
    this.modulesDir = process.env.MODULES_DIR || path.join(process.cwd(), 'src', 'modules');
  }

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  /**
   * Discover all modules in the modules directory
   */
  async discoverModules(): Promise<DiscoveredModule[]> {
    this.logger.log(`Discovering modules in: ${this.modulesDir}`);

    try {
      const entries = await fs.readdir(this.modulesDir, { withFileTypes: true });
      const modules: DiscoveredModule[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const modulePath = path.join(this.modulesDir, entry.name);
          const manifestPath = path.join(modulePath, 'manifest.json');

          try {
            // Check if manifest exists
            await fs.access(manifestPath);

            // Read and parse manifest
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const parsedManifest = JSON.parse(manifestContent);

            // Validate manifest
            const validation = ManifestSchema.safeParse(parsedManifest);

            if (!validation.success) {
              this.logger.error(
                `Invalid manifest for module ${entry.name}:`,
                validation.error.errors,
              );
              continue;
            }

            const manifest = validation.data as ModuleManifest;

            // Check for duplicate ID
            if (this.discoveredModules.has(manifest.id)) {
              this.logger.warn(`Duplicate module ID: ${manifest.id}`);
              continue;
            }

            // Detect module structure
            const backendPath = path.join(modulePath, 'backend');
            const frontendPath = path.join(modulePath, 'frontend');

            const hasBackend = await this.pathExists(backendPath);
            const hasFrontend = await this.pathExists(frontendPath);

            const discovered: DiscoveredModule = {
              path: modulePath,
              manifest,
              manifestPath,
              backendPath: hasBackend ? backendPath : undefined,
              frontendPath: hasFrontend ? frontendPath : undefined,
            };

            this.discoveredModules.set(manifest.id, discovered);
            modules.push(discovered);

            this.logger.debug(`Discovered module: ${manifest.id} v${manifest.version}`);
          } catch (error) {
            // No manifest.json, skip
            this.logger.debug(`No manifest found in ${entry.name}, skipping`);
          }
        }
      }

      this.logger.log(`Discovered ${modules.length} modules`);
      return modules;
    } catch (error) {
      this.logger.error('Failed to discover modules:', error);
      return [];
    }
  }

  /**
   * Load a module by ID
   */
  async loadModule(moduleId: string): Promise<IModule | null> {
    const discovered = this.discoveredModules.get(moduleId);
    if (!discovered) {
      this.logger.error(`Module not found: ${moduleId}`);
      return null;
    }

    try {
      // Check if already loaded
      if (this.loadedModules.has(moduleId)) {
        return this.loadedModules.get(moduleId)!;
      }

      // Load backend module class
      if (discovered.backendPath) {
        const moduleFile = path.join(discovered.backendPath, 'module.ts');
        
        if (await this.pathExists(moduleFile)) {
          // Dynamic import
          const moduleClass = await import(moduleFile);
          const ModuleConstructor = moduleClass.default || moduleClass.Module;

          if (ModuleConstructor) {
            const instance: IModule = new ModuleConstructor();

            // Verify manifest matches
            if (instance.manifest.id !== discovered.manifest.id) {
              this.logger.warn(
                `Manifest ID mismatch: ${instance.manifest.id} vs ${discovered.manifest.id}`,
              );
            }

            this.loadedModules.set(moduleId, instance);
            this.logger.log(`Loaded module: ${moduleId}`);
            return instance;
          }
        }
      }

      // If no backend, create a stub module
      const stubModule = this.createStubModule(discovered.manifest);
      this.loadedModules.set(moduleId, stubModule);
      return stubModule;
    } catch (error) {
      this.logger.error(`Failed to load module ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Load all discovered modules
   */
  async loadAllModules(): Promise<IModule[]> {
    const modules: IModule[] = [];

    // Sort by dependencies
    const sortedIds = this.sortByDependencies();

    for (const moduleId of sortedIds) {
      const module = await this.loadModule(moduleId);
      if (module) {
        modules.push(module);
      }
    }

    return modules;
  }

  /**
   * Initialize all loaded modules with the kernel
   */
  async initializeModules(): Promise<void> {
    if (!this.kernel) {
      throw new Error('Kernel not set');
    }

    for (const [id, module] of this.loadedModules) {
      try {
        // Register with kernel first
        await this.kernel.registerModule(module);

        // Then initialize
        await module.initialize(this.kernel);

        // Register menus for tenant
        if (module.manifest.menus) {
          for (const menu of module.manifest.menus) {
            this.kernel.modules.registerMenuForTenant(id, menu);
          }
        }

        // Register routes for tenant
        if (module.manifest.routes) {
          for (const route of module.manifest.routes) {
            this.kernel.modules.registerRouteForTenant(id, route);
          }
        }

        // Register widgets for tenant
        if (module.manifest.widgets) {
          for (const widget of module.manifest.widgets) {
            this.kernel.modules.registerWidgetForTenant(id, widget);
          }
        }

        this.logger.log(`Initialized module: ${id}`);
      } catch (error) {
        this.logger.error(`Failed to initialize module ${id}:`, error);
        throw error;
      }
    }
  }

  /**
   * Reload a module (hot reload)
   */
  async reloadModule(moduleId: string): Promise<boolean> {
    if (!this.loadedModules.has(moduleId)) {
      this.logger.error(`Module not loaded: ${moduleId}`);
      return false;
    }

    try {
      // Shutdown existing module
      const existingModule = this.loadedModules.get(moduleId)!;
      await existingModule.shutdown();

      // Unregister from kernel
      await this.kernel?.unregisterModule(moduleId);

      // Remove from cache
      this.loadedModules.delete(moduleId);

      // Clear module from require cache (Node.js)
      const discovered = this.discoveredModules.get(moduleId);
      if (discovered?.backendPath) {
        const moduleFile = path.join(discovered.backendPath, 'module.ts');
        delete require.cache[require.resolve(moduleFile)];
      }

      // Reload
      const newModule = await this.loadModule(moduleId);
      if (newModule) {
        await newModule.initialize(this.kernel!);
        this.logger.log(`Hot reloaded module: ${moduleId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to reload module ${moduleId}:`, error);
      return false;
    }
  }

  /**
   * Unload a module
   */
  async unloadModule(moduleId: string): Promise<boolean> {
    if (!this.loadedModules.has(moduleId)) {
      return false;
    }

    try {
      const module = this.loadedModules.get(moduleId)!;
      await module.shutdown();
      await this.kernel?.unregisterModule(moduleId);
      this.loadedModules.delete(moduleId);

      this.logger.log(`Unloaded module: ${moduleId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unload module ${moduleId}:`, error);
      return false;
    }
  }

  /**
   * Get all discovered modules
   */
  getDiscoveredModules(): DiscoveredModule[] {
    return Array.from(this.discoveredModules.values());
  }

  /**
   * Get all loaded modules
   */
  getLoadedModules(): IModule[] {
    return Array.from(this.loadedModules.values());
  }

  /**
   * Validate module manifest
   */
  validateManifest(manifest: unknown): { valid: boolean; errors?: string[] } {
    const result = ManifestSchema.safeParse(manifest);

    if (result.success) {
      return { valid: true };
    }

    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies(): string[] | null {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[] = [];

    const visit = (moduleId: string, path: string[] = []): boolean => {
      if (recStack.has(moduleId)) {
        // Found cycle
        const cycleStart = path.indexOf(moduleId);
        const cycle = path.slice(cycleStart).concat(moduleId);
        cycles.push(cycle.join(' -> '));
        return true;
      }

      if (visited.has(moduleId)) {
        return false;
      }

      visited.add(moduleId);
      recStack.add(moduleId);
      path.push(moduleId);

      const module = this.discoveredModules.get(moduleId);
      if (module?.manifest.dependencies) {
        for (const dep of module.manifest.dependencies) {
          if (visit(dep, [...path])) {
            return true;
          }
        }
      }

      recStack.delete(moduleId);
      return false;
    };

    for (const moduleId of this.discoveredModules.keys()) {
      if (!visited.has(moduleId)) {
        visit(moduleId);
      }
    }

    return cycles.length > 0 ? cycles : null;
  }

  // Private methods

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private createStubModule(manifest: ModuleManifest): IModule {
    return {
      manifest,
      async initialize(): Promise<void> {
        // No-op
      },
      async shutdown(): Promise<void> {
        // No-op
      },
      async healthCheck() {
        return {
          status: 'healthy',
          timestamp: Date.now(),
        };
      },
    };
  }

  private sortByDependencies(): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (moduleId: string): void => {
      if (visited.has(moduleId)) return;
      if (visiting.has(moduleId)) {
        throw new Error(`Circular dependency detected: ${moduleId}`);
      }

      visiting.add(moduleId);

      const module = this.discoveredModules.get(moduleId);
      if (module?.manifest.dependencies) {
        for (const dep of module.manifest.dependencies) {
          if (this.discoveredModules.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(moduleId);
      visited.add(moduleId);
      sorted.push(moduleId);
    };

    for (const moduleId of this.discoveredModules.keys()) {
      visit(moduleId);
    }

    return sorted;
  }
}

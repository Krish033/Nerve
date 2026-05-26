/**
 * Plugin Runtime Foundation
 * 
 * The central orchestration layer for the plugin system.
 * Manages plugin lifecycle, state, and execution context.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PluginInstance,
  PluginManifest,
  PluginState,
  PluginOperationResult,
  ValidatedPluginManifest,
} from '../contracts';
import { PluginRegistry } from '../registry/plugin-registry';
import { PluginLifecycleManager } from '../lifecycle/plugin-lifecycle';
import { PluginValidator } from '../validator/plugin-validator';
import { PluginStorage } from '../storage/plugin-storage';
import { PluginDiagnostics } from '../diagnostics/plugin-diagnostics';
import { PluginEventBus } from '../events/plugin-event-bus';
import { PluginSecurityManager } from '../permissions/plugin-security';

interface RuntimeConfig {
  autoEnableOnInstall: boolean;
  healthCheckIntervalMs: number;
  maxFailureThreshold: number;
  sandboxEnabled: boolean;
  strictValidation: boolean;
}

@Injectable()
export class PluginRuntime implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PluginRuntime.name);
  private readonly config: RuntimeConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly activePlugins = new Map<string, PluginInstance>();
  private isShuttingDown = false;

  constructor(
    private readonly registry: PluginRegistry,
    private readonly lifecycle: PluginLifecycleManager,
    private readonly validator: PluginValidator,
    private readonly storage: PluginStorage,
    private readonly diagnostics: PluginDiagnostics,
    private readonly eventBus: PluginEventBus,
    private readonly security: PluginSecurityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = {
      autoEnableOnInstall: false,
      healthCheckIntervalMs: 60000,
      maxFailureThreshold: 3,
      sandboxEnabled: true,
      strictValidation: true,
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing plugin runtime...');
    
    // Load all previously installed plugins
    await this.restorePlugins();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    this.logger.log('Plugin runtime initialized');
    this.emitRuntimeEvent('runtime.initialized', {});
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down plugin runtime...');
    this.isShuttingDown = true;
    
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Gracefully disable all active plugins
    for (const [id, instance] of this.activePlugins) {
      if (instance.state === 'ENABLED') {
        await this.disablePlugin(id, { graceful: true, reason: 'runtime-shutdown' });
      }
    }
    
    this.activePlugins.clear();
    this.logger.log('Plugin runtime shutdown complete');
  }

  /**
   * Install a new plugin into the system
   */
  async installPlugin(
    packageData: Buffer,
    options: { force?: boolean; skipValidation?: boolean } = {},
  ): Promise<PluginOperationResult<PluginInstance>> {
    const operationId = this.diagnostics.startOperation('plugin.install');
    
    try {
      this.logger.log('Starting plugin installation...');
      
      // 1. Extract and validate package
      const extraction = await this.storage.extractPackage(packageData);
      if (!extraction.success || !extraction.manifest || !extraction.tempPath) {
        return this.createErrorResult('EXTRACTION_FAILED', extraction.error || 'Failed to extract plugin package');
      }
      
      // 2. Parse and validate manifest
      let manifest: ValidatedPluginManifest;
      if (!options.skipValidation) {
        const validation = await this.validator.validateManifest(extraction.manifest);
        if (!validation.valid) {
          await this.storage.cleanupTemp(extraction.tempPath);
          return this.createErrorResult(
            'VALIDATION_FAILED',
            `Manifest validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
            { errors: validation.errors }
          );
        }
        manifest = validation.manifest!;
      } else {
        manifest = extraction.manifest as ValidatedPluginManifest;
      }
      
      // 3. Check for duplicates
      const existing = await this.registry.getPlugin(manifest.name);
      if (existing && !options.force) {
        await this.storage.cleanupTemp(extraction.tempPath);
        return this.createErrorResult('PLUGIN_EXISTS', `Plugin ${manifest.name} is already installed`);
      }
      
      // 4. Check compatibility
      const compatibility = await this.validator.checkCompatibility(manifest);
      if (!compatibility.compatible) {
        await this.storage.cleanupTemp(extraction.tempPath);
        return this.createErrorResult(
          'INCOMPATIBLE',
          `Plugin ${manifest.name} is incompatible: ${compatibility.reason}`
        );
      }
      
      // 5. Install to permanent storage
      const installResult = await this.storage.installPlugin(manifest, extraction.tempPath);
      if (!installResult.success || !installResult.installPath) {
        return this.createErrorResult('INSTALLATION_FAILED', installResult.error || 'Failed to install plugin');
      }
      
      // 6. Create plugin instance
      const instance = await this.createPluginInstance(manifest, installResult.installPath);
      
      // 7. Register in system
      await this.registry.registerPlugin(instance);
      
      // 8. Execute install lifecycle hook
      const installHook = await this.lifecycle.executeHook(instance, 'onInstall');
      if (!installHook.success) {
        this.logger.warn(`Install hook failed for ${manifest.name}: ${installHook.error}`);
        // Continue - install hook failure shouldn't block installation
      }
      
      // 9. Auto-enable if configured
      if (manifest.autoEnable || this.config.autoEnableOnInstall) {
        const enableResult = await this.enablePlugin(instance.id);
        if (!enableResult.success) {
          this.logger.warn(`Auto-enable failed for ${manifest.name}: ${enableResult.error?.message}`);
        }
      }
      
      this.activePlugins.set(instance.id, instance);
      
      this.diagnostics.endOperation(operationId, { success: true, pluginId: instance.id });
      this.emitRuntimeEvent('plugin.installed', { pluginId: instance.id, manifest });
      
      return {
        success: true,
        data: instance,
      };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Plugin installation failed: ${message}`);
      this.diagnostics.endOperation(operationId, { success: false, error: message });
      return this.createErrorResult('INSTALLATION_EXCEPTION', message);
    }
  }

  /**
   * Enable a plugin - activates all its functionality
   */
  async enablePlugin(
    pluginId: string,
    options: { graceful?: boolean; reason?: string } = {},
  ): Promise<PluginOperationResult<void>> {
    const instance = this.activePlugins.get(pluginId) || await this.registry.getPlugin(pluginId);
    
    if (!instance) {
      return this.createErrorResult('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }
    
    if (instance.state === 'ENABLED') {
      return { success: true };
    }
    
    if (instance.state === 'BROKEN' || instance.state === 'INVALID') {
      return this.createErrorResult('INVALID_STATE', `Cannot enable plugin in ${instance.state} state`);
    }
    
    const operationId = this.diagnostics.startOperation('plugin.enable', { pluginId });
    
    try {
      this.logger.log(`Enabling plugin ${instance.manifest.name}...`);
      
      // 1. Security validation
      const securityCheck = await this.security.validatePlugin(instance.manifest);
      if (!securityCheck.allowed) {
        return this.createErrorResult('SECURITY_VIOLATION', securityCheck.reason || 'Security check failed');
      }
      
      // 2. Load backend module
      if (instance.manifest.entry.backend) {
        const loadResult = await this.loadBackendModule(instance);
        if (!loadResult.success) {
          return this.createErrorResult('LOAD_FAILED', loadResult.error || 'Failed to load backend module');
        }
      }
      
      // 3. Register routes
      const routeResult = await this.registry.registerRoutes(instance);
      if (!routeResult.success) {
        await this.unloadBackendModule(instance);
        return this.createErrorResult('ROUTE_REGISTRATION_FAILED', routeResult.error || 'Failed to register routes');
      }
      
      // 4. Register event handlers
      const eventResult = await this.eventBus.registerPluginEvents(instance);
      if (!eventResult.success) {
        await this.registry.unregisterRoutes(instance);
        await this.unloadBackendModule(instance);
        return this.createErrorResult('EVENT_REGISTRATION_FAILED', eventResult.error || 'Failed to register events');
      }
      
      // 5. Register queue workers
      const queueResult = await this.registry.registerQueues(instance);
      if (!queueResult.success) {
        await this.eventBus.unregisterPluginEvents(instance);
        await this.registry.unregisterRoutes(instance);
        await this.unloadBackendModule(instance);
        return this.createErrorResult('QUEUE_REGISTRATION_FAILED', queueResult.error || 'Failed to register queues');
      }
      
      // 6. Execute enable lifecycle hook
      const enableHook = await this.lifecycle.executeHook(instance, 'onEnable');
      if (!enableHook.success) {
        this.logger.warn(`Enable hook failed for ${instance.manifest.name}: ${enableHook.error}`);
        // Log but don't block - plugin is technically enabled
      }
      
      // 7. Update state
      await this.updatePluginState(instance, 'ENABLED', options.reason || 'manual-enable');
      instance.enabledAt = new Date();
      instance.healthStatus = 'healthy';
      
      // 8. Persist state
      await this.registry.updatePlugin(instance);
      
      this.diagnostics.endOperation(operationId, { success: true });
      this.emitRuntimeEvent('plugin.enabled', { pluginId, name: instance.manifest.name });
      
      this.logger.log(`Plugin ${instance.manifest.name} enabled successfully`);
      return { success: true };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enable plugin ${pluginId}: ${message}`);
      
      // Cleanup on failure
      await this.cleanupFailedEnable(instance);
      
      await this.updatePluginState(instance, 'FAILED', message);
      instance.failureCount++;
      instance.lastFailure = {
        timestamp: new Date(),
        error: message,
        context: 'enable',
      };
      await this.registry.updatePlugin(instance);
      
      this.diagnostics.endOperation(operationId, { success: false, error: message });
      return this.createErrorResult('ENABLE_EXCEPTION', message);
    }
  }

  /**
   * Disable a plugin - deactivates all functionality
   */
  async disablePlugin(
    pluginId: string,
    options: { graceful?: boolean; reason?: string } = {},
  ): Promise<PluginOperationResult<void>> {
    const instance = this.activePlugins.get(pluginId);
    
    if (!instance) {
      return this.createErrorResult('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }
    
    if (instance.state !== 'ENABLED') {
      return { success: true };
    }
    
    const operationId = this.diagnostics.startOperation('plugin.disable', { pluginId });
    
    try {
      this.logger.log(`Disabling plugin ${instance.manifest.name}...`);
      
      // 1. Execute disable lifecycle hook
      const disableHook = await this.lifecycle.executeHook(instance, 'onDisable');
      if (!disableHook.success) {
        this.logger.warn(`Disable hook failed for ${instance.manifest.name}: ${disableHook.error}`);
      }
      
      // 2. Unregister queue workers
      await this.registry.unregisterQueues(instance);
      
      // 3. Unregister event handlers
      await this.eventBus.unregisterPluginEvents(instance);
      
      // 4. Unregister routes
      await this.registry.unregisterRoutes(instance);
      
      // 5. Unload backend module
      await this.unloadBackendModule(instance);
      
      // 6. Update state
      await this.updatePluginState(instance, 'DISABLED', options.reason || 'manual-disable');
      instance.enabledAt = undefined;
      
      // 7. Persist state
      await this.registry.updatePlugin(instance);
      
      this.diagnostics.endOperation(operationId, { success: true });
      this.emitRuntimeEvent('plugin.disabled', { pluginId, name: instance.manifest.name });
      
      this.logger.log(`Plugin ${instance.manifest.name} disabled successfully`);
      return { success: true };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to disable plugin ${pluginId}: ${message}`);
      
      // Even on failure, mark as disabled to prevent inconsistent state
      await this.updatePluginState(instance, 'DISABLED', `disable-failed: ${message}`);
      await this.registry.updatePlugin(instance);
      
      this.diagnostics.endOperation(operationId, { success: false, error: message });
      return this.createErrorResult('DISABLE_EXCEPTION', message);
    }
  }

  /**
   * Uninstall a plugin - completely removes it from the system
   */
  async uninstallPlugin(
    pluginId: string,
    options: { force?: boolean; keepData?: boolean } = {},
  ): Promise<PluginOperationResult<void>> {
    const instance = this.activePlugins.get(pluginId) || await this.registry.getPlugin(pluginId);
    
    if (!instance) {
      return this.createErrorResult('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }
    
    const operationId = this.diagnostics.startOperation('plugin.uninstall', { pluginId });
    
    try {
      this.logger.log(`Uninstalling plugin ${instance.manifest.name}...`);
      
      // 1. Disable if currently enabled
      if (instance.state === 'ENABLED') {
        const disableResult = await this.disablePlugin(pluginId, { reason: 'uninstall' });
        if (!disableResult.success && !options.force) {
          return this.createErrorResult('DISABLE_REQUIRED', 'Failed to disable plugin before uninstall');
        }
      }
      
      // 2. Execute uninstall lifecycle hook
      const uninstallHook = await this.lifecycle.executeHook(instance, 'onUninstall');
      if (!uninstallHook.success && !options.force) {
        return this.createErrorResult('UNINSTALL_HOOK_FAILED', uninstallHook.error || 'Uninstall hook failed');
      }
      
      // 3. Clean up storage
      if (!options.keepData) {
        const cleanupResult = await this.storage.uninstallPlugin(instance);
        if (!cleanupResult.success && !options.force) {
          return this.createErrorResult('CLEANUP_FAILED', cleanupResult.error || 'Failed to clean up plugin files');
        }
      }
      
      // 4. Unregister from system
      await this.registry.unregisterPlugin(pluginId);
      this.activePlugins.delete(pluginId);
      
      this.diagnostics.endOperation(operationId, { success: true });
      this.emitRuntimeEvent('plugin.uninstalled', { pluginId, name: instance.manifest.name });
      
      this.logger.log(`Plugin ${instance.manifest.name} uninstalled successfully`);
      return { success: true };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to uninstall plugin ${pluginId}: ${message}`);
      this.diagnostics.endOperation(operationId, { success: false, error: message });
      return this.createErrorResult('UNINSTALL_EXCEPTION', message);
    }
  }

  /**
   * Get plugin instance by ID
   */
  async getPlugin(pluginId: string): Promise<PluginInstance | undefined> {
    return this.activePlugins.get(pluginId) || this.registry.getPlugin(pluginId);
  }

  /**
   * List all plugins
   */
  async listPlugins(filters?: { state?: PluginState; type?: string }): Promise<PluginInstance[]> {
    const plugins = await this.registry.listPlugins();
    
    if (!filters) return plugins;
    
    return plugins.filter(p => {
      if (filters.state && p.state !== filters.state) return false;
      if (filters.type && p.manifest.type !== filters.type) return false;
      return true;
    });
  }

  /**
   * Get plugin diagnostics
   */
  async getPluginDiagnostics(pluginId: string): Promise<unknown> {
    return this.diagnostics.getPluginMetrics(pluginId);
  }

  // Private helper methods
  
  private async restorePlugins(): Promise<void> {
    const plugins = await this.registry.listPlugins();
    
    for (const plugin of plugins) {
      this.activePlugins.set(plugin.id, plugin);
      
      // Re-enable plugins that were previously enabled
      if (plugin.state === 'ENABLED' && !this.isShuttingDown) {
        const result = await this.enablePlugin(plugin.id, { reason: 'runtime-restore' });
        if (!result.success) {
          this.logger.error(`Failed to restore plugin ${plugin.manifest.name}: ${result.error?.message}`);
        }
      }
    }
    
    this.logger.log(`Restored ${plugins.length} plugins`);
  }

  private async createPluginInstance(
    manifest: ValidatedPluginManifest,
    installPath: string,
  ): Promise<PluginInstance> {
    const id = `${manifest.name}-${Date.now()}`;
    
    return {
      id,
      manifest,
      state: 'INSTALLED',
      installedAt: new Date(),
      installPath,
      backendPath: manifest.entry.backend ? `${installPath}/backend` : undefined,
      frontendPath: manifest.entry.frontend ? `${installPath}/frontend` : undefined,
      stateHistory: [{
        state: 'INSTALLED',
        timestamp: new Date(),
        reason: 'initial-install',
      }],
      failureCount: 0,
      healthStatus: 'unknown',
    };
  }

  private async updatePluginState(
    instance: PluginInstance,
    newState: PluginState,
    reason: string,
  ): Promise<void> {
    const oldState = instance.state;
    instance.state = newState;
    instance.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      reason,
    });
    
    this.emitRuntimeEvent('plugin.stateChanged', {
      pluginId: instance.id,
      oldState,
      newState,
      reason,
    });
  }

  private async loadBackendModule(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      if (!instance.backendPath) {
        return { success: true };
      }
      
      // TODO: Implement secure module loading with sandbox
      // For now, this is a placeholder for future sandboxed execution
      
      this.logger.debug(`Loading backend module for ${instance.manifest.name}`);
      
      // Placeholder: In production, this would use VM2 or similar
      // instance.backendModule = await sandboxedRequire(instance.backendPath);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async unloadBackendModule(instance: PluginInstance): Promise<void> {
    if (instance.backendModule) {
      // Cleanup module resources
      instance.backendModule = undefined;
    }
  }

  private async cleanupFailedEnable(instance: PluginInstance): Promise<void> {
    try {
      await this.registry.unregisterQueues(instance);
      await this.eventBus.unregisterPluginEvents(instance);
      await this.registry.unregisterRoutes(instance);
      await this.unloadBackendModule(instance);
    } catch (error) {
      this.logger.error(`Cleanup failed for ${instance.manifest.name}: ${error}`);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [id, instance] of this.activePlugins) {
        if (instance.state === 'ENABLED') {
          await this.performHealthCheck(instance);
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  private async performHealthCheck(instance: PluginInstance): Promise<void> {
    try {
      const result = await this.lifecycle.executeHook(instance, 'onHealthCheck');
      
      instance.lastHealthCheck = new Date();
      
      if (result.success) {
        instance.healthStatus = 'healthy';
        instance.failureCount = 0;
      } else {
        instance.healthStatus = 'degraded';
        instance.failureCount++;
        
        if (instance.failureCount >= this.config.maxFailureThreshold) {
          this.logger.error(`Plugin ${instance.manifest.name} failed health check ${instance.failureCount} times, disabling...`);
          await this.updatePluginState(instance, 'BROKEN', 'health-check-failure');
          await this.disablePlugin(instance.id, { reason: 'health-check-failure' });
        }
      }
      
      await this.registry.updatePlugin(instance);
    } catch (error) {
      this.logger.error(`Health check error for ${instance.manifest.name}: ${error}`);
    }
  }

  private emitRuntimeEvent(event: string, payload: unknown): void {
    this.eventEmitter.emit(`plugin.${event}`, payload);
  }

  private createErrorResult(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): PluginOperationResult<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }
}

// Compatibility check placeholder - needs implementation
const compatible = true;

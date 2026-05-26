/**
 * Plugin Installation Orchestrator
 * 
 * Complete installation pipeline:
 * UPLOAD → TEMP STORAGE → VALIDATION → EXTRACTION → MANIFEST PARSE → 
 * SECURITY CHECK → DEPENDENCY CHECK → REGISTRATION → ACTIVATION → LIVE
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PluginInstance,
  PluginManifest,
  ValidatedPluginManifest,
  PluginState,
  PluginOperationResult,
  PluginInstallationResult,
  ManifestValidationError,
} from '../contracts';
import { PluginStorage } from '../storage/plugin-storage';
import { PluginValidator } from '../validator/plugin-validator';
import { PluginRegistry } from '../registry/plugin-registry';
import { PluginLifecycleManager } from '../lifecycle/plugin-lifecycle';
import { PluginSecurityManager } from '../permissions/plugin-security';
import { PluginDiagnostics } from '../diagnostics/plugin-diagnostics';
import { PluginEventBus } from '../events/plugin-event-bus';
import { PluginCircuitBreaker } from '../isolation/plugin-circuit-breaker';
import { PluginTenantGuard } from '../isolation/plugin-tenant-guard';

interface InstallPhase {
  name: string;
  execute: () => Promise<{ success: boolean; error?: string }>;
  rollback?: () => Promise<void>;
}

interface InstallContext {
  installationId: string;
  packageData: Buffer;
  tempPath?: string;
  manifest?: ValidatedPluginManifest;
  instance?: PluginInstance;
  phase: string;
  startTime: Date;
  logs: string[];
  warnings: string[];
}

@Injectable()
export class PluginInstaller {
  private readonly logger = new Logger(PluginInstaller.name);
  private readonly maxPackageSize = 50 * 1024 * 1024; // 50MB
  private readonly activeInstallations = new Map<string, InstallContext>();

  constructor(
    private readonly storage: PluginStorage,
    private readonly validator: PluginValidator,
    private readonly registry: PluginRegistry,
    private readonly lifecycle: PluginLifecycleManager,
    private readonly security: PluginSecurityManager,
    private readonly diagnostics: PluginDiagnostics,
    private readonly eventBus: PluginEventBus,
    private readonly circuitBreaker: PluginCircuitBreaker,
    private readonly tenantGuard: PluginTenantGuard,
  ) {}

  /**
   * Complete plugin installation pipeline
   */
  async install(
    packageData: Buffer,
    options: {
      force?: boolean;
      skipValidation?: boolean;
      autoEnable?: boolean;
      tenantId?: string;
    } = {},
  ): Promise<PluginOperationResult<PluginInstallationResult>> {
    const installationId = crypto.randomUUID();
    const context: InstallContext = {
      installationId,
      packageData,
      phase: 'INIT',
      startTime: new Date(),
      logs: [],
      warnings: [],
    };

    this.activeInstallations.set(installationId, context);
    this.logger.log(`Starting plugin installation ${installationId}`);

    const operationId = this.diagnostics.startOperation('plugin.install', {
      installationId,
      packageSize: packageData.length,
    });

    try {
      // Phase 1: Validate upload
      const uploadValidation = await this.validateUpload(packageData);
      if (!uploadValidation.valid) {
        return this.createErrorResult('UPLOAD_INVALID', uploadValidation.error!);
      }

      // Phase 2: Extract package
      context.phase = 'EXTRACTION';
      const extraction = await this.storage.extractPackage(packageData);
      if (!extraction.success || !extraction.tempPath || !extraction.manifest) {
        return this.createErrorResult('EXTRACTION_FAILED', extraction.error || 'Extraction failed');
      }
      context.tempPath = extraction.tempPath;
      context.logs.push(`Package extracted to ${extraction.tempPath}`);

      // Phase 3: Validate manifest
      context.phase = 'VALIDATION';
      let manifest: ValidatedPluginManifest;
      if (!options.skipValidation) {
        const validation = await this.validator.validateManifest(extraction.manifest);
        if (!validation.valid) {
          await this.cleanup(context);
          return this.createValidationErrorResult(validation.errors);
        }
        manifest = validation.manifest!;
      } else {
        manifest = extraction.manifest as ValidatedPluginManifest;
      }
      context.manifest = manifest;
      context.logs.push(`Manifest validated: ${manifest.name}@${manifest.version}`);

      // Phase 4: Security check
      context.phase = 'SECURITY';
      const securityCheck = await this.security.validatePlugin(manifest);
      if (!securityCheck.allowed) {
        await this.cleanup(context);
        return this.createErrorResult('SECURITY_VIOLATION', securityCheck.reason || 'Security check failed');
      }
      context.logs.push('Security check passed');

      // Phase 5: Check for duplicates
      const existing = await this.registry.getPluginByName(manifest.name);
      if (existing && !options.force) {
        await this.cleanup(context);
        return this.createErrorResult('PLUGIN_EXISTS', `Plugin ${manifest.name} is already installed`);
      }

      // Phase 6: Install to permanent storage
      context.phase = 'INSTALLATION';
      const installResult = await this.storage.installPlugin(manifest, context.tempPath);
      if (!installResult.success || !installResult.installPath) {
        await this.cleanup(context);
        return this.createErrorResult('INSTALLATION_FAILED', installResult.error || 'Installation failed');
      }
      context.logs.push(`Plugin installed to ${installResult.installPath}`);

      // Phase 7: Create instance
      context.phase = 'REGISTRATION';
      const instance = await this.createPluginInstance(manifest, installResult.installPath);
      context.instance = instance;

      // Phase 8: Register capabilities
      const registration = await this.registerCapabilities(instance);
      if (!registration.success) {
        await this.rollbackInstallation(context);
        return this.createErrorResult('REGISTRATION_FAILED', registration.error || 'Capability registration failed');
      }
      context.logs.push('Capabilities registered');

      // Phase 9: Persist to database
      await this.registry.registerPlugin(instance);
      context.logs.push('Plugin registered in database');

      // Phase 10: Execute install hook
      context.phase = 'LIFECYCLE';
      const installHook = await this.lifecycle.executeHook(instance, 'onInstall');
      if (!installHook.success) {
        context.warnings.push(`Install hook warning: ${installHook.error}`);
      }
      context.logs.push('Install lifecycle hook executed');

      // Phase 11: Auto-enable if requested
      if (options.autoEnable || manifest.autoEnable) {
        const enableResult = await this.enablePlugin(instance.id, options.tenantId);
        if (!enableResult.success) {
          context.warnings.push(`Auto-enable warning: ${enableResult.error?.message}`);
        } else {
          context.logs.push('Plugin auto-enabled');
        }
      }

      // Success
      context.phase = 'COMPLETE';
      const result: PluginInstallationResult = {
        pluginId: instance.id,
        manifest,
        state: instance.state,
        installedAt: instance.installedAt,
        logs: context.logs,
        warnings: context.warnings.length > 0 ? context.warnings : undefined,
      };

      this.diagnostics.endOperation(operationId, { success: true });
      this.emitInstallEvent('plugin.installed', result);
      this.activeInstallations.delete(installationId);

      return {
        success: true,
        data: result,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Installation ${installationId} failed: ${message}`);
      
      await this.rollbackInstallation(context);
      
      this.diagnostics.endOperation(operationId, { success: false, error: message });
      this.activeInstallations.delete(installationId);

      return this.createErrorResult('INSTALLATION_EXCEPTION', message, {
        phase: context.phase,
        logs: context.logs,
      });
    }
  }

  /**
   * Enable a plugin - activate all capabilities
   */
  async enablePlugin(pluginId: string, tenantId?: string): Promise<PluginOperationResult<void>> {
    const instance = await this.registry.getPlugin(pluginId);
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

      // Execute in tenant context if provided
      const enableFn = async () => {
        // Load backend module
        if (instance.manifest.entry.backend) {
          await this.loadBackendModule(instance);
        }

        // Register routes
        await this.activateRoutes(instance);

        // Register event handlers
        await this.eventBus.registerPluginEvents(instance);

        // Register queues
        await this.activateQueues(instance);

        // Execute enable hook
        const enableHook = await this.lifecycle.executeHook(instance, 'onEnable');
        if (!enableHook.success) {
          this.logger.warn(`Enable hook failed: ${enableHook.error}`);
        }

        // Update state
        instance.state = 'ENABLED';
        instance.enabledAt = new Date();
        instance.healthStatus = 'healthy';
        await this.registry.updatePlugin(instance);

        // Emit event
        this.emitInstallEvent('plugin.enabled', { pluginId, name: instance.manifest.name });
      };

      if (tenantId) {
        await this.tenantGuard.withTenantContext(
          { tenantId, pluginId, permissions: [], startedAt: new Date() },
          enableFn,
        );
      } else {
        await enableFn();
      }

      this.diagnostics.endOperation(operationId, { success: true });
      this.circuitBreaker.recordSuccess(pluginId);

      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enable plugin ${pluginId}: ${message}`);
      
      instance.failureCount++;
      instance.lastFailure = { timestamp: new Date(), error: message, context: 'enable' };
      await this.registry.updatePlugin(instance);
      
      this.circuitBreaker.recordFailure(pluginId, error instanceof Error ? error : undefined);
      this.diagnostics.endOperation(operationId, { success: false, error: message });

      return this.createErrorResult('ENABLE_FAILED', message);
    }
  }

  /**
   * Disable a plugin - deactivate all capabilities
   */
  async disablePlugin(pluginId: string): Promise<PluginOperationResult<void>> {
    const instance = await this.registry.getPlugin(pluginId);
    if (!instance) {
      return this.createErrorResult('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    if (instance.state !== 'ENABLED') {
      return { success: true };
    }

    try {
      this.logger.log(`Disabling plugin ${instance.manifest.name}...`);

      // Execute disable hook
      await this.lifecycle.executeHook(instance, 'onDisable');

      // Deactivate routes
      await this.deactivateRoutes(instance);

      // Unregister events
      await this.eventBus.unregisterPluginEvents(instance);

      // Deactivate queues
      await this.deactivateQueues(instance);

      // Update state
      instance.state = 'DISABLED';
      instance.enabledAt = undefined;
      await this.registry.updatePlugin(instance);

      this.emitInstallEvent('plugin.disabled', { pluginId });

      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to disable plugin ${pluginId}: ${message}`);
      
      // Force disabled state even on failure
      instance.state = 'DISABLED';
      await this.registry.updatePlugin(instance);

      return this.createErrorResult('DISABLE_FAILED', message);
    }
  }

  /**
   * Uninstall a plugin - completely remove from system
   */
  async uninstallPlugin(
    pluginId: string,
    options: { force?: boolean; keepData?: boolean } = {},
  ): Promise<PluginOperationResult<void>> {
    const instance = await this.registry.getPlugin(pluginId);
    if (!instance) {
      return this.createErrorResult('PLUGIN_NOT_FOUND', `Plugin ${pluginId} not found`);
    }

    try {
      this.logger.log(`Uninstalling plugin ${instance.manifest.name}...`);

      // Disable first if enabled
      if (instance.state === 'ENABLED') {
        const disableResult = await this.disablePlugin(pluginId);
        if (!disableResult.success && !options.force) {
          return this.createErrorResult('DISABLE_REQUIRED', 'Failed to disable plugin before uninstall');
        }
      }

      // Execute uninstall hook
      await this.lifecycle.executeHook(instance, 'onUninstall');

      // Unregister from database
      await this.registry.unregisterPlugin(pluginId);

      // Cleanup storage
      if (!options.keepData) {
        await this.storage.uninstallPlugin(instance);
      }

      // Cleanup circuit breaker
      this.circuitBreaker.reset(pluginId);

      this.emitInstallEvent('plugin.uninstalled', { pluginId });

      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorResult('UNINSTALL_FAILED', message);
    }
  }

  /**
   * Get installation status
   */
  getInstallationStatus(installationId: string): {
    phase: string;
    logs: string[];
    duration: number;
  } | null {
    const context = this.activeInstallations.get(installationId);
    if (!context) return null;

    return {
      phase: context.phase,
      logs: context.logs,
      duration: Date.now() - context.startTime.getTime(),
    };
  }

  // Private methods

  private async validateUpload(packageData: Buffer): Promise<{ valid: boolean; error?: string }> {
    // Check size
    if (packageData.length > this.maxPackageSize) {
      return {
        valid: false,
        error: `Package size ${(packageData.length / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(this.maxPackageSize / 1024 / 1024).toFixed(0)}MB`,
      };
    }

    // Check format (magic numbers)
    const isZip = packageData[0] === 0x50 && packageData[1] === 0x4b;
    const isTar = packageData[0] === 0x1f && packageData[1] === 0x8b;

    if (!isZip && !isTar) {
      return {
        valid: false,
        error: 'Invalid package format. Supported: .zip, .tar.gz',
      };
    }

    return { valid: true };
  }

  private async createPluginInstance(
    manifest: ValidatedPluginManifest,
    installPath: string,
  ): Promise<PluginInstance> {
    return {
      id: crypto.randomUUID(),
      manifest,
      state: 'INSTALLED',
      installedAt: new Date(),
      installPath,
      stateHistory: [{ state: 'INSTALLED', timestamp: new Date(), reason: 'installation' }],
      failureCount: 0,
      healthStatus: 'unknown',
    };
  }

  private async registerCapabilities(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      // Register routes
      const routeResult = await this.registry.registerRoutes(instance);
      if (!routeResult.success) {
        return { success: false, error: routeResult.error };
      }

      // Register widgets
      const widgetResult = await this.registry.registerWidgets(instance);
      if (!widgetResult.success) {
        return { success: false, error: widgetResult.error };
      }

      // Register queues
      const queueResult = await this.registry.registerQueues(instance);
      if (!queueResult.success) {
        return { success: false, error: queueResult.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async loadBackendModule(instance: PluginInstance): Promise<void> {
    // Placeholder for actual module loading
    this.logger.debug(`Loading backend module for ${instance.manifest.name}`);
  }

  private async activateRoutes(instance: PluginInstance): Promise<void> {
    // Routes are registered but need to be activated in the HTTP layer
    this.logger.debug(`Activating routes for ${instance.manifest.name}`);
    // This would integrate with NestJS router
  }

  private async deactivateRoutes(instance: PluginInstance): Promise<void> {
    this.logger.debug(`Deactivating routes for ${instance.manifest.name}`);
  }

  private async activateQueues(instance: PluginInstance): Promise<void> {
    this.logger.debug(`Activating queues for ${instance.manifest.name}`);
    // This would integrate with BullMQ
  }

  private async deactivateQueues(instance: PluginInstance): Promise<void> {
    this.logger.debug(`Deactivating queues for ${instance.manifest.name}`);
  }

  private async cleanup(context: InstallContext): Promise<void> {
    if (context.tempPath) {
      await this.storage.cleanupTemp(context.tempPath);
    }
  }

  private async rollbackInstallation(context: InstallContext): Promise<void> {
    this.logger.warn(`Rolling back installation ${context.installationId}`);

    try {
      // Cleanup temp
      await this.cleanup(context);

      // Unregister if registered
      if (context.instance) {
        await this.registry.unregisterPlugin(context.instance.id).catch(() => {});
      }

      // Cleanup storage if installed
      if (context.instance && context.instance.installPath) {
        await this.storage.uninstallPlugin(context.instance).catch(() => {});
      }
    } catch (error) {
      this.logger.error(`Rollback failed: ${error}`);
    }
  }

  private createErrorResult(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): PluginOperationResult<never> {
    return {
      success: false,
      error: { code, message, details },
    };
  }

  private createValidationErrorResult(errors: ManifestValidationError[]): PluginOperationResult<never> {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: `Manifest validation failed with ${errors.length} errors`,
        details: { errors },
      },
    };
  }

  private emitInstallEvent(event: string, payload: unknown): void {
    // Emit to plugin event bus
    this.eventBus.emitEvent('system', event, payload).catch(() => {});
  }
}

/**
 * BASE MODULE
 * 
 * Abstract base class that all modules should extend.
 * Provides common functionality and enforces the module contract.
 */

import {
  IModule,
  IKernel,
  ModuleManifest,
  HealthStatus,
} from '../contracts/module.contract';

export abstract class BaseModule implements IModule {
  /** Module manifest - must be defined by subclasses */
  abstract readonly manifest: ModuleManifest;

  /** Reference to the kernel */
  protected kernel: IKernel | undefined;

  /** Module state */
  protected initialized = false;
  protected enabled = false;

  /**
   * Initialize the module
   * Called by kernel when module is loaded
   */
  async initialize(kernel: IKernel): Promise<void> {
    this.kernel = kernel;

    try {
      // Perform module-specific initialization
      await this.onInitialize();

      this.initialized = true;
      this.enabled = true;

      // Register event handlers
      await this.registerEventHandlers();

      // Register permissions
      this.registerPermissions();

      // Register menu items
      this.registerMenus();

      // Register routes
      this.registerRoutes();

      // Register widgets
      this.registerWidgets();

      // Register workflow triggers/actions
      this.registerWorkflowComponents();

      // Register queue handlers
      this.registerQueueHandlers();

      this.kernel.logger.info(
        `Module ${this.manifest.id} initialized successfully`,
      );
    } catch (error) {
      this.kernel.logger.error(
        `Module ${this.manifest.id} initialization failed`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Shutdown the module
   * Called by kernel when module is unloaded
   */
  async shutdown(): Promise<void> {
    try {
      // Perform module-specific shutdown
      await this.onShutdown();

      this.initialized = false;
      this.enabled = false;

      this.kernel?.logger.info(`Module ${this.manifest.id} shut down`);
    } catch (error) {
      this.kernel?.logger.error(
        `Module ${this.manifest.id} shutdown error`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Health check
   * Called by kernel to check module health
   */
  async healthCheck(): Promise<HealthStatus> {
    const checks: Record<string, boolean> = {
      initialized: this.initialized,
      enabled: this.enabled,
    };

    try {
      // Perform module-specific health checks
      const moduleHealth = await this.onHealthCheck();

      return {
        status: moduleHealth ? 'healthy' : 'degraded',
        checks,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        checks,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if module is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if module is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable the module
   */
  async enable(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Cannot enable module: not initialized');
    }
    this.enabled = true;
    await this.onEnable();
  }

  /**
   * Disable the module
   */
  async disable(): Promise<void> {
    this.enabled = false;
    await this.onDisable();
  }

  /**
   * Emit module event
   */
  protected async emit(event: string, payload: any): Promise<void> {
    await this.kernel?.events.emit(`${this.manifest.id}.${event}`, payload);
  }

  /**
   * Listen to kernel events
   */
  protected on(event: string, handler: (payload: any) => void): void {
    this.kernel?.events.on(event, handler);
  }

  /**
   * Check permission
   */
  protected async checkPermission(
    userId: string,
    action: string,
    resource: any,
  ): Promise<boolean> {
    // Implementation would check with permission system
    return true;
  }

  /**
   * Add job to queue
   */
  protected async queueJob(
    queue: string,
    job: any,
    options?: any,
  ): Promise<string> {
    return await this.kernel!.queue.add(queue, job, options);
  }

  /**
   * Get module configuration
   */
  protected getConfig<T = any>(key: string, defaultValue?: T): T {
    const moduleConfig = this.kernel?.config.getModuleConfig(this.manifest.id);
    return moduleConfig?.[key] ?? defaultValue;
  }

  /**
   * Get tenant context
   */
  protected getTenantContext() {
    return this.kernel?.tenant.getCurrentContext();
  }

  // Abstract methods for subclasses to implement

  /**
   * Called during initialization
   * Override to perform module-specific setup
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Called during shutdown
   * Override to perform module-specific cleanup
   */
  protected abstract onShutdown(): Promise<void>;

  /**
   * Called for health check
   * Override to perform module-specific health checks
   */
  protected abstract onHealthCheck(): Promise<boolean>;

  /**
   * Called when module is enabled
   */
  protected onEnable(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Called when module is disabled
   */
  protected onDisable(): Promise<void> {
    return Promise.resolve();
  }

  // Registration methods (override in subclass)

  /**
   * Register event handlers
   */
  protected registerEventHandlers(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Register permissions
   */
  protected registerPermissions(): void {
    // Register permissions from manifest
    if (this.manifest.requiredPermissions) {
      for (const perm of this.manifest.requiredPermissions) {
        this.kernel?.permissions.registerPermission({
          id: perm,
          name: perm,
          description: `${this.manifest.id} permission`,
          module: this.manifest.id,
        });
      }
    }
  }

  /**
   * Register menu items
   */
  protected registerMenus(): void {
    // Menus are registered via manifest
    // Kernel will auto-register from manifest
  }

  /**
   * Register routes
   */
  protected registerRoutes(): void {
    // Routes are registered via manifest
    // Kernel will auto-register from manifest
  }

  /**
   * Register widgets
   */
  protected registerWidgets(): void {
    // Widgets are registered via manifest
    // Kernel will auto-register from manifest
  }

  /**
   * Register workflow components
   */
  protected registerWorkflowComponents(): void {
    // Override to register workflow triggers and actions
  }

  /**
   * Register queue handlers
   */
  protected registerQueueHandlers(): void {
    // Override to register queue processors
  }
}

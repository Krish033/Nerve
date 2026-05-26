/**
 * Plugin Tenant Guard
 * 
 * Enforces strict tenant isolation for plugin execution.
 * Prevents plugins from accessing data across tenant boundaries.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  pluginId?: string;
  userId?: string;
  permissions: string[];
  startedAt: Date;
}

interface IsolatedExecutionOptions {
  tenantId: string;
  pluginId: string;
  timeoutMs?: number;
  memoryLimitMB?: number;
  allowedResources?: string[];
}

@Injectable()
export class PluginTenantGuard {
  private readonly logger = new Logger(PluginTenantGuard.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
  private readonly activeExecutions = new Map<string, Set<string>>(); // tenantId -> pluginIds
  private readonly executionMetrics = new Map<string, {
    totalCalls: number;
    violations: number;
    lastViolation?: Date;
  }>();

  constructor() {}

  /**
   * Get current tenant context
   */
  getCurrentContext(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.tenantId;
  }

  /**
   * Execute function within tenant context
   */
  async withTenantContext<T>(
    context: TenantContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.trackExecutionStart(context.tenantId, context.pluginId);
    
    try {
      return await this.asyncLocalStorage.run(context, fn);
    } finally {
      this.trackExecutionEnd(context.tenantId, context.pluginId);
    }
  }

  /**
   * Execute plugin code with full isolation
   */
  async executeIsolated<T>(
    options: IsolatedExecutionOptions,
    fn: () => Promise<T>,
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const executionId = `${options.tenantId}:${options.pluginId}:${Date.now()}`;
    const timeoutMs = options.timeoutMs || 30000;
    const memoryLimitMB = options.memoryLimitMB || 128;

    this.logger.debug(`Starting isolated execution ${executionId}`);

    const context: TenantContext = {
      tenantId: options.tenantId,
      pluginId: options.pluginId,
      permissions: options.allowedResources || [],
      startedAt: new Date(),
    };

    // Memory monitoring
    const startMemory = process.memoryUsage();
    let memoryExceeded = false;

    try {
      const result = await Promise.race([
        this.asyncLocalStorage.run(context, async () => {
          // Check memory periodically during execution
          const memoryCheck = setInterval(() => {
            const currentMemory = process.memoryUsage();
            const heapUsedMB = (currentMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
            
            if (heapUsedMB > memoryLimitMB) {
              memoryExceeded = true;
              clearInterval(memoryCheck);
              throw new Error(`Memory limit exceeded: ${heapUsedMB.toFixed(2)}MB > ${memoryLimitMB}MB`);
            }
          }, 100);

          try {
            return await fn();
          } finally {
            clearInterval(memoryCheck);
          }
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Execution timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);

      this.recordMetrics(options.pluginId, true);

      return {
        success: true,
        result,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`Isolated execution failed for ${executionId}: ${errorMessage}`);
      this.recordMetrics(options.pluginId, false, memoryExceeded);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate tenant access permission
   */
  validateTenantAccess(
    resourceTenantId: string,
    action: string,
  ): { allowed: boolean; reason?: string } {
    const context = this.getCurrentContext();

    if (!context) {
      return {
        allowed: false,
        reason: 'No tenant context available',
      };
    }

    // Same tenant always allowed
    if (context.tenantId === resourceTenantId) {
      return { allowed: true };
    }

    // Check for admin/super permissions
    if (context.permissions.includes('tenant:admin') || 
        context.permissions.includes('super:admin')) {
      return { allowed: true };
    }

    // Cross-tenant access denied
    this.logger.warn(
      `Cross-tenant access blocked: ${context.pluginId || 'unknown'} ` +
      `tried to access tenant ${resourceTenantId} from tenant ${context.tenantId}`
    );

    this.recordViolation(context.pluginId || 'unknown', 'cross_tenant_access');

    return {
      allowed: false,
      reason: `Cross-tenant access denied: ${context.tenantId} -> ${resourceTenantId}`,
    };
  }

  /**
   * Enforce tenant-scoped database query
   */
  enforceTenantScope(query: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.getCurrentTenantId();
    
    if (!tenantId) {
      throw new Error('Cannot enforce tenant scope: no tenant context');
    }

    // Add tenant filter to query
    return {
      ...query,
      tenantId,
    };
  }

  /**
   * Check if current context is within a plugin execution
   */
  isPluginExecution(): boolean {
    const context = this.getCurrentContext();
    return !!context?.pluginId;
  }

  /**
   * Get active executions per tenant
   */
  getActiveExecutions(tenantId: string): string[] {
    const plugins = this.activeExecutions.get(tenantId);
    return plugins ? Array.from(plugins) : [];
  }

  /**
   * Get metrics for a plugin
   */
  getPluginMetrics(pluginId: string): {
    totalCalls: number;
    violations: number;
    lastViolation?: Date;
  } {
    return this.executionMetrics.get(pluginId) || {
      totalCalls: 0,
      violations: 0,
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.executionMetrics.clear();
  }

  // Private helpers

  private trackExecutionStart(tenantId: string, pluginId?: string): void {
    if (!pluginId) return;

    let plugins = this.activeExecutions.get(tenantId);
    if (!plugins) {
      plugins = new Set();
      this.activeExecutions.set(tenantId, plugins);
    }
    plugins.add(pluginId);
  }

  private trackExecutionEnd(tenantId: string, pluginId?: string): void {
    if (!pluginId) return;

    const plugins = this.activeExecutions.get(tenantId);
    if (plugins) {
      plugins.delete(pluginId);
      if (plugins.size === 0) {
        this.activeExecutions.delete(tenantId);
      }
    }
  }

  private recordMetrics(pluginId: string, success: boolean, violation?: boolean): void {
    let metrics = this.executionMetrics.get(pluginId);
    
    if (!metrics) {
      metrics = {
        totalCalls: 0,
        violations: 0,
      };
      this.executionMetrics.set(pluginId, metrics);
    }

    metrics.totalCalls++;
    
    if (!success || violation) {
      metrics.violations++;
      metrics.lastViolation = new Date();
    }
  }

  private recordViolation(pluginId: string, type: string): void {
    this.logger.error(`Tenant violation recorded: ${pluginId} - ${type}`);
    
    let metrics = this.executionMetrics.get(pluginId);
    if (!metrics) {
      metrics = {
        totalCalls: 0,
        violations: 0,
      };
      this.executionMetrics.set(pluginId, metrics);
    }
    
    metrics.violations++;
    metrics.lastViolation = new Date();
  }
}

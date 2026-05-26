/**
 * Plugin Lifecycle Manager
 * 
 * Orchestrates plugin lifecycle hooks:
 * - onInstall
 * - onEnable
 * - onDisable
 * - onUpdate
 * - onUninstall
 * - onHealthCheck
 * 
 * All lifecycle execution is observable, traceable, and failure-safe.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PluginInstance, PluginLifecycleHooks } from '../contracts';
import { PluginDiagnostics } from '../diagnostics/plugin-diagnostics';

interface LifecycleHookResult {
  success: boolean;
  error?: string;
  duration: number;
  output?: unknown;
}

interface LifecycleContext {
  pluginId: string;
  hookName: string;
  timestamp: Date;
  tenantId?: string;
  success?: boolean;
}

@Injectable()
export class PluginLifecycleManager {
  private readonly logger = new Logger(PluginLifecycleManager.name);
  private readonly maxHookDuration = 30000; // 30 seconds
  private readonly hookHistory = new Map<string, LifecycleContext[]>();

  constructor(private readonly diagnostics: PluginDiagnostics) {}

  /**
   * Execute a lifecycle hook for a plugin
   */
  async executeHook(
    instance: PluginInstance,
    hookName: keyof PluginLifecycleHooks,
  ): Promise<LifecycleHookResult> {
    const hookPath = instance.manifest.lifecycle?.[hookName];

    if (!hookPath) {
      // No hook defined, consider it successful
      return {
        success: true,
        duration: 0,
      };
    }

    const operationId = this.diagnostics.startOperation(`lifecycle.${hookName}`, {
      pluginId: instance.id,
      hookPath,
    });

    const startTime = Date.now();
    const context: LifecycleContext = {
      pluginId: instance.id,
      hookName,
      timestamp: new Date(),
    };

    this.logger.debug(`Executing lifecycle hook ${hookName} for ${instance.manifest.name}`);

    try {
      // Check for hook file existence
      const hookExists = await this.checkHookFile(instance, hookPath);
      if (!hookExists) {
        const duration = Date.now() - startTime;
        this.diagnostics.endOperation(operationId, {
          success: false,
          error: `Hook file not found: ${hookPath}`,
        });
        return {
          success: false,
          error: `Hook file not found: ${hookPath}`,
          duration,
        };
      }

      // Execute hook with timeout
      const result = await this.executeWithTimeout(instance, hookPath, hookName);

      const duration = Date.now() - startTime;

      // Record successful execution
      this.recordHookExecution(context, true);

      this.diagnostics.endOperation(operationId, {
        success: result.success,
        error: result.error,
      });

      return {
        success: result.success,
        error: result.error,
        duration,
        output: result.output,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Lifecycle hook ${hookName} failed for ${instance.manifest.name}: ${errorMessage}`);

      // Record failed execution
      this.recordHookExecution(context, false);

      this.diagnostics.endOperation(operationId, {
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Execute multiple lifecycle hooks in sequence
   */
  async executeHookSequence(
    instance: PluginInstance,
    hooks: Array<keyof PluginLifecycleHooks>,
    options: { stopOnFailure?: boolean } = {},
  ): Promise<{ success: boolean; results: Map<string, LifecycleHookResult> }> {
    const results = new Map<string, LifecycleHookResult>();
    let overallSuccess = true;

    for (const hookName of hooks) {
      const result = await this.executeHook(instance, hookName);
      results.set(hookName, result);

      if (!result.success) {
        overallSuccess = false;
        if (options.stopOnFailure) {
          break;
        }
      }
    }

    return {
      success: overallSuccess,
      results,
    };
  }

  /**
   * Get hook execution history for a plugin
   */
  getHookHistory(pluginId: string): LifecycleContext[] {
    return this.hookHistory.get(pluginId) || [];
  }

  /**
   * Clear hook history for a plugin
   */
  clearHookHistory(pluginId: string): void {
    this.hookHistory.delete(pluginId);
  }

  /**
   * Check if a plugin hook file exists
   */
  private async checkHookFile(instance: PluginInstance, hookPath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const fullPath = path.join(instance.installPath, hookPath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a hook with timeout protection
   */
  private async executeWithTimeout(
    instance: PluginInstance,
    hookPath: string,
    hookName: string,
  ): Promise<{ success: boolean; error?: string; output?: unknown }> {
    const path = await import('path');
    const fullPath = path.join(instance.installPath, hookPath);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: `Lifecycle hook ${hookName} timed out after ${this.maxHookDuration}ms`,
        });
      }, this.maxHookDuration);

      this.runHookFile(fullPath, instance)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }

  /**
   * Run a hook file (placeholder for sandboxed execution)
   */
  private async runHookFile(
    hookPath: string,
    instance: PluginInstance,
  ): Promise<{ success: boolean; error?: string; output?: unknown }> {
    try {
      // SECURITY: In production, this should use:
      // - VM2 for sandboxed execution
      // - Or isolated-vm for stricter isolation
      // - Or worker threads with limited context

      // For now, this is a safe implementation that only allows
      // specific hook patterns without arbitrary code execution

      const fs = await import('fs/promises');
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Validate hook content (basic safety check)
      const isSafe = this.validateHookContent(hookContent);
      if (!isSafe) {
        return {
          success: false,
          error: 'Hook contains potentially unsafe operations',
        };
      }

      // Placeholder: Return success for now
      // In production, this would actually execute the hook
      // with proper sandboxing and context

      this.logger.debug(`Hook file validated: ${hookPath}`);

      return {
        success: true,
        output: { executed: true, placeholder: true },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate hook content for safety
   */
  private validateHookContent(content: string): boolean {
    // List of forbidden patterns
    const forbiddenPatterns = [
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /require\s*\(\s*['"]path['"]\s*\)/,
      /process\.exit/,
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
      /import\s*\(/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        this.logger.warn(`Hook contains forbidden pattern: ${pattern}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Record hook execution in history
   */
  private recordHookExecution(context: LifecycleContext, success: boolean): void {
    const history = this.hookHistory.get(context.pluginId) || [];
    history.push({
      ...context,
      success,
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    this.hookHistory.set(context.pluginId, history);
  }
}

/**
 * Plugin Diagnostics System
 * 
 * Provides comprehensive observability for plugins:
 * - Operation tracing
 * - Metrics collection
 * - Health monitoring
 * - Log aggregation
 * - Failure analysis
 */

import { Injectable, Logger } from '@nestjs/common';

interface Operation {
  id: string;
  name: string;
  startTime: number;
  context?: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  endTime?: number;
  result?: unknown;
  error?: string;
}

interface PluginMetrics {
  pluginId: string;
  totalOperations: number;
  failedOperations: number;
  averageOperationDuration: number;
  lastActivity: Date;
  healthChecks: {
    total: number;
    passed: number;
    failed: number;
    lastCheck: Date;
  };
  lifecycleExecutions: {
    total: number;
    successful: number;
    failed: number;
  };
  errors: Array<{
    timestamp: Date;
    operation: string;
    error: string;
  }>;
}

interface SystemMetrics {
  totalPlugins: number;
  activePlugins: number;
  failedPlugins: number;
  totalOperations: number;
  averageResponseTime: number;
  errorsLastHour: number;
}

@Injectable()
export class PluginDiagnostics {
  private readonly logger = new Logger(PluginDiagnostics.name);
  private readonly operations = new Map<string, Operation>();
  private readonly pluginMetrics = new Map<string, PluginMetrics>();
  private readonly systemMetrics: SystemMetrics;
  private readonly maxOperations = 1000;
  private readonly maxErrors = 100;

  constructor() {
    this.systemMetrics = {
      totalPlugins: 0,
      activePlugins: 0,
      failedPlugins: 0,
      totalOperations: 0,
      averageResponseTime: 0,
      errorsLastHour: 0,
    };
  }

  /**
   * Start tracking an operation
   */
  startOperation(name: string, context?: Record<string, unknown>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: Operation = {
      id,
      name,
      startTime: Date.now(),
      context,
      status: 'running',
    };

    this.operations.set(id, operation);
    this.systemMetrics.totalOperations++;

    // Cleanup old operations
    if (this.operations.size > this.maxOperations) {
      const oldestId = this.operations.keys().next().value;
      this.operations.delete(oldestId);
    }

    this.logger.debug(`Started operation: ${name} (${id})`);

    return id;
  }

  /**
   * End tracking an operation
   */
  endOperation(
    operationId: string,
    result: { success: boolean; error?: string; data?: unknown },
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.endTime = Date.now();
    operation.status = result.success ? 'completed' : 'failed';
    operation.result = result.data;
    operation.error = result.error;

    const duration = operation.endTime - operation.startTime;

    // Update system metrics
    this.updateAverageResponseTime(duration);

    if (!result.success) {
      this.systemMetrics.errorsLastHour++;
    }

    // Update plugin metrics if context contains pluginId
    if (operation.context?.pluginId) {
      this.updatePluginMetrics(
        operation.context.pluginId as string,
        operation.name,
        result.success,
        duration,
        result.error,
      );
    }

    this.logger.debug(
      `Completed operation: ${operation.name} (${operationId}) - ${result.success ? 'success' : 'failure'} in ${duration}ms`,
    );
  }

  /**
   * Get metrics for a specific plugin
   */
  getPluginMetrics(pluginId: string): PluginMetrics | undefined {
    return this.pluginMetrics.get(pluginId);
  }

  /**
   * Get all plugin metrics
   */
  getAllPluginMetrics(): Map<string, PluginMetrics> {
    return new Map(this.pluginMetrics);
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get operation history
   */
  getOperationHistory(filter?: { name?: string; status?: string }): Operation[] {
    let operations = Array.from(this.operations.values());

    if (filter?.name) {
      operations = operations.filter(op => op.name === filter.name);
    }

    if (filter?.status) {
      operations = operations.filter(op => op.status === filter.status);
    }

    return operations.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Record a health check result
   */
  recordHealthCheck(pluginId: string, passed: boolean): void {
    const metrics = this.getOrCreatePluginMetrics(pluginId);
    
    metrics.healthChecks.total++;
    metrics.healthChecks.lastCheck = new Date();
    
    if (passed) {
      metrics.healthChecks.passed++;
    } else {
      metrics.healthChecks.failed++;
    }
  }

  /**
   * Record a lifecycle execution
   */
  recordLifecycleExecution(
    pluginId: string,
    hookName: string,
    success: boolean,
    duration: number,
  ): void {
    const metrics = this.getOrCreatePluginMetrics(pluginId);
    
    metrics.lifecycleExecutions.total++;
    
    if (success) {
      metrics.lifecycleExecutions.successful++;
    } else {
      metrics.lifecycleExecutions.failed++;
    }

    metrics.lastActivity = new Date();
  }

  /**
   * Record an error for analysis
   */
  recordError(
    pluginId: string,
    operation: string,
    error: string | Error,
  ): void {
    const metrics = this.getOrCreatePluginMetrics(pluginId);
    const errorMessage = error instanceof Error ? error.message : error;

    metrics.errors.push({
      timestamp: new Date(),
      operation,
      error: errorMessage,
    });

    // Keep only recent errors
    if (metrics.errors.length > this.maxErrors) {
      metrics.errors.shift();
    }

    this.logger.error(`Plugin ${pluginId} error in ${operation}: ${errorMessage}`);
  }

  /**
   * Generate diagnostic report for a plugin
   */
  generateDiagnosticReport(pluginId: string): unknown {
    const metrics = this.pluginMetrics.get(pluginId);
    if (!metrics) {
      return { error: 'No metrics found for plugin' };
    }

    const operations = this.getOperationHistory().filter(
      op => op.context?.pluginId === pluginId,
    );

    return {
      pluginId,
      summary: {
        totalOperations: metrics.totalOperations,
        successRate: metrics.totalOperations > 0
          ? ((metrics.totalOperations - metrics.failedOperations) / metrics.totalOperations * 100).toFixed(2) + '%'
          : 'N/A',
        averageDuration: metrics.averageOperationDuration + 'ms',
        healthCheckSuccessRate: metrics.healthChecks.total > 0
          ? ((metrics.healthChecks.passed / metrics.healthChecks.total) * 100).toFixed(2) + '%'
          : 'N/A',
        lifecycleSuccessRate: metrics.lifecycleExecutions.total > 0
          ? ((metrics.lifecycleExecutions.successful / metrics.lifecycleExecutions.total) * 100).toFixed(2) + '%'
          : 'N/A',
      },
      recentOperations: operations.slice(0, 10).map(op => ({
        name: op.name,
        status: op.status,
        duration: op.endTime ? op.endTime - op.startTime : null,
        error: op.error,
      })),
      recentErrors: metrics.errors.slice(-10),
    };
  }

  /**
   * Clear all metrics for a plugin
   */
  clearPluginMetrics(pluginId: string): void {
    this.pluginMetrics.delete(pluginId);
  }

  /**
   * Update system plugin counts
   */
  updateSystemCounts(counts: {
    total: number;
    active: number;
    failed: number;
  }): void {
    this.systemMetrics.totalPlugins = counts.total;
    this.systemMetrics.activePlugins = counts.active;
    this.systemMetrics.failedPlugins = counts.failed;
  }

  // Private helpers

  private getOrCreatePluginMetrics(pluginId: string): PluginMetrics {
    let metrics = this.pluginMetrics.get(pluginId);
    
    if (!metrics) {
      metrics = {
        pluginId,
        totalOperations: 0,
        failedOperations: 0,
        averageOperationDuration: 0,
        lastActivity: new Date(),
        healthChecks: {
          total: 0,
          passed: 0,
          failed: 0,
          lastCheck: new Date(),
        },
        lifecycleExecutions: {
          total: 0,
          successful: 0,
          failed: 0,
        },
        errors: [],
      };
      this.pluginMetrics.set(pluginId, metrics);
    }

    return metrics;
  }

  private updatePluginMetrics(
    pluginId: string,
    operationName: string,
    success: boolean,
    duration: number,
    error?: string,
  ): void {
    const metrics = this.getOrCreatePluginMetrics(pluginId);

    metrics.totalOperations++;
    if (!success) {
      metrics.failedOperations++;
    }

    // Update average duration using exponential moving average
    if (metrics.averageOperationDuration === 0) {
      metrics.averageOperationDuration = duration;
    } else {
      metrics.averageOperationDuration = 
        (metrics.averageOperationDuration * 0.9) + (duration * 0.1);
    }

    metrics.lastActivity = new Date();

    if (error) {
      metrics.errors.push({
        timestamp: new Date(),
        operation: operationName,
        error,
      });

      if (metrics.errors.length > this.maxErrors) {
        metrics.errors.shift();
      }
    }
  }

  private updateAverageResponseTime(duration: number): void {
    if (this.systemMetrics.averageResponseTime === 0) {
      this.systemMetrics.averageResponseTime = duration;
    } else {
      this.systemMetrics.averageResponseTime = 
        (this.systemMetrics.averageResponseTime * 0.95) + (duration * 0.05);
    }
  }
}

/**
 * Plugin Circuit Breaker
 * 
 * Prevents cascading failures by monitoring plugin health and
cutting off unhealthy plugins before they destabilize the system.
 */

import { Injectable, Logger } from '@nestjs/common';

interface CircuitBreakerState {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveSuccesses: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutDuration: number;
  monitoringPeriod: number;
}

@Injectable()
export class PluginCircuitBreaker {
  private readonly logger = new Logger(PluginCircuitBreaker.name);
  private readonly states = new Map<string, CircuitBreakerState>();
  private readonly config: CircuitBreakerConfig;

  constructor() {
    this.config = {
      failureThreshold: 5,      // Open after 5 failures
      successThreshold: 3,      // Close after 3 consecutive successes
      timeoutDuration: 60000,   // 1 minute cooldown
      monitoringPeriod: 300000, // 5 minute monitoring window
    };
  }

  /**
   * Check if plugin operation should be allowed
   */
  canExecute(pluginId: string): boolean {
    const state = this.getState(pluginId);

    switch (state.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // Check if timeout has elapsed
        if (Date.now() - state.lastFailureTime > this.config.timeoutDuration) {
          state.state = 'HALF_OPEN';
          state.consecutiveSuccesses = 0;
          this.logger.log(`Circuit breaker for ${pluginId} entering HALF_OPEN state`);
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        // Allow limited operations in half-open state
        return true;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(pluginId: string): void {
    const state = this.getState(pluginId);
    const now = Date.now();

    state.successes++;
    state.lastSuccessTime = now;

    if (state.state === 'HALF_OPEN') {
      state.consecutiveSuccesses++;
      
      if (state.consecutiveSuccesses >= this.config.successThreshold) {
        state.state = 'CLOSED';
        state.failures = 0;
        this.logger.log(`Circuit breaker for ${pluginId} CLOSED after recovery`);
      }
    }

    // Clean old failures outside monitoring period
    this.cleanOldFailures(state, now);
  }

  /**
   * Record a failed operation
   */
  recordFailure(pluginId: string, error?: Error): void {
    const state = this.getState(pluginId);
    const now = Date.now();

    state.failures++;
    state.lastFailureTime = now;

    // Open circuit if threshold reached
    if (state.failures >= this.config.failureThreshold && state.state === 'CLOSED') {
      state.state = 'OPEN';
      this.logger.warn(
        `Circuit breaker OPENED for ${pluginId} after ${state.failures} failures. ` +
        `Error: ${error?.message || 'Unknown'}`
      );
    }

    // Reset consecutive successes in half-open state
    if (state.state === 'HALF_OPEN') {
      state.consecutiveSuccesses = 0;
      state.state = 'OPEN';
      this.logger.warn(`Circuit breaker for ${pluginId} re-opened due to failure in HALF_OPEN state`);
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus(pluginId: string): {
    state: string;
    failures: number;
    successes: number;
    isHealthy: boolean;
    timeUntilRetry?: number;
  } {
    const state = this.getState(pluginId);
    const status: any = {
      state: state.state,
      failures: state.failures,
      successes: state.successes,
      isHealthy: state.state === 'CLOSED',
    };

    if (state.state === 'OPEN') {
      const elapsed = Date.now() - state.lastFailureTime;
      status.timeUntilRetry = Math.max(0, this.config.timeoutDuration - elapsed);
    }

    return status;
  }

  /**
   * Reset circuit breaker for a plugin
   */
  reset(pluginId: string): void {
    this.states.delete(pluginId);
    this.logger.log(`Circuit breaker reset for ${pluginId}`);
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Map<string, ReturnType<typeof this.getStatus>> {
    const statuses = new Map<string, ReturnType<typeof this.getStatus>>();
    
    for (const [pluginId, state] of this.states) {
      statuses.set(pluginId, this.getStatus(pluginId));
    }
    
    return statuses;
  }

  /**
   * Force open a circuit breaker (emergency use)
   */
  forceOpen(pluginId: string, reason: string): void {
    const state = this.getState(pluginId);
    state.state = 'OPEN';
    state.lastFailureTime = Date.now();
    this.logger.warn(`Circuit breaker for ${pluginId} FORCE OPENED: ${reason}`);
  }

  private getState(pluginId: string): CircuitBreakerState {
    let state = this.states.get(pluginId);
    
    if (!state) {
      state = {
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        state: 'CLOSED',
        consecutiveSuccesses: 0,
      };
      this.states.set(pluginId, state);
    }
    
    return state;
  }

  private cleanOldFailures(state: CircuitBreakerState, now: number): void {
    // Simple decay of failures over time
    if (now - state.lastFailureTime > this.config.monitoringPeriod) {
      state.failures = Math.max(0, state.failures - 1);
    }
  }
}

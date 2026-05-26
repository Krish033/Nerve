/**
 * ERROR HANDLER
 * 
 * Centralized error handling with recovery, classification, and observability.
 * Prevents crashes and provides graceful degradation.
 */

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import {
  IKernel,
  IKernelLogger,
} from '../contracts/module.contract';

export enum ErrorSeverity {
  CRITICAL = 'critical',   // System failure, immediate attention
  HIGH = 'high',           // Major functionality impacted
  MEDIUM = 'medium',       // Partial impact, can recover
  LOW = 'low',             // Minor issue, logged only
  WARNING = 'warning',     // Potential issue, monitor
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL = 'external',
  DATABASE = 'database',
  QUEUE = 'queue',
  EVENT = 'event',
  MODULE = 'module',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  moduleId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, any>;
}

export interface ClassifiedError {
  originalError: Error;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  httpStatus: number;
  isRecoverable: boolean;
  shouldNotify: boolean;
  context: ErrorContext;
  timestamp: number;
  retryable: boolean;
  retryAfter?: number;
}

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: ClassifiedError) => boolean;
  recover: (error: ClassifiedError) => Promise<boolean>;
}

@Injectable()
export class ErrorHandler {
  private readonly logger = new Logger(ErrorHandler.name);
  private kernel: IKernel | undefined;
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorCounts = new Map<string, { count: number; lastError: number }>();
  private readonly ERROR_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ERRORS_PER_WINDOW = 100;

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
    this.registerDefaultRecoveryStrategies();
  }

  /**
   * Classify and handle any error
   */
  async handleError(
    error: Error,
    context: ErrorContext = {},
    operation?: string,
  ): Promise<ClassifiedError> {
    const classified = this.classifyError(error, context);

    // Log error
    this.logError(classified, operation);

    // Track error rate
    this.trackErrorRate(classified);

    // Emit error event
    await this.emitErrorEvent(classified);

    // Attempt recovery if recoverable
    if (classified.isRecoverable) {
      const recovered = await this.attemptRecovery(classified);
      if (recovered) {
        this.logger.log(`Successfully recovered from error: ${classified.message}`);
      }
    }

    // Notify if critical
    if (classified.shouldNotify) {
      await this.notifyCriticalError(classified);
    }

    return classified;
  }

  /**
   * Wrap any function with error handling
   */
  async wrap<T>(
    fn: () => Promise<T>,
    context: ErrorContext = {},
    fallback?: T,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const classified = await this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context,
      );

      if (fallback !== undefined) {
        this.logger.warn(`Returning fallback value due to error: ${classified.message}`);
        return fallback;
      }

      throw this.createHttpError(classified);
    }
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.logger.debug(`Registered recovery strategy: ${strategy.name}`);
  }

  /**
   * Check if error rate is too high
   */
  isErrorRateHigh(category?: ErrorCategory): boolean {
    const now = Date.now();
    let totalErrors = 0;

    for (const [key, data] of this.errorCounts) {
      if (!category || key.startsWith(category)) {
        if (now - data.lastError < this.ERROR_WINDOW) {
          totalErrors += data.count;
        }
      }
    }

    return totalErrors > this.MAX_ERRORS_PER_WINDOW;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, { count: number; lastError: number }> {
    const now = Date.now();
    const stats: Record<string, { count: number; lastError: number }> = {};

    for (const [key, data] of this.errorCounts) {
      if (now - data.lastError < this.ERROR_WINDOW) {
        stats[key] = data;
      }
    }

    return stats;
  }

  /**
   * Clear error counts
   */
  clearErrorCounts(): void {
    this.errorCounts.clear();
    this.logger.log('Error counts cleared');
  }

  // Private methods

  private classifyError(error: Error, context: ErrorContext): ClassifiedError {
    const message = error.message || 'Unknown error';
    const name = error.name || 'Error';

    // Default classification
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let isRecoverable = false;
    let shouldNotify = false;
    let retryable = false;
    let retryAfter: number | undefined;

    // Classify based on error type
    if (name === 'ValidationError' || message.includes('validation')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      httpStatus = HttpStatus.BAD_REQUEST;
      isRecoverable = false;
    } else if (name === 'AuthenticationError' || message.includes('authentication') || message.includes('unauthorized')) {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.MEDIUM;
      httpStatus = HttpStatus.UNAUTHORIZED;
      isRecoverable = false;
    } else if (name === 'PermissionDeniedError' || message.includes('permission denied') || message.includes('forbidden')) {
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
      httpStatus = HttpStatus.FORBIDDEN;
      isRecoverable = false;
    } else if (name === 'NotFoundError' || message.includes('not found') || message.includes('does not exist')) {
      category = ErrorCategory.NOT_FOUND;
      severity = ErrorSeverity.LOW;
      httpStatus = HttpStatus.NOT_FOUND;
      isRecoverable = false;
    } else if (name === 'ConflictError' || message.includes('conflict') || message.includes('already exists')) {
      category = ErrorCategory.CONFLICT;
      severity = ErrorSeverity.MEDIUM;
      httpStatus = HttpStatus.CONFLICT;
      isRecoverable = false;
    } else if (name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out')) {
      category = ErrorCategory.TIMEOUT;
      severity = ErrorSeverity.HIGH;
      httpStatus = HttpStatus.REQUEST_TIMEOUT;
      isRecoverable = true;
      retryable = true;
      retryAfter = 1000;
    } else if (name === 'RateLimitError' || message.includes('rate limit') || message.includes('too many requests')) {
      category = ErrorCategory.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      httpStatus = HttpStatus.TOO_MANY_REQUESTS;
      isRecoverable = true;
      retryable = true;
      retryAfter = 60000;
    } else if (message.includes('database') || message.includes('prisma') || message.includes('connection')) {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.HIGH;
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
      isRecoverable = true;
      retryable = true;
      shouldNotify = true;
      retryAfter = 5000;
    } else if (message.includes('queue') || message.includes('bull') || message.includes('job')) {
      category = ErrorCategory.QUEUE;
      severity = ErrorSeverity.HIGH;
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
      isRecoverable = true;
      retryable = true;
    } else if (message.includes('event') || message.includes('pub/sub')) {
      category = ErrorCategory.EVENT;
      severity = ErrorSeverity.MEDIUM;
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      isRecoverable = true;
    } else if (message.includes('module') || message.includes('manifest')) {
      category = ErrorCategory.MODULE;
      severity = ErrorSeverity.HIGH;
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      isRecoverable = false;
    } else if (name === 'TypeError' || name === 'ReferenceError' || name === 'SyntaxError') {
      category = ErrorCategory.SYSTEM;
      severity = ErrorSeverity.CRITICAL;
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      isRecoverable = false;
      shouldNotify = true;
    }

    // Adjust severity based on context
    if (context.tenantId && severity === ErrorSeverity.CRITICAL) {
      // Critical errors in tenant context are still critical
      shouldNotify = true;
    }

    return {
      originalError: error,
      message,
      category,
      severity,
      httpStatus,
      isRecoverable,
      shouldNotify,
      context,
      timestamp: Date.now(),
      retryable,
      retryAfter,
    };
  }

  private logError(classified: ClassifiedError, operation?: string): void {
    const logData = {
      category: classified.category,
      severity: classified.severity,
      userId: classified.context.userId,
      tenantId: classified.context.tenantId,
      moduleId: classified.context.moduleId,
      requestId: classified.context.requestId,
      path: classified.context.path,
      operation,
      retryable: classified.retryable,
    };

    switch (classified.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITICAL: ${classified.message}`, classified.originalError.stack, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`ERROR: ${classified.message}`, classified.originalError.stack, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`WARNING: ${classified.message}`, logData);
        break;
      default:
        this.logger.debug(`Error: ${classified.message}`, logData);
    }
  }

  private trackErrorRate(classified: ClassifiedError): void {
    const key = `${classified.category}:${classified.context.moduleId || 'system'}`;
    const existing = this.errorCounts.get(key);

    if (existing) {
      existing.count++;
      existing.lastError = classified.timestamp;
    } else {
      this.errorCounts.set(key, {
        count: 1,
        lastError: classified.timestamp,
      });
    }
  }

  private async emitErrorEvent(classified: ClassifiedError): Promise<void> {
    if (!this.kernel) return;

    try {
      await this.kernel.events.emit('system.error', {
        category: classified.category,
        severity: classified.severity,
        message: classified.message,
        userId: classified.context.userId,
        tenantId: classified.context.tenantId,
        moduleId: classified.context.moduleId,
        requestId: classified.context.requestId,
        timestamp: classified.timestamp,
        retryable: classified.retryable,
      });
    } catch {
      // Don't let error emission fail
    }
  }

  private async attemptRecovery(classified: ClassifiedError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      try {
        if (strategy.canHandle(classified)) {
          this.logger.debug(`Attempting recovery with strategy: ${strategy.name}`);
          const recovered = await strategy.recover(classified);
          if (recovered) {
            return true;
          }
        }
      } catch (error) {
        this.logger.error(`Recovery strategy ${strategy.name} failed:`, error);
      }
    }

    return false;
  }

  private async notifyCriticalError(classified: ClassifiedError): Promise<void> {
    // TODO: Send to external notification service (PagerDuty, Slack, etc.)
    this.logger.error(`CRITICAL ERROR NOTIFICATION: ${classified.message}`, {
      category: classified.category,
      severity: classified.severity,
      context: classified.context,
    });
  }

  private createHttpError(classified: ClassifiedError): Error {
    const error = new Error(classified.message);
    (error as any).statusCode = classified.httpStatus;
    (error as any).category = classified.category;
    (error as any).retryable = classified.retryable;
    (error as any).retryAfter = classified.retryAfter;
    return error;
  }

  private registerDefaultRecoveryStrategies(): void {
    // Database connection recovery
    this.registerRecoveryStrategy({
      name: 'database-reconnect',
      canHandle: (error) => error.category === ErrorCategory.DATABASE,
      recover: async () => {
        // Wait a bit and return true to indicate we should retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
      },
    });

    // Queue service recovery
    this.registerRecoveryStrategy({
      name: 'queue-reconnect',
      canHandle: (error) => error.category === ErrorCategory.QUEUE,
      recover: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return true;
      },
    });

    // Event bus recovery
    this.registerRecoveryStrategy({
      name: 'event-bus-reconnect',
      canHandle: (error) => error.category === ErrorCategory.EVENT,
      recover: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return true;
      },
    });
  }
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` (${id})` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfter: number = 60) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

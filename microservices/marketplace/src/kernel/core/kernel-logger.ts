/**
 * KERNEL LOGGER
 * 
 * Structured logging with observability hooks.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IKernelLogger, IKernel } from '../contracts/module.contract';

@Injectable()
export class KernelLogger implements IKernelLogger {
  private readonly logger = new Logger('Kernel');
  private kernel: IKernel | undefined;

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  initialize(): void {
    this.logger.log('Kernel logger initialized');
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  info(message: string, context?: Record<string, any>): void {
    this.logger.log(this.formatMessage(message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    this.logger.error(this.formatMessage(message, errorContext));
  }

  audit(
    action: string,
    userId: string,
    resource: string,
    details?: Record<string, any>,
  ): void {
    const auditLog = {
      action,
      userId,
      resource,
      details,
      timestamp: new Date().toISOString(),
    };

    // Log to audit trail
    this.logger.log(`[AUDIT] ${action}: ${userId} -> ${resource}`, auditLog);

    // Emit audit event
    this.kernel?.events.emit('audit.log', auditLog);
  }

  private formatMessage(
    message: string,
    context?: Record<string, any>,
  ): string {
    if (!context || Object.keys(context).length === 0) {
      return message;
    }

    return `${message} ${JSON.stringify(context)}`;
  }
}

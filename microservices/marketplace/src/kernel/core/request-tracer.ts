/**
 * REQUEST TRACER
 * 
 * Distributed tracing and request correlation.
 * Enables end-to-end request tracking across services.
 */

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Map<string, string>;
}

export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{ timestamp: number; fields: Record<string, any> }>;
  error?: boolean;
  errorMessage?: string;
}

@Injectable()
export class RequestTracer implements NestMiddleware {
  private readonly logger = new Logger(RequestTracer.name);
  private activeSpans = new Map<string, Span>();
  private readonly MAX_SPANS = 10000;
  private readonly SPAN_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or create trace context
    const traceContext = this.extractOrCreateContext(req);

    // Attach to request
    (req as any).traceContext = traceContext;

    // Create root span for this request
    const rootSpan = this.startSpan('http.request', traceContext);
    rootSpan.tags['http.method'] = req.method;
    rootSpan.tags['http.path'] = req.path;
    rootSpan.tags['http.user_agent'] = req.get('user-agent');
    rootSpan.tags['http.remote_addr'] = req.ip;

    if (traceContext.parentSpanId) {
      rootSpan.parentId = traceContext.parentSpanId;
    }

    // Add trace IDs to response headers
    res.setHeader('X-Trace-Id', traceContext.traceId);
    res.setHeader('X-Span-Id', rootSpan.id);

    // Track response
    const self = this;
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
      // Record response info
      rootSpan.tags['http.status_code'] = res.statusCode;
      rootSpan.tags['http.content_length'] = res.get('content-length');

      if (res.statusCode >= 400) {
        rootSpan.error = true;
        rootSpan.errorMessage = `HTTP ${res.statusCode}`;
      }

      // Finish span
      self.finishSpan(rootSpan.id);

      // Log slow requests
      const duration = Date.now() - rootSpan.startTime;
      if (duration > 1000) {
        self.logger.warn(
          `Slow request detected: ${req.method} ${req.path} took ${duration}ms`,
          {
            traceId: traceContext.traceId,
            spanId: rootSpan.id,
            duration,
            statusCode: res.statusCode,
          },
        );
      }

      return originalEnd(...args);
    } as any;

    next();
  }

  /**
   * Start a new span
   */
  startSpan(name: string, context?: TraceContext, parentSpanId?: string): Span {
    const span: Span = {
      id: this.generateSpanId(),
      traceId: context?.traceId || this.generateTraceId(),
      parentId: parentSpanId,
      name,
      startTime: Date.now(),
      tags: {},
      logs: [],
    };

    // Add baggage as tags
    if (context?.baggage) {
      for (const [key, value] of context.baggage) {
        span.tags[`baggage.${key}`] = value;
      }
    }

    this.activeSpans.set(span.id, span);

    // Cleanup old spans
    this.cleanupOldSpans();

    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(spanId: string, error?: Error): Span | undefined {
    const span = this.activeSpans.get(spanId);
    if (!span) return undefined;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    if (error) {
      span.error = true;
      span.errorMessage = error.message;
      span.tags['error.type'] = error.name;
      span.tags['error.stack'] = error.stack;
    }

    // Log span for debugging
    if (span.duration > 500 || span.error) {
      this.logger.debug(
        `Span ${span.name} completed in ${span.duration}ms`,
        {
          traceId: span.traceId,
          spanId: span.id,
          duration: span.duration,
          error: span.error,
        },
      );
    }

    this.activeSpans.delete(spanId);

    return span;
  }

  /**
   * Add tag to span
   */
  setSpanTag(spanId: string, key: string, value: any): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add log to span
   */
  logSpanEvent(spanId: string, event: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        fields: { event, ...fields },
      });
    }
  }

  /**
   * Get current trace context from request
   */
  getContextFromRequest(req: any): TraceContext | undefined {
    return req?.traceContext;
  }

  /**
   * Propagate context to child request
   */
  propagateContext(context: TraceContext): Record<string, string> {
    return {
      'X-Trace-Id': context.traceId,
      'X-Span-Id': context.spanId,
      'X-Sampled': context.sampled ? '1' : '0',
      ...Object.fromEntries(context.baggage),
    };
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.activeSpans.get(spanId);
  }

  /**
   * Get all active spans for a trace
   */
  getSpansForTrace(traceId: string): Span[] {
    return Array.from(this.activeSpans.values()).filter(
      (span) => span.traceId === traceId,
    );
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): { activeTraces: number; activeSpans: number } {
    const traceIds = new Set<string>();
    for (const span of this.activeSpans.values()) {
      traceIds.add(span.traceId);
    }

    return {
      activeTraces: traceIds.size,
      activeSpans: this.activeSpans.size,
    };
  }

  // Private methods

  private extractOrCreateContext(req: Request): TraceContext {
    // Try to extract from headers
    const traceId = req.get('x-trace-id') || this.generateTraceId();
    const parentSpanId = req.get('x-span-id');
    const sampled = req.get('x-sampled') !== '0';

    // Extract baggage
    const baggage = new Map<string, string>();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.startsWith('x-baggage-') && typeof value === 'string') {
        baggage.set(key.replace('x-baggage-', ''), value);
      }
    }

    return {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId,
      sampled,
      baggage,
    };
  }

  private generateTraceId(): string {
    return uuidv4().replace(/-/g, '');
  }

  private generateSpanId(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16);
  }

  private cleanupOldSpans(): void {
    if (this.activeSpans.size < this.MAX_SPANS) return;

    const now = Date.now();
    let cleaned = 0;

    for (const [id, span] of this.activeSpans) {
      if (now - span.startTime > this.SPAN_TIMEOUT) {
        this.activeSpans.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.warn(`Cleaned up ${cleaned} stale spans`);
    }
  }
}

/**
 * Decorator to trace method execution
 */
export function Trace(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracer = (this as any).requestTracer as RequestTracer;

      if (!tracer) {
        return originalMethod.apply(this, args);
      }

      // Get context from request or create new
      const context = tracer.getContextFromRequest((this as any).req) || {
        traceId: uuidv4().replace(/-/g, ''),
        spanId: uuidv4().replace(/-/g, '').substring(0, 16),
        sampled: true,
        baggage: new Map(),
      };

      const span = tracer.startSpan(name, context);

      try {
        const result = await originalMethod.apply(this, args);

        // Record success
        span.tags['result'] = 'success';
        if (result && typeof result === 'object') {
          span.tags['result.type'] = result.constructor.name;
        }

        return result;
      } catch (error) {
        // Record error
        span.tags['result'] = 'error';
        tracer.finishSpan(span.id, error as Error);
        throw error;
      } finally {
        if (!span.endTime) {
          tracer.finishSpan(span.id);
        }
      }
    };

    return descriptor;
  };
}

/**
 * Middleware to add trace context to requests
 */
export function traceContextMiddleware(tracer: RequestTracer) {
  return (req: any, res: any, next: any) => {
    // Make tracer available on request
    req.requestTracer = tracer;

    // Helper to start child span
    req.startSpan = (name: string) => {
      const context = tracer.getContextFromRequest(req);
      return tracer.startSpan(name, context);
    };

    next();
  };
}

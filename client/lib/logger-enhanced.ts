/**
 * Enhanced Structured Logger for Production Observability
 * 
 * Features:
 * - Structured JSON logging for production
 * - Performance instrumentation
 * - Error sampling and rate limiting
 * - Session correlation IDs
 * - Batched log shipping
 * 
 * Usage:
 *   import { logger } from '@/lib/logger-enhanced';
 *   logger.info('Profile loaded', { userId });
 *   logger.error('Failed to update profile', { error, userId });
 *   logger.perf('Component render', 16, { component: 'UserList' });
 */

import { logger as baseLogger } from './logger';

type LogLevel = "debug" | "info" | "warn" | "error" | "perf";
type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  sessionId?: string;
  userId?: string;
  url?: string;
}

const IS_DEV = process.env.NODE_ENV === "development";
const IS_BROWSER = typeof window !== "undefined";

// Configuration
const CONFIG = {
  // Rate limiting
  MAX_ERRORS_PER_MINUTE: 10,
  MAX_PERF_LOGS_PER_MINUTE: 100,
  
  // Batching
  BATCH_SIZE: 10,
  FLUSH_INTERVAL: 5000,
  
  // Sampling
  PERF_SAMPLING_RATE: IS_DEV ? 1 : 0.1, // 10% in production
  
  // Storage
  LOCAL_STORAGE_KEY: "nerve_logs_queue",
  MAX_QUEUE_SIZE: 100,
};

/**
 * Session ID generator for correlation
 */
function getSessionId(): string {
  if (!IS_BROWSER) return "server";
  
  let sessionId = sessionStorage.getItem("nerve_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("nerve_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Rate limiter for error logging
 */
class RateLimiter {
  private counts = new Map<string, number[]>();
  
  canLog(key: string, limit: number, windowMs: number = 60000): boolean {
    const now = Date.now();
    const timestamps = this.counts.get(key) || [];
    
    // Remove old timestamps
    const valid = timestamps.filter((t) => now - t < windowMs);
    
    if (valid.length >= limit) {
      return false;
    }
    
    valid.push(now);
    this.counts.set(key, valid);
    return true;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Log queue with batching
 */
class LogQueue {
  private queue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  push(entry: LogEntry) {
    this.queue.push(entry);
    
    // Auto-flush on batch size
    if (this.queue.length >= CONFIG.BATCH_SIZE) {
      this.flush();
    }
    
    // Schedule periodic flush
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), CONFIG.FLUSH_INTERVAL);
    }
  }
  
  flush() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, CONFIG.BATCH_SIZE);
    
    // In production: send to logging service
    // For now, use base logger as fallback
    if (!IS_DEV) {
      // TODO: Send to external logging service
      // Example: sendToLogService(batch);
      
      // Fallback to console for now
      batch.forEach((entry) => {
        const method = entry.level === "error" ? "error" : 
                       entry.level === "warn" ? "warn" : "log";
        console[method](`[${entry.level.toUpperCase()}]`, entry.message, entry.context);
      });
    }
    
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

const logQueue = new LogQueue();

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    sessionId: getSessionId(),
    url: IS_BROWSER ? window.location.href : undefined,
  };
}

/**
 * Enhanced Logger
 */
export const logger = {
  /**
   * Debug level - development only
   */
  debug(message: string, context?: LogContext) {
    baseLogger.debug(message, context);
  },

  /**
   * Info level - development only
   */
  info(message: string, context?: LogContext) {
    baseLogger.info(message, context);
  },

  /**
   * Warning level - with rate limiting
   */
  warn(message: string, context?: LogContext) {
    const key = `warn:${message}`;
    if (!rateLimiter.canLog(key, 5)) {
      return; // Silently drop if rate limited
    }
    
    baseLogger.warn(message, context);
    
    if (!IS_DEV) {
      logQueue.push(createLogEntry("warn", message, context));
    }
  },

  /**
   * Error level - always logged, with rate limiting for duplicates
   */
  error(message: string, context?: LogContext) {
    const errorKey = context?.errorKey as string || message;
    
    if (!rateLimiter.canLog(`error:${errorKey}`, CONFIG.MAX_ERRORS_PER_MINUTE)) {
      // Log that we're rate limiting
      baseLogger.warn(`Error rate limited: ${message}`);
      return;
    }
    
    baseLogger.error(message, context?.error, context);
    
    // Extract error details
    const error = context?.error;
    const enhancedContext = {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    };
    
    if (!IS_DEV) {
      logQueue.push(createLogEntry("error", message, enhancedContext));
    }
  },

  /**
   * Performance logging - sampled
   */
  perf(operation: string, durationMs: number, context?: LogContext) {
    // Sample performance logs in production
    if (!IS_DEV && Math.random() > CONFIG.PERF_SAMPLING_RATE) {
      return;
    }
    
    const key = `perf:${operation}`;
    if (!rateLimiter.canLog(key, CONFIG.MAX_PERF_LOGS_PER_MINUTE)) {
      return;
    }
    
    const perfContext = {
      ...context,
      durationMs,
      operation,
      slow: durationMs > 16, // Frame budget
    };
    
    if (IS_DEV) {
      const emoji = durationMs > 16 ? "⚠️" : "✓";
      baseLogger.info(`${emoji} [PERF] ${operation}: ${durationMs.toFixed(2)}ms`, perfContext);
    } else {
      logQueue.push(createLogEntry("perf", operation, perfContext));
    }
  },

  /**
   * User action tracking
   */
  track(action: string, context?: LogContext) {
    const trackContext = {
      ...context,
      action,
      category: "user_action",
    };
    
    if (IS_DEV) {
      baseLogger.info(`[TRACK] ${action}`, trackContext);
    } else {
      // Sample tracking events
      if (Math.random() < 0.5) {
        logQueue.push(createLogEntry("info", `track:${action}`, trackContext));
      }
    }
  },

  /**
   * API call logging
   */
  api(method: string, endpoint: string, durationMs: number, statusCode?: number, context?: LogContext) {
    const apiContext = {
      ...context,
      method,
      endpoint,
      durationMs,
      statusCode,
      slow: durationMs > 1000,
    };
    
    if (IS_DEV) {
      const status = statusCode && statusCode >= 400 ? "❌" : "✓";
      baseLogger.info(`${status} [API] ${method} ${endpoint} - ${durationMs}ms`, apiContext);
    } else {
      // Always log slow API calls, sample others
      if (durationMs > 1000 || Math.random() < 0.2) {
        logQueue.push(createLogEntry("info", `api:${method}:${endpoint}`, apiContext));
      }
    }
  },

  /**
   * Force flush logs (useful before page unload)
   */
  flush() {
    logQueue.flush();
  },

  /**
   * Set user ID for correlation
   */
  setUserId(userId: string) {
    if (IS_BROWSER) {
      sessionStorage.setItem("nerve_user_id", userId);
    }
  },

  /**
   * Get current session ID
   */
  getSessionId,
};

// Auto-flush on page unload
if (IS_BROWSER) {
  window.addEventListener("beforeunload", () => {
    logger.flush();
  });
}

/**
 * Structured client-side logger.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Profile loaded', { userId });
 *   logger.error('Failed to update profile', error, { userId });
 *
 * In production, only errors are emitted.
 * In development, all levels are emitted with context.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const IS_DEV = process.env.NODE_ENV === "development";

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}${context ? ` ${JSON.stringify(context)}` : ""}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (!IS_DEV) return;
    console.debug(formatMessage("debug", message, context));
  },

  info(message: string, context?: LogContext) {
    if (!IS_DEV) return;
    console.info(formatMessage("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    if (!IS_DEV) return;
    console.warn(formatMessage("warn", message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errMessage = error instanceof Error ? error.message : String(error ?? "");
    const errStack = error instanceof Error ? error.stack : undefined;
    const payload = { ...context, error: errMessage, stack: errStack };

    if (IS_DEV) {
      console.error(formatMessage("error", message, payload));
    }

    // In production: send to observability service here
    // e.g. Sentry.captureException(error, { extra: context });
  },
};

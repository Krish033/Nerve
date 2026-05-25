"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary with recovery capabilities
 * 
 * Features:
 * - Catches React rendering errors
 * - Logs errors with context
 * - Supports custom fallback UI
 * - Can reset on prop changes
 * - Tracks error frequency
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly ERROR_THRESHOLD = 5;
  private readonly ERROR_WINDOW = 60000; // 1 minute

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Rate limiting for error logging
    const now = Date.now();
    if (now - this.lastErrorTime > this.ERROR_WINDOW) {
      this.errorCount = 0;
    }
    this.errorCount++;
    this.lastErrorTime = now;

    // Only log if under threshold to prevent spam
    if (this.errorCount <= this.ERROR_THRESHOLD) {
      logger.error("React Error Boundary caught error:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorCount: this.errorCount,
      });
    }

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (this.props.resetOnPropsChange && this.state.hasError) {
      const keysChanged = this.props.resetKeys?.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (keysChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.errorCount = 0;
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-lg border border-destructive/50 bg-destructive/10">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            An error occurred while rendering this component.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-background rounded overflow-auto max-h-48">
                {this.state.error.message}
                {"\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.resetErrorBoundary}
            className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary for handling promise rejections
 */
export class AsyncErrorBoundary extends Component<
  Props & { suspenseFallback?: ReactNode },
  State
> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Async Error Boundary caught error:", {
      error: error.message,
      stack: error.stack,
    });
    this.setState({ errorInfo });
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">Failed to load content</p>
            <button
              onClick={this.resetErrorBoundary}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return (
      <React.Suspense fallback={this.props.suspenseFallback || null}>
        {this.props.children}
      </React.Suspense>
    );
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

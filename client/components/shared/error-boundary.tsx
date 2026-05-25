"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  /** Optional fallback to render instead of the default error UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. You can try again or return to the dashboard.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-left">
                <p className="text-xs text-muted-foreground font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Try again
              </Button>
              <Button size="sm" onClick={() => (window.location.href = "/")}>
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

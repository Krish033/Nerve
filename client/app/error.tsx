"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
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

        {error.message && (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-left">
            <p className="text-xs text-muted-foreground font-mono break-words">{error.message}</p>
            {error.digest && (
              <p className="text-[11px] text-muted-foreground/60 mt-1">ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </Button>
          <Button size="sm" asChild>
            <Link href="/">
              <Home className="h-3.5 w-3.5 mr-1.5" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}



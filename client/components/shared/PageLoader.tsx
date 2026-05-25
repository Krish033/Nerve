"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  fullScreen?: boolean;
  className?: string;
}

export function PageLoader({ fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "min-h-screen bg-background" : "flex-1 min-h-[60vh]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
          Loading…
        </p>
      </div>
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border p-5 space-y-3", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 py-3 border-b border-border last:border-0", className)}>
      <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3 bg-muted/40 border-b border-border flex gap-6">
        {[40, 25, 20, 15].map((w, i) => (
          <Skeleton key={i} className={`h-3 w-[${w}%]`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} className="px-5" />
      ))}
    </div>
  );
}

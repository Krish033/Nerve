import React from 'react';
import { cn } from '@/lib/utils';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  error: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  neutral: 'bg-muted text-muted-foreground',
};

const dotClasses: Record<StatusVariant, string> = {
  default: 'bg-foreground/40',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-muted-foreground/50',
};

export function StatusBadge({ variant = 'default', children, dot, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
      variantClasses[variant],
      className
    )}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClasses[variant])} />}
      {children}
    </span>
  );
}

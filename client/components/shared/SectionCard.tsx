import React from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding,
}: SectionCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="space-y-0.5">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 ml-4 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

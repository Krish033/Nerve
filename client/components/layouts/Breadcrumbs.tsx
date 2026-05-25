"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Breadcrumbs = () => {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6 select-none">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={path}>
            <span className="text-muted-foreground/40 select-none">/</span>
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

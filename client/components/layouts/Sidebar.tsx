"use client";

import React from 'react';
import { LayoutDashboard, ShoppingBag, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/lib/store/use-layout-store';

const WORKSPACE_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/',            exact: true  },
];

const SYSTEM_ITEMS = [
  { icon: ShoppingBag, label: 'Marketplace', href: '/marketplace', exact: false },
  { icon: Settings,    label: 'Settings',    href: '/settings',    exact: false },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { sidebarPlacement, hideSidebarMenus } = useLayoutStore();

  if (hideSidebarMenus) return null;

  const isHorizontal = sidebarPlacement === 'top' || sidebarPlacement === 'bottom';
  const isFloating   = sidebarPlacement === 'floating';
  const tooltipSide  = sidebarPlacement === 'right' || isFloating
    ? 'right-full mr-2.5'
    : 'left-full ml-2.5';

  const containerClass = isHorizontal
    ? 'w-full h-11 flex flex-row items-center px-3 bg-card border-border z-50 overflow-x-auto'
    : cn(
        'w-14 h-full flex flex-col items-center py-2 bg-card border-border z-50 shrink-0',
        isFloating && 'absolute right-3 top-1/2 -translate-y-1/2 h-auto rounded-xl border shadow-lg',
      );

  const borderClass = isHorizontal
    ? sidebarPlacement === 'top' ? 'border-b' : 'border-t'
    : sidebarPlacement === 'right' ? 'border-l' : isFloating ? '' : 'border-r';

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const navItem = (href: string, label: string, Icon: React.ElementType, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-label={label}
      className={cn(
        'group relative h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200',
        !isHorizontal && 'mx-auto',
        active
          ? 'bg-muted text-foreground border border-border/50'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {active && !isHorizontal && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] bg-foreground rounded-r-full" />
      )}
      {!isHorizontal && (
        <span className={cn(
          'absolute px-2.5 py-1.5 bg-popover border border-border text-popover-foreground text-xs font-medium rounded-lg shadow-lg',
          'opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[200] transition-opacity duration-150',
          tooltipSide,
        )}>
          {label}
        </span>
      )}
    </Link>
  );

  const divider = isHorizontal
    ? <div className="w-px h-5 bg-border mx-1" />
    : <div className="h-px bg-border mx-2 my-1" />;

  if (isHorizontal) {
    return (
      <aside className={cn(containerClass, borderClass)}>
        <nav className="flex flex-row h-full items-center gap-0.5 px-1.5">
          {WORKSPACE_ITEMS.map((item) =>
            navItem(item.href, item.label, item.icon, isActive(item.href, item.exact)),
          )}
          {divider}
          {SYSTEM_ITEMS.map((item) =>
            navItem(item.href, item.label, item.icon, isActive(item.href, item.exact)),
          )}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={cn(containerClass, borderClass)}>
      {/* Workspace nav — grows to fill space */}
      <nav className="flex flex-col gap-0.5 w-full px-1.5 pt-1">
        {WORKSPACE_ITEMS.map((item) =>
          navItem(item.href, item.label, item.icon, isActive(item.href, item.exact)),
        )}
      </nav>

      {/* System nav — pinned to bottom */}
      <nav className="flex flex-col gap-0.5 w-full px-1.5 pb-2 mt-auto">
        {divider}
        {SYSTEM_ITEMS.map((item) =>
          navItem(item.href, item.label, item.icon, isActive(item.href, item.exact)),
        )}
      </nav>
    </aside>
  );
};



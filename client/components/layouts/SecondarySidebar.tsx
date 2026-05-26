"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  Palette,
  Mail,
  Globe,
  Activity,
  Terminal,
  Lock,
  UserCheck,
  Settings,
  Bell,
  GitBranch,
  BookOpen,
} from "lucide-react";
import { useLayoutStore } from "@/lib/store/use-layout-store";

interface SubmenuItem {
  name?: string;
  href?: string;
  icon?: React.ElementType;
  type?: "label" | "separator";
  count?: number;
}

const submenus: Record<string, { title: string; items: SubmenuItem[] }> = {
  "/settings": {
    title: "Settings",
    items: [
      { type: "label", name: "General" },
      { name: "General", href: "/settings/general", icon: AppWindow },
      { type: "separator" },
      { type: "label", name: "Appearance" },
      { name: "Themes", href: "/settings/themes", icon: Palette },
      { name: "Mail", href: "/settings/mail", icon: Mail },
      { type: "separator" },
      { type: "label", name: "Security" },
      { name: "Active sessions", href: "/settings/security/active-logins", icon: UserCheck },
      { type: "separator" },
      { type: "label", name: "Logs" },
      { name: "Activity", href: "/settings/logs/activity", icon: Activity },
      { name: "Errors", href: "/settings/logs/errors", icon: Terminal },
    ],
  },
  "/marketplace": {
    title: "Marketplace",
    items: [
      { name: "Themes", href: "/marketplace/themes", icon: Palette },
    ],
  },
  "/github": {
    title: "GitHub",
    items: [
      { name: "Repositories", href: "/github", icon: GitBranch },
      { type: "separator" },
      { type: "label", name: "Account" },
    ],
  },
  "/profile": {
    title: "Profile",
    items: [
      { name: "Account", href: "/profile", icon: UserCheck },
      { name: "Security", href: "/profile/change-password", icon: Lock },
    ],
  },
  "/search": {
    title: "Search",
    items: [
      { name: "All", href: "/search", icon: Globe },
      { name: "Activity", href: "/search?tab=activity", icon: Activity },
      { name: "Settings", href: "/search?tab=settings", icon: Settings },
      { name: "Users", href: "/search?tab=users", icon: UserCheck },
    ],
  },
  "/notifications": {
    title: "Notifications",
    items: [
      { name: "All", href: "/notifications", icon: Bell },
      { type: "separator" },
      { type: "label", name: "Filter" },
      { name: "Unread", href: "/notifications?filter=UNREAD", icon: Activity },
      { name: "Alerts", href: "/notifications?filter=ERROR", icon: Terminal },
      { name: "Messages", href: "/notifications?filter=MESSAGE", icon: Mail },
    ],
  },
  "/docs": {
    title: "Documentation",
    items: [
      { type: "label", name: "Getting started" },
      { name: "Overview", href: "/docs", icon: BookOpen },
    ],
  },
};

export const SecondarySidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarPlacement } = useLayoutStore();
  const isFloating = sidebarPlacement === "floating";

  const activeKey = Object.keys(submenus).find((key) =>
    pathname.startsWith(key),
  );
  const activeSubmenu = activeKey ? submenus[activeKey] : null;

  if (!activeSubmenu) return null;

  // Match exact path, or path+query for filter/tab hrefs
  const isItemActive = (href: string) => {
    if (href.includes('?')) {
      const [hrefPath, hrefQuery] = href.split('?');
      const currentQuery = searchParams.toString();
      return pathname === hrefPath && currentQuery === hrefQuery;
    }
    return pathname === href;
  };

  return (
    <aside
      className={cn(
        "w-56 h-full flex flex-col bg-card border-r border-border z-40 shrink-0",
        isFloating && "border-l shadow-none",
      )}
    >
      {/* Section title */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          {activeSubmenu.title}
        </h2>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {activeSubmenu.items.map((item, idx) => {
          if (item.type === "separator") {
            return <div key={`sep-${idx}`} className="h-px bg-border mx-1 my-2" />;
          }

          if (item.type === "label") {
            return (
              <p key={`label-${idx}`} className="text-[11px] font-medium text-muted-foreground/50 px-2 pt-3 pb-0.5 uppercase tracking-wider first:pt-2">
                {item.name}
              </p>
            );
          }

          const active = isItemActive(item.href!);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                active
                  ? "bg-muted/50 text-foreground font-medium border border-border/50"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-foreground" : "text-muted-foreground/60 group-hover:text-foreground"
                  )} />
                )}
                <span className="truncate">{item.name}</span>
              </div>

              {item.count !== undefined && (
                <span className={cn(
                  "shrink-0 text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full",
                  active ? "bg-background text-muted-foreground border border-border/50" : "bg-muted text-muted-foreground"
                )}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

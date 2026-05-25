/**
 * Module Registry
 *
 * Central registration point for all application modules.
 * Each module declares its routes, navigation entries, and feature flag dependency.
 * This lets the sidebar, command palette, and secondary nav stay in sync
 * without tight coupling.
 */

import type { LucideIcon } from 'lucide-react';

export type ModuleId =
  | 'dashboard'
  | 'tasks'
  | 'github'
  | 'marketplace'
  | 'notifications'
  | 'messaging'
  | 'search'
  | 'settings'
  | 'profile'
  | 'docs';

export type AppModule = {
  id: ModuleId;
  label: string;
  href: string;
  /** Icon component (Lucide) */
  icon: LucideIcon;
  /** Which feature flag gates this module. Undefined = always visible. */
  featureFlag?: string;
  /** Whether this appears in the primary sidebar rail */
  inSidebar?: boolean;
  /** Whether this appears in the command palette */
  inCommandPalette?: boolean;
  /** Keywords for command palette fuzzy search */
  keywords?: string[];
};

import {
  LayoutDashboard,
  ListTodo,
  GitBranch,
  ShoppingBag,
  Bell,
  MessageSquare,
  Search,
  Settings,
  User,
  BookOpen,
} from 'lucide-react';

export const modules: AppModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    inSidebar: true,
    inCommandPalette: true,
    keywords: ['home', 'overview'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
    inSidebar: true,
    inCommandPalette: true,
    keywords: ['todo', 'work', 'checklist'],
  },
  {
    id: 'github',
    label: 'GitHub',
    href: '/github',
    icon: GitBranch,
    featureFlag: 'github_integration',
    inSidebar: true,
    inCommandPalette: true,
    keywords: ['repos', 'code', 'git', 'commits', 'workflows'],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/marketplace',
    icon: ShoppingBag,
    featureFlag: 'marketplace',
    inSidebar: false,
    inCommandPalette: true,
    keywords: ['themes', 'plugins', 'extensions'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    inSidebar: false,
    inCommandPalette: true,
  },
  {
    id: 'messaging',
    label: 'Messages',
    href: '/messaging',
    icon: MessageSquare,
    featureFlag: 'messaging',
    inSidebar: false,
    inCommandPalette: true,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: Search,
    inSidebar: false,
    inCommandPalette: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    inSidebar: false,
    inCommandPalette: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: User,
    inSidebar: false,
    inCommandPalette: true,
  },
  {
    id: 'docs',
    label: 'Documentation',
    href: '/docs',
    icon: BookOpen,
    inSidebar: false,
    inCommandPalette: true,
  },
];

export function getModule(id: ModuleId): AppModule | undefined {
  return modules.find((m) => m.id === id);
}

export function getSidebarModules(): AppModule[] {
  return modules.filter((m) => m.inSidebar);
}

export function getCommandPaletteModules(): AppModule[] {
  return modules.filter((m) => m.inCommandPalette);
}

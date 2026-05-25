'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Command, Bell, ListTodo, GitBranch,
  Settings, LogOut, User, ChevronRight,
  CheckCircle2, Trash2, ShieldAlert, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandStore } from '@/lib/store/useCommand';
import { useLayoutStore } from '@/lib/store/use-layout-store';
import { useAppSettingsStore } from '@/lib/store/use-app-settings-store';
import { useAuthStore } from '@/lib/store/useAuth';
import { useNotifications } from '@/lib/providers/notification-provider';
import { formatDistanceToNow } from 'date-fns';
import logout from '@/app/auth/_partials/imports/logout';
import { toast } from 'sonner';

/* ─── tiny hook: close panel when clicking outside ─── */
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

/* ─── route label helper ─── */
const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  tasks: 'Tasks',
  github: 'GitHub',
  notifications: 'Notifications',
  marketplace: 'Marketplace',
  settings: 'Settings',
  profile: 'Profile',
  search: 'Search',
  docs: 'Docs',
  derby: 'Derby',
  messaging: 'Messages',
};

function segmentLabel(s: string) {
  return ROUTE_LABELS[s] ?? (s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '));
}

/* ─── shared icon button classes ─── */
const iconBtnBase = 'relative h-7 w-7 flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
function iconBtnClass(active?: boolean) {
  return cn(iconBtnBase, active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground');
}

/* Badge dot overlay */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center bg-foreground text-background text-[9px] font-bold rounded-full ring-1 ring-background leading-none pointer-events-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

/* Button variant (for click handlers) */
function NavIconBtn({ onClick, active, badge, label, children }: {
  onClick?: () => void; active?: boolean; badge?: number; label: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} className={iconBtnClass(active)}>
      {children}
      {typeof badge === 'number' && <Badge count={badge} />}
    </button>
  );
}

/* Link variant (for navigation) */
function NavIconLink({ href, active, label, children }: {
  href: string; active?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className={iconBtnClass(active)}>
      {children}
    </Link>
  );
}

/* ─── Notifications panel ─── */
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, requestPermission, permissionStatus } = useNotifications();

  return (
    <div className="w-80 flex flex-col max-h-[480px]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[11px] text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* push permission banner */}
      {permissionStatus !== 'granted' && (
        <div className="mx-3 my-2 p-3 rounded-lg border border-border bg-muted/40 shrink-0">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Push notifications off</p>
              <button
                onClick={requestPermission}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Zap className="h-3 w-3" /> Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* list */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <Bell className="h-6 w-6 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={cn(
                'relative px-4 py-3 border-b border-border last:border-0 group/item cursor-default',
                !n.read && 'bg-accent/30',
              )}
            >
              {!n.read && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
              )}
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-[11px] font-medium', n.read ? 'text-muted-foreground' : 'text-foreground')}>
                  {n.type}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className={cn('text-xs leading-relaxed', n.read ? 'text-muted-foreground' : 'text-foreground')}>
                {n.title}
              </p>
              {n.message && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
              )}
              {/* actions on hover */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {!n.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    aria-label="Mark as read"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  aria-label="Delete"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* footer */}
      <div className="px-4 py-2.5 border-t border-border shrink-0">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

/* ─── User menu panel ─── */
function UserMenu({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out');
      router.push('/auth/login');
    } catch {
      toast.error('Sign out failed');
    }
  };

  const menuItems = [
    { label: 'Profile', icon: User, href: '/profile' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="w-52">
      {/* identity */}
      <div className="px-3 py-3 border-b border-border">
        <p className="text-sm font-medium truncate">{user?.name || 'Account'}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>
      {/* nav items */}
      <div className="p-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>
      <div className="p-1 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

/* ─── Floating panel wrapper ─── */
function NavPanel({
  children,
  align = 'right',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <div
      className={cn(
        'absolute top-full mt-1.5 z-[200] bg-popover border border-border rounded-xl shadow-lg overflow-hidden',
        align === 'right' && 'right-0',
        align === 'left' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
      )}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════ */
export const Navbar = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const { open: openCommand } = useCommandStore();
  const { hideNavbar } = useLayoutStore();
  const { user } = useAuthStore();
  const { appName, appLogoUrl } = useAppSettingsStore();
  const { unreadCount } = useNotifications();

  const [openPanel, setOpenPanel] = useState<'notifications' | 'user' | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useOutsideClick(notifRef, () => openPanel === 'notifications' && setOpenPanel(null));
  useOutsideClick(userRef, () => openPanel === 'user' && setOpenPanel(null));

  const toggle = (panel: 'notifications' | 'user') =>
    setOpenPanel((p) => (p === panel ? null : panel));

  if (hideNavbar) return null;

  return (
    <nav className="h-11 w-full shrink-0 flex items-center px-4 border-b border-border bg-background/95 backdrop-blur-sm z-[100]">

      {/* ── LEFT: breadcrumb ── */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-foreground/70 transition-colors shrink-0"
        >
          {appLogoUrl && (
            <Image
              src={appLogoUrl}
              alt={appName}
              width={18}
              height={18}
              unoptimized
              className="h-[18px] w-[18px] object-contain rounded-sm"
            />
          )}
          {appName || 'Nurve'}
        </Link>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const href = '/' + segments.slice(0, i + 1).join('/');
          return (
            <React.Fragment key={seg + i}>
              <span className="text-border text-base select-none shrink-0">/</span>
              {isLast ? (
                <span className="text-sm text-foreground font-medium truncate">{segmentLabel(seg)}</span>
              ) : (
                <Link
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {segmentLabel(seg)}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── CENTER: search trigger ── */}
      <div className="hidden md:flex justify-center px-4 flex-1 max-w-xl">
        <button
          onClick={openCommand}
          className="w-full flex items-center gap-2 h-7 px-3 rounded-md border border-border bg-muted/30 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs"
        >
          <Search className="h-3 w-3 shrink-0" />
          <span>Search</span>
          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
            <Command className="h-2.5 w-2.5" /><span>K</span>
          </span>
        </button>
      </div>

      {/* ── RIGHT: utility icons ── */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        {/* Mobile search trigger */}
        <div className="md:hidden">
          <NavIconBtn label="Search" onClick={openCommand}>
            <Search className="h-3.5 w-3.5" />
          </NavIconBtn>
        </div>

        {/* Tasks */}
        <NavIconLink
          href="/tasks"
          label="Tasks"
          active={pathname === '/tasks' || pathname.startsWith('/tasks/')}
        >
          <ListTodo className="h-3.5 w-3.5" />
        </NavIconLink>

        {/* GitHub */}
        <NavIconLink
          href="/github"
          label="GitHub"
          active={pathname === '/github' || pathname.startsWith('/github/')}
        >
          <GitBranch className="h-3.5 w-3.5" />
        </NavIconLink>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <NavIconBtn
            label="Notifications"
            active={openPanel === 'notifications'}
            badge={unreadCount}
            onClick={() => toggle('notifications')}
          >
            <Bell className="h-3.5 w-3.5" />
          </NavIconBtn>
          {openPanel === 'notifications' && (
            <NavPanel align="right">
              <NotificationsPanel onClose={() => setOpenPanel(null)} />
            </NavPanel>
          )}
        </div>

        <div className="w-px h-4 bg-border mx-1 shrink-0" />

        {/* User avatar / menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => toggle('user')}
            aria-label="User menu"
            className={cn(
              'h-7 w-7 rounded-md overflow-hidden border transition-colors',
              openPanel === 'user'
                ? 'border-foreground/40 ring-1 ring-foreground/20'
                : 'border-border hover:border-foreground/30',
            )}
          >
            {user?.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt="avatar"
                width={28}
                height={28}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="h-full w-full flex items-center justify-center bg-muted text-xs font-medium text-foreground">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            )}
          </button>
          {openPanel === 'user' && (
            <NavPanel align="right">
              <UserMenu onClose={() => setOpenPanel(null)} />
            </NavPanel>
          )}
        </div>
      </div>
    </nav>
  );
};



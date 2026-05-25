'use client';

import React from 'react';
import { Bell, ShieldAlert, CheckCircle2, Trash2, Zap } from 'lucide-react';
import { useNotifications } from '@/lib/providers/notification-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/shared/button';

export const NotificationBell = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    requestPermission, 
    permissionStatus 
  } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          icon={Bell}
        >
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center bg-foreground text-background text-[9px] font-bold rounded-full ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl border border-border bg-popover shadow-lg">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">({unreadCount} unread)</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              icon={CheckCircle2}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        {permissionStatus !== 'granted' && (
          <div className="mx-3 mt-3 mb-1 p-3 rounded-lg border border-border bg-muted/50">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Push notifications disabled</p>
                <p className="text-xs text-muted-foreground">Enable push notifications to receive real-time updates.</p>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={(e) => {
                    e.preventDefault();
                    requestPermission();
                  }}
                  icon={Zap}
                >
                  Enable notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <Bell className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1.5 px-4 py-3 cursor-pointer border-b border-border last:border-0 relative group/item rounded-none focus:bg-accent",
                  !notification.read && "bg-accent/40"
                )}
                onSelect={(e) => e.preventDefault()}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                {!notification.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-foreground rounded-r-full" />
                )}

                <div className="flex w-full items-center justify-between gap-3">
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-md",
                    !notification.read
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground"
                  )}>
                    {notification.type}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-0.5 pr-8 w-full">
                  <h4 className={cn(
                    "text-sm font-medium",
                    !notification.read ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {notification.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {notification.message}
                  </p>
                </div>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  {!notification.read && (
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      aria-label="Mark as read"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



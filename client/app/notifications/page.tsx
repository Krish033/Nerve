"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useNotifications } from "@/lib/providers/notification-provider";
import {
  Terminal,
  ShieldAlert,
  Trash2,
  History,
  Activity,
  AlertTriangle,
  X,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";

import { useSearchParams } from "next/navigation";

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "ALL";

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const [showPurgeModal, setShowPurgeModal] = useState(false);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !n.read;
    return n.type === filter;
  });

  const handlePurgeBuffer = async () => {
    await deleteAllNotifications();
    setShowPurgeModal(false);
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <Heading 
          title="Intelligence Buffer" 
          description="System-wide security and event logging" 
        />


        <div className="relative">
          {/* Main List */}
          <div className="relative">
            <div className="space-y-10">
              {filteredNotifications.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-10">
                  <Bell className="h-10 w-10" />
                  <p className="text-[11px] font-black uppercase tracking-[0.5em]">Buffer_Empty</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={cn(
                        "group transition-all relative border-l pl-6",
                        notification.read ? "border-white/5 opacity-40" : "border-primary"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              notification.type === 'ERROR' ? "text-red-500" :
                              notification.type === 'WARNING' ? "text-amber-500" :
                              "text-primary"
                            )}>
                              {notification.type}_PROTOCOL
                            </span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground/20 uppercase">
                              ID_{notification.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground/40 uppercase">
                            {safeFormatDistanceToNow(notification.createdAt)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-[15px] font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {notification.title}
                          </h3>
                          <p className="text-[13px] font-bold leading-relaxed max-w-3xl tracking-tight text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 transition-all">
                          {!notification.read && (
                            <Button 
                              variant="ghost"
                              size="xs"
                              onClick={() => markAsRead(notification.id)}
                              icon={CheckCircle2}
                            >
                              ACKNOWLEDGE
                            </Button>
                          )}
                          <Button 
                            variant="ghost"
                            size="xs"
                            onClick={() => deleteNotification(notification.id)}
                            icon={Trash2}
                            className="text-red-500/40 hover:text-red-500"
                          >
                            PURGE_RECORD
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={() => setShowPurgeModal(false)} />
          <div className="relative w-full max-w-md p-8 border border-white/5 bg-card animate-in zoom-in-95 duration-200">
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setShowPurgeModal(false)} 
              className="absolute right-4 top-4"
              icon={X}
            />
            <div className="space-y-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Purge Buffer</h3>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">
                    Irreversible_Decommission
                  </p>
                </div>
              </div>
              <p className="text-[12px] font-bold text-muted-foreground/60 text-center uppercase tracking-wider leading-relaxed">
                Confirming this action will permanently terminate all intelligence fragments stored in this node.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="destructive"
                  size="lg"
                  onClick={handlePurgeBuffer} 
                  icon={Trash2}
                >
                  Execute_Purge
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setShowPurgeModal(false)}
                >
                  Abort_Protocol
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



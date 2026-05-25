"use client";

import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  Monitor, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Clock, 
  RefreshCcw, 
  LogOut, 
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionLogs } from "@/app/settings/logs/_partials/imports/queries";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";

interface Session {
  id: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isActive: boolean;
}

export default function ActiveLoginsPage() {
  const { data: sessions = [], isLoading: loading, refetch: fetchSessions } = useSessionLogs();

  const uniqueSessions = sessions.reduce((acc: Session[], current: Session) => {
    const isDuplicate = acc.find(item => item.ip === current.ip && item.device === current.device && item.os === current.os);
    if (!isDuplicate) acc.push(current);
    return acc;
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/logs/sessions/${id}`);
      fetchSessions();
      toast.success("Session terminated successfully");
    } catch (error) {
      toast.error("Failed to revoke session");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
        <Heading 
          title="Active Handshakes" 
          description="Real-time session monitoring and decommissioning" 
          className="mb-0" 
        />
        
        <div className="flex items-center gap-3">
          <Button 
            variant="destructive" 
            size="sm" 
            icon={LogOut}
            onClick={() => {}}
          >
            Wipe All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={RefreshCcw}
            loading={loading}
            onClick={() => fetchSessions()}
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-6 opacity-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Tracing Active Vectors...</p>
        </div>
      ) : uniqueSessions.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-10 border border-dashed border-border/40 rounded-none">
          <UserCheck className="h-10 w-10" />
          <p className="text-[12px] font-bold uppercase tracking-widest">No Active Handshakes</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">System</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Origin / IP</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Heartbeat</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {uniqueSessions.map((session: Session) => (
                <tr key={session.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-lg border",
                        session.isActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                      )}>
                        {session.device.toLowerCase().includes('iphone') || session.device.toLowerCase().includes('android') 
                          ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{session.device}</p>
                          {session.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest">Active</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{session.os} • {session.browser}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <span>{session.location || 'Unknown'}</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground/60">{session.ip}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-muted-foreground">{new Date(session.lastActive).toLocaleTimeString()}</p>
                    <p className="text-xs text-muted-foreground/50">{new Date(session.lastActive).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {session.isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 cursor-not-allowed">
                        Current Node
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRevoke(session.id)}
                        icon={ShieldCheck}
                        className="text-red-500/50 hover:text-red-500"
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Protocol Panel */}
      <div className="p-8 border border-white/5 bg-white/[0.01] flex gap-8 items-center rounded-none border-l-2 border-l-primary/40">
        <ShieldCheck className="h-8 w-8 text-primary/20 shrink-0" />
        <div className="space-y-1">
          <p className="text-[14px] font-bold text-foreground">Security Protocol Established</p>
          <p className="text-[12px] font-medium text-muted-foreground/40 leading-relaxed max-w-4xl italic">
            Terminating a handshake results in immediate session invalidation across the global neural matrix. 
            The target identity node will be purged and forced to re-verify all security factors.
          </p>
        </div>
      </div>
    </div>
  );
}



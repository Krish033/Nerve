"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Conversation } from "@/lib/store/useMessaging";

interface ConversationItemProps {
  conv: Conversation;
  isActive: boolean;
  unreadCount: number;
  isBlocked: boolean;
  onClick: () => void;
}

export const ConversationItem = React.memo(({
  conv,
  isActive,
  unreadCount,
  isBlocked,
  onClick
}: ConversationItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-start gap-4 border-b border-border/5 transition-all text-left group relative",
        isActive ? "bg-muted/10 border-l-4 border-l-primary" : "hover:bg-muted/5"
      )}
    >
      <div className="h-11 w-11 bg-white/[0.02] flex items-center justify-center rounded-[2px] shrink-0 border border-border/10 relative group-hover:border-primary/20 transition-colors">
        <span className="text-[12px] font-black uppercase text-primary/70 font-mono">
          {conv.name?.charAt(0) || 'G'}
        </span>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in duration-300 shadow-[0_0_10px_rgba(var(--primary),0.5)]">
            <span className="text-[8px] font-black text-primary-foreground">{unreadCount}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={cn(
            "text-[14px] font-semibold truncate pr-2 transition-colors",
            unreadCount > 0 ? "text-primary" : "text-foreground/90 group-hover:text-primary"
          )}>
            {conv.name || 'DIRECT_ENCRYPTED_LINK'}
            {isBlocked && <span className="ml-2 text-[10px] text-red-500/50">[BLOCKED]</span>}
          </h3>
          <span className="text-[10px] text-foreground/40 font-mono opacity-80 uppercase tracking-widest">
            {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:45'}
          </span>
        </div>
        <p className={cn(
          "text-[13px] truncate transition-opacity",
          unreadCount > 0 ? "text-primary opacity-100 font-bold" : "text-foreground/50 opacity-80"
        )}>
          {conv.lastMessage || 'INITIALIZING_SECURE_CHANNEL...'}
        </p>
      </div>
    </button>
  );
});

ConversationItem.displayName = "ConversationItem";

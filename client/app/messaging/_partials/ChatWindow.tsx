"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMessagingSocket } from "./imports/useMessagingSocket";
import { useMessagingStore } from "@/lib/store/useMessaging";
import { MessageBubble } from "@/app/messaging/_partials/MessageBubble";
import { useConversations, useMessages } from './imports/queries';
import { ChatInput } from "@/app/messaging/_partials/ChatInput";
import { useAuthStore } from "@/lib/store/useAuth";
import { Shield, MoreHorizontal, Trash2, ShieldAlert, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export const ChatWindow = () => {
  const { user } = useAuthStore();
  const { 
    activeConversationId, 
    blockedUserIds,
    setEditingMessage
  } = useMessagingStore();
  const { data: conversations = [] } = useConversations();
  const { data: currentMessages = [], isLoading: isLoadingMessages } = useMessages(activeConversationId);
  const { clearChatHistory, deleteMessage, joinConversation, setBlockUser } = useMessagingSocket();
  const [showProfile, setShowProfile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  useEffect(() => {
    if (activeConversationId) {
      joinConversation(activeConversationId);
    }
  }, [activeConversationId, joinConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentMessages, isLoadingMessages]);

  const handleBlock = () => {
    const targetUserId = activeConversation?.participants.find(p => p.userId !== user?.id)?.userId;
    if (targetUserId) {
      setBlockUser(targetUserId, blockedUserIds.indexOf(targetUserId) !== -1);
    }
  };

  const handleClearHistory = () => {
    if (activeConversationId) {
      clearChatHistory(activeConversationId);
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 border-r border-border/50 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="text-center space-y-4 relative z-10">
          <div className="h-16 w-16 bg-white/[0.01] rounded-[2px] flex items-center justify-center mx-auto border border-white/5 shadow-sm">
            <Shield className="h-8 w-8 text-primary/50" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-colors">
              Secure Terminal
            </h3>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
              Select a channel to begin communication
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-background font-mono relative">
      <div className="flex-1 flex flex-col min-w-0 relative border-r border-white/5">
        {/* Matrix Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

        {/* Header */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-white/[0.01] backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowProfile(!showProfile)}>
            <div className="h-10 w-10 bg-primary/5 flex items-center justify-center rounded-[2px] border border-primary/20 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all">
              <span className="text-[12px] font-black text-primary uppercase">
                {activeConversation?.name?.charAt(0) || "G"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] group-hover:shadow-[0_0_15px_rgba(var(--primary),0.8)] transition-all" />
                <h3 className="text-[15px] font-black tracking-[0.1em] uppercase group-hover:text-primary transition-colors">
                  {activeConversation?.name || "ENCRYPTED_CHANNEL"}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em]">
                  LINK_STABLE // {activeConversationId?.startsWith('self_') ? 'LOCAL_LOOP' : 'REMOTE_PEER'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleClearHistory}
              className="p-2.5 hover:bg-muted/10 text-muted-foreground hover:text-red-400 transition-all rounded-[2px] border border-transparent hover:border-border/50"
              title="CLEAR_HISTORY"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button 
              onClick={handleBlock}
              className={cn(
                "p-2.5 transition-all rounded-[2px] border border-transparent hover:border-border/50",
                blockedUserIds.indexOf(activeConversation?.participants.find(p => p.userId !== user?.id)?.userId || '') !== -1
                  ? "text-red-500 bg-red-500/10 border-red-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
              )}
              title="BLOCK_USER"
            >
              <ShieldAlert className="h-4 w-4" />
            </button>
            <div className="h-4 w-[1px] bg-border/40 mx-1" />
            <button className="p-2.5 hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all rounded-[2px]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-8 space-y-2 custom-scrollbar relative z-10"
        >
          <div className="flex flex-col items-center mb-12 opacity-40 hover:opacity-80 transition-opacity">
            <div className="px-6 py-2 border border-white/5 rounded-[2px] bg-white/[0.01]">
              <p className="text-[10px] text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                <Shield className="h-3.5 w-3.5" /> SECURE_VECTOR_ESTABLISHED
              </p>
            </div>
          </div>

          {isLoadingMessages ? (
            <div className="space-y-6 px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn("flex w-full", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <div className="h-16 w-64 bg-muted/5 animate-pulse rounded-[2px] border border-border/10" />
                </div>
              ))}
            </div>
          ) : (
            currentMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onEdit={setEditingMessage}
                onDelete={deleteMessage}
              />
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] backdrop-blur-md relative z-20">
          <ChatInput conversationId={activeConversationId} />
        </div>
      </div>

      {/* Profile Sidebar */}
      {showProfile && (
        <div className="w-80 bg-white/[0.01] border-l border-white/5 backdrop-blur-xl animate-in slide-in-from-right duration-300 z-30 flex flex-col">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="h-24 w-24 bg-primary/5 rounded-[2px] border border-primary/20 flex items-center justify-center mb-6 relative overflow-hidden group">
              <span className="text-4xl font-black text-primary uppercase">{activeConversation?.name?.charAt(0)}</span>
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-[16px] font-black uppercase tracking-[0.1em] mb-1 text-primary">{activeConversation?.name}</h2>
            <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-[0.3em] mb-8">
              IDENTITY_VERIFIED // SECURE_PEER
            </p>

            <div className="w-full space-y-1">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[2px] text-left hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer group">
                <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 opacity-40 group-hover:opacity-100 transition-opacity tracking-[0.2em]">PUBLIC_KEY</p>
                <p className="text-[12px] font-mono truncate text-primary/80">0x7F3A...E92D_RSA_4096</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[2px] text-left hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer group">
                <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 opacity-40 group-hover:opacity-100 transition-opacity tracking-[0.2em]">BIO_VECTOR</p>
                <p className="text-[12px] font-mono leading-relaxed text-muted-foreground/80 tracking-tight">System administrator for the Nerve mainnet interface. Encrypted communications only.</p>
              </div>
            </div>

            <div className="mt-8 w-full pt-8 border-t border-border/10 space-y-3">
              <button className="w-full py-3 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-[2px] transition-all">
                PURGE_TRANSMISSION_DATA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Smile, X } from "lucide-react";
import axios from "axios";
import { useMessagingSocket } from "./imports/useMessagingSocket";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useMessagingStore } from "@/lib/store/useMessaging";
import { useAuthStore } from "@/lib/store/useAuth";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  conversationId: string | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({ conversationId }) => {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, editMessage } = useMessagingSocket();
  const { editingMessage, setEditingMessage } = useMessagingStore();

  useEffect(() => {
    setContent(editingMessage?.content || "");
  }, [editingMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !conversationId) return;

    if (editingMessage) {
      editMessage(editingMessage.id, content.trim());
      setEditingMessage(null);
    } else {
      sendMessage(conversationId, content.trim());
    }
    setContent("");
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_MESSAGING_URL}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
        },
      );

      sendMessage(conversationId, res.data.url, "FILE");
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      {editingMessage && (
        <div className="absolute -top-12 left-0 right-0 bg-primary/10 border-t border-primary/30 p-2 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <p className="text-[10px] font-black uppercase text-primary px-4 tracking-[0.2em]">
            MODIFICATION_MODE // ESC to cancel
          </p>
          <button onClick={() => { setEditingMessage(null); setContent(''); }} className="p-1 hover:bg-muted/20 rounded-full">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-4 z-50">
          <EmojiPicker 
            theme={Theme.DARK} 
            onEmojiClick={(emoji) => setContent(prev => prev + emoji.emoji)}
          />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-3 bg-white/[0.02] border border-white/5 rounded-[2px] p-2 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(var(--primary),0.1)] transition-all">
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all rounded-[2px]"
          >
            <Paperclip className={cn("h-4 w-4", isUploading && "animate-spin")} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-all rounded-[2px]"
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
            if (e.key === 'Escape' && editingMessage) {
              setEditingMessage(null);
              setContent('');
            }
          }}
          placeholder={editingMessage ? "MODIFY_TRANSMISSION..." : "ENTER_SIGNAL..."}
          rows={1}
          className="flex-1 bg-transparent border-none focus:ring-0 text-[12px] font-mono py-2.5 resize-none max-h-32 custom-scrollbar placeholder:text-muted-foreground/30 selection:bg-primary/20 tracking-wider"
        />

        <button
          type="submit"
          disabled={!content.trim() || !conversationId}
          className="p-3 bg-primary hover:bg-primary/90 disabled:opacity-20 disabled:hover:bg-primary text-primary-foreground rounded-[2px] transition-all shadow-[0_0_15px_rgba(var(--primary),0.3)] active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="flex justify-between items-center mt-3 px-1">
        <p className="text-[8px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
          Secure Channel: AES-256-GCM / DH-2048
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
            <span className="text-[8px] text-primary/70 font-mono uppercase tracking-[0.2em] font-black">
              Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};



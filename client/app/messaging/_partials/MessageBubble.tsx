"use client";

import React from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/useAuth";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/store/useMessaging";
import {
  CheckCheck,
  Pencil,
  Trash2,
  File as FileIcon,
  Download,
} from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export const MessageBubble = ({ message, onEdit, onDelete }: MessageBubbleProps) => {
  const { user } = useAuthStore();
  const isMe = message.senderId === user?.id;

  return (
    <div
      className={cn("flex w-full mb-8", isMe ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "group flex flex-col max-w-[85%] relative",
          isMe ? "items-end ml-auto" : "items-start mr-auto",
        )}
      >
        {/* Metadata Header */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] font-mono">
            {isMe
              ? "NODE_SOURCE_LCL"
              : `NODE_STREAM_${message.senderId.slice(0, 4)}`}
          </span>
          <span className="text-[9px] text-muted-foreground/30 font-mono">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>

        {/* Message Container */}
        <div
          className={cn(
            "relative p-4 rounded-[2px] border transition-all duration-300",
            isMe
              ? "bg-primary/10 border-primary/30 text-foreground shadow-[0_0_20px_-10px_rgba(var(--primary),0.3)]"
              : "bg-white/[0.02] border-white/5 text-foreground",
          )}
        >
          {/* Hover Actions */}
          {isMe && !message.isDeleted && (
            <div className="absolute -left-12 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="p-1.5 hover:bg-muted/20 rounded-[2px] text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="p-1.5 hover:bg-muted/20 rounded-[2px] text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {message.isDeleted ? (
            <p className="text-[13.5px] font-mono italic opacity-40 uppercase tracking-tighter">
              [TRANSMISSION_PURGED_FROM_VECTOR]
            </p>
          ) : (
            <div className="space-y-3">
              {message.type === "IMAGE" && (
                <div className="rounded-[2px] overflow-hidden border border-border/20">
                  <Image
                    src={message.content}
                    alt="Transmission attachment"
                    width={640}
                    height={480}
                    unoptimized
                    className="max-w-full h-auto"
                  />
                </div>
              )}
              {message.type === "FILE" && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-[2px]">
                  <FileIcon className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono truncate uppercase">
                      Encrypted_Payload.dat
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      DOWNLOAD_VIA_SECURE_LINK
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                </div>
              )}
              {message.type === "TEXT" && (
                <p className="text-[13.5px] font-mono leading-relaxed tracking-tight whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              {message.isEdited && (
                <div className="flex items-center gap-1 opacity-30">
                  <span className="text-[8px] font-mono uppercase tracking-widest">
                    [MODIFIED]
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Matrix Detail */}
          <div
            className={cn(
              "absolute -bottom-1 h-[2px] bg-primary/20 transition-all duration-500 group-hover:w-full",
              isMe ? "right-0 w-8" : "left-0 w-8",
            )}
          />
        </div>

        {/* Status Footer */}
        <div
          className={cn(
            "flex items-center gap-3 mt-2 px-1",
            isMe ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-[10px] font-black font-mono opacity-40 uppercase tracking-[0.2em]">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isMe && (
            <CheckCheck className="h-3.5 w-3.5 text-primary opacity-50" />
          )}
          {!isMe && <div className="h-[1px] w-4 bg-white/10" />}
        </div>
      </div>
    </div>
  );
};



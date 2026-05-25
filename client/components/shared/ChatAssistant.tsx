"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/shared/button";
import { TextInput } from "@/components/ui/TextInput";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Send, Bot, User, Loader2, Activity } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  system_status?: Record<string, string>;
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am Derby, your Nerve assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          meta: { page: window.location.pathname },
        }),
      });

      const data = await response.json();
      const botMessage: Message = {
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions,
        system_status: data.system_status,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Error: Could not connect to Derby assistant. Make sure the derby microservice is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col shadow-2xl border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
            <Bot className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Derby Assistant</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Neural Network Active
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-600" : "bg-yellow-600"}`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`space-y-2`}>
                <div
                  className={`p-4 rounded-2xl shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600/90 text-white rounded-tr-none"
                      : "bg-white/5 border border-white/10 rounded-tl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map((s, si) => (
                      <span
                        key={si}
                        className="text-[10px] px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500"
                      >
                        Suggestion: {s}
                      </span>
                    ))}
                  </div>
                )}

                {msg.system_status && (
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Activity size={10} /> System Health
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(msg.system_status).map(
                        ([svc, status]) => (
                          <div
                            key={svc}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="text-muted-foreground">{svc}</span>
                            <span
                              className={
                                status === "Healthy" ||
                                status.includes("Running")
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {status}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-yellow-600" />
              </div>
              <p className="text-xs italic">Derby is thinking...</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 border-t border-white/10 bg-white/5">
        <form
          className="flex w-full items-center space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <TextInput
            placeholder="Ask Derby anything about Nerve..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-black/20 border-white/10 focus-visible:ring-yellow-500"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            loading={loading}
            icon={Send}
            className="bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          />
        </form>
      </CardFooter>
    </Card>
  );
}

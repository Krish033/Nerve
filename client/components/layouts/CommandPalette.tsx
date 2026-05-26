"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Settings,
  User,
  ArrowRight,
  BookOpen,
  Lock,
  ListTodo,
  GitBranch,
  Bell,
  ShoppingBag,
  Palette,
  Globe,
  AppWindow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandStore } from "@/lib/store/useCommand";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords?: string[];
};

const navItems: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", category: "Navigate", icon: LayoutDashboard, href: "/", keywords: ["home"] },
  { id: "tasks", label: "Tasks", category: "Navigate", icon: ListTodo, href: "/tasks", keywords: ["todo", "work"] },
  { id: "github", label: "GitHub", category: "Navigate", icon: GitBranch, href: "/github", keywords: ["repos", "code", "git"] },
  { id: "notifications", label: "Notifications", category: "Navigate", icon: Bell, href: "/notifications" },
  { id: "marketplace", label: "Marketplace", category: "Navigate", icon: ShoppingBag, href: "/marketplace", keywords: ["themes", "plugins"] },
  { id: "search", label: "Search", category: "Navigate", icon: Search, href: "/search" },
  { id: "settings", label: "Settings", category: "Navigate", icon: Settings, href: "/settings" },
  { id: "profile", label: "Profile", category: "Navigate", icon: User, href: "/profile" },
];

const settingsItems: CommandItem[] = [
  { id: "settings-general", label: "General Settings", category: "Settings", icon: AppWindow, href: "/settings/general", keywords: ["app name", "logo", "seo", "favicon"] },
  { id: "settings-themes", label: "Themes & Appearance", category: "Settings", icon: Palette, href: "/settings/themes" },
  { id: "settings-security", label: "Security", category: "Settings", icon: Lock, href: "/settings/security/active-logins" },
  { id: "change-password", label: "Change password", category: "Settings", icon: Lock, href: "/profile/change-password" },
];

const helpItems: CommandItem[] = [
  { id: "docs", label: "Documentation", category: "Help", icon: BookOpen, href: "/docs" },
  { id: "marketplace-explore", label: "Explore marketplace", category: "Help", icon: Globe, href: "/marketplace" },
];

const allItems = [...navItems, ...settingsItems, ...helpItems];

export const CommandPalette = () => {
  const { isOpen, close } = useCommandStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
    );
  });

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
    close();
  }, [close, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        useCommandStore.getState().toggle();
      }
      if (!isOpen) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(filteredItems.length, 1)) % Math.max(filteredItems.length, 1));
      }
      if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, close, handleSelect]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const grouped = filteredItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[18vh] px-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={close} />

      <div className="relative w-full max-w-[560px] bg-card border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
            placeholder="Search or jump to..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] text-muted-foreground font-medium">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
              <Search className="h-7 w-7 opacity-30" />
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                  {category}
                </p>
                <div className="space-y-0.5">
                  {categoryItems.map((item) => {
                    const globalIndex = filteredItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left group",
                          isSelected ? "bg-accent/10 text-accent border border-accent/20" : "hover:bg-accent/5 text-foreground"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-accent" : "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{item.label}</span>
                          {item.description && (
                            <span className="ml-2 text-xs text-muted-foreground truncate">{item.description}</span>
                          )}
                        </div>
                        {isSelected && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">⏎</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
};



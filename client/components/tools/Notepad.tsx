"use client";

import React, { useState } from 'react';
import { StickyNote, X, Minimize2, Maximize2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const Notepad = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [note, setNote] = useState(() =>
    typeof window === 'undefined' ? '' : localStorage.getItem('nerve_notepad_data') || '',
  );

  const handleSave = () => {
    localStorage.setItem('nerve_notepad_data', note);
    toast.success('Vector note synchronized locally');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-foreground text-background rounded-none shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-50"
      >
        <StickyNote className="h-6 w-6" />
        <span className="absolute right-full mr-4 px-2 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Open Intelligence Pad
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl transition-all duration-300 ${isMinimized ? 'h-12 w-64' : 'h-96 w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-black/20">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 opacity-50" />
          <span className="text-[10px] font-black uppercase tracking-widest">Rapid Notepad</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-48px)]">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Initialize thought vector..."
            className="flex-1 rounded-none border-none resize-none bg-transparent p-4 text-xs font-medium focus-visible:ring-0"
          />
          <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-black/10 flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-none text-[8px] font-black uppercase tracking-[0.2em]" onClick={() => setNote('')}>
              Purge
            </Button>
            <Button size="sm" className="h-8 px-4 rounded-none bg-foreground text-background text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-black/10" onClick={handleSave}>
              <Save className="h-3 w-3 mr-2" /> Sync Pad
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};



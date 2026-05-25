"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center border border-white/5 bg-white/[0.02]">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors border-r border-white/5"
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors border-r border-white/5"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="flex items-center">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "h-9 px-4 text-[11px] font-black tracking-widest transition-all",
                currentPage === page
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  : "text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.03]"
              )}
            >
              {page < 10 ? `0${page}` : page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors border-l border-white/5"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors border-l border-white/5"
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="ml-4 flex items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
}



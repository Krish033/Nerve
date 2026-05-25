"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  AlertTriangle, 
  Search, 
  Terminal,
  Bug,
  Activity,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/TextInput';
import { Pagination } from '@/components/ui/pagination-industrial';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useErrorLogs } from '../_partials/imports/queries';
import { Heading } from '@/components/shared/heading';

interface ErrorLog {
  id: string;
  message: string;
  stack: string;
  severity: string;
  module: string;
  node: string;
  type: string;
  createdAt: string;
}

export default function ErrorLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 5;
  const debouncedSearch = useDebounce(searchTerm, 500);
  const { data, isLoading: loading } = useErrorLogs({
    q: debouncedSearch,
    page,
    limit
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/40 pb-10">
        <Heading 
          title="Anomaly Buffer" 
          description="Historical record of system-wide exceptions and failures" 
          className="mb-0" 
        />
        
        <div className="flex items-center gap-8 py-4 px-6 border border-border/40 bg-muted/5 rounded-2xl">
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none">Diagnostic Alert</p>
            <div className="flex items-center gap-2 justify-end">
              <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
              <span className="text-[13px] font-semibold text-red-500">Sentinel Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 pt-4">
        <div className="relative flex-1 group">
          <input 
            placeholder="Scan for anomaly signatures..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-transparent border-0 border-b border-border focus:border-red-500 rounded-none pl-0 pr-10 text-[16px] font-semibold placeholder:text-muted-foreground/20 transition-all tracking-tight"
          />
          <Search className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/20 group-focus-within:text-red-500 transition-colors" />
        </div>
      </div>

      <div className="space-y-16">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-6 opacity-40">
            <ShieldAlert className="h-10 w-10 animate-pulse text-red-500" />
            <p className="text-[12px] font-bold tracking-widest uppercase text-red-500/60">Scanning Matrix...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-border/40 rounded-3xl opacity-10">
            <Bug className="h-12 w-12" />
            <p className="text-[13px] font-bold tracking-widest uppercase">Buffer Clean</p>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Error Summary</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Time</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Module / Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: ErrorLog) => (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => {
                          const table = document.getElementById(`stack-${log.id}`);
                          if (table) table.classList.toggle('hidden');
                        }}
                        className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", log.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500')} />
                            <div className="space-y-1">
                              <p className="font-medium text-foreground group-hover:text-red-500 transition-colors line-clamp-1">{log.message}</p>
                              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{log.type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-muted-foreground">{format(new Date(log.createdAt), 'MMM dd, yyyy')}</p>
                            <p className="text-xs font-mono text-muted-foreground/50">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 py-0.5 bg-muted rounded-full inline-block">
                              {log.module}
                            </span>
                            <p className="text-xs font-mono text-muted-foreground/50 pl-2">NODE_{log.node.toUpperCase()}</p>
                          </div>
                        </td>
                      </tr>
                      <tr id={`stack-${log.id}`} className="hidden bg-muted/10">
                        <td colSpan={3} className="px-6 py-4">
                          <div className="bg-black/50 border border-border/50 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-red-400/80 leading-relaxed whitespace-pre-wrap">
                              {log.stack}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-12 border-t border-white/5">
              <Pagination 
                currentPage={page} 
                totalPages={Math.ceil(total / limit)} 
                onPageChange={setPage} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



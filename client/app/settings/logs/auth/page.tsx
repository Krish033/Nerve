"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  Lock, 
  Search, 
  Shield,
  UserCheck,
  ShieldAlert,
  Globe,
  Key,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination-industrial';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useAuthLogs } from '../_partials/imports/queries';
import { Heading } from '@/components/shared/heading';

interface AuthLog {
  id: string;
  action: string;
  status: string;
  ip: string;
  module: string;
  createdAt: string;
}

export default function AuthLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 5;

  const debouncedSearch = useDebounce(searchTerm, 500);
  const { data, isLoading: loading } = useAuthLogs({
    q: debouncedSearch,
    page,
    limit
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;


  return (
    <div className="space-y-12 pt-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/40 pb-10">
        <Heading 
          title="Authentication Matrix" 
          description="Security handshake records and identity validation buffer" 
          className="mb-0" 
        />
        
        <div className="flex items-center gap-8 py-4 px-6 border border-border/40 bg-muted/5 rounded-2xl">
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none">Security Node</p>
            <div className="flex items-center gap-2 justify-end">
              <ShieldCheck className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[13px] font-semibold text-primary">Sentinel Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 pt-4">
        <div className="relative flex-1 group">
          <input 
            placeholder="Search authentication signatures..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-transparent border-0 border-b border-border focus:border-primary rounded-none pl-0 pr-10 text-[16px] font-semibold placeholder:text-muted-foreground/20 transition-all tracking-tight"
          />
          <Search className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
        </div>
      </div>

      <div className="space-y-16">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-6 opacity-40">
            <Lock className="h-10 w-10 animate-pulse text-primary" />
            <p className="text-[12px] font-bold tracking-widest uppercase text-primary/60">Decoding Buffer...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-border/40 rounded-3xl opacity-10">
            <Shield className="h-12 w-12" />
            <p className="text-[13px] font-bold tracking-widest uppercase">Buffer Neutral</p>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Action / Time</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">Date</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">User</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">IP Address</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[11px]">System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: AuthLog) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", log.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500')} />
                          <div className="space-y-1">
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        Admin User
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {log.ip}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 py-0.5 bg-muted rounded-full inline-block">
                          {log.module || 'System'}
                        </span>
                      </td>
                    </tr>
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



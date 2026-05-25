"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Search, 
  Loader2, 
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Zap,
  Activity,
  Bell
} from "lucide-react";
import { SearchResultItem, useSearchResults } from "./_partials/imports/queries";
import { cn, safeFormatDistanceToNow } from "@/lib/utils";
import { Heading } from "@/components/shared/heading";

function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const activeTab = searchParams.get("tab") || "ALL";
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(queryParam);
  const [sortBy, setSortBy] = useState<"Relevancy" | "Newest">("Relevancy");

  const { data: results, isLoading: loading, error: queryError } = useSearchResults(queryParam);
  const error = queryError ? "The intelligence node is currently unreachable." : null;

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}&tab=${activeTab}`);
    }
  };

  const allResults = useMemo(() => {
    if (!results) return [];
    
    const items: SearchResultItem[] = [
      ...(results.notifications || []).map(i => ({ ...i, category: 'Intel' })),
      ...(results.settings || []).map(i => ({ ...i, category: 'Config' })),
      ...(results.users || []).map(i => ({ ...i, category: 'Identity' })),
      ...(results.logs?.activity || []).map(i => ({ ...i, category: 'Ops', title: i.action, message: i.details })),
      ...(results.logs?.errors || []).map(i => ({ ...i, category: 'Ops', title: i.type, message: i.message, severity: 'Error' })),
      ...(results.logs?.access || []).map(i => ({ ...i, category: 'Ops', title: `${i.method} ${i.path}`, message: `Source IP: ${i.ip}` })),
    ];

    if (sortBy === "Newest") {
      return items.sort((a, b) => {
        const valueA = a.createdAt || a.date;
        const valueB = b.createdAt || b.date;
        const dateA = valueA ? new Date(valueA).getTime() : 0;
        const dateB = valueB ? new Date(valueB).getTime() : 0;
        return dateB - dateA;
      });
    }

    return items;
  }, [results, sortBy]);

  const filteredResults = useMemo(() => {
    if (activeTab === "ALL") return allResults;
    return allResults.filter(i => i.category === activeTab);
  }, [allResults, activeTab]);

  const counts = useMemo(() => {
    if (!results) return { ALL: 0, Intel: 0, Config: 0, Identity: 0, Ops: 0 };
    return {
      ALL: allResults.length,
      Intel: results.notifications?.length || 0,
      Config: results.settings?.length || 0,
      Identity: results.users?.length || 0,
      Ops: (results.logs?.activity?.length || 0) + (results.logs?.errors?.length || 0) + (results.logs?.access?.length || 0),
    };
  }, [results, allResults]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header - Refined style */}
      <Heading 
        title="Global Search" 
        description="Unified intelligence index and matrix scanner" 
      />
      <div className="space-y-12">


        <div className="flex flex-col md:flex-row gap-8 pt-4 border-t border-border/40">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 group">
            <input 
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter signature to scan matrix..."
              className="w-full h-12 bg-transparent border-0 border-b border-border focus:border-primary rounded-none pl-0 pr-10 text-[18px] font-semibold placeholder:text-muted-foreground/20 transition-all tracking-tight"
            />
            <Search className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
          </form>
          
          <button 
            onClick={() => setSortBy(sortBy === "Relevancy" ? "Newest" : "Relevancy")}
            className="flex flex-col items-end group"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none mb-1">Sort Order</p>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-primary group-hover:underline underline-offset-4">{sortBy}</span>
              <ArrowUpDown className="h-4 w-4 text-primary/40" />
            </div>
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-16">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-40">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[12px] font-bold tracking-widest uppercase">Scanning Buffer...</p>
          </div>
        ) : error ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 text-red-500/60 bg-red-500/5 border border-red-500/10 rounded-3xl">
            <ShieldAlert className="h-12 w-12" />
            <div className="text-center space-y-1">
              <p className="text-[15px] font-bold tracking-tight uppercase">Protocol Error</p>
              <p className="text-[13px] font-medium opacity-60 italic tracking-tight">{error}</p>
            </div>
          </div>
        ) : !queryParam ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-10">
            <Activity className="h-16 w-16" />
            <p className="text-[12px] font-bold tracking-[0.5em] uppercase">Matrix Idle</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-10">
            <Zap className="h-16 w-16" />
            <p className="text-[12px] font-bold tracking-[0.5em] uppercase">Zero Matches Found</p>
          </div>
        ) : (
          <div className="space-y-16">
            {filteredResults.map((item) => (
              <div 
                key={`${item.category}-${item.id}`} 
                className="group transition-all relative border-l-2 border-border/40 hover:border-primary pl-12"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                        item.category === 'Intel' ? "border-primary/20 text-primary" :
                        item.category === 'Chat' ? "border-green-500/20 text-green-500" :
                        item.category === 'Identity' ? "border-purple-500/20 text-purple-500" :
                        item.category === 'Ops' ? "border-red-500/20 text-red-500" :
                        "border-border text-muted-foreground/40"
                      )}>
                        {item.category} Fragment
                      </span>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground/10 uppercase tracking-tighter">
                        VEC_{item.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground/20 uppercase tracking-tighter">
                      {item.createdAt || item.date ? safeFormatDistanceToNow(item.createdAt || item.date) : 'Historical Point'}
                    </span>
                  </div>

                  <div 
                    onClick={() => {
                      if (item.category === 'Intel') router.push('/notifications');
                      if (item.category === 'Ops') router.push('/settings/logs/activity');
                      if (item.category === 'Identity') router.push(`/admin/users/${item.id}`);
                    }}
                    className="space-y-3 cursor-pointer group/content"
                  >
                    <h3 className="text-2xl font-bold tracking-tight text-foreground group-hover/content:text-primary transition-colors">
                      {item.title || item.name || item.key || 'Untitled Vector'}
                    </h3>
                    <p className="text-[16px] font-medium leading-relaxed text-muted-foreground group-hover/content:text-foreground transition-colors max-w-5xl tracking-tight">
                      {item.content || item.message || item.lastMessage || item.email || 'No payload description available in current node buffer.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-500 pt-3">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Acknowledge Vector</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Suspense fallback={
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }>
        <SearchResults />
      </Suspense>
    </>
  );
}

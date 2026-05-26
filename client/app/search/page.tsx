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
  Bell,
  FileText,
  User,
  Settings,
  AlertTriangle,
  Clock,
  X
} from "lucide-react";
import { SearchResultItem, useSearchResults } from "./_partials/imports/queries";
import { cn, safeFormatDistanceToNow } from "@/lib/utils";
import { Heading } from "@/components/shared/heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Simple Badge component since it's not available
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "outline" | "secondary"; className?: string }) {
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

const categoryIcons = {
  Intel: Bell,
  Config: Settings,
  Identity: User,
  Ops: AlertTriangle,
  Chat: FileText,
};

const categoryColors = {
  Intel: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Config: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Identity: "bg-green-500/10 text-green-500 border-green-500/20",
  Ops: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Chat: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

function SearchResults() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const activeTab = searchParams.get("tab") || "ALL";
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(queryParam);
  const [sortBy, setSortBy] = useState<"relevance" | "newest">("relevance");

  const { data: results, isLoading: loading, error: queryError } = useSearchResults(queryParam);
  const error = queryError ? "Search service is currently unavailable." : null;

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}&tab=${activeTab}`);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    router.push("/search");
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

    if (sortBy === "newest") {
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

  const tabs = [
    { id: "ALL", label: "All Results", count: counts.ALL },
    { id: "Intel", label: "Notifications", count: counts.Intel },
    { id: "Identity", label: "Users", count: counts.Identity },
    { id: "Config", label: "Settings", count: counts.Config },
    { id: "Ops", label: "Logs", count: counts.Ops },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Heading 
          title="Search" 
          description="Search across notifications, users, settings, and logs" 
        />
        <Badge variant="secondary" className="w-fit">
          {counts.ALL} results found
        </Badge>
      </div>

      {/* Search Bar Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for notifications, users, settings..."
                className="pl-10 pr-10"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={() => setSortBy(sortBy === "relevance" ? "newest" : "relevance")}
              className="gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortBy === "relevance" ? "Relevance" : "Newest"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(`/search?q=${encodeURIComponent(queryParam)}&tab=${tab.id}`)}
            disabled={tab.count === 0 && tab.id !== "ALL"}
            className="gap-2"
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge variant={activeTab === tab.id ? "secondary" : "outline"} className="h-4 min-w-[1rem] px-1 text-[10px] ml-1">
                {tab.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {loading ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
              <ShieldAlert className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Search Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : !queryParam ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Search className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="font-medium">Enter a search term</p>
                <p className="text-sm opacity-60">Search across all your data</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredResults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Zap className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="font-medium">No results found</p>
                <p className="text-sm opacity-60">Try adjusting your search terms</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((item) => {
              const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons] || FileText;
              return (
                <Card 
                  key={`${item.category}-${item.id}`}
                  className="group hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.category === 'Intel') router.push('/notifications');
                    if (item.category === 'Ops') router.push('/settings/logs/activity');
                    if (item.category === 'Identity') router.push(`/admin/users/${item.id}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        categoryColors[item.category as keyof typeof categoryColors] || "bg-muted text-muted-foreground"
                      )}>
                        <CategoryIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            ID: {item.id.substring(0, 8)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3" />
                            {item.createdAt || item.date 
                              ? safeFormatDistanceToNow(item.createdAt || item.date) 
                              : 'Unknown'}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold mt-2 group-hover:text-primary transition-colors">
                          {item.title || item.name || item.key || 'Untitled'}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.content || item.message || item.lastMessage || item.email || 'No description available'}
                        </p>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuth';
import { useThemeStore } from '@/lib/store/use-theme-store';
import { Download, Check, Sparkles, Search, Palette, Layers, Radius, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";

export default function MarketplaceThemesPage() {
  const { user } = useAuthStore();
  const { installedThemes, setInstalledThemes, activeTheme, setActiveTheme } = useThemeStore();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('http://localhost:3002/marketplace/themes')
      .then(res => res.json())
      .then(data => {
        setThemes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Fetch installed themes on mount to ensure sync
  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:3002/marketplace/users/${user.id}/themes`)
      .then(res => res.json())
      .then(data => {
        setInstalledThemes(data);
      })
      .catch(err => console.error("Failed to sync themes:", err));
  }, [user?.id, setInstalledThemes]);

  const handleInstall = async (themeId: string) => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setInstalling(themeId);
    try {
      const installRes = await fetch(`http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}/install`, {
        method: 'POST'
      });
      
      if (!installRes.ok) {
        const errorText = await installRes.text();
        throw new Error(`Install failed: ${installRes.status} - ${errorText}`);
      }
      
      toast.success("Theme installed successfully");
      
      // Re-fetch installed themes to update the store
      const res = await fetch(`http://localhost:3002/marketplace/users/${user.id}/themes`);
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }
      
      const installedItems = await res.json();
      setInstalledThemes(installedItems);
    } catch (err) {
      console.error('Install error:', err);
      toast.error("Failed to install theme");
    } finally {
      setInstalling(null);
    }
  };

  const handleActivate = async (themeId: string, theme: any) => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setInstalling(themeId);
    try {
      await fetch(`http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}/activate`, {
        method: 'POST'
      });
      toast.success(`${theme.name} activated`);
      // Update active theme in store
      setActiveTheme(theme);
      // Re-fetch to sync all installed themes status
      const res = await fetch(`http://localhost:3002/marketplace/users/${user.id}/themes`);
      const installedItems = await res.json();
      setInstalledThemes(installedItems);
    } catch (err) {
      toast.error("Failed to activate theme");
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex gap-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loading catalog...</div>;
  }

  const filteredThemes = themes.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Heading 
          title="Theme Catalog" 
          description="Premium interface configurations" 
          className="mb-0" 
        />
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search themes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            {filteredThemes.length}
          </div>
        </div>
      </div>

      {/* Themes Grid - 3 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredThemes.map((theme) => {
          const isInstalled = installedThemes.some(it => it.itemId === theme.id);
          const isActive = activeTheme?.id === theme.id;
          const isProcessing = installing === theme.id;
          const colors = theme.config?.colors || {};
          const style = theme.config?.style || {};
          
          return (
            <div 
              key={theme.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
            >
              {/* Theme Preview Header */}
              <div 
                className="h-36 p-4 relative overflow-hidden"
                style={{
                  backgroundColor: colors.background || '#000',
                  color: colors.foreground || '#fff',
                  fontFamily: theme.config?.fontFamily,
                  borderRadius: style.radius || '8px'
                }}
              >
                {/* Scanlines Effect */}
                {style.scanlines && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)'
                    }}
                  />
                )}
                
                {/* Glassmorphism Overlay */}
                {style.glassmorphism && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                )}

                {/* Preview Content */}
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.foreground }}>
                      {theme.name}
                    </h3>
                    <p className="text-xs mt-1 opacity-60 line-clamp-1" style={{ color: colors.foreground }}>
                      {theme.description}
                    </p>
                  </div>
                  
                  {/* Mock UI Elements */}
                  <div className="flex items-center gap-2 mt-3">
                    <div 
                      className="h-2 w-12 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <div 
                      className="h-2 w-8 rounded-full opacity-40"
                      style={{ backgroundColor: colors.foreground }}
                    />
                    <div 
                      className="h-2 w-6 rounded-full opacity-30"
                      style={{ backgroundColor: colors.foreground }}
                    />
                  </div>
                </div>
              </div>

              {/* Color Palette Swatches */}
              <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.background }}
                    title="Background"
                  />
                  <div 
                    className="w-8 h-8 rounded-lg shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.foreground }}
                    title="Foreground"
                  />
                  <div 
                    className="w-8 h-8 rounded-lg shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.primary }}
                    title="Primary"
                  />
                  <div 
                    className="w-8 h-8 rounded-lg shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.card }}
                    title="Card"
                  />
                  <div className="ml-auto flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Theme Info & Actions */}
              <div className="p-4 border-t border-border flex items-center justify-between bg-card">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">{theme.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {theme.author}
                  </span>
                </div>
                
                {/* Feature Badges */}
                <div className="flex items-center gap-1.5 mr-2">
                  {style.glassmorphism && (
                    <span className="p-1 rounded bg-primary/10 text-primary" title="Glassmorphism">
                      <Layers className="w-3 h-3" />
                    </span>
                  )}
                  {style.scanlines && (
                    <span className="p-1 rounded bg-primary/10 text-primary" title="Scanlines">
                      <Activity className="w-3 h-3" />
                    </span>
                  )}
                  <span 
                    className="p-1 rounded bg-primary/10 text-primary" 
                    title={`Radius: ${style.radius}`}
                  >
                    <Radius className="w-3 h-3" />
                  </span>
                </div>

                {isActive ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    icon={Check}
                    className="h-8 px-3"
                  >
                    Active
                  </Button>
                ) : isInstalled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleActivate(theme.id, theme)}
                    loading={isProcessing}
                    icon={Check}
                    className="h-8 px-3"
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleInstall(theme.id)}
                    loading={isProcessing}
                    icon={Download}
                    className="h-8 px-3"
                  >
                    Install
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredThemes.length === 0 && (
        <div className="text-center py-16">
          <Palette className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No themes found matching your search.</p>
        </div>
      )}
    </div>
  );
}

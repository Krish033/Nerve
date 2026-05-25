"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useThemeStore } from "@/lib/store/use-theme-store";
import { useAuthStore } from "@/lib/store/useAuth";
import { useLayoutStore } from "@/lib/store/use-layout-store";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";
import {
  Palette,
  CheckCircle2,
  Type,
  Box,
  Layout,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function ThemesSettingsPage() {
  const { user } = useAuthStore();
  const {
    installedThemes,
    activeTheme,
    activeFont,
    activeIconPack,
    setActiveTheme,
    setActiveFont,
    setActiveIconPack,
    setInstalledThemes,
  } = useThemeStore();
  const [activeTab, setActiveTab] = React.useState<
    "THEMES" | "FONTS" | "ICONS" | "LAYOUT"
  >("THEMES");
  const [loading, setLoading] = React.useState(false);
  const layoutStore = useLayoutStore();

  const myThemes = installedThemes.filter((it) => it.item.type === "THEME");
  const myFonts = installedThemes.filter((it) => it.item.type === "FONT");
  const myIcons = installedThemes.filter((it) => it.item.type === "ICON_PACK");

  // Sync installed themes when page loads
  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:3002/marketplace/users/${user.id}/themes`)
      .then((res) => res.json())
      .then((data) => {
        setInstalledThemes(data);
        // Also sync active items
        const activeThemeItem = data.find((ui: any) => ui.isActive && ui.item?.type === 'THEME');
        const activeFontItem = data.find((ui: any) => ui.isActive && ui.item?.type === 'FONT');
        const activeIconItem = data.find((ui: any) => ui.isActive && ui.item?.type === 'ICON_PACK');
        if (activeThemeItem) setActiveTheme(activeThemeItem.item);
        if (activeFontItem) setActiveFont(activeFontItem.item);
        if (activeIconItem) setActiveIconPack(activeIconItem.item);
      })
      .catch((err) => console.error("Failed to sync themes:", err));
  }, [user?.id, setInstalledThemes, setActiveTheme, setActiveFont, setActiveIconPack]);

  const handleActivate = async (themeId: string, item: any, type: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch(
        `http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}/activate`,
        {
          method: "POST",
        },
      );
      // Optimistically update
      if (type === "THEME") setActiveTheme(item);
      if (type === "FONT") setActiveFont(item);
      if (type === "ICON_PACK") setActiveIconPack(item);

      setInstalledThemes(
        installedThemes.map((t) => {
          if (t.item?.type === type) {
            return { ...t, isActive: t.itemId === themeId };
          }
          return t;
        }),
      );
      toast.success(`${item.name} activated`);
    } catch (err) {
      toast.error(`Failed to activate ${type.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Heading
        title="Appearance"
        description="Manage themes, fonts, icons, and layout settings."
      />
      <div className="flex items-center gap-4 border-b border-border overflow-x-auto">
        {["THEMES", "FONTS", "ICONS", "LAYOUT"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-4 py-3 text-sm border-b-2 whitespace-nowrap transition-colors",
              activeTab === tab
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "FONTS"
              ? "Typography"
              : tab === "ICONS"
                ? "Icon Packs"
                : tab === "LAYOUT"
                  ? "Layout Engine"
                  : "Themes"}
          </button>
        ))}
      </div>

      {activeTab === "LAYOUT" && (
        <div className="space-y-8">
          <div className="space-y-6">
            <Heading 
              title="Sidebar position" 
              className="pt-2"
            />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(["left", "right", "top", "bottom", "floating"] as const).map(
                (pos) => (
                  <button
                    key={pos}
                    onClick={() => layoutStore.setSidebarPlacement(pos)}
                    className={cn(
                      "p-5 rounded-xl border flex flex-col items-center gap-3 transition-colors",
                      layoutStore.sidebarPlacement === pos
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    <div className="h-12 w-20 border-2 border-current rounded-lg relative opacity-50 overflow-hidden">
                      <div
                        className={cn(
                          "absolute bg-current",
                          pos === "left" &&
                            "left-0 top-0 bottom-0 w-4 border-r-2 border-current",
                          pos === "right" &&
                            "right-0 top-0 bottom-0 w-4 border-l-2 border-current",
                          pos === "top" &&
                            "left-0 top-0 right-0 h-4 border-b-2 border-current",
                          pos === "bottom" &&
                            "left-0 bottom-0 right-0 h-4 border-t-2 border-current",
                          pos === "floating" &&
                            "left-1.5 top-1.5 bottom-1.5 w-3 rounded-sm",
                        )}
                      />
                    </div>
                    <span className="text-xs font-medium capitalize">
                      {pos}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Heading 
              title="Component visibility" 
              className="pt-2"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Navbar Search",
                  desc: "Omni-search input in the top bar.",
                  active: !layoutStore.hideNavbarSearch,
                  toggle: () => layoutStore.setHideNavbarSearch(!layoutStore.hideNavbarSearch),
                  icon: Box
                },
                {
                  title: "Sidebar Icons",
                  desc: "Display icons in the navigation panel.",
                  active: !layoutStore.hideSidebarIcons,
                  toggle: () => layoutStore.setHideSidebarIcons(!layoutStore.hideSidebarIcons),
                  icon: Layout
                },
                {
                  title: "Sidebar Panel",
                  desc: "Master visibility for the sidebar panel.",
                  active: !layoutStore.hideSidebarMenus,
                  toggle: () => layoutStore.setHideSidebarMenus(!layoutStore.hideSidebarMenus),
                  icon: Layout
                },
                {
                  title: "Compact Sidebar",
                  desc: "Reduce sidebar width to icons only.",
                  active: layoutStore.compactSidebar,
                  toggle: () => layoutStore.setCompactSidebar(!layoutStore.compactSidebar),
                  icon: Layout
                },
                {
                  title: "Sticky Navbar",
                  desc: "Keep the top bar fixed while scrolling.",
                  active: layoutStore.stickyNavbar,
                  toggle: () => layoutStore.setStickyNavbar(!layoutStore.stickyNavbar),
                  icon: Box
                },
                {
                  title: "Breadcrumbs",
                  desc: "Show hierarchical path in navigation.",
                  active: layoutStore.showBreadcrumbs,
                  toggle: () => layoutStore.setShowBreadcrumbs(!layoutStore.showBreadcrumbs),
                  icon: ArrowRight
                },
                {
                  title: "Max-Width Layout",
                  desc: "Toggle between full width and centered.",
                  active: layoutStore.contentMaxWidth === 'prose',
                  toggle: () => layoutStore.setContentMaxWidth(layoutStore.contentMaxWidth === 'full' ? 'prose' : 'full'),
                  icon: Box
                }
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl border border-border bg-card flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className={cn(
                      "p-2 rounded-md border border-border transition-colors",
                      item.active ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={item.toggle}
                    className={cn(
                      "w-10 h-5 rounded-full relative",
                      item.active ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm",
                        item.active ? "left-5.5" : "left-0.5",
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "THEMES" && (
        <div className="space-y-6">
          <Heading title="Installed themes" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myThemes.map((installedItem) => {
              const theme = installedItem.item;
              const isActive = activeTheme?.id === theme.id;

              return (
                <div
                  key={theme.id}
                  className={cn(
                    "group relative p-5 rounded-xl border transition-colors",
                    isActive
                      ? "border-foreground/30 bg-accent"
                      : "border-border bg-card hover:border-foreground/20",
                  )}
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <div className="p-2 bg-muted rounded-md">
                          <Palette className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {/* Color Palette */}
                        <div className="flex -space-x-1.5 items-center ml-2">
                          {theme.config?.colors && Object.entries(theme.config.colors).map(([key, color]) => (
                            <div 
                              key={key}
                              className="w-4 h-4 rounded-full border-2 border-background ring-1 ring-border/20 shadow-sm"
                              style={{ backgroundColor: color as string }}
                              title={key}
                            />
                          ))}
                        </div>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-foreground">{theme.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium">
                        {theme.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">By {theme.author || 'System'}</span>
                      </div>
                      <Button
                        variant={isActive ? "secondary" : "default"}
                        size="sm"
                        className={cn(isActive && "opacity-50")}
                        disabled={isActive || loading}
                        onClick={() => handleActivate(theme.id, theme, "THEME")}
                        icon={isActive ? CheckCircle2 : Palette}
                      >
                        {isActive ? "Active" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {myThemes.length === 0 && (
            <div className="p-12 text-center rounded-xl border border-border bg-card">
              <Palette className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No themes installed</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                Head over to the marketplace to discover new configurations.
              </p>
              <Button asChild size="lg" icon={ArrowRight} iconPlacement="right">
                <Link href="/marketplace/themes">Explore Marketplace</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "FONTS" && (
        <div className="space-y-6">
          <Heading title="Installed fonts" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myFonts.map((installedItem) => {
              const font = installedItem.item;
              const isActive = activeFont?.id === font.id;

              return (
                <div
                  key={font.id}
                  className={cn(
                    "group relative p-5 rounded-xl border transition-colors",
                    isActive
                      ? "border-foreground/30 bg-accent"
                      : "border-border bg-card hover:border-foreground/20",
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div style={{ fontFamily: font.config?.fontFamily }} className="text-3xl font-semibold text-foreground">
                        Aa
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    <div style={{ fontFamily: font.config?.fontFamily }}>
                      <div className="text-base font-semibold">{font.name}</div>
                      <div className="text-sm text-muted-foreground mt-2 font-medium opacity-70">
                        The quick brown fox jumps over the lazy dog.
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex gap-1">
                         <span className="px-1.5 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">Sans</span>
                         <span className="px-1.5 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">Variable</span>
                      </div>
                      <Button
                        variant={isActive ? "secondary" : "default"}
                        size="sm"
                        className={cn(
                          "px-5",
                          isActive && "opacity-50"
                        )}
                        disabled={isActive || loading}
                        onClick={() => handleActivate(font.id, font, "FONT")}
                        icon={isActive ? CheckCircle2 : Type}
                      >
                        {isActive ? "Active" : "Apply"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {myFonts.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">No custom fonts installed.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "ICONS" && (
        <div className="space-y-6">
          <Heading title="Installed icon packs" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myIcons.map((installedItem) => {
              const pack = installedItem.item;
              const isActive = activeIconPack?.id === pack.id;

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "group relative p-5 rounded-xl border transition-colors",
                    isActive
                      ? "border-foreground/30 bg-accent"
                      : "border-border bg-card hover:border-foreground/20",
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-muted rounded-md">
                        <Box className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold">{pack.name}</div>
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        <Box className="w-4 h-4 text-muted-foreground" />
                        <Layout className="w-4 h-4 text-muted-foreground" />
                        <Palette className="w-4 h-4 text-muted-foreground" />
                        <Type className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">1200+ icons</span>
                      </div>
                      <Button
                        variant={isActive ? "secondary" : "default"}
                        size="sm"
                        className={cn(
                          "px-5",
                          isActive && "opacity-50"
                        )}
                        disabled={isActive || loading}
                        onClick={() => handleActivate(pack.id, pack, "ICON_PACK")}
                        icon={isActive ? CheckCircle2 : Box}
                      >
                        {isActive ? "Active" : "Apply"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {myIcons.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">No icon packs installed.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button variant="outline" size="sm" asChild icon={Plus}>
          <Link href="/marketplace">Browse Marketplace</Link>
        </Button>
      </div>
    </div>
  );
}

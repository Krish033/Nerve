"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuth";
import { useThemeStore } from "@/lib/store/use-theme-store";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { setInstalledThemes, setActiveTheme, setActiveFont } = useThemeStore();

  useEffect(() => {
    if (!user?.id) return;

    // Fetch user themes through gateway API
    const syncMarketplaceItems = async () => {
      try {
        const response = await api.get(`/marketplace/users/${user.id}/themes`);
        const installedItems = response.data;
        
        setInstalledThemes(installedItems || []);
        
        const activeTheme = installedItems?.find((ui: any) => ui.isActive && ui.item?.type === 'THEME');
        const activeFont = installedItems?.find((ui: any) => ui.isActive && ui.item?.type === 'FONT');
        
        setActiveTheme(activeTheme ? activeTheme.item : null);
        setActiveFont(activeFont ? activeFont.item : null);
      } catch (err) {
        // Log but don't break the app - marketplace is optional
        logger.warn("Marketplace sync unavailable", { 
          userId: user.id, 
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        // Set empty defaults to prevent UI breakage
        setInstalledThemes([]);
      }
    };

    syncMarketplaceItems();
  }, [user?.id, setInstalledThemes, setActiveTheme, setActiveFont]);

  return <>{children}</>;
}

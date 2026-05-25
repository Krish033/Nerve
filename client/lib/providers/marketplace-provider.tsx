"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuth";
import { useThemeStore } from "@/lib/store/use-theme-store";

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { setInstalledThemes, setActiveTheme, setActiveFont } = useThemeStore();

  useEffect(() => {
    if (!user?.id) return;

    // Fetch user themes
    fetch(`http://localhost:3002/marketplace/users/${user.id}/themes`)
      .then((res) => res.json())
      .then((installedItems) => {
        setInstalledThemes(installedItems);
        
        const activeTheme = installedItems.find((ui: any) => ui.isActive && ui.item.type === 'THEME');
        const activeFont = installedItems.find((ui: any) => ui.isActive && ui.item.type === 'FONT');
        
        setActiveTheme(activeTheme ? activeTheme.item : null);
        setActiveFont(activeFont ? activeFont.item : null);
      })
      .catch((err) => console.error("Failed to sync marketplace items:", err));
  }, [user?.id, setInstalledThemes, setActiveTheme, setActiveFont]);

  return <>{children}</>;
}

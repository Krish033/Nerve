"use client";

import React, { useEffect } from "react";
import { useTheme } from "next-themes";
import { useThemeStore } from "../store/use-theme-store";

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { accentColor, activeTheme, activeFont, activeIconPack } = useThemeStore();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    // Dynamic Icon Pack
    if (activeIconPack?.config) {
      const { strokeWidth, strokeLinecap, strokeLinejoin } = activeIconPack.config as any;
      if (strokeWidth) root.style.setProperty("--icon-stroke-width", strokeWidth);
      if (strokeLinecap) root.style.setProperty("--icon-stroke-linecap", strokeLinecap);
      if (strokeLinejoin) root.style.setProperty("--icon-stroke-linejoin", strokeLinejoin);
    } else {
      root.style.removeProperty("--icon-stroke-width");
      root.style.removeProperty("--icon-stroke-linecap");
      root.style.removeProperty("--icon-stroke-linejoin");
    }

    // Font Injection Logic
    const targetFont = activeFont?.config?.fontFamily || activeTheme?.config?.fontFamily;
    if (targetFont) {
      root.style.setProperty("--font-mono", targetFont);
      root.style.setProperty("--font-sans", targetFont);
      
      // Load Font
      const cssUrl = (activeFont?.config as any)?.cssUrl || (activeTheme?.config as any)?.cssUrl;
      const match = targetFont.match(/'([^']+)'/);
      
      if (cssUrl || (match && match[1])) {
        const url = cssUrl || `https://fonts.googleapis.com/css2?family=${match![1].replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
        let link = document.getElementById('dynamic-google-font') as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.id = 'dynamic-google-font';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        if (link.href !== url) {
          link.href = url;
        }
      }
    } else {
      root.style.removeProperty("--font-mono");
      root.style.removeProperty("--font-sans");
    }

    if (activeTheme) {
      // Apply Custom Theme Config
      const { config } = activeTheme;
      if (config.colors) {
        const colors = config.colors as any;
        
        // Set main colors
        Object.entries(colors).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value as string);
        });
        
        // Generate derived colors for proper contrast
        const bg = colors.background || (isDark ? "oklch(0.1 0 0)" : "oklch(0.98 0 0)");
        const fg = colors.foreground || (isDark ? "oklch(0.95 0 0)" : "oklch(0.1 0 0)");
        const primary = colors.primary || "oklch(0.6 0.2 260)";
        const card = colors.card || bg;
        
        // Parse primary to calculate foreground contrast
        const primaryMatch = primary.match(/oklch\(([\d.]+)\s/);
        let primaryL = primaryMatch ? parseFloat(primaryMatch[1]) : 0.6;
        // Use white text for dark primaries (L <= 0.6), black text for light primaries (L > 0.6)
        const primaryFg = primaryL > 0.6 ? "oklch(0.05 0 0)" : "oklch(0.98 0 0)";
        
        // Set all required shadcn variables
        root.style.setProperty("--primary-foreground", primaryFg);
        root.style.setProperty("--card-foreground", fg);
        root.style.setProperty("--popover", card);
        root.style.setProperty("--popover-foreground", fg);
        root.style.setProperty("--secondary", card);
        root.style.setProperty("--secondary-foreground", fg);
        root.style.setProperty("--muted", card);
        root.style.setProperty("--muted-foreground", isDark ? "oklch(0.65 0 0)" : "oklch(0.45 0 0)");
        root.style.setProperty("--accent", primary);
        root.style.setProperty("--accent-foreground", primaryFg);
        root.style.setProperty("--destructive", "oklch(0.577 0.245 27.325)");
        root.style.setProperty("--destructive-foreground", "oklch(0.985 0 0)");
        root.style.setProperty("--input", colors.border || "oklch(0.3 0 0)");
        root.style.setProperty("--ring", primary);
      }
      return; // Skip fallback logic
    }

    // Default fallback logic
    // Inject CSS variables for the selected accent color to :root

    // Oklch mapping for accent colors
    const colorMap: Record<string, string> = {
      indigo: "0.55 0.2 265",
      crimson: "0.55 0.2 20",
      emerald: "0.65 0.2 150",
      amber: "0.75 0.2 45",
      violet: "0.45 0.2 300",
      noir: isDark ? "0.98 0 0" : "0 0 0",
    };

    const colorValue = colorMap[accentColor] || colorMap.indigo;
    const [l, c, h] = colorValue.split(" ").map(parseFloat);

    // Standard overriding for primary and interactive elements
    root.style.setProperty("--primary", `oklch(${colorValue})`);
    root.style.setProperty("--ring", `oklch(${colorValue})`);

    // Handle global theme overrides
    if (accentColor === "noir") {
      // PURE MONOCHROME MODE
      if (isDark) {
        root.style.setProperty("--background", "oklch(0 0 0)");
        root.style.setProperty("--foreground", "oklch(1 0 0)");
        root.style.setProperty("--card", "oklch(0.06 0 0)");
        root.style.setProperty("--card-foreground", "oklch(1 0 0)");
        root.style.setProperty("--popover", "oklch(0.06 0 0)");
        root.style.setProperty("--popover-foreground", "oklch(1 0 0)");
        root.style.setProperty("--primary", "oklch(1 0 0)");
        root.style.setProperty("--primary-foreground", "oklch(0 0 0)");
        root.style.setProperty("--secondary", "oklch(0.12 0 0)");
        root.style.setProperty("--secondary-foreground", "oklch(1 0 0)");
        root.style.setProperty("--muted", "oklch(0.1 0 0)");
        root.style.setProperty("--muted-foreground", "oklch(0.75 0 0)");
        root.style.setProperty("--accent", "oklch(0.15 0 0)");
        root.style.setProperty("--accent-foreground", "oklch(1 0 0)");
        root.style.setProperty("--border", "oklch(0.35 0 0)");
        root.style.setProperty("--input", "oklch(0.25 0 0)");
        root.style.setProperty("--ring", "oklch(1 0 0)");
      } else {
        root.style.setProperty("--background", "oklch(1 0 0)");
        root.style.setProperty("--foreground", "oklch(0 0 0)");
        root.style.setProperty("--card", "oklch(0.98 0 0)");
        root.style.setProperty("--card-foreground", "oklch(0 0 0)");
        root.style.setProperty("--popover", "oklch(0.98 0 0)");
        root.style.setProperty("--popover-foreground", "oklch(0 0 0)");
        root.style.setProperty("--primary", "oklch(0 0 0)");
        root.style.setProperty("--primary-foreground", "oklch(1 0 0)");
        root.style.setProperty("--secondary", "oklch(0.94 0 0)");
        root.style.setProperty("--secondary-foreground", "oklch(0 0 0)");
        root.style.setProperty("--muted", "oklch(0.94 0 0)");
        root.style.setProperty("--muted-foreground", "oklch(0.4 0 0)");
        root.style.setProperty("--accent", "oklch(0.94 0 0)");
        root.style.setProperty("--accent-foreground", "oklch(0 0 0)");
        root.style.setProperty("--border", "oklch(0.88 0 0)");
        root.style.setProperty("--input", "oklch(0.88 0 0)");
        root.style.setProperty("--ring", "oklch(0 0 0)");
      }
    } else {
      // TINTED ACCENT MODE
      // Reset background to theme defaults (allowing CSS variables to take over)
      root.style.removeProperty("--background");
      root.style.removeProperty("--card");
      root.style.removeProperty("--popover");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--muted");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--border");
      root.style.removeProperty("--input");

      // Calculate contrasting primary-foreground
      const pfL = l > 0.7 ? "0.1 0.01 240" : "0.99 0 0";
      root.style.setProperty("--primary-foreground", `oklch(${pfL})`);

      // Ensure foreground readability
      const adjustedL = isDark ? Math.max(l, 0.6) : Math.min(l, 0.4);
      root.style.setProperty("--foreground", `oklch(${adjustedL} ${c} ${h})`);
    }
  }, [accentColor, resolvedTheme, activeTheme, activeFont, activeIconPack]);

  return <>{children}</>;
}



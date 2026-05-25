"use client";

import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useThemeStore } from "../store/use-theme-store";

// Cache for computed color values to avoid recalculation
const colorCache = new Map<string, string>();

// Memoized CSS variable application
const applyCSSVariables = (
  root: HTMLElement,
  variables: Record<string, string>
) => {
  Object.entries(variables).forEach(([key, value]) => {
    const cacheKey = `${key}:${value}`;
    const cached = colorCache.get(cacheKey);
    
    if (cached !== value) {
      root.style.setProperty(key, value);
      colorCache.set(cacheKey, value);
    }
  });
};

// Parse primary color lightness once with memoization
const parsePrimaryLightness = (primary: string): number => {
  const match = primary.match(/oklch\(([\d.]+)\s/);
  return match ? parseFloat(match[1]) : 0.6;
};

// Pre-computed color maps for performance
const ACCENT_COLOR_MAP: Record<string, string> = {
  indigo: "0.55 0.2 265",
  crimson: "0.55 0.2 20",
  emerald: "0.65 0.2 150",
  amber: "0.75 0.2 45",
  violet: "0.45 0.2 300",
};

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  // Use selector pattern to prevent unnecessary re-renders
  const accentColor = useThemeStore((state) => state.accentColor);
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const activeFont = useThemeStore((state) => state.activeFont);
  const activeIconPack = useThemeStore((state) => state.activeIconPack);
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  // Refs to track previous values and avoid unnecessary DOM updates
  const prevThemeRef = useRef<string | null>(null);
  const prevFontRef = useRef<string | null>(null);
  const prevIconRef = useRef<string | null>(null);

  // Memoized font URL computation
  const fontUrl = useMemo(() => {
    const targetFont = activeFont?.config?.fontFamily || activeTheme?.config?.fontFamily;
    if (!targetFont) return null;

    const cssUrl = (activeFont?.config as any)?.cssUrl || (activeTheme?.config as any)?.cssUrl;
    if (cssUrl) return cssUrl;

    const match = targetFont.match(/'([^']+)'/);
    if (!match?.[1]) return null;

    return `https://fonts.googleapis.com/css2?family=${match[1].replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`;
  }, [activeFont, activeTheme]);

  // Memoized CSS variable computation
  const cssVariables = useMemo(() => {
    const variables: Record<string, string> = {};

    // Dynamic Icon Pack
    if (activeIconPack?.config) {
      const { strokeWidth, strokeLinecap, strokeLinejoin } = activeIconPack.config as any;
      if (strokeWidth) variables["--icon-stroke-width"] = strokeWidth;
      if (strokeLinecap) variables["--icon-stroke-linecap"] = strokeLinecap;
      if (strokeLinejoin) variables["--icon-stroke-linejoin"] = strokeLinejoin;
    }

    // Font variables
    const targetFont = activeFont?.config?.fontFamily || activeTheme?.config?.fontFamily;
    if (targetFont) {
      variables["--font-mono"] = targetFont;
      variables["--font-sans"] = targetFont;
    }

    // Custom theme colors
    if (activeTheme?.config?.colors) {
      const colors = activeTheme.config.colors as any;
      
      // Set main colors
      Object.entries(colors).forEach(([key, value]) => {
        variables[`--${key}`] = value as string;
      });

      // Generate derived colors
      const bg = colors.background || (isDark ? "oklch(0.1 0 0)" : "oklch(0.98 0 0)");
      const fg = colors.foreground || (isDark ? "oklch(0.95 0 0)" : "oklch(0.1 0 0)");
      const primary = colors.primary || "oklch(0.6 0.2 260)";
      const card = colors.card || bg;

      // Calculate primary foreground based on lightness
      const primaryL = parsePrimaryLightness(primary);
      const primaryFg = primaryL > 0.6 ? "oklch(0.05 0 0)" : "oklch(0.98 0 0)";

      // Set all required shadcn variables
      variables["--primary-foreground"] = primaryFg;
      variables["--card-foreground"] = fg;
      variables["--popover"] = card;
      variables["--popover-foreground"] = fg;
      variables["--secondary"] = card;
      variables["--secondary-foreground"] = fg;
      variables["--muted"] = card;
      variables["--muted-foreground"] = isDark ? "oklch(0.65 0 0)" : "oklch(0.45 0 0)";
      variables["--accent"] = primary;
      variables["--accent-foreground"] = primaryFg;
      variables["--destructive"] = "oklch(0.577 0.245 27.325)";
      variables["--destructive-foreground"] = "oklch(0.985 0 0)";
      variables["--input"] = colors.border || "oklch(0.3 0 0)";
      variables["--ring"] = primary;
    } else if (accentColor) {
      // Accent color mode (no custom theme)
      const colorValue = ACCENT_COLOR_MAP[accentColor];
      if (colorValue) {
        const [l, c, h] = colorValue.split(" ").map(parseFloat);
        variables["--primary"] = `oklch(${colorValue})`;
        variables["--ring"] = `oklch(${colorValue})`;
        
        const pfL = l > 0.7 ? "0.1 0.01 240" : "0.99 0 0";
        variables["--primary-foreground"] = `oklch(${pfL})`;
        
        const adjustedL = isDark ? Math.max(l, 0.6) : Math.min(l, 0.4);
        variables["--foreground"] = `oklch(${adjustedL} ${c} ${h})`;
      }
    }

    return variables;
  }, [activeTheme, activeFont, activeIconPack, accentColor, isDark]);

  // Apply CSS variables with batched DOM updates
  useEffect(() => {
    const root = document.documentElement;
    
    // Batch all CSS variable updates
    requestAnimationFrame(() => {
      applyCSSVariables(root, cssVariables);
    });
  }, [cssVariables]);

  // Font loading with deduplication
  useEffect(() => {
    if (!fontUrl) {
      // Clean up font link if no font needed
      const existingLink = document.getElementById("dynamic-google-font") as HTMLLinkElement;
      if (existingLink) {
        existingLink.remove();
      }
      return;
    }

    // Check if we already have this font loaded
    const currentFontId = activeFont?.id || activeTheme?.id;
    if (prevFontRef.current === currentFontId) return;
    prevFontRef.current = currentFontId || null;

    let link = document.getElementById("dynamic-google-font") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.id = "dynamic-google-font";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    
    if (link.href !== fontUrl) {
      link.href = fontUrl;
    }

    return () => {
      // Don't remove on unmount - font stays for performance
    };
  }, [fontUrl, activeFont?.id, activeTheme?.id]);

  // Clean up icon styles when icon pack changes
  useEffect(() => {
    const currentIconId = activeIconPack?.id;
    if (prevIconRef.current && prevIconRef.current !== currentIconId) {
      const root = document.documentElement;
      root.style.removeProperty("--icon-stroke-width");
      root.style.removeProperty("--icon-stroke-linecap");
      root.style.removeProperty("--icon-stroke-linejoin");
    }
    prevIconRef.current = currentIconId || null;
  }, [activeIconPack?.id]);

  return <>{children}</>;
}

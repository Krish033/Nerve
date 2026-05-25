import { create } from "zustand";
import { persist } from "zustand/middleware";

// Type definitions
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  card: string;
  border: string;
}

export interface ThemeStyle {
  scanlines: boolean;
  glassmorphism: boolean;
  radius: string;
}

export interface ThemeConfig {
  fontFamily: string;
  cssUrl?: string;
  colors: ThemeColors;
  style: ThemeStyle;
  loadingIndicator: "pulse" | "spinner" | "bar" | "scan";
}

export interface MarketplaceItem {
  id: string;
  name: string;
  type: string;
  description: string;
  config: ThemeConfig;
  author: string;
  assets?: any;
}

export interface UserInstalledItem {
  id: string;
  itemId: string;
  isActive: boolean;
  item: MarketplaceItem;
}

export type AccentColor = "indigo" | "crimson" | "emerald" | "amber" | "violet" | "noir";

// State interface
interface ThemeState {
  // Legacy
  accentColor: AccentColor;
  isIndustrial: boolean;
  scanlines: boolean;
  glassmorphism: boolean;

  // New Theme Engine
  installedThemes: UserInstalledItem[];
  activeTheme: MarketplaceItem | null;
  activeFont: MarketplaceItem | null;
  activeIconPack: MarketplaceItem | null;
}

// Actions interface
interface ThemeActions {
  setInstalledThemes: (themes: UserInstalledItem[]) => void;
  setActiveTheme: (theme: MarketplaceItem | null) => void;
  setActiveFont: (font: MarketplaceItem | null) => void;
  setActiveIconPack: (pack: MarketplaceItem | null) => void;
  setAccentColor: (color: AccentColor) => void;
  toggleIndustrial: () => void;
  toggleScanlines: () => void;
  toggleGlassmorphism: () => void;
}

// Create the base store with optimized persistence
const useThemeStoreBase = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      accentColor: "indigo",
      isIndustrial: true,
      scanlines: true,
      glassmorphism: true,

      installedThemes: [],
      activeTheme: null,
      activeFont: null,
      activeIconPack: null,

      setInstalledThemes: (themes) => set({ installedThemes: themes }),
      setActiveTheme: (theme) => set({ activeTheme: theme }),
      setActiveFont: (font) => set({ activeFont: font }),
      setActiveIconPack: (pack) => set({ activeIconPack: pack }),

      setAccentColor: (color) => set({ accentColor: color }),
      toggleIndustrial: () =>
        set((state) => ({ isIndustrial: !state.isIndustrial })),
      toggleScanlines: () =>
        set((state) => ({ scanlines: !state.scanlines })),
      toggleGlassmorphism: () =>
        set((state) => ({ glassmorphism: !state.glassmorphism })),
    }),
    {
      name: "nerve-theme-storage",
      // Optimize storage by only persisting necessary state
      partialize: (state) => ({
        accentColor: state.accentColor,
        isIndustrial: state.isIndustrial,
        scanlines: state.scanlines,
        glassmorphism: state.glassmorphism,
        activeTheme: state.activeTheme,
        activeFont: state.activeFont,
        activeIconPack: state.activeIconPack,
        // Don't persist installedThemes - fetch from server on load
      }),
    }
  )
);

// Selector-based hook for granular subscriptions
export function useThemeSelector<T>(
  selector: (state: ThemeState & ThemeActions) => T
): T {
  return useThemeStoreBase(selector);
}

// Convenience hooks for common patterns - prevents unnecessary re-renders
export function useActiveTheme(): MarketplaceItem | null {
  return useThemeSelector((state) => state.activeTheme);
}

export function useInstalledThemes(): UserInstalledItem[] {
  return useThemeSelector((state) => state.installedThemes);
}

export function useThemeConfig() {
  return useThemeSelector((state) => ({
    accentColor: state.accentColor,
    isIndustrial: state.isIndustrial,
    scanlines: state.scanlines,
    glassmorphism: state.glassmorphism,
  }));
}

export function useActiveFont(): MarketplaceItem | null {
  return useThemeSelector((state) => state.activeFont);
}

export function useActiveIconPack(): MarketplaceItem | null {
  return useThemeSelector((state) => state.activeIconPack);
}

// Actions hook - returns stable action references
export function useThemeActions(): ThemeActions {
  return useThemeSelector((state) => ({
    setInstalledThemes: state.setInstalledThemes,
    setActiveTheme: state.setActiveTheme,
    setActiveFont: state.setActiveFont,
    setActiveIconPack: state.setActiveIconPack,
    setAccentColor: state.setAccentColor,
    toggleIndustrial: state.toggleIndustrial,
    toggleScanlines: state.toggleScanlines,
    toggleGlassmorphism: state.toggleGlassmorphism,
  }));
}

// Legacy export
export { useThemeStoreBase as useThemeStore };

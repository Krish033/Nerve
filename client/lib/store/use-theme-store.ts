import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeConfig {
  fontFamily: string;
  cssUrl?: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
    border: string;
  };
  style: {
    scanlines: boolean;
    glassmorphism: boolean;
    radius: string;
  };
  loadingIndicator: 'pulse' | 'spinner' | 'bar' | 'scan';
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

export type AccentColor = 'indigo' | 'crimson' | 'emerald' | 'amber' | 'violet' | 'noir';

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
  
  // Actions
  setInstalledThemes: (themes: UserInstalledItem[]) => void;
  setActiveTheme: (theme: MarketplaceItem | null) => void;
  setActiveFont: (font: MarketplaceItem | null) => void;
  setActiveIconPack: (pack: MarketplaceItem | null) => void;
  
  // Legacy Actions
  setAccentColor: (color: AccentColor) => void;
  toggleIndustrial: () => void;
  toggleScanlines: () => void;
  toggleGlassmorphism: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: 'indigo',
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
      toggleIndustrial: () => set((state) => ({ isIndustrial: !state.isIndustrial })),
      toggleScanlines: () => set((state) => ({ scanlines: !state.scanlines })),
      toggleGlassmorphism: () => set((state) => ({ glassmorphism: !state.glassmorphism })),
    }),
    {
      name: 'nerve-theme-storage',
    }
  )
);

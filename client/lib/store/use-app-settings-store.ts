import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettingsData {
  appName: string;
  appLogoUrl: string;
  appFaviconUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string;
}

interface AppSettingsState extends AppSettingsData {
  applySettings: (data: Partial<AppSettingsData>) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      appName: 'Nurve',
      appLogoUrl: '',
      appFaviconUrl: '',

      seoTitle: 'Nurve',
      seoDescription: '',
      seoKeywords: '',
      seoOgImage: '',

      applySettings: (data) => set(data),
    }),
    {
      name: 'nurve-app-settings',
    }
  )
);

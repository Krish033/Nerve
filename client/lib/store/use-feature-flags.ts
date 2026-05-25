import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeatureFlag =
  | 'github_integration'
  | 'ai_assistant'
  | 'marketplace'
  | 'messaging'
  | 'advanced_search'
  | 'team_workspaces'
  | 'audit_logs'
  | 'plugin_system';

type FeatureFlagState = {
  flags: Record<FeatureFlag, boolean>;
  enable: (flag: FeatureFlag) => void;
  disable: (flag: FeatureFlag) => void;
  isEnabled: (flag: FeatureFlag) => boolean;
};

const defaultFlags: Record<FeatureFlag, boolean> = {
  github_integration: true,
  ai_assistant: false,
  marketplace: true,
  messaging: true,
  advanced_search: true,
  team_workspaces: false,
  audit_logs: true,
  plugin_system: false,
};

export const useFeatureFlags = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      flags: defaultFlags,
      enable: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: true } })),
      disable: (flag) => set((s) => ({ flags: { ...s.flags, [flag]: false } })),
      isEnabled: (flag) => get().flags[flag] ?? false,
    }),
    { name: 'nurve-feature-flags' }
  )
);

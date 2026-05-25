/**
 * React Query Hooks for Marketplace with Optimized Store Integration
 * 
 * These hooks combine React Query's server state management with
 * the optimized Zustand stores for seamless data flow.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-optimized";
import { useThemeActions, useThemeSelector } from "@/lib/store/use-theme-optimized";
import { useAuthUser } from "@/lib/store/use-auth-optimized";
import { logger } from "@/lib/logger-enhanced";
import { toast } from "sonner";

// Query keys for proper cache management
const marketplaceKeys = {
  all: ["marketplace"] as const,
  themes: () => [...marketplaceKeys.all, "themes"] as const,
  installed: (userId: string) => 
    [...marketplaceKeys.all, "installed", userId] as const,
  theme: (id: string) => [...marketplaceKeys.themes(), id] as const,
};

/**
 * Hook to fetch all available themes
 * Caches for 5 minutes, refetches on window focus
 */
export function useThemes() {
  return useQuery({
    queryKey: marketplaceKeys.themes(),
    queryFn: async () => {
      const startTime = Date.now();
      const themes = await api.get<any[]>("http://localhost:3002/marketplace/themes");
      logger.perf("Fetch themes", Date.now() - startTime, { count: themes.length });
      return themes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on focus (themes rarely change)
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch user's installed themes
 * Integrates with optimized theme store
 */
export function useInstalledThemes() {
  const user = useAuthUser();
  const { setInstalledThemes } = useThemeActions();
  
  return useQuery({
    queryKey: marketplaceKeys.installed(user?.id || "guest"),
    queryFn: async () => {
      if (!user?.id) return [];
      
      const startTime = Date.now();
      const installed = await api.get<any[]>(
        `http://localhost:3002/marketplace/users/${user.id}/themes`
      );
      
      // Sync with optimized store
      setInstalledThemes(installed);
      
      logger.perf("Fetch installed themes", Date.now() - startTime, { 
        userId: user.id,
        count: installed.length 
      });
      
      return installed;
    },
    enabled: !!user?.id, // Only run when user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to install a theme
 * Optimistic update with rollback
 */
export function useInstallTheme() {
  const queryClient = useQueryClient();
  const user = useAuthUser();
  const { setInstalledThemes } = useThemeActions();
  
  return useMutation({
    mutationFn: async (themeId: string) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      const result = await api.post(
        `http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}/install`
      );
      
      logger.track("theme_installed", { themeId, userId: user.id });
      
      return result;
    },
    onMutate: async (themeId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
      
      // Snapshot previous value
      const previousThemes = queryClient.getQueryData(
        marketplaceKeys.installed(user?.id || "")
      );
      
      // Optimistically add to cache
      queryClient.setQueryData(
        marketplaceKeys.installed(user?.id || ""),
        (old: any[] = []) => [...old, { itemId: themeId, isActive: false }]
      );
      
      toast.loading("Installing theme...");
      
      return { previousThemes };
    },
    onSuccess: () => {
      toast.success("Theme installed successfully!");
      
      // Refetch to get server state
      queryClient.invalidateQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
    },
    onError: (error, themeId, context) => {
      // Rollback on error
      if (context?.previousThemes) {
        queryClient.setQueryData(
          marketplaceKeys.installed(user?.id || ""),
          context.previousThemes
        );
      }
      
      logger.error("Theme installation failed", { 
        error, 
        themeId, 
        userId: user?.id 
      });
      
      toast.error("Failed to install theme");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
    },
  });
}

/**
 * Hook to activate a theme
 * Updates both server and client state
 */
export function useActivateTheme() {
  const queryClient = useQueryClient();
  const user = useAuthUser();
  const { setActiveTheme } = useThemeActions();
  
  return useMutation({
    mutationFn: async ({ themeId, theme }: { themeId: string; theme: any }) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      await api.post(
        `http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}/activate`
      );
      
      return theme;
    },
    onMutate: async ({ theme }) => {
      // Optimistically set active theme
      setActiveTheme(theme);
      
      toast.loading("Activating theme...");
      
      return { previousTheme: null };
    },
    onSuccess: (theme) => {
      toast.success(`${theme.name} activated!`);
      
      logger.track("theme_activated", { 
        themeId: theme.id, 
        userId: user?.id 
      });
      
      // Update store with confirmed theme
      setActiveTheme(theme);
    },
    onError: (error, variables) => {
      logger.error("Theme activation failed", { 
        error, 
        themeId: variables.themeId,
        userId: user?.id 
      });
      
      toast.error("Failed to activate theme");
    },
    onSettled: () => {
      // Refetch installed themes to update active status
      queryClient.invalidateQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
    },
  });
}

/**
 * Hook to uninstall a theme
 */
export function useUninstallTheme() {
  const queryClient = useQueryClient();
  const user = useAuthUser();
  const { setActiveTheme, setInstalledThemes } = useThemeActions();
  const activeTheme = useThemeSelector((state) => state.activeTheme);
  
  return useMutation({
    mutationFn: async (themeId: string) => {
      if (!user?.id) throw new Error("Must be logged in");
      
      await api.delete(
        `http://localhost:3002/marketplace/users/${user.id}/themes/${themeId}`
      );
      
      return themeId;
    },
    onMutate: async (themeId: string) => {
      // Cancel refetches
      await queryClient.cancelQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
      
      // Snapshot
      const previousThemes = queryClient.getQueryData(
        marketplaceKeys.installed(user?.id || "")
      );
      
      // Optimistically remove
      queryClient.setQueryData(
        marketplaceKeys.installed(user?.id || ""),
        (old: any[] = []) => old.filter((t) => t.itemId !== themeId)
      );
      
      // If uninstalling active theme, clear it
      if (activeTheme?.id === themeId) {
        setActiveTheme(null);
      }
      
      toast.loading("Uninstalling theme...");
      
      return { previousThemes };
    },
    onSuccess: (themeId) => {
      toast.success("Theme uninstalled");
      
      logger.track("theme_uninstalled", { themeId, userId: user?.id });
    },
    onError: (error, themeId, context) => {
      // Rollback
      if (context?.previousThemes) {
        queryClient.setQueryData(
          marketplaceKeys.installed(user?.id || ""),
          context.previousThemes
        );
        setInstalledThemes(context.previousThemes as any[]);
      }
      
      logger.error("Theme uninstall failed", { 
        error, 
        themeId, 
        userId: user?.id 
      });
      
      toast.error("Failed to uninstall theme");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: marketplaceKeys.installed(user?.id || "") 
      });
    },
  });
}

/**
 * Combined hook for theme management
 * Provides all marketplace operations in one hook
 */
export function useThemeManagement() {
  const { data: themes, isLoading: themesLoading } = useThemes();
  const { data: installed, isLoading: installedLoading } = useInstalledThemes();
  const install = useInstallTheme();
  const activate = useActivateTheme();
  const uninstall = useUninstallTheme();
  
  return {
    // Data
    themes,
    installedThemes: installed,
    isLoading: themesLoading || installedLoading,
    
    // Actions
    installTheme: install.mutate,
    activateTheme: activate.mutate,
    uninstallTheme: uninstall.mutate,
    
    // Loading states
    isInstalling: install.isPending,
    isActivating: activate.isPending,
    isUninstalling: uninstall.isPending,
  };
}

/**
 * Hook to check if a theme is installed
 * Memoized for performance
 */
export function useIsThemeInstalled(themeId: string): boolean {
  const { data: installed } = useInstalledThemes();
  
  return (
    installed?.some((item: any) => item.itemId === themeId) ?? false
  );
}

/**
 * Hook to check if a theme is active
 */
export function useIsThemeActive(themeId: string): boolean {
  const activeTheme = useThemeSelector((state) => state.activeTheme);
  return activeTheme?.id === themeId;
}

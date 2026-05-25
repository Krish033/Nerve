import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { useCallback, useMemo } from "react";

// Type definitions
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  profilePicture?: string;
  mobile?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  isTwoFactorEnabled?: boolean;
}

// State interface
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  googleAccessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

// Actions interface
interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, googleAccessToken?: string) => void;
  setAccessToken: (accessToken: string) => void;
  setGoogleAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  logout: () => void;
}

// No-op storage for SSR
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

// Create the base store
const useAuthStoreBase = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      googleAccessToken: null,
      isLoading: false,
      isInitialized: false,

      setAuth: (user, accessToken, googleAccessToken) =>
        set({
          user,
          accessToken,
          googleAccessToken: googleAccessToken || null,
          isLoading: false,
          isInitialized: true,
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setGoogleAccessToken: (googleAccessToken) => set({ googleAccessToken }),

      setUser: (user) => set({ user, isLoading: false, isInitialized: true }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      logout: () => {
        if (typeof window !== "undefined") {
          import("@/app/actions/auth-cookies").then((m) =>
            m.clearRefreshTokenCookie().catch(console.error)
          );
        }
        set({
          user: null,
          accessToken: null,
          googleAccessToken: null,
          isLoading: false,
          isInitialized: true,
        });
      },
    }),
    {
      name: "auth-storage",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : noopStorage
      ),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized(true);
          state.setLoading(false);
        }
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        googleAccessToken: state.googleAccessToken,
      }),
    }
  )
);

// Optimized hook with selector support
// This prevents re-renders when unrelated state changes
export function useAuthSelector<T>(selector: (state: AuthState & AuthActions) => T): T {
  return useAuthStoreBase(selector);
}

// Convenience hooks for common access patterns
export function useAuthUser(): AuthUser | null {
  return useAuthSelector((state) => state.user);
}

export function useAccessToken(): string | null {
  return useAuthSelector((state) => state.accessToken);
}

export function useAuthStatus(): { isLoading: boolean; isInitialized: boolean } {
  return useAuthSelector((state) => ({
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
  }));
}

// Actions hook - only returns actions, never causes re-render from state changes
export function useAuthActions(): AuthActions {
  return useAuthSelector((state) => ({
    setAuth: state.setAuth,
    setAccessToken: state.setAccessToken,
    setGoogleAccessToken: state.setGoogleAccessToken,
    setUser: state.setUser,
    setLoading: state.setLoading,
    setInitialized: state.setInitialized,
    logout: state.logout,
  }));
}

// Is authenticated check
export function useIsAuthenticated(): boolean {
  return useAuthSelector((state) => !!state.user && !!state.accessToken);
}

// Legacy export for compatibility
export { useAuthStoreBase };

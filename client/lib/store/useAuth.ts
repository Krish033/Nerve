import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

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

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  googleAccessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  setAuth: (user: AuthUser, accessToken: string, googleAccessToken?: string) => void;
  setAccessToken: (accessToken: string) => void;
  setGoogleAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  logout: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useAuthStore = create<AuthState>()(
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
          isInitialized: true 
        }),
      
      setAccessToken: (accessToken) => 
        set({ accessToken }),

      setGoogleAccessToken: (googleAccessToken) =>
        set({ googleAccessToken }),
        
      setUser: (user) => 
        set({ user, isLoading: false, isInitialized: true }),
        
      setLoading: (isLoading) => 
        set({ isLoading }),
        
      setInitialized: (isInitialized) => 
        set({ isInitialized }),
        
      logout: () => {
        if (typeof window !== 'undefined') {
          import('@/app/actions/auth-cookies').then(m => m.clearRefreshTokenCookie().catch(console.error));
        }
        set({ 
          user: null, 
          accessToken: null, 
          googleAccessToken: null, 
          isLoading: false, 
          isInitialized: true 
        });
      },
    }),
    {
      name: "auth-storage",
      version: 1,
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : noopStorage)),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized(true);
          state.setLoading(false);
        }
      },
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken,
        googleAccessToken: state.googleAccessToken
      }),
    }
  )
);



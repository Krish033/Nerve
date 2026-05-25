"use client";

import { useEffect, ReactNode, useCallback, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/useAuth";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import refreshSession from "@/app/auth/_partials/imports/refresh-session";
import { validateEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

interface AuthProviderProps {
  children: ReactNode;
}

// Auth state machine for better control
interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  retryCount: number;
}

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 5000;

export function AuthProvider({ children }: AuthProviderProps) {
  const { setInitialized, setLoading, setUser, logout } = useAuthStore();
  const [authState, setAuthState] = useState<AuthState>({ 
    status: 'idle', 
    retryCount: 0 
  });
  
  // Refs for cleanup and tracking
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settledRef = useRef(false);

  // Memoized session refresh with retry logic
  const attemptSessionRefresh = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      await refreshSession();
      setAuthState(prev => ({ ...prev, status: 'authenticated' }));
      setLoading(false);
      setInitialized(true);
    } catch (error) {
      logger.warn("Session refresh failed", { error });
      
      if (authState.retryCount < MAX_RETRIES) {
        // Exponential backoff retry
        const delay = Math.pow(2, authState.retryCount) * 1000;
        setTimeout(() => {
          setAuthState(prev => ({ 
            ...prev, 
            retryCount: prev.retryCount + 1 
          }));
          attemptSessionRefresh(firebaseUser);
        }, delay);
      } else {
        // Max retries reached, log user out
        setAuthState({ status: 'error', retryCount: 0 });
        logout();
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [authState.retryCount, logout, setInitialized, setLoading]);

  useEffect(() => {
    // Validate environment on mount
    validateEnv();
    setLoading(true);
    setAuthState({ status: 'loading', retryCount: 0 });

    // Safety timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!settledRef.current) {
        logger.warn("Auth initialization timeout");
        setLoading(false);
        setInitialized(true);
        setAuthState({ status: 'error', retryCount: 0 });
      }
    }, INITIAL_TIMEOUT);

    // Check for session hint
    const hasSessionHint = typeof document !== 'undefined' && 
      document.cookie.split(';').some((item) => 
        item.trim().startsWith('session_hint=')
      );

    // Subscribe to Firebase auth state
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (firebaseUser) => {
        settledRef.current = true;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (firebaseUser) {
          setAuthState({ status: 'loading', retryCount: 0 });
          await attemptSessionRefresh(firebaseUser);
        } else {
          setAuthState({ status: 'unauthenticated', retryCount: 0 });
          setLoading(false);
          setInitialized(true);
        }
      },
      (error) => {
        settledRef.current = true;
        logger.error("Firebase auth error", { error });
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        setAuthState({ status: 'error', retryCount: 0 });
        setLoading(false);
        setInitialized(true);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [attemptSessionRefresh, setInitialized, setLoading]);

  return <>{children}</>;
}

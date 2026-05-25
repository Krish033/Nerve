"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/lib/store/useAuth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import refreshSession from "@/app/auth/_partials/imports/refresh-session";
import { validateEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setInitialized, setLoading, user } = useAuthStore();

  useEffect(() => {
    validateEnv();
    let settled = false;
    setLoading(true);
    const fallback = window.setTimeout(() => {
      if (!settled) {
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);
    // 0. Optimistic Auth: Check for session hint cookie
    // We do this to avoid showing the login screen if we likely have a session.
    const hasSessionHint = document.cookie.split(';').some((item) => item.trim().startsWith('session_hint='));
    if (hasSessionHint && !user) {
      // We don't set initialized=true yet because we want to show skeletons
      // But we can use this hint in the ProtectedRoute to show the layout instead of a blank screen.
    }

    // 1. Listen for Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      settled = true;
      window.clearTimeout(fallback);
      if (firebaseUser) {
        try {
          // 2. Attempt to sync with backend if we don't have a session or just to refresh
          await refreshSession();
        } catch {
          logger.warn("Could not restore session on load");
          setLoading(false);
        }
      } else {
        // No user, so we're not loading anymore
        setLoading(false);
      }
      setInitialized(true);
    });

    return () => {
      window.clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}



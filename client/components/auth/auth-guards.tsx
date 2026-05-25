"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((isInitialized || timedOut) && !user) {
      router.replace("/auth/login");
    }
  }, [user, isInitialized, router, timedOut]);

  if ((!isInitialized && !timedOut) || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-800 mx-auto" />
          <p className="text-sm font-medium text-neutral-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((isInitialized || timedOut) && user) {
      router.replace("/");
    }
  }, [user, isInitialized, router, timedOut]);

  if ((!isInitialized && !timedOut) || isLoading) {
    return null;
  }

  return !user ? <>{children}</> : null;
}



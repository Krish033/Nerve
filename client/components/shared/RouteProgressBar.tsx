"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start bar on route change
    setVisible(true);
    setProgress(10);

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) {
          clearInterval(intervalRef.current!);
          return 85;
        }
        return p + Math.random() * 12;
      });
    }, 200);

    // Complete after a short delay
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 500);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(timerRef.current!);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out shadow-[0_0_8px_0px] shadow-primary/60"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

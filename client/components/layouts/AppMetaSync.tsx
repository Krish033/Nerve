"use client";

import { useEffect, useRef } from "react";
import { useAppSettingsStore } from "@/lib/store/use-app-settings-store";

export function AppMetaSync() {
  const { appName, seoTitle, seoDescription, appFaviconUrl } = useAppSettingsStore();
  const previousFaviconRef = useRef<string>("/favicon.ico");
  const isFirstRenderRef = useRef(true);

  // Update document title - safe to do immediately
  useEffect(() => {
    document.title = seoTitle || appName || "Nurve";
  }, [seoTitle, appName]);

  // Update meta description
  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = seoDescription || "";
  }, [seoDescription]);

  // Update favicon with microtask to avoid hydration issues
  useEffect(() => {
    const faviconUrl = appFaviconUrl || "/favicon.ico";
    
    // Always run on first render to set initial favicon
    // Skip only if it's the same URL on subsequent renders
    if (!isFirstRenderRef.current && previousFaviconRef.current === faviconUrl) {
      return;
    }
    
    isFirstRenderRef.current = false;
    previousFaviconRef.current = faviconUrl;

    // Use microtask to defer DOM manipulation until after hydration
    const updateFavicon = () => {
      // Find or create favicon link with specific ID for React to track
      let link = document.getElementById("dynamic-favicon") as HTMLLinkElement;
      
      if (!link) {
        // Create new link if doesn't exist
        link = document.createElement("link");
        link.id = "dynamic-favicon";
        link.rel = "icon";
        
        // Detect proper mime type
        if (faviconUrl.startsWith("data:")) {
          const match = faviconUrl.match(/^data:([^;]+);/);
          link.type = match?.[1] || "image/x-icon";
        } else if (faviconUrl.endsWith(".svg") || faviconUrl.includes("svg+xml")) {
          link.type = "image/svg+xml";
        } else if (faviconUrl.endsWith(".png")) {
          link.type = "image/png";
        } else if (faviconUrl.endsWith(".jpg") || faviconUrl.endsWith(".jpeg")) {
          link.type = "image/jpeg";
        } else {
          link.type = "image/x-icon";
        }
        
        // Add cache-busting timestamp for dynamic favicons (skip for data URIs)
        const cacheBuster = faviconUrl.includes("?") ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        link.href = faviconUrl.startsWith("data:") ? faviconUrl : `${faviconUrl}${cacheBuster}`;
        
        document.head.appendChild(link);
      } else {
        // Update existing link href only (don't recreate)
        const cacheBuster = faviconUrl.includes("?") ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        link.href = faviconUrl.startsWith("data:") ? faviconUrl : `${faviconUrl}${cacheBuster}`;
      }
    };

    // Defer to microtask to avoid hydration conflicts
    Promise.resolve().then(updateFavicon);
  }, [appFaviconUrl]);

  return null;
}

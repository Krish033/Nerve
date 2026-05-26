"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSettingsStore } from "@/lib/store/use-app-settings-store";

export function AppMetaSync() {
  const { appName, seoTitle, seoDescription, appFaviconUrl } = useAppSettingsStore();
  const previousFaviconRef = useRef<string>("/favicon.ico");
  const [mounted, setMounted] = useState(false);

  // Only run after component mounts to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.title = seoTitle || appName || "Nurve";
  }, [seoTitle, appName, mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = seoDescription || "";
  }, [seoDescription, mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    const faviconUrl = appFaviconUrl || "/favicon.ico";
    
    // Skip if favicon hasn't changed
    if (previousFaviconRef.current === faviconUrl) return;
    previousFaviconRef.current = faviconUrl;

    // Remove existing favicon links (safely)
    const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });

    // Create new favicon link with cache busting
    const link = document.createElement("link");
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
    
    // Add cache-busting timestamp for dynamic favicons
    const cacheBuster = faviconUrl.includes("?") ? `&t=${Date.now()}` : `?t=${Date.now()}`;
    link.href = faviconUrl.startsWith("data:") ? faviconUrl : `${faviconUrl}${cacheBuster}`;
    
    document.head.appendChild(link);
  }, [appFaviconUrl, mounted]);

  return null;
}

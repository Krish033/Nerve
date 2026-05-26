"use client";

import { useEffect, useRef } from "react";
import { useAppSettingsStore } from "@/lib/store/use-app-settings-store";

export function AppMetaSync() {
  const { appName, seoTitle, seoDescription, appFaviconUrl } = useAppSettingsStore();
  const previousFaviconRef = useRef<string>("/favicon.ico");

  useEffect(() => {
    document.title = seoTitle || appName || "Nurve";
  }, [seoTitle, appName]);

  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = seoDescription || "";
  }, [seoDescription]);

  useEffect(() => {
    const faviconUrl = appFaviconUrl || "/favicon.ico";
    
    // Skip if favicon hasn't changed
    if (previousFaviconRef.current === faviconUrl) return;
    previousFaviconRef.current = faviconUrl;

    // Remove existing favicon links
    const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link with cache busting
    const link = document.createElement("link");
    link.rel = "icon";
    
    // Detect proper mime type
    if (faviconUrl.startsWith("data:")) {
      // Data URI - extract type from data URI
      const match = faviconUrl.match(/^data:([^;]+);/);
      link.type = match?.[1] || "image/x-icon";
    } else if (faviconUrl.endsWith(".svg") || faviconUrl.includes("svg")) {
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
  }, [appFaviconUrl]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useAppSettingsStore } from "@/lib/store/use-app-settings-store";

export function AppMetaSync() {
  const { appName, seoTitle, seoDescription, appFaviconUrl } = useAppSettingsStore();

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
    // Remove any existing favicon links first
    const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
    existingLinks.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = appFaviconUrl?.startsWith("data:image/svg") ? "image/svg+xml" : "image/x-icon";
    link.href = appFaviconUrl || "/favicon.ico";
    document.head.appendChild(link);
  }, [appFaviconUrl]);

  return null;
}

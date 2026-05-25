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
    if (!appFaviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = appFaviconUrl;
  }, [appFaviconUrl]);

  return null;
}

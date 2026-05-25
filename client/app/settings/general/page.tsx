"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";
import { TextInput } from "@/components/ui/TextInput";
import { useAppSettingsStore } from "@/lib/store/use-app-settings-store";
import {
  AppWindow,
  Globe,
  Image as ImageIcon,
  Save,
  Search,
  Tag,
  Type,
  Upload,
} from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GeneralSettingsPage() {
  const store = useAppSettingsStore();

  const [appName, setAppName] = useState(store.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(store.appLogoUrl);
  const [appFaviconUrl, setAppFaviconUrl] = useState(store.appFaviconUrl);
  const [seoTitle, setSeoTitle] = useState(store.seoTitle);
  const [seoDescription, setSeoDescription] = useState(store.seoDescription);
  const [seoKeywords, setSeoKeywords] = useState(store.seoKeywords);
  const [seoOgImage, setSeoOgImage] = useState(store.seoOgImage);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAppLogoUrl(base64);
    e.target.value = "";
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAppFaviconUrl(base64);
    e.target.value = "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.applySettings({
      appName,
      appLogoUrl,
      appFaviconUrl,
      seoTitle,
      seoDescription,
      seoKeywords,
      seoOgImage,
    });
    toast.success("Settings saved");
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <Heading
        title="General"
        description="Configure your app identity and SEO metadata."
      />

      {/* ── App Identity ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <AppWindow className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">App Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextInput
            label="App Name"
            placeholder="Nurve"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            icon={<Type className="h-4 w-4" />}
          />
        </div>

        {/* Logo & Favicon upload cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">App Logo</span>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden",
                )}
              >
                {appLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appLogoUrl}
                    alt="App logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <AppWindow className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">
                  PNG, SVG or WebP. Recommended 256×256.
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Upload}
                  onClick={() => logoInputRef.current?.click()}
                >
                  Upload logo
                </Button>
                {appLogoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-2"
                    onClick={() => setAppLogoUrl("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <TextInput
              label="Or paste URL"
              placeholder="https://example.com/logo.png"
              value={appLogoUrl}
              onChange={(e) => setAppLogoUrl(e.target.value)}
              icon={<Globe className="h-4 w-4" />}
            />
          </div>

          {/* Favicon */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Favicon</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {appFaviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appFaviconUrl}
                    alt="Favicon"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">
                  ICO, PNG or SVG. Recommended 32×32.
                </p>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFaviconUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Upload}
                  onClick={() => faviconInputRef.current?.click()}
                >
                  Upload favicon
                </Button>
                {appFaviconUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-2"
                    onClick={() => setAppFaviconUrl("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <TextInput
              label="Or paste URL"
              placeholder="https://example.com/favicon.ico"
              value={appFaviconUrl}
              onChange={(e) => setAppFaviconUrl(e.target.value)}
              icon={<Globe className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ── SEO Settings ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">SEO Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextInput
            label="Meta Title"
            placeholder="Nurve — Your workspace"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            icon={<Type className="h-4 w-4" />}
          />
          <TextInput
            label="Keywords"
            placeholder="productivity, tasks, collaboration"
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
            icon={<Tag className="h-4 w-4" />}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Meta Description</label>
          <textarea
            rows={3}
            placeholder="A short description shown in search engine results…"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {seoDescription.length} / 160 characters recommended
          </p>
        </div>

        <TextInput
          label="Open Graph Image URL"
          placeholder="https://example.com/og-image.png"
          value={seoOgImage}
          onChange={(e) => setSeoOgImage(e.target.value)}
          icon={<ImageIcon className="h-4 w-4" />}
        />

        {seoOgImage && (
          <div className="rounded-xl border border-border overflow-hidden w-full max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={seoOgImage}
              alt="OG preview"
              className="w-full h-auto object-cover"
            />
            <div className="px-3 py-2 bg-muted/40 border-t border-border">
              <p className="text-xs font-medium truncate">{seoTitle || appName}</p>
              <p className="text-xs text-muted-foreground truncate">{seoDescription}</p>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="sm" icon={Save}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

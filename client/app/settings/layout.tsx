"use client";

import React from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout isFullWidth>
      <div className="px-6 md:px-10 lg:px-12 pb-20 relative pt-8">
        {/* Subtle Background Glow */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <main className="relative">
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.01]" />
            <div className="min-h-[600px]">{children}</div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

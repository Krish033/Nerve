"use client";

import React from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout isFullWidth>
      <div className="px-6 md:px-10 lg:px-12 py-8 space-y-12 animate-in fade-in duration-700 pb-20 relative">
        {/* Subtle Background Glow */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10">
          <main className="relative">
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

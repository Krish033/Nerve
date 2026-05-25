"use client";

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useLayoutStore } from '@/lib/store/use-layout-store';
import { cn } from '@/lib/utils';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const { hideNavbar } = useLayoutStore();

  return (
    <AdminLayout isFullWidth>
      <div className="min-h-screen bg-background font-mono text-foreground relative overflow-hidden">
        {/* Main Content Area */}
        <main className={cn(
          "flex-1 overflow-y-auto lg:pl-16 relative",
          hideNavbar ? "p-6" : "p-10"
        )}>
          {/* Subtle accent line on top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {children}
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}



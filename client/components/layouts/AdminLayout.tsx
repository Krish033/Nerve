import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SecondarySidebar } from './SecondarySidebar';
import { TodoList } from '../tools/TodoList';
import { ProtectedRoute } from '@/components/auth/auth-guards';
import { CommandPalette } from './CommandPalette';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/lib/store/use-layout-store';

interface AdminLayoutProps {
  children: React.ReactNode;
  isFullWidth?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { sidebarPlacement } = useLayoutStore();

  const isHorizontal = sidebarPlacement === 'top' || sidebarPlacement === 'bottom';
  const isRight = sidebarPlacement === 'right';

  return (
    <ProtectedRoute>
      <div className="h-screen bg-background flex flex-col font-sans overflow-hidden">
        {/* Navbar spans full width at the top */}
        <Navbar />

        {/* Body: sidebar + secondary + main */}
        <div className={cn(
          'flex-1 flex min-h-0 overflow-hidden',
          isHorizontal ? 'flex-col' : isRight ? 'flex-row-reverse' : 'flex-row',
        )}>
          <Sidebar />

          <div className="flex-1 flex flex-row min-w-0 overflow-hidden">
            <SecondarySidebar />

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="px-6 py-6 md:px-8 md:py-8 space-y-6">
                {children}
              </div>
            </main>
          </div>
        </div>

        <TodoList />
        <CommandPalette />
      </div>
    </ProtectedRoute>
  );
};



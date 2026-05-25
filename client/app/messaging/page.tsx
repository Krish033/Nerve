"use client";

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ChatList } from '@/app/messaging/_partials/ChatList';
import { ChatWindow } from '@/app/messaging/_partials/ChatWindow';

export default function MessagingPage() {

  return (
    <AdminLayout isFullWidth>
      <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden border-t border-border/50">
        <ChatList />
        <ChatWindow />
      </div>
    </AdminLayout>
  );
}



"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useAuthStore } from '@/lib/store/useAuth';
import { Clock, User, Activity, ListTodo, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description={`Welcome back${user?.name ? `, ${user.name}` : ''}.`}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Time card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Local time</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-mono font-semibold tabular-nums">{formatTime(time)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(time)}</p>
          </div>

          {/* User card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
          </div>

          {/* Status card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">System status</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="success" dot>Operational</StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All services running normally.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Tasks"
            description="Your open work items."
            actions={
              <Button variant="ghost" size="xs" asChild>
                <Link href="/tasks" className="flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ListTodo className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No pending tasks.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/tasks">Go to Tasks</Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Quick links">
            <div className="space-y-1">
              {[
                { label: 'Marketplace', href: '/marketplace', description: 'Browse themes, fonts, and plugins' },
                { label: 'Settings', href: '/settings', description: 'Configure your workspace' },
                { label: 'Profile', href: '/profile', description: 'Manage your account' },
                { label: 'Notifications', href: '/notifications', description: 'View recent activity' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AdminLayout>
  );
}



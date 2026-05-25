"use client";

import { AdminLayout } from "@/components/layouts/AdminLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus } from "lucide-react";
import Link from "next/link";

export default function GitHubPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="GitHub"
          description="Repositories, workflows, and deployment status."
          actions={
            <Button size="sm" asChild>
              <Link href="/github/connect"><Plus className="h-4 w-4 mr-1.5" />Connect account</Link>
            </Button>
          }
        />

        <SectionCard title="Repositories">
          <EmptyState
            icon={<GitBranch />}
            title="No repositories connected"
            description="Connect your GitHub account to view and manage your repositories here."
            action={
              <Button size="sm" asChild>
                <Link href="/github/connect">Connect GitHub</Link>
              </Button>
            }
          />
        </SectionCard>
      </div>
    </AdminLayout>
  );
}

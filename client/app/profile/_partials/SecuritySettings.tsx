"use client";

import React from "react";
import Link from "next/link";
import { Fingerprint, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthUser } from "@/lib/store/useAuth";

import { Switch } from "@/components/ui/switch";

interface SecuritySettingsProps {
  user: AuthUser | null;
  hasPassword: boolean;
  onLinkPassword: () => void;
  onSetupMfa: () => void;
  isSettingUpMfa: boolean;
}

export const SecuritySettings = React.memo(({
  user,
  hasPassword,
  onLinkPassword,
  onSetupMfa,
  isSettingUpMfa
}: SecuritySettingsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold">Security</h2>

      {hasPassword ? (
        <Link
          href="/profile/change-password"
          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <Fingerprint className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your password</p>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">OAuth account</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your account is secured via an external provider. You can link a password for direct sign-in.
          </p>
          <Button onClick={onLinkPassword} variant="outline" size="sm">
            Link password
          </Button>
        </div>
      )}

      <div className="p-3 rounded-lg border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-2 w-2 rounded-full ${user?.isTwoFactorEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            <span className="text-sm font-medium">Two-factor authentication</span>
          </div>
          <Switch
            checked={!!user?.isTwoFactorEnabled}
            onCheckedChange={onSetupMfa}
            disabled={isSettingUpMfa}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Require a second verification step when signing in.
        </p>
      </div>
    </div>
  );
});

SecuritySettings.displayName = "SecuritySettings";

"use client";

import React from "react";
import Image from "next/image";
import { Camera, ShieldCheck } from "lucide-react";
import { AuthUser } from "@/lib/store/useAuth";

interface ProfileHeaderProps {
  user: AuthUser | null;
}

export const ProfileHeader = React.memo(({ user }: ProfileHeaderProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <div className="relative group/avatar shrink-0">
        <div className="h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
          {user?.profilePicture ? (
            <Image
              src={user.profilePicture}
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
              alt="profile"
            />
          ) : (
            <span className="text-xl font-semibold text-muted-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>
        <button
          className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity"
          aria-label="Change avatar"
        >
          <Camera className="h-4 w-4 text-white" />
        </button>
        {user?.isEmailVerified && (
          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-background rounded-full" />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{user?.name}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {user?.isEmailVerified && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified</span>
          </div>
        )}
      </div>
    </div>
  );
});

ProfileHeader.displayName = "ProfileHeader";

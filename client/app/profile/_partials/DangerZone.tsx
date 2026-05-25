"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DangerZoneProps {
  onDeleteRequest: () => void;
}

export const DangerZone = React.memo(({ onDeleteRequest }: DangerZoneProps) => {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Danger zone
        </h2>
        <p className="text-xs text-muted-foreground">
          Deleting your account is permanent and cannot be undone. All your data will be removed.
        </p>
      </div>

      <Button
        onClick={onDeleteRequest}
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
      >
        Delete account
      </Button>
    </div>
  );
});

DangerZone.displayName = "DangerZone";

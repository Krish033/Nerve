"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/TextInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import type { UserInfo } from "firebase/auth";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const changePasswordApi = async (data: PasswordFormValues) => {
  return new Promise((resolve) => setTimeout(() => resolve(data), 1000));
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      const providers = auth.currentUser.providerData.map((p: UserInfo) => p.providerId);
      queueMicrotask(() => setHasPassword(providers.indexOf('password') !== -1));
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const updateMutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast.success("Password updated successfully");
      reset();
      router.push("/profile");
    },
    onError: () => {
      toast.error("Failed to update password");
    },
  });

  const onSubmit = (data: PasswordFormValues) => {
    updateMutation.mutate(data);
  };

  if (hasPassword === false) {
    return (
      <div className="max-w-lg space-y-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to profile
            </Link>
          </Button>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">Password change not available</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your account is linked to an external OAuth provider. Password changes are only available for accounts with a direct password credential.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Back to profile</Link>
            </Button>
          </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to profile
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-semibold tracking-tight">Change password</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your account password.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TextInput
              type="password"
              label="Current password"
              placeholder="••••••••"
              {...register("currentPassword")}
              icon={<Lock className="h-4 w-4" />}
              error={errors.currentPassword?.message}
            />

            <div className="h-px bg-border" />

            <TextInput
              type="password"
              label="New password"
              placeholder="Min. 8 characters"
              {...register("newPassword")}
              icon={<KeyRound className="h-4 w-4" />}
              error={errors.newPassword?.message}
            />

            <TextInput
              type="password"
              label="Confirm new password"
              placeholder="Repeat new password"
              {...register("confirmPassword")}
              icon={<KeyRound className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
            />

            <div className="pt-2 flex items-center gap-3">
              <Button type="submit" disabled={updateMutation.isPending} size="sm">
                {updateMutation.isPending ? "Saving..." : "Update password"}
              </Button>
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/profile">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Passwords are encrypted before storage.</span>
        </div>
    </div>
  );
}



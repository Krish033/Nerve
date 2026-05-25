"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Phone, ShieldCheck } from "lucide-react";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/button";
import { profileSchema, ProfileFormValues } from "./imports/schema";
import { AuthUser } from "@/lib/store/useAuth";

interface IdentityFormProps {
  user: AuthUser | null;
  onSubmit: (data: ProfileFormValues) => void;
  isPending: boolean;
  onResendVerification: () => void;
}

export const IdentityForm = React.memo(({ 
  user, 
  onSubmit, 
  isPending, 
  onResendVerification 
}: IdentityFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      mobile: user?.mobile || "",
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-6">
      <h2 className="text-sm font-semibold">Personal information</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextInput
          label="Full name"
          {...register("name")}
          icon={<User className="h-3.5 w-3.5" />}
          error={errors.name?.message}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email</span>
            {user?.isEmailVerified ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            ) : (
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={onResendVerification}
                className="h-auto p-0 text-xs text-amber-600 dark:text-amber-400"
              >
                Resend verification
              </Button>
            )}
          </div>
          <TextInput
            defaultValue={user?.email}
            disabled
            icon={<Mail className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Phone</span>
            {user?.isMobileVerified ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not verified</span>
            )}
          </div>
          <TextInput
            {...register("mobile")}
            placeholder="+1 (000) 000-0000"
            icon={<Phone className="h-3.5 w-3.5" />}
            error={errors.mobile?.message}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
});

IdentityForm.displayName = "IdentityForm";

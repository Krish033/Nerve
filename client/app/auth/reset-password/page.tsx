"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Shield, Lock, ArrowRight, Terminal, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PasswordInput } from "@/components/ui/password-input";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PublicRoute } from "@/components/auth/auth-guards";
import { getErrorMessage } from "@/lib/utils";

// Import new partial
import resetPassword from "../_partials/imports/reset-password";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!oobCode) return;

    setIsLoading(true);
    try {
      await resetPassword(oobCode, data.password);
      toast.success("Security key recalibrated", {
        description: "Your session has been updated successfully."
      });
      // We could redirect here or let the user click the button
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Security update rejected"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 p-4 font-sans text-neutral-900 dark:text-neutral-100 selection:bg-neutral-200 dark:selection:bg-neutral-800">
        <div className="w-full max-w-[400px] space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="space-y-6">
            <Link
              href="/auth/login"
              className="group inline-flex items-center text-xs font-medium text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform"
              >
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <Button variant={"link"} className="p-0 h-auto text-neutral-500">Back to login</Button>
            </Link>

            {!oobCode ? (
              <div className="bg-red-50 dark:bg-red-900/20 p-6 border border-red-100 dark:border-red-800/50 text-center rounded-xl space-y-3">
                <div className="mx-auto w-10 h-10 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-red-900 dark:text-red-200">
                  Invalid reset link
                </h4>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">
                  This password reset link is missing, invalid, or has expired.
                </p>
                <div className="pt-2">
                  <Link href="/auth/forgot-password">
                    <Button variant="outline" className="w-full h-10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50">
                      Request new link
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Create new password</h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Your new password must be different from previous used passwords.
                  </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="px-1 text-sm font-medium"
                    >
                      New password
                    </Label>
                    <PasswordInput
                      id="password"
                      className="h-10"
                      placeholder="Enter new password"
                      disabled={isLoading}
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500 font-medium mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="px-1 text-sm font-medium"
                    >
                      Confirm new password
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      className="h-10"
                      placeholder="Verify new password"
                      disabled={isLoading}
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500 font-medium mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-medium transition-all active:scale-[0.98] shadow-md shadow-black/5 mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        Update password
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-black uppercase text-[10px] tracking-[0.4em] text-neutral-500 bg-black">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Loading Terminal...
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}



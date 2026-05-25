"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Shield, Mail, ArrowRight, Activity, Terminal } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/TextInput";
import { Label } from "@/components/ui/label";
import { PublicRoute } from "@/components/auth/auth-guards";
import { getErrorMessage } from "@/lib/utils";

// Import new partial
import sendResetEmail from "../_partials/imports/send-reset-email";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    try {
      await sendResetEmail(data.email);
      setIsSuccess(true);
      toast.success("Recovery link dispatched", {
        description: "Verify your inbox for instructions.",
      });
    } catch (error: unknown) {
      toast.error("Dispatch failure", {
        description: getErrorMessage(error, "Could not initialize recovery cycle."),
      });
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

            {!isSuccess ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <TextInput
                    id="email"
                    type="email"
                    label="Email address"
                    placeholder="name@example.com"
                    disabled={isLoading}
                    error={errors.email?.message}
                    {...register("email")}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-medium transition-all active:scale-[0.98] shadow-md shadow-black/5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent" />
                        <span>Sending link...</span>
                      </div>
                    ) : "Send reset link"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-xl border border-neutral-100 dark:border-neutral-800 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
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
                      className="h-6 w-6"
                    >
                      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      <path d="m16 19 2 2 4-4" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Check your email</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
                      We&apos;ve sent a password reset link to your email. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-lg border-neutral-200 dark:border-neutral-800 font-medium transition-all active:scale-[0.98]"
                  onClick={() => setIsSuccess(false)}
                >
                  Try another email
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}



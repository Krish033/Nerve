"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/TextInput";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/ui/logo";
import { Turnstile } from "@marsidev/react-turnstile";
import { PublicRoute } from "@/components/auth/auth-guards";
import { Shield, Lock, ArrowRight, Smartphone, Mail, Key } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

// Import new partials
import loginWithEmail from "../_partials/imports/login-with-email";
import loginWithGoogle from "../_partials/imports/login-with-google";
import loginWithGithub from "../_partials/imports/login-with-github";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<{
    required: boolean;
    type: string;
    userId: string;
  } | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState<{
    email: string;
  } | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const router = useRouter();
  const mfaSubmitRef = React.useRef(false);

  const verifyMfa = useCallback(async () => {
    if (!mfaData || !mfaToken) return;

    setIsLoading(true);
    try {
      const res = await api.post("/auth/mfa/verify", {
        userId: mfaData.userId,
        token: mfaToken,
      });

      const { user, accessToken } = res.data as { user: import("@/lib/store/useAuth").AuthUser; accessToken: string };
      const { useAuthStore } = await import("@/lib/store/useAuth");
      useAuthStore.getState().setAuth(user, accessToken);

      toast.success("MFA Verification successful");
      setIsLoading(false);
      window.location.href = "/";
    } catch {
      toast.error("Invalid security code");
      setIsLoading(false);
    }
  }, [mfaData, mfaToken]);

  // Auto-verify when token reaches 6 digits
  useEffect(() => {
    if (mfaToken.length === 6 && !isLoading && !mfaSubmitRef.current) {
      mfaSubmitRef.current = true;
      void verifyMfa();
    } else if (mfaToken.length < 6) {
      mfaSubmitRef.current = false;
    }
  }, [isLoading, mfaToken, verifyMfa]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onEmailLogin = async (data: LoginFormValues) => {
    if (!captchaToken) {
      toast.error("Security challenge required");
      return;
    }
    setIsLoading(true);
    try {
      const res = await loginWithEmail(
        data.email,
        data.password,
        data.rememberMe,
      );
      if (res.emailVerificationRequired) {
        setEmailVerificationRequired({ email: res.email || "" });
        setIsLoading(false);
        toast.warning("Email verification required");
      } else if (res.mfaRequired) {
        setMfaData({
          required: true,
          type: res.mfaType || "TOTP",
          userId: res.userId || "",
        });
        setIsLoading(false);
        toast.info("Security code required");
      } else {
        toast.success("Identity verified");
        setIsLoading(false);
        window.location.href = "/";
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Authentication failed"));
      setIsLoading(false);
    }
  };

  const onVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyMfa();
  };

  const onResendVerification = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      if (auth.currentUser) {
        const { sendEmailVerification } = await import("firebase/auth");
        await sendEmailVerification(auth.currentUser);
        toast.success("Verification link transmitted");
      } else {
        toast.error("Session expired. Please attempt login again.");
        setEmailVerificationRequired(null);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Transmission failed"));
    }
  };

  const onGoogleLogin = async () => {
    setIsLoading(true);

    try {
      await loginWithGoogle();
      toast.success("Google authentication successful");
      setIsLoading(false);
      // window.location.href = "/";
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Google link failed"));
      setIsLoading(false);
    }
  };

  const onGithubLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGithub();
      toast.success("GitHub authentication successful");
      setIsLoading(false);
      window.location.href = "/";
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "GitHub link failed"));
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 p-4 font-sans text-neutral-900 dark:text-neutral-100 selection:bg-neutral-200 dark:selection:bg-neutral-800">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-8 gap-4">
            <Logo size="lg" />
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Sign in to your account to continue
              </p>
            </div>
          </div>

          {emailVerificationRequired ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/50 text-center space-y-3">
                <div className="mx-auto w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                  <Mail className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-blue-900 dark:text-blue-200">
                  Verify your email
                </h4>
                <p className="text-sm text-blue-700/80 dark:text-blue-300/80">
                  We&apos;ve sent an activation link to <span className="font-medium text-blue-900 dark:text-blue-100">{emailVerificationRequired.email}</span>.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={onResendVerification}
                  className="w-full h-11"
                >
                  Resend Activation Link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEmailVerificationRequired(null)}
                  className="w-full h-11 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Back to login
                </Button>
              </div>
            </div>
          ) : !mfaData?.required ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  onClick={onGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  onClick={onGithubLogin}
                  disabled={isLoading}
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  GitHub
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-neutral-950 px-2 text-neutral-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onEmailLogin)} className="space-y-4">
                <div className="space-y-4">
                  <TextInput
                    id="email"
                    type="email"
                    label="Email address"
                    placeholder="name@example.com"
                    disabled={isLoading}
                    error={errors.email?.message}
                    {...register("email")}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/auth/forgot-password">
                        <span className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <PasswordInput
                      id="password"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500 font-medium mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="rememberMe"
                    disabled={isLoading}
                    className="h-4 w-4 rounded-[4px] border-neutral-300 dark:border-neutral-700"
                    onCheckedChange={(checked) => {
                      setValue("rememberMe", !!checked);
                    }}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                <div className="py-2">
                  <Turnstile
                    options={{
                      appearance: "interaction-only",
                      theme: "auto",
                      size: "flexible",
                    }}
                    className="w-full"
                    siteKey="1x00000000000000000000AA"
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-medium transition-all active:scale-[0.98] shadow-md shadow-black/5"
                  disabled={isLoading || !captchaToken}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={onVerifyMfa} className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-neutral-900 dark:text-neutral-100 mb-4">
                  {mfaData.type === "TOTP" && <Key className="h-5 w-5" />}
                  {mfaData.type === "EMAIL" && <Mail className="h-5 w-5" />}
                  {mfaData.type === "PHONE" && <Smartphone className="h-5 w-5" />}
                </div>
                <h4 className="text-xl font-bold">
                  Two-Factor Authentication
                </h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter the code from your{" "}
                  {mfaData.type === "TOTP"
                    ? "authenticator app"
                    : mfaData.type.toLowerCase()}{" "}
                  to continue.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <TextInput
                    id="mfaToken"
                    type="text"
                    placeholder="000 000"
                    className="h-12 text-center text-2xl font-bold tracking-[0.2em]"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-medium transition-all active:scale-[0.98]"
                  disabled={isLoading || mfaToken.length < 6}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify code"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMfaData(null)}
                  className="w-full text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Back to login
                </Button>
              </div>
            </form>
          )}

          <div className="pt-6 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}

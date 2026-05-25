"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useAuthStore } from "@/lib/store/useAuth";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";
import { TextInput } from "@/components/ui/TextInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertTriangle,
  X,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { AuthUser } from "@/lib/store/useAuth";

// Import Partials
import { ProfileHeader } from "./_partials/ProfileHeader";
import { IdentityForm } from "./_partials/IdentityForm";
import { SecuritySettings } from "./_partials/SecuritySettings";
import { DangerZone } from "./_partials/DangerZone";
import { ProfileFormValues } from "./_partials/imports/schema";

import { 
  useProfile, 
  useUpdateProfile, 
  useDeleteAccount, 
  useResendVerification, 
  useDisableMfa 
} from "@/app/auth/_partials/imports/queries";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  
  useProfile();
  const updateProfileMutation = useUpdateProfile();
  const resendVerificationMutation = useResendVerification();
  const deleteAccountMutation = useDeleteAccount();
  const disableMfaMutation = useDisableMfa();
  
  const [hasPassword, setHasPassword] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisableMfaModal, setShowDisableMfaModal] = useState(false);
  const [showLinkPasswordModal, setShowLinkPasswordModal] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaSetupStep, setMfaSetupStep] = useState(1);
  const [mfaVerifyToken, setMfaVerifyToken] = useState("");
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const mfaSubmitRef = useRef(false);

  useEffect(() => {
    if (auth.currentUser) {
      const providers = auth.currentUser.providerData.map((p: { providerId: string }) => p.providerId);
      setHasPassword(providers.indexOf("password") !== -1);
    }
  }, [user]);

  const handleUpdate = useCallback(async (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data, {
      onSuccess: (updatedUser) => {
        setUser(updatedUser);
        toast.success("Profile updated successfully");
      },
      onError: () => {
        toast.error("Failed to update profile");
      }
    });
  }, [updateProfileMutation, setUser]);

  const onResendVerification = useCallback(async () => {
    resendVerificationMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Verification link sent to your email");
      },
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error, "Failed to send verification link"));
      }
    });
  }, [resendVerificationMutation]);

  const handleDelete = async () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: async () => {
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
        logout();
        toast.success("Account deleted permanently");
        router.push("/auth/login");
      },
      onError: () => {
        toast.error("Failed to delete account. Please contact support.");
      }
    });
  };

  const confirmDisableMfa = useCallback(() => {
    disableMfaMutation.mutate(undefined, {
      onSuccess: (updatedUser) => {
        toast.success("2FA has been disabled");
        setUser(updatedUser);
        setShowDisableMfaModal(false);
      },
      onError: () => {
        toast.error("Failed to disable 2FA");
      }
    });
  }, [disableMfaMutation, setUser]);

  const handleSetupMfa = useCallback(async () => {
    if (user?.isTwoFactorEnabled) {
      setShowDisableMfaModal(true);
      return;
    }

    setIsSettingUpMfa(true);
    try {
      const res = await api.post("/auth/mfa/setup");
      setMfaQrCode(res.data.qrCode);
      setMfaSecret(res.data.secret);
      setMfaSetupStep(1);
      setShowMfaModal(true);
    } catch {
      toast.error("Failed to start MFA setup");
    } finally {
      setIsSettingUpMfa(false);
    }
  }, [user?.isTwoFactorEnabled, disableMfaMutation, setUser]);

  const handleVerifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUpMfa(true);
    try {
      await api.post("/auth/mfa/setup-verify", { token: mfaVerifyToken });
      toast.success("2FA has been enabled");
      setShowMfaModal(false);
      const updatedProfile = await api.get("/users/profile");
      setUser(updatedProfile.data as AuthUser);
    } catch {
      toast.error("Invalid verification code");
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  const handleLinkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !linkPassword) return;

    setIsLinking(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, linkPassword);
      await linkWithCredential(auth.currentUser, credential);
      setHasPassword(true);
      setShowLinkPasswordModal(false);
      toast.success("Password linked successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to link password"));
    } finally {
      setIsLinking(false);
    }
  };

  // Auto-verify MFA token
  useEffect(() => {
    if (mfaVerifyToken.length === 6 && !isSettingUpMfa && !mfaSubmitRef.current) {
      mfaSubmitRef.current = true;
      void api.post("/auth/mfa/setup-verify", { token: mfaVerifyToken })
        .then(async () => {
          toast.success("2FA has been enabled");
          setShowMfaModal(false);
          const updatedProfile = await api.get("/users/profile");
          setUser(updatedProfile.data as AuthUser);
        })
        .catch(() => toast.error("Invalid verification code"))
        .finally(() => setIsSettingUpMfa(false));
    } else if (mfaVerifyToken.length < 6) {
      mfaSubmitRef.current = false;
    }
  }, [mfaVerifyToken, isSettingUpMfa]);

  return (
    <>
      <div className="space-y-6">
        <Heading title="Profile" description="Manage your personal information and security settings." />
        <ProfileHeader user={user} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <IdentityForm
              user={user}
              onSubmit={handleUpdate}
              isPending={updateProfileMutation.isPending}
              onResendVerification={onResendVerification}
            />
          </div>
          <div className="space-y-4">
            <SecuritySettings
              user={user}
              hasPassword={hasPassword}
              onLinkPassword={() => setShowLinkPasswordModal(true)}
              onSetupMfa={handleSetupMfa}
              isSettingUpMfa={isSettingUpMfa || disableMfaMutation.isPending}
            />
            <DangerZone onDeleteRequest={() => setShowDeleteModal(true)} />
          </div>
        </div>
      </div>

      {/* Disable 2FA modal */}
      {showDisableMfaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowDisableMfaModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => setShowDisableMfaModal(false)} className="absolute right-3 top-3 h-7 w-7" icon={X} />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Disable two-factor authentication</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This will reduce your account security.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure? Without 2FA your account will be more vulnerable to unauthorized access.
              </p>
              <div className="flex gap-2 pt-1">
                <Button onClick={() => setShowDisableMfaModal(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                <Button onClick={confirmDisableMfa} disabled={disableMfaMutation.isPending} variant="destructive" size="sm" className="flex-1">
                  {disableMfaMutation.isPending ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(false)} className="absolute right-3 top-3 h-7 w-7" icon={X} />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Delete account</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove all your data. This cannot be reversed.
              </p>
              <div className="flex gap-2 pt-1">
                <Button onClick={() => setShowDeleteModal(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                <Button onClick={handleDelete} variant="destructive" size="sm" className="flex-1">Delete account</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link password modal */}
      {showLinkPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowLinkPasswordModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => setShowLinkPasswordModal(false)} className="absolute right-3 top-3 h-7 w-7" icon={X} />
            <form onSubmit={handleLinkPassword} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Set a password</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Add a password to sign in directly.</p>
              </div>
              <TextInput
                type="password"
                label="New password"
                placeholder="Min. 8 characters"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                icon={<Lock className="h-3.5 w-3.5" />}
                required
                minLength={8}
              />
              <Button type="submit" disabled={isLinking} size="sm" className="w-full">
                {isLinking ? "Saving..." : "Set password"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* MFA setup modal */}
      {showMfaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMfaModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <Button variant="ghost" size="icon" onClick={() => setShowMfaModal(false)} className="absolute right-3 top-3 h-7 w-7" icon={X} />
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Set up two-factor authentication</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Step {mfaSetupStep} of 2 — {mfaSetupStep === 1 ? "Scan QR code" : "Verify code"}</p>
              </div>
              {mfaSetupStep === 1 ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-lg border border-border">
                    {mfaQrCode && <Image src={mfaQrCode} alt="MFA QR Code" width={176} height={176} unoptimized className="h-44 w-44" />}
                  </div>
                  <div className="w-full text-center space-y-1.5">
                    <p className="text-xs text-muted-foreground">Or enter this code manually in your authenticator app:</p>
                    <div className="p-2 bg-muted rounded-md">
                      <code className="text-xs font-mono text-foreground break-all">{mfaSecret}</code>
                    </div>
                  </div>
                  <Button onClick={() => setMfaSetupStep(2)} size="sm" className="w-full">Continue</Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyMfaSetup} className="space-y-4">
                  <TextInput
                    label="Verification code"
                    placeholder="000000"
                    value={mfaVerifyToken}
                    onChange={(e) => setMfaVerifyToken(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setMfaSetupStep(1)} className="flex-1">Back</Button>
                    <Button type="submit" size="sm" disabled={isSettingUpMfa} className="flex-1">
                      {isSettingUpMfa ? "Verifying..." : "Enable 2FA"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

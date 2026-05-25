declare global {
  interface AuthUser {
    id: string;
    email: string;
    name: string;
    mobile?: string;
    profilePicture?: string;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
    isTwoFactorEnabled: boolean;
    twoFactorType?: string;
    isEmailVerified: boolean;
    isMobileVerified: boolean;
  }

  interface LoginResponse {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    mfaRequired?: boolean;
    mfaType?: string;
    userId?: string;
    emailVerificationRequired?: boolean;
    email?: string;
  }
}

export {};



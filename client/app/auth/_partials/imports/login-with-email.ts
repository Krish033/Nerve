import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuth";
import { setRefreshTokenCookie } from "@/app/actions/auth-cookies";

/**
 * Orchestrates the email/password login flow:
 * 1. Authenticates with Firebase
 * 2. Exchanges Firebase ID token for a session with the Gateway
 * 3. Updates the local auth store
 */
export default async function loginWithEmail(
  email: string, 
  pass: string, 
  rememberMe: boolean = false
): Promise<LoginResponse> {
  // 1. Firebase Login
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const idToken = await userCredential.user.getIdToken();

  // 2. Gateway Login
  const response = await api.post<LoginResponse>("/auth/login", { 
    idToken,
    rememberMe 
  });

  console.log('[loginWithEmail] Response received:', !!response.data.user, !!response.data.accessToken, !!response.data.refreshToken);
  const { user, accessToken, refreshToken, mfaRequired, emailVerificationRequired } = response.data;
  
  if (!mfaRequired && !emailVerificationRequired && user && accessToken) {
    if (refreshToken) {
      await setRefreshTokenCookie(refreshToken);
    }
    // 3. Update Store only if fully verified
    useAuthStore.getState().setAuth(user, accessToken);
  }
  
  return response.data;
}



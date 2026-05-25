import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuth";
import { setRefreshTokenCookie } from "@/app/actions/auth-cookies";

/**
 * Executes Google OAuth login flow
 */
export default async function loginWithGoogle(): Promise<LoginResponse> {
  const provider = new GoogleAuthProvider();
  // Add contacts scope
  provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
  
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleAccessToken = credential?.accessToken;

  const response = await api.post<LoginResponse>("/auth/login", { idToken });
  const { user, accessToken, refreshToken, mfaRequired, emailVerificationRequired } = response.data;
  

  console.log(response.data, "response data");
  if (!mfaRequired && !emailVerificationRequired && user && accessToken) {
    if (refreshToken) {
      await setRefreshTokenCookie(refreshToken);
    }
    useAuthStore.getState().setAuth(user, accessToken, googleAccessToken || undefined);
  }
  
  return response.data;
}



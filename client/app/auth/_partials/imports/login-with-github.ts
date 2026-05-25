import { signInWithPopup, GithubAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuth";


/**
 * Executes GitHub OAuth login flow
 */
export default async function loginWithGithub(): Promise<LoginResponse> {
  const provider = new GithubAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const idToken = await userCredential.user.getIdToken();

  const response = await api.post<LoginResponse>("/auth/login", { idToken });
  const { user, accessToken, mfaRequired, emailVerificationRequired } = response.data;
  
  if (!mfaRequired && !emailVerificationRequired && user && accessToken) {
    useAuthStore.getState().setAuth(user, accessToken);
  }
  
  return response.data;
}



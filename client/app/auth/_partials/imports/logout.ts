import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuth";

/**
 * Logs the user out from both the Backend and Firebase, and clears the local store
 */
export default async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch (e) {
    console.error("Backend logout failed:", e);
  } finally {
    await firebaseSignOut(auth);
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }
}



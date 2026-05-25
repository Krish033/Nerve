import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuth";

/**
 * Attempts to refresh the access token using the HttpOnly refresh cookie
 */
export default async function refreshSession(): Promise<string> {
  try {
    const response = await api.post<LoginResponse>("/auth/refresh");
    const { user, accessToken } = response.data;
    
    // Using setAuth updates both user and token, AND sets isLoading to false
    useAuthStore.getState().setAuth(user, accessToken);
    
    return accessToken;
  } catch (error) {
    useAuthStore.getState().logout();
    throw error;
  }
}



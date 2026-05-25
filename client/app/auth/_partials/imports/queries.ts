import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UpdateProfileData {
  name?: string;
  mobile?: string;
  profilePicture?: string;
}

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get("/users/profile");
      return response.data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await api.patch("/users/profile", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete("/users/profile");
      return response.data;
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/auth/resend-verification");
      return response.data;
    },
  });
};

export const useDisableMfa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/auth/mfa/disable");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

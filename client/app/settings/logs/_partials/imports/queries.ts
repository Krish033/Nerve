import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useActivityLogs = (params: { q?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["logs", "activity", params],
    queryFn: async () => {
      const res = await api.get("/logs/activity", { params });
      return res.data;
    },
  });
};

export const useErrorLogs = (params: { q?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["logs", "errors", params],
    queryFn: async () => {
      const res = await api.get("/logs/errors", { params });
      return res.data;
    },
  });
};

export const useAuthLogs = (params: { q?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["logs", "auth", params],
    queryFn: async () => {
      const res = await api.get("/logs/auth", { params });
      return res.data;
    },
  });
};

export const useAccessLogs = (params: { q?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["logs", "access", params],
    queryFn: async () => {
      const res = await api.get("/logs/access", { params });
      return res.data;
    },
  });
};

export const useSessionLogs = () => {
  return useQuery({
    queryKey: ["logs", "sessions"],
    queryFn: async () => {
      const response = await api.get("/logs/sessions");
      return response.data;
    },
  });
};

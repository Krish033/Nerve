import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

function isClientError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

function getReadableMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ||
    (error instanceof Error ? error.message : "An unexpected error occurred")
  );
}

export const queryClientConfig = {
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only toast if the query already had data (background refetch failure)
      if (query.state.data !== undefined) {
        toast.error(getReadableMessage(error));
      }
    },
  }),
  mutationCache: new MutationCache({
    // Mutations handle their own errors in onError callbacks.
    // Global handler is a safety net for mutations that don't.
    onError: (error) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[MutationCache]", error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 1 min before refetch
      gcTime: 5 * 60 * 1000,     // 5 min before cache GC
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: unknown) => {
        // Never retry 4xx client errors
        if (isClientError(error)) return false;
        return failureCount < 2;
      },
    },
  },
};

export const getQueryClient = () => new QueryClient(queryClientConfig);



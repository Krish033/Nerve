"use client";

import { QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { getQueryClient } from "@/lib/query-client";

export default function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}



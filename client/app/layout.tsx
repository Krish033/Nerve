import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import QueryClientProvider from "@/lib/providers/QueryClientProvider";
import { AuthProvider } from "@/lib/providers/auth-provider-optimized";
import { NotificationProvider } from "@/lib/providers/notification-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ThemeColorProvider } from "@/lib/providers/theme-color-provider-optimized";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { MarketplaceProvider } from "@/lib/providers/marketplace-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { AppMetaSync } from "@/components/layouts/AppMetaSync";
import { RouteProgressBar } from "@/components/shared/RouteProgressBar";

export const metadata: Metadata = {
  title: "Nurve",
  description: "Nurve — your development workspace.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans bg-background text-foreground antialiased">
        <QueryClientProvider>
          <AuthProvider>
            <NotificationProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <MarketplaceProvider>
                  <ThemeColorProvider>
                    <AppMetaSync />
                    <Suspense fallback={null}>
                      <RouteProgressBar />
                    </Suspense>
                    <ErrorBoundary>{children}</ErrorBoundary>
                    <Toaster richColors position="top-center" />
                  </ThemeColorProvider>
                </MarketplaceProvider>
              </ThemeProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

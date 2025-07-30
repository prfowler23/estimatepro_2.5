"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { StartupValidationProvider } from "@/components/providers/startup-validation-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { NotificationProvider } from "@/components/ui/standardized-notifications";
import { FocusManager } from "@/components/ui/focus-management";
import { ErrorProvider } from "@/contexts/error-context";
import { SentryErrorBoundary } from "@/components/monitoring/sentry-error-boundary";
import { useState } from "react";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Composite provider that combines related providers to reduce nesting
 * in the main layout and improve maintainability
 */
export function AppProviders({ children }: AppProvidersProps) {
  // Create a client instance with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 5 minutes
            staleTime: 5 * 60 * 1000,
            // Garbage collection time: 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect unless stale
            refetchOnReconnect: "always",
          },
          mutations: {
            // Retry mutations
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="estimatepro-theme">
        <SentryErrorBoundary
          component="AppProviders"
          showDetails={true}
          allowFeedback={true}
        >
          <NotificationProvider
            maxNotifications={5}
            defaultPosition="top-right"
            defaultDuration={5000}
          >
            <FocusManager
              enableSkipLinks={true}
              skipLinks={[
                { href: "#main-content", label: "Skip to main content" },
                { href: "#navigation", label: "Skip to navigation" },
                { href: "#mobile-nav", label: "Skip to mobile navigation" },
              ]}
            >
              <StartupValidationProvider showValidationUI={false}>
                <AuthProvider>
                  <ErrorProvider>{children}</ErrorProvider>
                </AuthProvider>
              </StartupValidationProvider>
            </FocusManager>
          </NotificationProvider>
        </SentryErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

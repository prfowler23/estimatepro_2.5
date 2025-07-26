"use client";

import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Lazy load non-critical providers
const StartupValidationProvider = lazy(() =>
  import("@/components/providers/startup-validation-provider").then((mod) => ({
    default: mod.StartupValidationProvider,
  })),
);

const NotificationProvider = lazy(() =>
  import("@/components/ui/standardized-notifications").then((mod) => ({
    default: mod.NotificationProvider,
  })),
);

const FocusManager = lazy(() =>
  import("@/components/ui/focus-management").then((mod) => ({
    default: mod.FocusManager,
  })),
);

interface OptimizedAppProvidersProps {
  children: React.ReactNode;
}

// Loading fallback for providers
function ProviderFallback() {
  return null; // Providers typically don't have visual output
}

/**
 * Optimized provider setup with lazy loading for non-critical providers
 */
export function OptimizedAppProviders({
  children,
}: OptimizedAppProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="estimatepro-theme">
      <AuthProvider>
        <Suspense fallback={<ProviderFallback />}>
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
                {children}
              </StartupValidationProvider>
            </FocusManager>
          </NotificationProvider>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

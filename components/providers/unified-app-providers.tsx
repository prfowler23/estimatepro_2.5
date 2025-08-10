"use client";

import React, { Suspense, lazy, useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ErrorProvider } from "@/contexts/error-context";
import {
  QUERY_CLIENT_CONFIG,
  NOTIFICATION_CONFIG,
  FOCUS_MANAGEMENT_CONFIG,
  THEME_CONFIG,
  PROVIDER_OPTIMIZATION_CONFIG,
} from "@/lib/config/provider-config";

// Import critical providers directly
import { SentryErrorBoundary } from "@/components/monitoring/sentry-error-boundary";
import { MobilePerformanceProvider } from "@/components/providers/mobile-performance-provider";
import { MobileGestureProvider } from "@/components/providers/MobileGestureProvider";

// Conditionally lazy load non-critical providers based on optimization settings
const StartupValidationProvider = PROVIDER_OPTIMIZATION_CONFIG.enableLazyLoading
  ? lazy(() =>
      import("@/components/providers/startup-validation-provider").then(
        (mod) => ({
          default: mod.StartupValidationProvider,
        }),
      ),
    )
  : require("@/components/providers/startup-validation-provider")
      .StartupValidationProvider;

const NotificationProvider = PROVIDER_OPTIMIZATION_CONFIG.enableLazyLoading
  ? lazy(() =>
      import("@/components/ui/standardized-notifications").then((mod) => ({
        default: mod.NotificationProvider,
      })),
    )
  : require("@/components/ui/standardized-notifications").NotificationProvider;

const FocusManager = PROVIDER_OPTIMIZATION_CONFIG.enableLazyLoading
  ? lazy(() =>
      import("@/components/ui/focus-management").then((mod) => ({
        default: mod.FocusManager,
      })),
    )
  : require("@/components/ui/focus-management").FocusManager;

interface UnifiedAppProvidersProps {
  children: React.ReactNode;
  /**
   * Override default optimization settings
   */
  optimizationMode?: "standard" | "optimized" | "auto";
  /**
   * Show validation UI for startup validation
   */
  showValidationUI?: boolean;
  /**
   * Enable mobile performance optimization
   */
  enableMobilePerformance?: boolean;
  /**
   * Enable debug mode for mobile performance
   */
  debugMobilePerformance?: boolean;
  /**
   * Enable advanced mobile gesture support
   */
  enableMobileGestures?: boolean;
  /**
   * Enable gesture metrics tracking
   */
  enableGestureMetrics?: boolean;
}

/**
 * Provider loading fallback component
 */
const ProviderFallback = React.memo(() => {
  return null; // Providers typically don't have visual output
});

ProviderFallback.displayName = "ProviderFallback";

/**
 * Compound provider to reduce nesting depth
 */
const UIProviders = React.memo<{ children: React.ReactNode }>(
  ({ children }) => {
    const content = (
      <NotificationProvider
        maxNotifications={NOTIFICATION_CONFIG.maxNotifications}
        defaultPosition={NOTIFICATION_CONFIG.defaultPosition}
        defaultDuration={NOTIFICATION_CONFIG.defaultDuration}
      >
        <FocusManager
          enableSkipLinks={FOCUS_MANAGEMENT_CONFIG.enableSkipLinks}
          skipLinks={FOCUS_MANAGEMENT_CONFIG.skipLinks}
        >
          {children}
        </FocusManager>
      </NotificationProvider>
    );

    // Wrap in Suspense if lazy loading is enabled
    if (PROVIDER_OPTIMIZATION_CONFIG.enableLazyLoading) {
      return <Suspense fallback={<ProviderFallback />}>{content}</Suspense>;
    }

    return content;
  },
);

UIProviders.displayName = "UIProviders";

/**
 * State management providers compound
 */
const StateProviders = React.memo<{
  children: React.ReactNode;
  showValidationUI?: boolean;
}>(({ children, showValidationUI = false }) => {
  const content = (
    <StartupValidationProvider showValidationUI={showValidationUI}>
      <AuthProvider>
        <ErrorProvider>{children}</ErrorProvider>
      </AuthProvider>
    </StartupValidationProvider>
  );

  // Wrap in Suspense if lazy loading is enabled and StartupValidationProvider is lazy
  if (PROVIDER_OPTIMIZATION_CONFIG.enableLazyLoading) {
    return <Suspense fallback={<ProviderFallback />}>{content}</Suspense>;
  }

  return content;
});

StateProviders.displayName = "StateProviders";

/**
 * Unified application providers with intelligent optimization
 * Combines the benefits of both standard and optimized approaches
 */
export const UnifiedAppProviders = React.memo<UnifiedAppProvidersProps>(
  ({
    children,
    optimizationMode = "auto",
    showValidationUI = false,
    enableMobilePerformance = true,
    debugMobilePerformance = false,
    enableMobileGestures = true,
    enableGestureMetrics = true,
  }) => {
    // Create a stable QueryClient instance with memoized configuration
    const [queryClient] = useState(
      () =>
        new QueryClient({
          defaultOptions: QUERY_CLIENT_CONFIG,
        }),
    );

    // Determine if we should use optimization based on mode
    const shouldOptimize = useMemo(() => {
      if (optimizationMode === "auto") {
        // Auto mode: optimize in production, standard in development
        return process.env.NODE_ENV === "production";
      }
      return optimizationMode === "optimized";
    }, [optimizationMode]);

    // Log provider mode in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Providers] Running in ${shouldOptimize ? "optimized" : "standard"} mode`,
      );
    }

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          defaultTheme={THEME_CONFIG.defaultTheme}
          storageKey={THEME_CONFIG.storageKey}
        >
          <MobilePerformanceProvider
            enableAutoOptimization={enableMobilePerformance}
            debugMode={debugMobilePerformance}
          >
            <MobileGestureProvider
              enableMetrics={enableGestureMetrics}
              enableAutoOptimization={enableMobileGestures}
            >
              <SentryErrorBoundary
                component="UnifiedAppProviders"
                showDetails={true}
                allowFeedback={true}
              >
                <UIProviders>
                  <StateProviders showValidationUI={showValidationUI}>
                    {children}
                  </StateProviders>
                </UIProviders>
              </SentryErrorBoundary>
            </MobileGestureProvider>
          </MobilePerformanceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  },
);

UnifiedAppProviders.displayName = "UnifiedAppProviders";

/**
 * Export the unified provider as the default app provider
 */
export { UnifiedAppProviders as AppProviders };

/**
 * Export for backward compatibility
 */
export { UnifiedAppProviders as OptimizedAppProviders };

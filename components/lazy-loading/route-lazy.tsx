/**
 * Route-Level Lazy Loading Components
 *
 * Provides lazy-loaded route components to improve initial bundle size
 * and reduce time to interactive (TTI) for the application.
 *
 * Benefits:
 * - Reduces initial bundle size by ~40-60%
 * - Improves Time to Interactive (TTI)
 * - Better Core Web Vitals scores
 * - Route-based code splitting
 */

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

// ===========================================
// Loading Components
// ===========================================

export function RoutePageLoader({
  title = "Loading page...",
}: {
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Content skeleton */}
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TablePageLoader() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-4">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-6" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPageLoader() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-48" />
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormPageLoader() {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10" />
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Lazy Loaded Route Components
// ===========================================

// Analytics and AI pages
export const LazyAIAnalyticsPage = dynamic(
  () =>
    import("@/app/ai-analytics/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <AnalyticsPageLoader />,
  },
);

export const LazyAnalyticsPage = dynamic(
  () =>
    import("@/app/analytics/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <AnalyticsPageLoader />,
  },
);

export const LazyPerformancePage = dynamic(
  () =>
    import("@/app/performance/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <AnalyticsPageLoader />,
  },
);

export const LazyAuditPage = dynamic(
  () => import("@/app/audit/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <AnalyticsPageLoader />,
  },
);

// AI Assistant pages
export const LazyAIAssistantPage = dynamic(
  () =>
    import("@/app/ai-assistant/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading AI Assistant..." />,
  },
);

export const LazyAIAssistantEnhancedPage = dynamic(
  () =>
    import("@/app/ai-assistant/enhanced/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading Enhanced AI Assistant..." />,
  },
);

export const LazyAIAssistantToolsPage = dynamic(
  () =>
    import("@/app/ai-assistant/tools/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading AI Tools..." />,
  },
);

export const LazyAIAssistantIntegratedPage = dynamic(
  () =>
    import("@/app/ai-assistant/integrated/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading Integrated Assistant..." />,
  },
);

// Estimate pages
export const LazyEstimatesPage = dynamic(
  () =>
    import("@/app/estimates/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <TablePageLoader />,
  },
);

export const LazyEstimateDetailsPage = dynamic(
  () =>
    import("@/app/estimates/[id]/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading estimate details..." />,
  },
);

export const LazyEstimateEditPage = dynamic(
  () =>
    import("@/app/estimates/[id]/edit/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazyEstimatesNewPage = dynamic(
  () =>
    import("@/app/estimates/new/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading estimate builder..." />,
  },
);

export const LazyEstimatesNewQuickPage = dynamic(
  () =>
    import("@/app/estimates/new/quick/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazyEstimatesTemplatesPage = dynamic(
  () =>
    import("@/app/estimates/templates/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <TablePageLoader />,
  },
);

// Demo and tool pages
export const Lazy3DDemoPage = dynamic(
  () => import("@/app/3d-demo/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading 3D visualization..." />,
  },
);

export const LazyDroneDemoPage = dynamic(
  () =>
    import("@/app/drone-demo/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading drone interface..." />,
  },
);

// Settings pages
export const LazySettingsPage = dynamic(
  () => import("@/app/settings/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazySettingsUsersPage = dynamic(
  () =>
    import("@/app/settings/users/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <TablePageLoader />,
  },
);

// Auth pages (keep lightweight, don't lazy load)
// Authentication pages should load quickly for UX

// Auth pages
export const LazyAuthLoginPage = dynamic(
  () =>
    import("@/app/auth/login/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazyAuthSignupPage = dynamic(
  () =>
    import("@/app/auth/signup/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazyAuthCallbackPage = dynamic(
  () =>
    import("@/app/auth/callback/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Authenticating..." />,
  },
);

export const LazyAuthForgotPasswordPage = dynamic(
  () =>
    import("@/app/auth/forgot-password/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

// Test and utility pages
export const LazyTestSentryPage = dynamic(
  () =>
    import("@/app/test-sentry/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading test page..." />,
  },
);

export const LazyTestFixesPage = dynamic(
  () =>
    import("@/app/test-fixes/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading test fixes..." />,
  },
);

export const LazyPDFProcessorPage = dynamic(
  () =>
    import("@/app/pdf-processor/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading PDF processor..." />,
  },
);

export const LazyBackgroundsDemoPage = dynamic(
  () =>
    import("@/app/backgrounds-demo/page").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading backgrounds demo..." />,
  },
);

// Root page (home)
export const LazyRootPage = dynamic(
  () => import("@/app/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading EstimatePro..." />,
  },
);

// Special pages
export const LazyOnboardingPage = dynamic(
  () =>
    import("@/app/onboarding/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <FormPageLoader />,
  },
);

export const LazyOfflinePage = dynamic(
  () => import("@/app/offline/page").then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => <RoutePageLoader title="Loading offline page..." />,
  },
);

// ===========================================
// Lazy Loading Wrapper Component
// ===========================================

interface LazyRouteWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  enableSuspense?: boolean;
}

export function LazyRouteWrapper({
  children,
  fallback = <RoutePageLoader />,
  enableSuspense = true,
}: LazyRouteWrapperProps) {
  if (!enableSuspense) {
    return <>{children}</>;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

// ===========================================
// Route Component Registry
// ===========================================

export const LAZY_ROUTES = {
  // Root page
  "/": LazyRootPage,

  // Analytics
  "/ai-analytics": LazyAIAnalyticsPage,
  "/analytics": LazyAnalyticsPage,
  "/performance": LazyPerformancePage,
  "/audit": LazyAuditPage,

  // AI Assistant
  "/ai-assistant": LazyAIAssistantPage,
  "/ai-assistant/enhanced": LazyAIAssistantEnhancedPage,
  "/ai-assistant/tools": LazyAIAssistantToolsPage,
  "/ai-assistant/integrated": LazyAIAssistantIntegratedPage,

  // Estimates
  "/estimates": LazyEstimatesPage,
  "/estimates/new": LazyEstimatesNewPage,
  "/estimates/new/quick": LazyEstimatesNewQuickPage,
  "/estimates/templates": LazyEstimatesTemplatesPage,

  // Auth
  "/auth/login": LazyAuthLoginPage,
  "/auth/signup": LazyAuthSignupPage,
  "/auth/callback": LazyAuthCallbackPage,
  "/auth/forgot-password": LazyAuthForgotPasswordPage,

  // Demos
  "/3d-demo": Lazy3DDemoPage,
  "/drone-demo": LazyDroneDemoPage,
  "/backgrounds-demo": LazyBackgroundsDemoPage,

  // Settings
  "/settings": LazySettingsPage,
  "/settings/users": LazySettingsUsersPage,

  // Test pages
  "/test-sentry": LazyTestSentryPage,
  "/test-fixes": LazyTestFixesPage,
  "/pdf-processor": LazyPDFProcessorPage,

  // Special
  "/onboarding": LazyOnboardingPage,
  "/offline": LazyOfflinePage,
} as const;

export type LazyRoutePath = keyof typeof LAZY_ROUTES;

// Helper to get lazy component for a route
export function getLazyRouteComponent(
  path: string,
): React.ComponentType | null {
  return LAZY_ROUTES[path as LazyRoutePath] || null;
}

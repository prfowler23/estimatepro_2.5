/**
 * Component-Level Lazy Loading Infrastructure
 *
 * Provides lazy-loaded components for non-critical UI elements to improve
 * initial page load performance and reduce bundle size impact.
 */

import React, { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle, BarChart3, Settings, Users } from "lucide-react";

// ===========================================
// Loading Components for Different UI Types
// ===========================================

export function ChartComponentLoader() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-48 w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsComponentLoader() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground animate-pulse" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function FormComponentLoader() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex space-x-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsComponentLoader() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-muted-foreground animate-pulse" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function UserManagementComponentLoader() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-muted-foreground animate-pulse" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 p-3 border rounded"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorComponentLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-2">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

// ===========================================
// Lazy Loaded Non-Critical Components
// ===========================================

// Analytics and Dashboard Components
export const LazyAIAnalyticsDashboard = lazy(
  () => import("@/components/ai/AIAnalyticsDashboard"),
);

export const LazyConsolidatedAnalyticsDashboard = lazy(
  () => import("@/components/analytics/ConsolidatedAnalyticsDashboard"),
);

export const LazyEnhancedAnalyticsDashboard = lazy(
  () => import("@/components/analytics/enhanced-analytics-dashboard"),
);

export const LazyPerformanceDashboard = lazy(
  () => import("@/components/performance/performance-dashboard"),
);

export const LazyMonitoringDashboard = lazy(
  () => import("@/components/monitoring/monitoring-dashboard"),
);

// Audit and Compliance Components
export const LazyAuditDashboard = lazy(
  () => import("@/components/audit/audit-dashboard"),
);

// Settings and User Management
export const LazyEnhancedMFASetup = lazy(
  () => import("@/components/auth/enhanced-mfa-setup"),
);

export const LazyWebhookManager = lazy(
  () => import("@/components/integrations/webhook-manager-v2"),
);

export const LazyWebhookForm = lazy(
  () => import("@/components/integrations/webhook-form"),
);

export const LazyWebhookDeliveryTable = lazy(
  () => import("@/components/integrations/webhook-delivery-table"),
);

// Template and Recommendation Components
export const LazyRecommendationsList = lazy(
  () => import("@/components/templates/RecommendationsList"),
);

export const LazyTagInput = lazy(
  () => import("@/components/templates/TagInput"),
);

// Advanced Calculator Components (Non-Critical Forms)
export const LazyBiofilmRemovalForm = lazy(
  () => import("@/components/calculator/forms/biofilm-removal-form"),
);

export const LazyFinalCleanForm = lazy(
  () => import("@/components/calculator/forms/final-clean-form"),
);

export const LazyGraniteReconditioningForm = lazy(
  () => import("@/components/calculator/forms/granite-reconditioning-form"),
);

export const LazyParkingDeckForm = lazy(
  () => import("@/components/calculator/forms/parking-deck-form"),
);

// Collaboration and Real-time Components
export const LazyCollaborationDemo = lazy(
  () => import("@/components/collaboration/CollaborationDemo"),
);

export const LazyRealTimeChangeIndicator = lazy(
  () => import("@/components/collaboration/RealTimeChangeIndicator"),
);

export const LazyConflictResolutionDialog = lazy(
  () => import("@/components/collaboration/ConflictResolutionDialog"),
);

// Help and Tutorial Components
export const LazyInteractiveTutorial = lazy(
  () => import("@/components/help/InteractiveTutorial"),
);

export const LazyContextualHelpPanel = lazy(
  () => import("@/components/help/ContextualHelpPanel"),
);

export const LazyHelpIntegratedFlow = lazy(
  () => import("@/components/help/HelpIntegratedFlow"),
);

// Drone and 3D Visualization (Heavy Components)
export const LazyDroneDashboard = lazy(
  () => import("@/components/drone/drone-dashboard"),
);

export const LazyThreeDDemoPageDynamic = lazy(
  () => import("@/components/3d-demo/ThreeDDemoPageDynamic"),
);

// ===========================================
// Wrapper Component with Error Boundary
// ===========================================

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  name?: string;
}

export function LazyComponentWrapper({
  children,
  fallback,
  errorFallback,
  name = "component",
}: LazyComponentWrapperProps) {
  return (
    <Suspense fallback={fallback || <Skeleton className="h-32 w-full" />}>
      <React.Suspense fallback={fallback}>{children}</React.Suspense>
    </Suspense>
  );
}

// ===========================================
// Component Registry and Utilities
// ===========================================

export const LAZY_COMPONENT_REGISTRY = {
  // Analytics
  "ai-analytics": LazyAIAnalyticsDashboard,
  "consolidated-analytics": LazyConsolidatedAnalyticsDashboard,
  "enhanced-analytics": LazyEnhancedAnalyticsDashboard,
  "performance-dashboard": LazyPerformanceDashboard,
  "monitoring-dashboard": LazyMonitoringDashboard,

  // Audit
  "audit-dashboard": LazyAuditDashboard,

  // Settings
  "mfa-setup": LazyEnhancedMFASetup,
  "webhook-manager": LazyWebhookManager,
  "webhook-form": LazyWebhookForm,
  "webhook-delivery": LazyWebhookDeliveryTable,

  // Templates
  recommendations: LazyRecommendationsList,
  "tag-input": LazyTagInput,

  // Advanced Forms
  "biofilm-form": LazyBiofilmRemovalForm,
  "final-clean-form": LazyFinalCleanForm,
  "granite-form": LazyGraniteReconditioningForm,
  "parking-deck-form": LazyParkingDeckForm,

  // Collaboration
  "collaboration-demo": LazyCollaborationDemo,
  "realtime-indicator": LazyRealTimeChangeIndicator,
  "conflict-resolution": LazyConflictResolutionDialog,

  // Help
  tutorial: LazyInteractiveTutorial,
  "help-panel": LazyContextualHelpPanel,
  "help-flow": LazyHelpIntegratedFlow,

  // Heavy Components
  "drone-dashboard": LazyDroneDashboard,
  "3d-demo": LazyThreeDDemoPageDynamic,
} as const;

export type LazyComponentType = keyof typeof LAZY_COMPONENT_REGISTRY;

/**
 * Helper function to get a lazy component by name
 */
export function getLazyComponent(name: LazyComponentType) {
  return LAZY_COMPONENT_REGISTRY[name];
}

/**
 * Hook for conditional lazy loading based on viewport
 */
export function useConditionalLazyLoad(condition: boolean = true) {
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (condition && !shouldLoad) {
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }
  }, [condition, shouldLoad]);

  return shouldLoad;
}

/**
 * Performance metrics for lazy loading
 */
export interface LazyLoadingMetrics {
  componentName: string;
  loadTime: number;
  bundleSize?: number;
  renderTime?: number;
}

const lazyLoadingMetrics: LazyLoadingMetrics[] = [];

export function recordLazyLoadingMetric(metric: LazyLoadingMetrics) {
  lazyLoadingMetrics.push({
    ...metric,
    loadTime: Date.now(),
  });

  // Optional: Send to analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "lazy_component_load", {
      component_name: metric.componentName,
      load_time: metric.loadTime,
    });
  }
}

export function getLazyLoadingMetrics() {
  return [...lazyLoadingMetrics];
}

"use client";

import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardUnifiedSkeleton } from "@/components/dashboard/DashboardUnifiedSkeleton";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import { ChartErrorBoundary } from "@/components/dashboard/ChartErrorBoundary";
import { ConnectivityStatus } from "@/components/ui/connectivity-status";
import { useAppNavigation } from "@/hooks/useNavigationState";
import { useSmartNavigation } from "@/lib/optimization/route-optimization";
import { useAuth } from "@/contexts/auth-context";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useRouter } from "next/navigation";

// Import lightweight components directly
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AICreateEstimateCard } from "@/components/dashboard/AICreateEstimateCard";
import { FacadeAnalysisCard } from "@/components/dashboard/FacadeAnalysisCard";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";

// Lazy load only heavy components
const AnalyticsOverview = lazy(() =>
  import("@/components/analytics/enhanced-analytics-overview").then((mod) => ({
    default: mod.AnalyticsOverview,
  })),
);

const AIBusinessInsights = lazy(() =>
  import("@/components/dashboard/AIBusinessInsights").then((mod) => ({
    default: mod.AIBusinessInsights,
  })),
);

export default function Dashboard() {
  const { user } = useAuth();
  const { navigateTo, isNavigating } = useAppNavigation();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Use smart navigation for predictive prefetching
  const { navigate: smartNavigate } = useSmartNavigation({
    enablePrefetch: true,
    enablePrediction: true,
    enableMetrics: true,
    preloadTimeout: 1500, // Shorter timeout for dashboard
  });

  // Use React Query hook for analytics data
  const { data, loading, error, refetch, isFetching } = useAnalyticsData();

  useEffect(() => {
    setIsClient(true);

    // Prefetch critical routes immediately
    if (router.prefetch) {
      router.prefetch("/estimates/new/guided");
      router.prefetch("/calculator");
      router.prefetch("/ai-assistant");

      // Prefetch high-value routes after a short delay
      setTimeout(() => {
        router.prefetch("/estimates");
        router.prefetch("/analytics");
        router.prefetch("/settings");
      }, 2000);
    }
  }, [router]);

  const handleNavigateTo = useCallback(
    async (path: string) => {
      try {
        if (isClient) {
          // Use smart navigation for performance tracking and prediction
          smartNavigate(path);
        }
      } catch (error) {
        console.error("Navigation error:", error);
        // Fallback to regular navigation
        try {
          await navigateTo(path);
        } catch (fallbackError) {
          console.error("Fallback navigation error:", fallbackError);
        }
      }
    },
    [isClient, smartNavigate, navigateTo],
  );

  const isEmpty = useMemo(
    () =>
      !data ||
      (data.overview.totalRevenue === 0 && data.customers.totalCustomers === 0),
    [data],
  );

  return (
    <ProtectedRoute requireOnboarding>
      <div className="min-h-screen bg-bg-base">
        <ConnectivityStatus />

        <div className="container mx-auto px-4 py-6 lg:px-8">
          {/* Header Section */}
          <DashboardErrorBoundary>
            <DashboardHeader
              userName={user?.user_metadata?.full_name || user?.email || "User"}
              lastActivity={
                user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null
              }
              onRefresh={refetch}
              loading={loading || isFetching}
            />
          </DashboardErrorBoundary>

          {/* Main Content */}
          {loading ? (
            <DashboardUnifiedSkeleton />
          ) : error ? (
            <DashboardErrorState
              error={error?.message || "Failed to load analytics data"}
              onRetry={refetch}
            />
          ) : isEmpty ? (
            <DashboardEmptyState
              fetchDashboardData={refetch}
              navigateTo={handleNavigateTo}
            />
          ) : (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2">
                <DashboardErrorBoundary>
                  <AICreateEstimateCard navigateTo={handleNavigateTo} />
                </DashboardErrorBoundary>

                <DashboardErrorBoundary>
                  <FacadeAnalysisCard />
                </DashboardErrorBoundary>
              </div>

              {/* Analytics Overview */}
              <ChartErrorBoundary fallbackTitle="Analytics Overview Error">
                <Suspense
                  fallback={
                    <div className="h-96 animate-pulse bg-border-primary/20 rounded-lg" />
                  }
                >
                  <AnalyticsOverview data={data} />
                </Suspense>
              </ChartErrorBoundary>

              {/* AI Business Insights */}
              <DashboardErrorBoundary>
                <AIBusinessInsights data={data} />
              </DashboardErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardSkeletonLoader } from "@/components/dashboard/DashboardSkeletonLoader";
import { ConnectivityStatus } from "@/components/ui/connectivity-status";
import { useAppNavigation } from "@/hooks/useNavigationState";
import type { AnalyticsData } from "@/lib/analytics/data";

// Lazy load heavy components
const AnalyticsOverview = lazy(() =>
  import("@/components/analytics/analytics-overview").then((mod) => ({
    default: mod.AnalyticsOverview,
  })),
);

const DashboardHeader = lazy(() =>
  import("@/components/dashboard/DashboardHeader").then((mod) => ({
    default: mod.DashboardHeader,
  })),
);

const AICreateEstimateCard = lazy(() =>
  import("@/components/dashboard/AICreateEstimateCard").then((mod) => ({
    default: mod.AICreateEstimateCard,
  })),
);

const AIBusinessInsights = lazy(() =>
  import("@/components/dashboard/AIBusinessInsights").then((mod) => ({
    default: mod.AIBusinessInsights,
  })),
);

const FacadeAnalysisCard = lazy(() =>
  import("@/components/dashboard/FacadeAnalysisCard").then((mod) => ({
    default: mod.FacadeAnalysisCard,
  })),
);

const DashboardEmptyState = lazy(() =>
  import("@/components/dashboard/DashboardEmptyState").then((mod) => ({
    default: mod.DashboardEmptyState,
  })),
);

const DashboardErrorState = lazy(() =>
  import("@/components/dashboard/DashboardErrorState").then((mod) => ({
    default: mod.DashboardErrorState,
  })),
);

// Lazy load analytics service
const getAnalyticsService = () =>
  import("@/lib/analytics/data").then((mod) => mod.AnalyticsService);

export default function Dashboard() {
  const { navigateTo, isNavigating } = useAppNavigation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNavigateTo = async (path: string) => {
    console.log(`Navigating to: ${path}`);
    try {
      if (isClient) {
        console.log("Client is ready, attempting navigation...");
        await navigateTo(path);
      } else {
        console.warn("Client not ready for navigation");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      if (typeof window !== "undefined") {
        console.log("Falling back to window.location");
        window.location.href = path;
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const AnalyticsService = await getAnalyticsService();
      const analytics = new AnalyticsService();
      const fetchedData = await analytics.getAnalyticsData("1d");
      setData(fetchedData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClient) {
      fetchDashboardData();
    }
  }, [isClient]);

  return (
    <ProtectedRoute requireOnboarding>
      <div className="min-h-screen bg-bg-base">
        <ConnectivityStatus />

        <div className="container mx-auto px-4 py-6 lg:px-8">
          {/* Header Section */}
          <Suspense
            fallback={
              <div className="h-20 animate-pulse bg-border-primary/20 rounded-lg mb-6" />
            }
          >
            <DashboardHeader
              userName="User"
              lastActivity={data?.lastActivity}
            />
          </Suspense>

          {/* Main Content */}
          {loading ? (
            <DashboardSkeletonLoader />
          ) : error ? (
            <Suspense fallback={<DashboardSkeletonLoader />}>
              <DashboardErrorState error={error} onRetry={fetchDashboardData} />
            </Suspense>
          ) : !data ||
            (data.totalRevenue === 0 && data.activeCustomers === 0) ? (
            <Suspense fallback={<DashboardSkeletonLoader />}>
              <DashboardEmptyState navigateTo={handleNavigateTo} />
            </Suspense>
          ) : (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2">
                <Suspense
                  fallback={
                    <div className="h-32 animate-pulse bg-border-primary/20 rounded-lg" />
                  }
                >
                  <AICreateEstimateCard navigateTo={handleNavigateTo} />
                </Suspense>

                <Suspense
                  fallback={
                    <div className="h-32 animate-pulse bg-border-primary/20 rounded-lg" />
                  }
                >
                  <FacadeAnalysisCard />
                </Suspense>
              </div>

              {/* Analytics Overview */}
              <Suspense
                fallback={
                  <div className="h-96 animate-pulse bg-border-primary/20 rounded-lg" />
                }
              >
                <AnalyticsOverview data={data} />
              </Suspense>

              {/* AI Business Insights */}
              <Suspense
                fallback={
                  <div className="h-64 animate-pulse bg-border-primary/20 rounded-lg" />
                }
              >
                <AIBusinessInsights data={data} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

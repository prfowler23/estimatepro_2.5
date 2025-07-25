"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { AnalyticsService, type AnalyticsData } from "@/lib/analytics/data";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AICreateEstimateCard } from "@/components/dashboard/AICreateEstimateCard";
import { AIBusinessInsights } from "@/components/dashboard/AIBusinessInsights";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { ConnectivityStatus } from "@/components/ui/connectivity-status";
import { useAppNavigation } from "@/hooks/useNavigationState";

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
      setError(null);

      const isConnected = await AnalyticsService.checkDatabaseConnection();
      if (!isConnected) {
        throw new Error(
          "Unable to connect to database. Please check your connection.",
        );
      }

      const analyticsData = await AnalyticsService.getFullAnalyticsData();
      setData(analyticsData);
    } catch (error: any) {
      setError(error.message || "Failed to load dashboard data");
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <ProtectedRoute>
      <div className="container py-6">
        <DashboardHeader onRefresh={fetchDashboardData} loading={loading} />

        {/* System Status Section */}
        <div className="mb-6">
          <ConnectivityStatus />
        </div>

        <AICreateEstimateCard navigateTo={handleNavigateTo} />

        <AIBusinessInsights />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && !data && <DashboardLoadingState />}

        {!loading && data && !error && data.overview.totalQuotes === 0 && (
          <DashboardEmptyState
            fetchDashboardData={fetchDashboardData}
            navigateTo={handleNavigateTo}
          />
        )}

        {!loading && data && !error && data.overview.totalQuotes > 0 && (
          <AnalyticsOverview data={data} />
        )}

        {!loading && !data && !error && (
          <DashboardErrorState fetchDashboardData={fetchDashboardData} />
        )}
      </div>
    </ProtectedRoute>
  );
}

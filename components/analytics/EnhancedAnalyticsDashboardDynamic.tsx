"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, RefreshCw } from "lucide-react";

// Loading component for the enhanced analytics dashboard
function EnhancedAnalyticsDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-80 bg-border-primary/20 rounded animate-pulse" />
          <div className="h-4 w-96 bg-border-primary/20 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-border-primary/20 rounded animate-pulse" />
          <div className="h-9 w-20 bg-border-primary/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Data Quality Indicator skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-border-primary/20 rounded animate-pulse" />
            <div className="h-6 w-32 bg-border-primary/20 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-border-primary/20 rounded animate-pulse" />
                <div className="h-2 w-full bg-border-primary/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Scores skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-5 w-5 bg-border-primary/20 rounded animate-pulse" />
            <div className="h-6 w-40 bg-border-primary/20 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-20 h-20 mx-auto bg-border-primary/20 rounded-full animate-pulse" />
                <div className="h-4 w-16 mx-auto bg-border-primary/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 bg-border-primary/20 rounded animate-pulse"
            />
          ))}
        </div>

        {/* Tab content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 w-24 bg-border-primary/20 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-border-primary/20 rounded animate-pulse" />
                </div>
                <div className="h-8 w-32 bg-border-primary/20 rounded animate-pulse mb-2" />
                <div className="h-3 w-40 bg-border-primary/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-6 w-48 bg-border-primary/20 rounded animate-pulse mb-4" />
                <div className="h-80 bg-border-primary/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamic import of the actual enhanced analytics dashboard with lazy loading
const EnhancedAnalyticsDashboardContent = dynamic(
  () =>
    import("./enhanced-analytics-dashboard").then((mod) => ({
      default: mod.EnhancedAnalyticsDashboard,
    })),
  {
    ssr: false, // Disable SSR for Recharts components
    loading: () => <EnhancedAnalyticsDashboardLoading />,
  },
);

export default function EnhancedAnalyticsDashboardDynamic() {
  return <EnhancedAnalyticsDashboardContent />;
}

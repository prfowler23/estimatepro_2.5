"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

// Loading components for analytics dashboards
const AnalyticsLoader = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <CardTitle>Loading Analytics...</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  </div>
);

// Lazy load AdvancedFilteringPersonalization (37KB)
export const LazyAdvancedFilteringPersonalization = dynamic(
  () => import("../analytics/AdvancedFilteringPersonalization"),
  {
    loading: () => <AnalyticsLoader />,
    ssr: false, // Disable SSR for heavy analytics component
  },
);

// Lazy load UnifiedAnalyticsDashboard (32KB)
export const LazyUnifiedAnalyticsDashboard = dynamic(
  () => import("../analytics/UnifiedAnalyticsDashboard"),
  {
    loading: () => <AnalyticsLoader />,
    ssr: false,
  },
);

// Lazy load ChartOptimizations (31KB)
export const LazyChartOptimizations = dynamic(
  () => import("../analytics/ChartOptimizations"),
  {
    loading: () => <AnalyticsLoader />,
    ssr: false,
  },
);

// Wrapper component with Suspense for additional safety
export function LazyAnalyticsWrapper({
  children,
  fallback = <AnalyticsLoader />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

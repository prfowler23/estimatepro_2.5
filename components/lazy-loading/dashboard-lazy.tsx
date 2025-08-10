"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Monitor, FileText, Clock } from "lucide-react";

// Loading component for dashboards
const DashboardLoader = () => (
  <div className="min-h-screen bg-bg-base p-6">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-8">
        <Monitor className="h-6 w-6 animate-pulse text-primary" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 mb-4" />
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Loading component for PDF processor
const PDFLoader = () => (
  <Card className="max-w-4xl mx-auto">
    <CardHeader>
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 animate-pulse text-primary" />
        <CardTitle>Loading PDF Processor...</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

// Loading component for timeline visualization
const TimelineLoader = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 animate-pulse text-primary" />
        <CardTitle>Loading Timeline...</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Lazy load PDF processor (34KB)
export const LazyPDFProcessor = dynamic(() => import("../pdf/pdf-processor"), {
  loading: () => <PDFLoader />,
  ssr: false,
});

// Lazy load monitoring dashboard (33KB)
export const LazyMonitoringDashboard = dynamic(
  () => import("../monitoring/monitoring-dashboard"),
  {
    loading: () => <DashboardLoader />,
    ssr: false,
  },
);

// Lazy load timeline visualization (32KB)
export const LazyTimelineVisualization = dynamic(
  () => import("../duration/TimelineVisualization"),
  {
    loading: () => <TimelineLoader />,
    ssr: false,
  },
);

// Lazy load audit dashboard (31KB)
export const LazyAuditDashboard = dynamic(
  () => import("../audit/audit-dashboard"),
  {
    loading: () => <DashboardLoader />,
    ssr: false,
  },
);

// Wrapper components
export function LazyDashboardWrapper({
  children,
  fallback = <DashboardLoader />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function LazyPDFWrapper({
  children,
  fallback = <PDFLoader />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

"use client";

import React, { Suspense } from "react";
import { OptimizedLazyLoader } from "@/lib/optimization/client-lazy-loader";

// Loading component for the entire analytics page
function AnalyticsLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-64 bg-border-primary/20 rounded animate-pulse mb-2" />
            <div className="h-5 w-80 bg-border-primary/20 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 bg-border-primary/20 rounded animate-pulse" />
            <div className="h-9 w-24 bg-border-primary/20 rounded animate-pulse" />
            <div className="h-9 w-20 bg-border-primary/20 rounded animate-pulse" />
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="h-32 bg-border-primary/20 rounded-lg animate-pulse" />

        {/* Main analytics skeleton */}
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-border-primary/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="h-96 bg-border-primary/20 rounded-lg animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-border-primary/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Create optimized lazy component for the analytics page
const LazyAnalyticsPage = OptimizedLazyLoader.createLazyComponent(
  () => import("../../app/analytics/page"),
  AnalyticsLoading,
  "AnalyticsPage",
);

// Export the dynamic wrapper
export function AnalyticsPageDynamic() {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <LazyAnalyticsPage />
    </Suspense>
  );
}

// Preload function for idle behavior
export function preloadAnalytics() {
  OptimizedLazyLoader.preloadComponent(
    () => import("../../app/analytics/page"),
  );
}

"use client";

import React, { Suspense } from "react";
import { OptimizedLazyLoader } from "@/lib/optimization/client-lazy-loader";

// Loading component for the entire calculator page
function CalculatorLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="text-center space-y-4">
          <div className="h-12 bg-border-primary/20 rounded animate-pulse" />
          <div className="h-6 bg-border-primary/20 rounded animate-pulse mx-auto max-w-md" />
        </div>

        {/* Calculator grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-48 bg-border-primary/20 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Additional content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-border-primary/20 rounded-lg animate-pulse" />
          <div className="h-32 bg-border-primary/20 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Create optimized lazy component for the calculator page
const LazyCalculatorPage = OptimizedLazyLoader.createLazyComponent(
  () => import("../../app/calculator/page"),
  CalculatorLoading,
  "CalculatorPage",
);

// Export the dynamic wrapper
export function CalculatorPageDynamic() {
  return (
    <Suspense fallback={<CalculatorLoading />}>
      <LazyCalculatorPage />
    </Suspense>
  );
}

// Preload function for hover behavior (per ROUTE_SPLITTING_CONFIG)
export function preloadCalculator() {
  OptimizedLazyLoader.preloadComponent(
    () => import("../../app/calculator/page"),
  );
}

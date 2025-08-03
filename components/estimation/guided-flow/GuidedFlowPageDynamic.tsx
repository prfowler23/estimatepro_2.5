"use client";

import React, { Suspense } from "react";
import { OptimizedLazyLoader } from "@/lib/optimization/client-lazy-loader";

// Loading component for the entire guided flow
function GuidedFlowLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-bg-base/80 backdrop-blur-md border-b border-border-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 bg-bg-subtle rounded animate-pulse w-48" />
                <div className="h-4 bg-bg-subtle rounded animate-pulse w-20" />
              </div>
              <div className="h-2 bg-bg-subtle rounded animate-pulse w-full" />
            </div>
            <div className="flex items-center gap-3 ml-6">
              <div className="h-8 bg-bg-subtle rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Step indicators skeleton */}
          <div className="flex items-center justify-center mt-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-bg-subtle animate-pulse" />
                    <div className="hidden sm:block h-4 bg-bg-subtle rounded animate-pulse w-20" />
                  </div>
                  {i < 4 && (
                    <div className="w-8 h-0.5 bg-bg-subtle animate-pulse" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="h-8 bg-bg-subtle rounded animate-pulse w-64" />
            <div className="space-y-4">
              <div className="h-4 bg-bg-subtle rounded animate-pulse w-full" />
              <div className="h-4 bg-bg-subtle rounded animate-pulse w-3/4" />
              <div className="h-4 bg-bg-subtle rounded animate-pulse w-1/2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-bg-subtle rounded animate-pulse" />
              <div className="h-32 bg-bg-subtle rounded animate-pulse" />
            </div>
          </div>

          {/* Navigation buttons skeleton */}
          <div className="flex items-center justify-between mt-8">
            <div className="h-10 bg-bg-subtle rounded animate-pulse w-24" />
            <div className="h-10 bg-bg-subtle rounded animate-pulse w-24" />
          </div>
        </div>
      </main>
    </div>
  );
}

// Create optimized lazy component for the guided flow page
const LazyGuidedFlowPage = OptimizedLazyLoader.createLazyComponent(
  () => import("../../../app/estimates/new/guided/page"),
  GuidedFlowLoading,
  "GuidedFlowPage",
);

// Export the dynamic wrapper
export function GuidedFlowPageDynamic() {
  return (
    <Suspense fallback={<GuidedFlowLoading />}>
      <LazyGuidedFlowPage />
    </Suspense>
  );
}

// Preload function for hover behavior
export function preloadGuidedFlow() {
  OptimizedLazyLoader.preloadComponent(
    () => import("../../../app/estimates/new/guided/page"),
  );
}

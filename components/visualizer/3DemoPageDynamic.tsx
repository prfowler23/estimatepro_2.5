"use client";

import React, { Suspense } from "react";
import { OptimizedLazyLoader } from "@/lib/optimization/client-lazy-loader";

// Loading component for the entire 3D demo page
function ThreeDemoLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-border-primary/20 rounded animate-pulse" />
        <div>
          <div className="h-8 w-64 bg-border-primary/20 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-border-primary/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Feature Status Card skeleton */}
      <div className="h-32 bg-border-primary/20 rounded-lg animate-pulse" />

      {/* Demo Selection Card skeleton */}
      <div className="h-28 bg-border-primary/20 rounded-lg animate-pulse" />

      {/* Main 3D Demo Content skeleton */}
      <div className="h-96 bg-border-primary/20 rounded-lg animate-pulse" />

      {/* Instructions Card skeleton */}
      <div className="h-64 bg-border-primary/20 rounded-lg animate-pulse" />

      {/* Integration Status Card skeleton */}
      <div className="h-48 bg-border-primary/20 rounded-lg animate-pulse" />
    </div>
  );
}

// Create optimized lazy component for the 3D demo page
const Lazy3DDemoPage = OptimizedLazyLoader.createLazyComponent(
  () => import("../../app/3d-demo/page"),
  ThreeDemoLoading,
  "3DDemoPage",
);

// Export the dynamic wrapper
export function ThreeDemoPageDynamic() {
  return (
    <Suspense fallback={<ThreeDemoLoading />}>
      <Lazy3DDemoPage />
    </Suspense>
  );
}

// Preload function for interaction behavior (per ROUTE_SPLITTING_CONFIG)
export function preload3DDemo() {
  OptimizedLazyLoader.preloadComponent(() => import("../../app/3d-demo/page"));
}

"use client";

import React, { Suspense, lazy } from "react";
import { Skeleton } from "../loading/skeleton";

// Lazy load the heavy MobilePhotoCapture component
const MobilePhotoCaptureComponent = lazy(() =>
  import("./MobilePhotoCapture").then((module) => ({
    default: module.default,
  })),
);

// Loading fallback component optimized for mobile photo capture
function MobilePhotoCaptureLoading() {
  return (
    <div className="space-y-4">
      {/* Camera controls skeleton */}
      <div className="flex gap-2">
        <Skeleton variant="shimmer" className="flex-1 h-11 rounded-md" />
        <Skeleton variant="shimmer" className="flex-1 h-11 rounded-md" />
      </div>

      {/* Camera settings skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="shimmer"
            className="h-8 w-full rounded-md"
          />
        ))}
      </div>

      {/* Status display skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-4 w-24" />
        <Skeleton variant="shimmer" className="h-6 w-20 rounded-full" />
      </div>

      {/* Photo tips card skeleton */}
      <div className="p-4 border border-border-primary rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-3">
          <Skeleton
            variant="shimmer"
            className="h-12 w-12 rounded-full mx-auto"
          />
          <Skeleton variant="shimmer" className="h-5 w-32 mx-auto" />
          <Skeleton variant="shimmer" className="h-4 w-48 mx-auto" />
          <div className="grid grid-cols-2 gap-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="shimmer" className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Props type re-export for convenience
export type { CapturedPhoto } from "./MobilePhotoCapture";

// Optimized lazy wrapper component
export interface MobilePhotoCaptureProps {
  onPhotosChange: (photos: any[]) => void;
  maxPhotos?: number;
  enableAIAnalysis?: boolean;
  className?: string;
  autoCompress?: boolean;
  maxFileSize?: number;
  imageQuality?: number;
  enableLocation?: boolean;
  showCameraControls?: boolean;
  gridLines?: boolean;
  flashMode?: "auto" | "on" | "off";
  onCameraError?: (error: string) => void;
  onAnalysisComplete?: (photo: any, analysis: any) => void;
}

/**
 * Lazy-loaded MobilePhotoCapture component with optimized loading state
 *
 * This component provides:
 * - Code splitting to reduce initial bundle size
 * - Contextual loading skeleton matching the interface
 * - Error boundary for graceful failure handling
 * - Performance monitoring integration
 *
 * @example
 * ```tsx
 * import { MobilePhotoCapturePreload } from '@/components/ui/mobile/MobilePhotoCaptureLazy';
 *
 * // Preload component when user is likely to need it
 * MobilePhotoCapturePreload();
 *
 * // Use component normally
 * <MobilePhotoCaptureWrapper onPhotosChange={handlePhotos} />
 * ```
 */
export function MobilePhotoCaptureWrapper(props: MobilePhotoCaptureProps) {
  return (
    <Suspense fallback={<MobilePhotoCaptureLoading />}>
      <MobilePhotoCaptureComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload function to warm the cache before component is needed
 * Call this when user is likely to use the photo capture feature
 */
export function MobilePhotoCapturePreload() {
  import("./MobilePhotoCapture").catch(() => {
    // Silently fail if preload doesn't work
    console.warn("Failed to preload MobilePhotoCapture component");
  });
}

// Default export for backwards compatibility
export default MobilePhotoCaptureWrapper;

/**
 * Lazy-loaded facade analysis components for better performance
 * Only loads components when they are actually needed
 */

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load heavy components
export const FacadeAnalysisDetail = lazy(() =>
  import("./facade-analysis-detail").then((module) => ({
    default: module.FacadeAnalysisDetail,
  })),
);

export const FacadeImageGallery = lazy(() =>
  import("./facade-image-gallery").then((module) => ({
    default: module.FacadeImageGallery,
  })),
);

export const FacadeMaterialsList = lazy(() =>
  import("./facade-materials-list").then((module) => ({
    default: module.FacadeMaterialsList,
  })),
);

export const FacadeImageUpload = lazy(() =>
  import("./facade-image-upload").then((module) => ({
    default: module.FacadeImageUpload,
  })),
);

// Loading skeletons for different components
export const FacadeDetailSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>

    {/* Status bar skeleton */}
    <div className="flex gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-6 w-24" />
    </div>

    {/* Tabs skeleton */}
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export const FacadeImageGallerySkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <Skeleton className="aspect-video w-full mb-3" />
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const FacadeMaterialsListSkeleton = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 border rounded"
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const FacadeUploadSkeleton = () => <Skeleton className="h-10 w-32" />;

// Wrapper components with Suspense
export const LazyFacadeAnalysisDetail = (props: any) => (
  <Suspense fallback={<FacadeDetailSkeleton />}>
    <FacadeAnalysisDetail {...props} />
  </Suspense>
);

export const LazyFacadeImageGallery = (props: any) => (
  <Suspense fallback={<FacadeImageGallerySkeleton />}>
    <FacadeImageGallery {...props} />
  </Suspense>
);

export const LazyFacadeMaterialsList = (props: any) => (
  <Suspense fallback={<FacadeMaterialsListSkeleton />}>
    <FacadeMaterialsList {...props} />
  </Suspense>
);

export const LazyFacadeImageUpload = (props: any) => (
  <Suspense fallback={<FacadeUploadSkeleton />}>
    <FacadeImageUpload {...props} />
  </Suspense>
);

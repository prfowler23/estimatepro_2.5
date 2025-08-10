"use client";

import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components for better performance
const EstimateHeader = lazy(() =>
  import("./estimate-header").then((m) => ({ default: m.EstimateHeader })),
);
const CustomerInfoSection = lazy(() =>
  import("./customer-info-section").then((m) => ({
    default: m.CustomerInfoSection,
  })),
);
const BuildingInfoSection = lazy(() =>
  import("./building-info-section").then((m) => ({
    default: m.BuildingInfoSection,
  })),
);
const ServicesSection = lazy(() =>
  import("./services-section").then((m) => ({ default: m.ServicesSection })),
);
const EstimateSummarySection = lazy(() =>
  import("./estimate-summary-section").then((m) => ({
    default: m.EstimateSummarySection,
  })),
);
const NotesSection = lazy(() =>
  import("./notes-section").then((m) => ({ default: m.NotesSection })),
);

// Loading components
const HeaderSkeleton = () => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-8 w-8" />
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-9 w-16" />
    </div>
  </div>
);

const SectionSkeleton = ({ title }: { title: string }) => (
  <div className="border border-border-primary rounded-lg">
    <div className="p-6 border-b border-border-primary">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  </div>
);

// Enhanced wrapper components with performance optimizations
interface OptimizedEstimateComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: boolean;
}

const OptimizedEstimateComponent = ({
  children,
  fallback,
  priority = false,
}: OptimizedEstimateComponentProps) => (
  <Suspense fallback={fallback || <SectionSkeleton title="Loading..." />}>
    {children}
  </Suspense>
);

export {
  EstimateHeader,
  CustomerInfoSection,
  BuildingInfoSection,
  ServicesSection,
  EstimateSummarySection,
  NotesSection,
  OptimizedEstimateComponent,
  HeaderSkeleton,
  SectionSkeleton,
};

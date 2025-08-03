"use client";

import React, { lazy, Suspense } from "react";
import {
  ChartLoading,
  PDFLoading,
  AnalysisLoading,
  ImageLoading,
} from "@/components/ui/loading/lazy-loading";

// Enhanced lazy loading with retry mechanism
function createLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <div>Loading...</div>,
) {
  const LazyComponent = lazy(() =>
    factory().catch((error) => {
      console.error("Lazy component loading failed:", error);
      // Return a fallback component instead of failing
      return {
        default: (() => (
          <div className="p-4 text-center text-red-600">
            <p>Component failed to load</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )) as T,
      };
    }),
  );

  const WrappedComponent = (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return WrappedComponent;
}

// Lazy load heavy chart components with error handling
export const LazyRechartsChart = createLazyComponent(
  () =>
    import("recharts").then((module) => ({
      default: module.LineChart,
    })),
  <ChartLoading />,
);

export const LazyBarChart = createLazyComponent(
  () =>
    import("recharts").then((module) => ({
      default: module.BarChart,
    })),
  <ChartLoading />,
);

export const LazyPieChart = createLazyComponent(
  () =>
    import("recharts").then((module) => ({
      default: module.PieChart,
    })),
  <ChartLoading />,
);

// Note: @react-pdf/renderer removed - not actively used
// PDF generation handled by jsPDF in lib/pdf/generator.ts

// Lazy load guided flow components
export const LazyGuidedFlow = createLazyComponent(
  () =>
    import("@/components/estimation/guided-flow").then((module) => ({
      default: module.GuidedEstimationFlow,
    })),
  <AnalysisLoading />,
);

// Lazy load canvas components
export const LazyDrawingCanvas = createLazyComponent(
  () =>
    import("@/components/canvas/DrawingCanvas").then((module) => ({
      default: module.DrawingCanvas,
    })),
  <ImageLoading />,
);

// Lazy load analytics components
export const LazyAnalytics = createLazyComponent(
  () =>
    import("@/components/analytics/analytics-overview").then((module) => ({
      default: module.AnalyticsOverview,
    })),
  <AnalysisLoading />,
);

// Legacy wrapper components for backward compatibility
export const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<ChartLoading />}>{children}</React.Suspense>
);

export const PDFWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<PDFLoading />}>{children}</React.Suspense>
);

export const AnalysisWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <React.Suspense fallback={<AnalysisLoading />}>{children}</React.Suspense>
);

export const ImageWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<ImageLoading />}>{children}</React.Suspense>
);

"use client";

import React, { Suspense } from "react";
import { CalculatorLoading } from "@/components/ui/loading/lazy-loading";
import { OptimizedLazyLoader } from "@/lib/optimization/client-lazy-loader";

// Lazy load calculator forms using OptimizedLazyLoader for better performance
// This provides retry logic, exponential backoff, and caching

// Fallback component for failed loads
const CalculatorFormFallback = () => (
  <div className="p-4 text-center">
    <p className="text-muted-foreground">Unable to load calculator form.</p>
  </div>
);

export const LazyGlassRestorationForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/glass-restoration-form").then((module) => ({
      default: module.GlassRestorationForm,
    })),
  CalculatorFormFallback,
  "GlassRestorationForm",
);

export const LazyWindowCleaningForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/window-cleaning-form").then((module) => ({
      default: module.WindowCleaningForm,
    })),
  CalculatorFormFallback,
  "WindowCleaningForm",
);

export const LazyPressureWashingForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/pressure-washing-form").then((module) => ({
      default: module.PressureWashingForm,
    })),
  CalculatorFormFallback,
  "PressureWashingForm",
);

export const LazyPressureWashSealForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/pressure-wash-seal-form").then((module) => ({
      default: module.PressureWashSealForm,
    })),
  CalculatorFormFallback,
  "PressureWashSealForm",
);

export const LazyFinalCleanForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/final-clean-form").then((module) => ({
      default: module.FinalCleanForm,
    })),
  CalculatorFormFallback,
  "FinalCleanForm",
);

export const LazyFrameRestorationForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/frame-restoration-form").then((module) => ({
      default: module.FrameRestorationForm,
    })),
  CalculatorFormFallback,
  "FrameRestorationForm",
);

export const LazyHighDustingForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/high-dusting-form").then((module) => ({
      default: module.HighDustingForm,
    })),
  CalculatorFormFallback,
  "HighDustingForm",
);

export const LazySoftWashingForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/soft-washing-form").then((module) => ({
      default: module.SoftWashingForm,
    })),
  CalculatorFormFallback,
  "SoftWashingForm",
);

export const LazyParkingDeckForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/parking-deck-form").then((module) => ({
      default: module.ParkingDeckForm,
    })),
  CalculatorFormFallback,
  "ParkingDeckForm",
);

export const LazyGraniteReconditioningForm =
  OptimizedLazyLoader.createLazyComponent(
    () =>
      import("./forms/granite-reconditioning-form").then((module) => ({
        default: module.GraniteReconditioningForm,
      })),
    CalculatorFormFallback,
    "GraniteReconditioningForm",
  );

export const LazyBiofilmRemovalForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/biofilm-removal-form").then((module) => ({
      default: module.BiofilmRemovalForm,
    })),
  CalculatorFormFallback,
  "BiofilmRemovalForm",
);

export const LazyFacadeAnalysisForm = OptimizedLazyLoader.createLazyComponent(
  () =>
    import("./forms/facade-analysis-form").then((module) => ({
      default: module.FacadeAnalysisForm,
    })),
  CalculatorFormFallback,
  "FacadeAnalysisForm",
);

// Legacy dynamic form loader - use DynamicFormLoader from ./DynamicFormLoader.tsx instead
// @deprecated This is kept for backward compatibility only
export const LegacyDynamicFormLoader = ({
  serviceType,
  onSubmit,
  onCancel,
  estimateId,
}: {
  serviceType: string | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  estimateId: string;
}) => {
  if (!serviceType) {
    return <div>No service selected</div>;
  }

  switch (serviceType) {
    case "window-cleaning":
      return (
        <FormWrapper>
          <LazyWindowCleaningForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "pressure-washing":
      return (
        <FormWrapper>
          <LazyPressureWashingForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "soft-washing":
      return (
        <FormWrapper>
          <LazySoftWashingForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "biofilm-removal":
      return (
        <FormWrapper>
          <LazyBiofilmRemovalForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "glass-restoration":
      return (
        <FormWrapper>
          <LazyGlassRestorationForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "frame-restoration":
      return (
        <FormWrapper>
          <LazyFrameRestorationForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "high-dusting":
      return (
        <FormWrapper>
          <LazyHighDustingForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "final-clean":
      return (
        <FormWrapper>
          <LazyFinalCleanForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "granite-reconditioning":
      return (
        <FormWrapper>
          <LazyGraniteReconditioningForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "pressure-wash-seal":
      return (
        <FormWrapper>
          <LazyPressureWashSealForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "parking-deck":
      return (
        <FormWrapper>
          <LazyParkingDeckForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    case "facade-analysis":
      return (
        <FormWrapper>
          <LazyFacadeAnalysisForm
            onSubmit={onSubmit}
            onCancel={onCancel}
            estimateId={estimateId}
          />
        </FormWrapper>
      );
    default:
      return (
        <div className="p-4 text-center">
          <p className="text-muted-foreground">
            Form not available for service: {serviceType}
          </p>
        </div>
      );
  }
};

// Form component wrapper with suspense (legacy compatibility)
export const FormWrapper = ({
  children,
  fallback = <CalculatorLoading />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  return (
    <div className="min-h-[400px]">
      <React.Suspense fallback={fallback}>{children}</React.Suspense>
    </div>
  );
};

// Export the improved DynamicFormLoader
export { default as DynamicFormLoader } from "./DynamicFormLoader";

"use client";

import React, { lazy, Suspense } from "react";
import { CalculatorLoading } from "@/components/ui/loading/lazy-loading";

// Enhanced lazy loading with retry mechanism
function createLazyFormComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <CalculatorLoading />,
) {
  const LazyComponent = lazy(() =>
    factory().catch((error) => {
      console.error("Lazy form component loading failed:", error);
      // Return a fallback component instead of failing
      return {
        default: (() => (
          <div className="p-4 text-center text-red-600 border border-red-300 rounded">
            <p>Form failed to load</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )) as unknown as T,
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

// Lazy load calculator forms to reduce initial bundle size
export const LazyGlassRestorationForm = createLazyFormComponent(() =>
  import("./forms/glass-restoration-form").then((module) => ({
    default: module.GlassRestorationForm,
  })),
);

export const LazyWindowCleaningForm = createLazyFormComponent(() =>
  import("./forms/window-cleaning-form").then((module) => ({
    default: module.WindowCleaningForm,
  })),
);

export const LazyPressureWashingForm = createLazyFormComponent(() =>
  import("./forms/pressure-washing-form").then((module) => ({
    default: module.PressureWashingForm,
  })),
);

export const LazyPressureWashSealForm = createLazyFormComponent(() =>
  import("./forms/pressure-wash-seal-form").then((module) => ({
    default: module.PressureWashSealForm,
  })),
);

export const LazyFinalCleanForm = createLazyFormComponent(() =>
  import("./forms/final-clean-form").then((module) => ({
    default: module.FinalCleanForm,
  })),
);

export const LazyFrameRestorationForm = createLazyFormComponent(() =>
  import("./forms/frame-restoration-form").then((module) => ({
    default: module.FrameRestorationForm,
  })),
);

export const LazyHighDustingForm = createLazyFormComponent(() =>
  import("./forms/high-dusting-form").then((module) => ({
    default: module.HighDustingForm,
  })),
);

export const LazySoftWashingForm = createLazyFormComponent(() =>
  import("./forms/soft-washing-form").then((module) => ({
    default: module.SoftWashingForm,
  })),
);

export const LazyParkingDeckForm = createLazyFormComponent(() =>
  import("./forms/parking-deck-form").then((module) => ({
    default: module.ParkingDeckForm,
  })),
);

export const LazyGraniteReconditioningForm = createLazyFormComponent(() =>
  import("./forms/granite-reconditioning-form").then((module) => ({
    default: module.GraniteReconditioningForm,
  })),
);

export const LazyBiofilmRemovalForm = createLazyFormComponent(() =>
  import("./forms/biofilm-removal-form").then((module) => ({
    default: module.BiofilmRemovalForm,
  })),
);

export const LazyFacadeAnalysisForm = createLazyFormComponent(() =>
  import("./forms/facade-analysis-form").then((module) => ({
    default: module.FacadeAnalysisForm,
  })),
);

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

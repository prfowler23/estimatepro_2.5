import { lazy } from "react";

// Lazy load estimation flow steps
export const EstimationSteps = {
  InitialContact: lazy(
    () => import("@/components/estimation/guided-flow/steps/InitialContact"),
  ),
  ProjectSetup: lazy(
    () => import("@/components/estimation/guided-flow/steps/ProjectSetup"),
  ),
  AreaOfWork: lazy(
    () => import("@/components/estimation/guided-flow/steps/AreaOfWork"),
  ),
  ScopeDetails: lazy(
    () => import("@/components/estimation/guided-flow/steps/ScopeDetails"),
  ),
  Measurements: lazy(
    () => import("@/components/estimation/guided-flow/steps/Measurements"),
  ),
  Takeoff: lazy(
    () => import("@/components/estimation/guided-flow/steps/Takeoff"),
  ),
  Duration: lazy(
    () => import("@/components/estimation/guided-flow/steps/Duration"),
  ),
  Expenses: lazy(
    () => import("@/components/estimation/guided-flow/steps/Expenses"),
  ),
  UnifiedPricing: lazy(
    () => import("@/components/estimation/guided-flow/steps/UnifiedPricing"),
  ),
  FilesPhotos: lazy(
    () => import("@/components/estimation/guided-flow/steps/FilesPhotos"),
  ),
  Summary: lazy(
    () => import("@/components/estimation/guided-flow/steps/Summary"),
  ),
  ReviewSend: lazy(
    () => import("@/components/estimation/guided-flow/steps/ReviewSend"),
  ),
};

// Preload next step for smoother transitions
export const preloadStep = (stepName: keyof typeof EstimationSteps) => {
  if (EstimationSteps[stepName]) {
    // @ts-ignore - preload is a method on lazy components
    EstimationSteps[stepName].preload?.();
  }
};

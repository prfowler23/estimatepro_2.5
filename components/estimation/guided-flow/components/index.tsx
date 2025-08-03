// Export all components with error boundary wrapping
import { withErrorBoundary } from "./ErrorBoundary";
import { AutoSaveStatusDisplay as AutoSaveStatusDisplayRaw } from "./AutoSaveStatusDisplay";
import { DesktopStepIndicator as DesktopStepIndicatorRaw } from "./DesktopStepIndicator";
import { StepContentArea as StepContentAreaRaw } from "./StepContentArea";
import { DesktopNavigationControls as DesktopNavigationControlsRaw } from "./DesktopNavigationControls";
import { ProgressiveValidation as ProgressiveValidationRaw } from "./ProgressiveValidation";
import { TemplateStatusDisplay as TemplateStatusDisplayRaw } from "./TemplateStatusDisplay";

// Export wrapped components with error boundaries
export const AutoSaveStatusDisplay = withErrorBoundary(
  AutoSaveStatusDisplayRaw,
  "AutoSaveStatusDisplay",
);

export const DesktopStepIndicator = withErrorBoundary(
  DesktopStepIndicatorRaw,
  "DesktopStepIndicator",
);

export const StepContentArea = withErrorBoundary(
  StepContentAreaRaw,
  "StepContentArea",
);

export const DesktopNavigationControls = withErrorBoundary(
  DesktopNavigationControlsRaw,
  "DesktopNavigationControls",
);

export const ProgressiveValidation = withErrorBoundary(
  ProgressiveValidationRaw,
  "ProgressiveValidation",
);

export const TemplateStatusDisplay = withErrorBoundary(
  TemplateStatusDisplayRaw,
  "TemplateStatusDisplay",
);

// Re-export the error boundary itself for direct usage
export { ErrorBoundary, withErrorBoundary } from "./ErrorBoundary";

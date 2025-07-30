"use client";

// PHASE 3 FIX: Extracted desktop navigation controls into focused component
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DesktopNavigationControlsProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  validationErrors: string[];
  onNext: () => void;
  onBack: () => void;
  onSaveAndExit?: () => void;
  className?: string;
}

function DesktopNavigationControlsComponent({
  currentStep,
  totalSteps,
  canProceed,
  validationErrors,
  onNext,
  onBack,
  onSaveAndExit,
  className = "",
}: DesktopNavigationControlsProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const hasErrors = validationErrors.length > 0;

  return (
    <div
      className={`flex items-center justify-between pt-6 border-t ${className}`}
    >
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {onSaveAndExit && (
          <Button
            variant="outline"
            onClick={onSaveAndExit}
            className="text-gray-600"
          >
            Save & Exit
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {hasErrors && (
          <div className="text-sm text-red-600 max-w-md">
            <span className="font-medium">
              {validationErrors.length} error
              {validationErrors.length !== 1 ? "s" : ""} found
            </span>
            <p className="text-xs mt-1">
              Please fix the issues above to continue
            </p>
          </div>
        )}

        <Button
          onClick={onNext}
          disabled={false} // PHASE 1 FIX: Allow navigation even with errors
          className="flex items-center gap-2 min-w-[120px]"
        >
          {isLastStep ? (
            "Complete"
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// PHASE 3 FIX: Memoize to prevent unnecessary re-renders
// Custom comparison function to handle function props properly
export const DesktopNavigationControls = memo(
  DesktopNavigationControlsComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.currentStep === nextProps.currentStep &&
      prevProps.totalSteps === nextProps.totalSteps &&
      prevProps.canProceed === nextProps.canProceed &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.validationErrors) ===
        JSON.stringify(nextProps.validationErrors)
      // Note: onNext, onBack, onSaveAndExit are functions and will have new references
      // Parent should wrap these in useCallback to prevent re-renders
    );
  },
);

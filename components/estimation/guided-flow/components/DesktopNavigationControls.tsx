import React from "react";
import { Button } from "@/components/ui/button";

interface DesktopNavigationControlsProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  validationErrors: string[];
  onNext: () => void;
  onBack: () => void;
  onSaveAndExit: () => void;
}

export const DesktopNavigationControls: React.FC<
  DesktopNavigationControlsProps
> = ({
  currentStep,
  totalSteps,
  canProceed,
  validationErrors,
  onNext,
  onBack,
  onSaveAndExit,
}) => {
  return (
    <div className="hidden md:flex justify-between mt-8">
      <Button variant="outline" onClick={onBack} disabled={currentStep === 1}>
        Back
      </Button>
      <div>
        {validationErrors.length > 0 && (
          <div className="text-red-500 text-sm mb-2">
            {validationErrors.join(", ")}
          </div>
        )}
        <Button onClick={onSaveAndExit} variant="outline" className="mr-2">
          Save & Exit
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed || currentStep === totalSteps}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

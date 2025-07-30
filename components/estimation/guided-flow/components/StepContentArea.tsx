// UX Task 1: Enhanced Step Content Area with Progressive Validation
import React from "react";
import { ValidationResult } from "@/lib/validation/guided-flow-validation";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { ProgressiveValidation } from "./ProgressiveValidation";
import { ProgressiveHint } from "@/components/validation/ProgressiveHintsSystem";

interface StepContentAreaProps {
  CurrentStepComponent: React.ComponentType<any>;
  flowData: GuidedFlowData;
  currentStep: number;
  steps: any[];
  currentValidation: ValidationResult | undefined;
  attemptedNavigation: boolean;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
  userExperienceLevel?: "beginner" | "intermediate" | "advanced";
  onApplyAutoFix?: (fieldPath: string, suggestedValue: any) => void;
  onRequestHelp?: (hint: ProgressiveHint) => void;
}

export const StepContentArea: React.FC<StepContentAreaProps> = ({
  CurrentStepComponent,
  flowData,
  currentStep,
  steps,
  currentValidation,
  attemptedNavigation,
  onUpdate,
  onNext,
  onBack,
  userExperienceLevel = "intermediate",
  onApplyAutoFix,
  onRequestHelp,
}) => {
  // Default auto-fix handler
  const handleAutoFix = (fieldPath: string, suggestedValue: any) => {
    if (onApplyAutoFix) {
      onApplyAutoFix(fieldPath, suggestedValue);
    } else {
      // Default implementation: apply the fix by updating the field
      const fieldParts = fieldPath.split(".");
      const stepData: any = {};

      // Build nested object structure for update
      if (fieldParts.length === 2) {
        stepData[fieldParts[0]] = { [fieldParts[1]]: suggestedValue };
      } else if (fieldParts.length === 3) {
        stepData[fieldParts[0]] = {
          [fieldParts[1]]: { [fieldParts[2]]: suggestedValue },
        };
      } else {
        stepData[fieldPath] = suggestedValue;
      }

      onUpdate(stepData);
    }
  };

  // Default help handler
  const handleRequestHelp = (hint: ProgressiveHint) => {
    if (onRequestHelp) {
      onRequestHelp(hint);
    } else {
      // Default implementation: TODO: implement contextual help system
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Component */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CurrentStepComponent
          data={flowData}
          onUpdate={onUpdate}
          onNext={onNext}
          onBack={onBack}
        />
      </div>

      {/* Progressive Validation - replaces old error display */}
      {currentValidation && (
        <ProgressiveValidation
          stepNumber={currentStep}
          flowData={flowData}
          validationResult={currentValidation}
          userExperienceLevel={userExperienceLevel}
          onApplyAutoFix={handleAutoFix}
          onRequestHelp={handleRequestHelp}
        />
      )}

      {/* Legacy validation fallback (only shown in development if progressive validation fails) */}
      {process.env.NODE_ENV === "development" &&
        attemptedNavigation &&
        currentValidation &&
        !currentValidation.isValid && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">
              Legacy Validation (Fallback)
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {currentValidation.errors.map((error, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span>•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};

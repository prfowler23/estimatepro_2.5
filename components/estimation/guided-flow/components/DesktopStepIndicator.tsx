import React from "react";
import { ValidationResult } from "@/lib/validation/guided-flow-validation";

interface DesktopStepIndicatorProps {
  steps: any[];
  currentStep: number;
  availableSteps: number[];
  validationResults: Record<number, ValidationResult>;
  onStepClick: (stepId: number) => void;
}

export const DesktopStepIndicator: React.FC<DesktopStepIndicatorProps> = ({
  steps,
  currentStep,
  availableSteps,
  validationResults,
  onStepClick,
}) => {
  return (
    <div className="hidden md:block mb-8">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isAvailable = availableSteps.includes(stepNumber);
          const validation = validationResults[stepNumber];
          const hasErrors = validation && !validation.isValid;

          return (
            <li key={step.id} className="flex w-full items-center">
              <button
                onClick={() => isAvailable && onStepClick(stepNumber)}
                disabled={!isAvailable}
                className={`flex items-center justify-center w-10 h-10 rounded-full text-lg font-semibold ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isCompleted
                      ? "bg-green-500 text-white"
                      : hasErrors
                        ? "bg-red-500 text-white"
                        : isAvailable
                          ? "bg-gray-300"
                          : "bg-gray-200 text-gray-500"
                }`}
              >
                {stepNumber}
              </button>
              {stepNumber < steps.length && (
                <div className="flex-auto border-t-2 border-gray-200 mx-4"></div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

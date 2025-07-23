"use client";

// PHASE 3 FIX: Extracted desktop step indicator into focused component
import React, { memo } from "react";
import { CheckCircle, Lock, AlertCircle, Circle } from "lucide-react";

interface Step {
  id: number;
  name: string;
  component: React.ComponentType<any>;
}

interface DesktopStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  availableSteps: number[];
  validationResults: Record<number, any>;
  onStepClick: (stepId: number) => void;
  className?: string;
}

function DesktopStepIndicatorComponent({
  steps,
  currentStep,
  availableSteps,
  validationResults,
  onStepClick,
  className = "",
}: DesktopStepIndicatorProps) {
  const getStepIcon = (
    step: Step,
    isCurrent: boolean,
    isCompleted: boolean,
    isAvailable: boolean,
  ) => {
    const hasErrors =
      validationResults[step.id] && !validationResults[step.id].isValid;

    if (hasErrors && !isCurrent) {
      return <AlertCircle className="w-6 h-6" />;
    }
    if (isCompleted) {
      return <CheckCircle className="w-6 h-6" />;
    }
    if (isCurrent) {
      return <Circle className="w-6 h-6 fill-current" />;
    }
    if (isAvailable) {
      return <Circle className="w-6 h-6" />;
    }
    return <Lock className="w-6 h-6" />;
  };

  const getStepColor = (
    step: Step,
    isCurrent: boolean,
    isCompleted: boolean,
    isAvailable: boolean,
  ) => {
    const hasErrors =
      validationResults[step.id] && !validationResults[step.id].isValid;

    if (hasErrors && !isCurrent) return "text-red-500";
    if (isCurrent) return "text-primary";
    if (isCompleted) return "text-green-600";
    if (isAvailable) return "text-blue-600 hover:text-blue-800";
    return "text-gray-400";
  };

  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / steps.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop step indicator */}
      <div className="flex items-center justify-between overflow-x-auto">
        {steps.map((step, index) => {
          const isAvailable = availableSteps.includes(step.id);
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const hasErrors =
            validationResults[step.id] && !validationResults[step.id].isValid;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`flex flex-col items-center min-w-0 flex-1 cursor-pointer group transition-colors duration-200 ${getStepColor(step, isCurrent, isCompleted, isAvailable)}`}
                onClick={() => onStepClick(step.id)}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 transition-all duration-200 ${
                    isCurrent
                      ? "border-primary bg-primary text-white"
                      : isCompleted
                        ? "border-green-600 bg-green-600 text-white"
                        : hasErrors
                          ? "border-red-500 bg-red-50"
                          : isAvailable
                            ? "border-blue-600 bg-blue-50 group-hover:bg-blue-100"
                            : "border-gray-300 bg-gray-50"
                  }`}
                >
                  {getStepIcon(step, isCurrent, isCompleted, isAvailable)}
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium block mb-1 truncate max-w-24 group-hover:text-current">
                    {step.name}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Step {step.id}
                  </span>
                  {hasErrors && !isCurrent && (
                    <span className="text-xs text-red-500 block mt-1">
                      Has errors
                    </span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-shrink-0 w-8 mx-2">
                  <div
                    className={`h-0.5 w-full transition-colors duration-300 ${
                      currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// PHASE 3 FIX: Memoize to prevent unnecessary re-renders
export const DesktopStepIndicator = memo(DesktopStepIndicatorComponent);

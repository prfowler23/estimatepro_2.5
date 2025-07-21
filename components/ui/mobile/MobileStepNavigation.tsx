"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle,
  Lock,
  AlertCircle,
} from "lucide-react";

interface Step {
  id: number;
  name: string;
  component: React.ComponentType<any>;
}

interface MobileStepNavigationProps {
  steps: Step[];
  currentStep: number;
  availableSteps: number[];
  onStepChange: (step: number) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  validationErrors?: string[];
  progress?: number;
}

export function MobileStepNavigation({
  steps,
  currentStep,
  availableSteps,
  onStepChange,
  onNext,
  onBack,
  canProceed,
  validationErrors = [],
  progress = 0,
}: MobileStepNavigationProps) {
  const currentStepName = steps[currentStep - 1]?.name || "";
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;
  const hasErrors = validationErrors.length > 0;

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    if (availableSteps.includes(stepId)) return "available";
    return "locked";
  };

  const getStepIcon = (stepId: number) => {
    const status = getStepStatus(stepId);
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "current":
        return <div className="w-4 h-4 bg-blue-600 rounded-full" />;
      case "available":
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
      case "locked":
        return <Lock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepColor = (stepId: number) => {
    const status = getStepStatus(stepId);
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "current":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "available":
        return "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100";
      case "locked":
        return "text-gray-400 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-gray-500">
            {Math.round((currentStep / steps.length) * 100)}% complete
          </span>
        </div>
        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
      </div>

      {/* Current Step Info */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {currentStepName}
          </h3>
          {hasErrors && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.length} error
              {validationErrors.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Step Overview Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2">
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>Estimation Steps</SheetTitle>
              <SheetDescription>
                Navigate between steps. Locked steps require previous steps to
                be completed.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-2 overflow-y-auto max-h-[40vh]">
              {steps.map((step) => {
                const status = getStepStatus(step.id);
                const canNavigate =
                  status === "completed" ||
                  status === "available" ||
                  status === "current";

                return (
                  <button
                    key={step.id}
                    onClick={() => canNavigate && onStepChange(step.id)}
                    disabled={!canNavigate}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${getStepColor(step.id)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStepIcon(step.id)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.name}</span>
                          {status === "current" && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Step {step.id} of {steps.length}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Please fix these issues to continue:
          </h4>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li
                key={index}
                className="text-sm text-red-700 flex items-start gap-2"
              >
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={onNext}
          disabled={!canProceed || hasErrors}
          className="flex-1"
        >
          {isLastStep ? "Complete" : "Next"}
          {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

export default MobileStepNavigation;

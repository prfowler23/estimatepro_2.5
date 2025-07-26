"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Home, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface MobileStepNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSave?: () => void;
  onExit?: () => void;
  progress: number;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  className?: string;
}

export function MobileStepNavigation({
  currentStep,
  totalSteps,
  stepTitle,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  onSave,
  onExit,
  progress,
  hasUnsavedChanges = false,
  isSaving = false,
  className,
}: MobileStepNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-bg-base border-t border-border-primary",
        className,
      )}
    >
      {/* Progress Bar */}
      <Progress value={progress} className="h-1 w-full rounded-none" />

      {/* Navigation Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Step Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {stepTitle}
            </span>
            <span className="text-xs text-text-secondary">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="h-8 px-2"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            )}
            {onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="h-12 text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isFirstStep ? "Exit" : "Previous"}
          </Button>

          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "h-12 text-sm font-medium",
              isLastStep && "bg-green-600 hover:bg-green-700 text-white",
            )}
          >
            {isLastStep ? (
              <>
                Complete
                <Check className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && !isSaving && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
            <p className="text-xs text-yellow-800">
              Unsaved changes will be lost if you exit
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact step indicator for mobile headers
interface MobileStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: string;
    title: string;
    completed?: boolean;
  }>;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function MobileStepIndicator({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  className,
}: MobileStepIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2",
        className,
      )}
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.completed || index < currentStep;
        const isClickable = onStepClick && isCompleted && !isActive;

        return (
          <button
            key={step.id}
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            className={cn(
              "relative flex items-center justify-center transition-all",
              isClickable && "cursor-pointer",
            )}
          >
            {/* Step Circle */}
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                isActive && "bg-primary text-white shadow-md scale-110",
                isCompleted && !isActive && "bg-green-500 text-white",
                !isActive && !isCompleted && "bg-bg-subtle text-text-secondary",
              )}
            >
              {isCompleted && !isActive ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>

            {/* Step Line */}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "absolute left-full w-8 h-0.5 transition-colors",
                  isCompleted ? "bg-green-500" : "bg-border-primary",
                )}
              />
            )}

            {/* Active Step Label */}
            {isActive && (
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-medium text-text-primary">
                  {step.title}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Swipe hint component for mobile gestures
interface SwipeHintProps {
  direction: "left" | "right";
  text: string;
  visible: boolean;
  className?: string;
}

export function SwipeHint({
  direction,
  text,
  visible,
  className,
}: SwipeHintProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-40 pointer-events-none transition-opacity duration-300",
        direction === "left" ? "left-4" : "right-4",
        !visible && "opacity-0",
        className,
      )}
    >
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2">
        {direction === "left" ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

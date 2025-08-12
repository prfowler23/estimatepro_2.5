"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { EstimateFlowProvider } from "@/components/estimation/EstimateFlowProvider";
import { useEstimateFlow } from "@/components/estimation/EstimateFlowProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { validateClientEnv } from "@/lib/config/env-validation";
import {
  MobileStepNavigation,
  MobileStepIndicator,
} from "@/components/ui/mobile-step-navigation";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { GuidedFlowErrorBoundary } from "@/components/error-handling/guided-flow-error-boundary";
import {
  LazyMeasurementsWithFacade,
  LazySummary,
  LazyInitialContact,
} from "@/components/lazy-loading/estimation-lazy";

// Loading component for lazy-loaded steps
function StepLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-text-secondary">Loading step...</p>
      </div>
    </div>
  );
}

// Step renderer component
function StepRenderer() {
  const {
    currentStep,
    totalSteps,
    flowData,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,
    validateCurrentStep,
    getProgress,
    isSaving,
    hasUnsavedChanges,
    isLegacyMode,
  } = useEstimateFlow();

  const router = useRouter();
  const env = validateClientEnv();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Swipe gestures for mobile
  const { ref: swipeRef } = useSwipeGestures({
    onSwipeLeft: () => canGoNext && handleNext(),
    onSwipeRight: () => canGoPrevious && previousStep(),
    enabled: isMobile,
  });

  // Get the current step configuration
  // Clear validation errors when step changes
  useEffect(() => {
    setValidationErrors([]);
  }, [currentStep]);

  const steps = isLegacyMode
    ? [
        {
          id: "initial-contact",
          title: "Initial Contact",
          component: LazyInitialContact,
        },
        {
          id: "scope-details",
          title: "Scope Details",
          component: React.lazy(
            () =>
              import("@/components/estimation/guided-flow/steps/ScopeDetails"),
          ),
        },
        {
          id: "area-of-work",
          title: "Area of Work",
          component: React.lazy(
            () =>
              import("@/components/estimation/guided-flow/steps/AreaOfWork"),
          ),
        },
        {
          id: "takeoff",
          title: "Takeoff",
          component: React.lazy(
            () => import("@/components/estimation/guided-flow/steps/Takeoff"),
          ),
        },
        {
          id: "duration",
          title: "Duration",
          component: React.lazy(
            () => import("@/components/estimation/guided-flow/steps/Duration"),
          ),
        },
        {
          id: "expenses",
          title: "Expenses",
          component: React.lazy(
            () => import("@/components/estimation/guided-flow/steps/Expenses"),
          ),
        },
        {
          id: "pricing",
          title: "Pricing",
          component: React.lazy(
            () => import("@/components/estimation/guided-flow/steps/Pricing"),
          ),
        },
        {
          id: "files-photos",
          title: "Files & Photos",
          component: React.lazy(
            () =>
              import("@/components/estimation/guided-flow/steps/FilesPhotos"),
          ),
        },
      ]
    : [
        {
          id: "project-setup",
          title: "Project Setup",
          component: React.lazy(
            () =>
              import("@/components/estimation/guided-flow/steps/ProjectSetup"),
          ),
        },
        {
          id: "measurements",
          title: "Measurements",
          component: LazyMeasurementsWithFacade,
        },
        {
          id: "pricing",
          title: "Pricing",
          component: React.lazy(
            () =>
              import(
                "@/components/estimation/guided-flow/steps/UnifiedPricing"
              ),
          ),
        },
        {
          id: "review",
          title: "Review & Send",
          component: React.lazy(
            () =>
              import("@/components/estimation/guided-flow/steps/ReviewSend"),
          ),
        },
      ];

  const currentStepConfig = steps[currentStep];
  const StepComponent = currentStepConfig.component;

  // Handle save and exit
  const handleSaveExit = async () => {
    // Save logic here
    router.push("/estimates");
  };

  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate before next - prevent multiple rapid calls
  const handleNext = useCallback(() => {
    const validation = validateCurrentStep();
    if (validation.isValid) {
      setValidationErrors([]); // Clear any previous errors
      nextStep();
    } else {
      // Show validation errors to user
      setValidationErrors(validation.errors);
      console.log("Validation failed:", validation.errors);
    }
  }, [validateCurrentStep, nextStep]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base"
      ref={swipeRef}
    >
      {/* Desktop Header */}
      {!isMobile && (
        <div className="sticky top-0 z-40 bg-bg-base/80 backdrop-blur-md border-b border-border-primary">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Step Progress */}
              <div className="flex-1 max-w-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-lg font-semibold text-text-primary">
                    {currentStepConfig.title}
                  </h1>
                  <span className="text-sm text-text-secondary">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 ml-6">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    Unsaved changes
                  </div>
                )}
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                    Saving...
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveExit}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save & Exit
                </Button>
              </div>
            </div>

            {/* Step Indicators (4-step flow) */}
            {!isLegacyMode && (
              <div className="flex items-center justify-center mt-4">
                <div className="flex items-center gap-2">
                  {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;

                    return (
                      <React.Fragment key={step.id}>
                        <button
                          onClick={() =>
                            index < currentStep && router.push(`?step=${index}`)
                          }
                          disabled={index >= currentStep}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                            isActive &&
                              "bg-primary text-white font-medium shadow-sm",
                            isCompleted &&
                              "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200",
                            !isActive &&
                              !isCompleted &&
                              "bg-bg-subtle text-text-secondary",
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                                isActive
                                  ? "bg-white/20"
                                  : "bg-text-secondary/10",
                              )}
                            >
                              {index + 1}
                            </span>
                          )}
                          <span className="hidden sm:inline">{step.title}</span>
                        </button>
                        {index < steps.length - 1 && (
                          <div
                            className={cn(
                              "w-8 h-0.5 transition-colors",
                              isCompleted
                                ? "bg-green-500"
                                : "bg-border-primary",
                            )}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-40 bg-bg-base border-b border-border-primary">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-semibold text-text-primary">
                New Estimate
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveExit}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!isLegacyMode && (
              <MobileStepIndicator
                currentStep={currentStep}
                totalSteps={totalSteps}
                steps={steps.map((s, i) => ({
                  id: s.id,
                  title: s.title,
                  completed: i < currentStep,
                }))}
                onStepClick={(index) => {
                  if (index < currentStep) {
                    // Navigate to previous step
                    for (let i = currentStep; i > index; i--) {
                      previousStep();
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "container mx-auto px-4",
          isMobile ? "py-4 pb-24" : "py-8",
        )}
      >
        <div className="max-w-4xl mx-auto">
          {/* Validation Errors Display */}
          {validationErrors.length > 0 && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-1">
                      Please fix the following issues:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <GuidedFlowErrorBoundary>
            <Suspense fallback={<StepLoading />}>
              <StepComponent />
            </Suspense>
          </GuidedFlowErrorBoundary>

          {/* Desktop Navigation Buttons */}
          {!isMobile && (
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={!canGoPrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex items-center gap-2"
              >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileStepNavigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepTitle={currentStepConfig.title}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          onNext={handleNext}
          onPrevious={previousStep}
          onSave={handleSaveExit}
          onExit={() => router.push("/estimates")}
          progress={getProgress()}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// Memoize the StepRenderer to prevent unnecessary re-renders
const MemoizedStepRenderer = React.memo(StepRenderer);

export default function GuidedFlowPage() {
  return (
    <EstimateFlowProvider>
      <MemoizedStepRenderer />
    </EstimateFlowProvider>
  );
}

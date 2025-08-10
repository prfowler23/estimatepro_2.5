/**
 * Mobile Guided Flow Layout
 *
 * Mobile-first layout for the guided estimation workflow with
 * responsive design, gesture support, and optimal touch interactions.
 *
 * Features:
 * - Full-screen mobile workflow
 * - Step-by-step navigation with progress indicators
 * - Gesture-based navigation (swipe between steps)
 * - Contextual action buttons
 * - Responsive breakpoints for tablet/desktop
 * - Performance optimized for mobile devices
 * - Accessibility compliance
 *
 * Part of Phase 4 Priority 3: Create Responsive Mobile Layouts
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSwipeGestures } from "@/hooks/useAdvancedTouchGestures";
import {
  useHapticFeedback,
  useDeviceCapabilities,
} from "@/components/providers/MobileGestureProvider";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Save,
  Check,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Menu,
} from "lucide-react";

interface FlowStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<any>;
  optional?: boolean;
  validation?: (data: any) => string | undefined;
  dependencies?: string[];
}

interface MobileGuidedFlowLayoutProps {
  steps: FlowStep[];
  currentStep: number;
  totalSteps: number;
  stepData: Record<string, any>;
  onStepChange: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
  onExit: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
  enableSwipeNavigation?: boolean;
  className?: string;
}

/**
 * Mobile Guided Flow Layout Component
 */
export function MobileGuidedFlowLayout({
  steps,
  currentStep,
  totalSteps,
  stepData,
  onStepChange,
  onNext,
  onPrevious,
  onSave,
  onExit,
  loading = false,
  title,
  subtitle,
  showProgress = true,
  enableSwipeNavigation = true,
  className,
}: MobileGuidedFlowLayoutProps) {
  const [showStepOverview, setShowStepOverview] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { haptic } = useHapticFeedback();
  const { isMobile, screenSize } = useDeviceCapabilities();

  const currentStepInfo = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const canGoNext = currentStep < totalSteps - 1;
  const canGoPrevious = currentStep > 0;

  // Validation for current step
  const validationError = useMemo(() => {
    if (!currentStepInfo?.validation) return undefined;
    return currentStepInfo.validation(stepData[currentStepInfo.id] || {});
  }, [currentStepInfo, stepData]);

  const canProceed = !validationError && !loading;

  // Swipe gesture handlers
  const swipeCallbacks = useMemo(
    () => ({
      onSwipeLeft: () => {
        if (enableSwipeNavigation && canGoNext && canProceed) {
          haptic("impact", "light");
          onNext();
        }
      },
      onSwipeRight: () => {
        if (enableSwipeNavigation && canGoPrevious) {
          haptic("impact", "light");
          onPrevious();
        }
      },
    }),
    [
      enableSwipeNavigation,
      canGoNext,
      canGoPrevious,
      canProceed,
      haptic,
      onNext,
      onPrevious,
    ],
  );

  const { bindGestures } = useSwipeGestures(swipeCallbacks, {
    swipeThreshold: 50,
    enableHapticFeedback: true,
  });

  // Handle step selection from overview
  const handleStepSelect = useCallback(
    (step: number) => {
      haptic("selection");
      onStepChange(step);
      setShowStepOverview(false);
    },
    [haptic, onStepChange],
  );

  // Handle next/previous with haptic feedback
  const handleNext = useCallback(() => {
    haptic("impact", "medium");
    onNext();
  }, [haptic, onNext]);

  const handlePrevious = useCallback(() => {
    haptic("impact", "light");
    onPrevious();
  }, [haptic, onPrevious]);

  const handleSave = useCallback(() => {
    haptic("impact", "heavy");
    onSave();
  }, [haptic, onSave]);

  const handleExit = useCallback(() => {
    haptic("impact", "medium");
    onExit();
  }, [haptic, onExit]);

  // Get step status
  const getStepStatus = useCallback(
    (step: FlowStep, index: number) => {
      if (index < currentStep) return "completed";
      if (index === currentStep) return "current";
      if (step.optional) return "optional";
      return "pending";
    },
    [currentStep],
  );

  return (
    <div className={cn("flex flex-col h-screen bg-bg-base", className)}>
      {/* Header */}
      <div className="flex-none bg-bg-base border-b border-border-primary">
        <div className="flex items-center justify-between p-4 pb-2">
          {/* Back/Exit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Title */}
          <div className="flex-1 text-center px-4">
            {title && (
              <h1 className="text-lg font-semibold text-text-primary truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-text-secondary truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
              <span>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step Info */}
        <div
          className="px-4 pb-3 cursor-pointer"
          onClick={() => setShowStepOverview(!showStepOverview)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-text-primary">
                {currentStepInfo?.title}
              </h2>
              {currentStepInfo?.subtitle && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {currentStepInfo.subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentStepInfo?.optional && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Optional
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-text-secondary transition-transform",
                  showStepOverview && "rotate-180",
                )}
              />
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}
      </div>

      {/* Step Overview Modal */}
      <AnimatePresence>
        {showStepOverview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-20 bg-bg-base border-b border-border-primary shadow-lg"
          >
            <div className="p-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const status = getStepStatus(step, index);
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepSelect(index)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        status === "current" &&
                          "bg-primary-50 border border-primary-200",
                        status === "completed" &&
                          "bg-green-50 border border-green-200",
                        status === "pending" &&
                          "bg-gray-50 border border-gray-200",
                        status === "optional" &&
                          "bg-blue-50 border border-blue-200",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {status === "completed" ? (
                          <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : status === "current" ? (
                          <div className="h-6 w-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs",
                              status === "optional"
                                ? "border-blue-300 text-blue-600"
                                : "border-gray-300 text-gray-500",
                            )}
                          >
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {step.title}
                        </div>
                        {step.subtitle && (
                          <div className="text-sm text-text-secondary truncate">
                            {step.subtitle}
                          </div>
                        )}
                      </div>
                      {step.optional && (
                        <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Optional
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions Dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 right-4 z-30 bg-bg-base border border-border-primary rounded-lg shadow-lg min-w-[160px]"
          >
            <div className="py-2">
              <button
                onClick={handleSave}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-text-primary hover:bg-bg-subtle"
              >
                <Save className="h-4 w-4" />
                Save Progress
              </button>
              <button
                onClick={() => setShowStepOverview(!showStepOverview)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-text-primary hover:bg-bg-subtle"
              >
                <Info className="h-4 w-4" />
                Step Overview
              </button>
              <div className="border-t border-border-primary my-2" />
              <button
                onClick={handleExit}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <Home className="h-4 w-4" />
                Exit to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-hidden relative"
        ref={(el) => el && bindGestures(el)}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-4 pb-24">
            {/* Step Component */}
            {currentStepInfo && (
              <currentStepInfo.component
                data={stepData[currentStepInfo.id] || {}}
                onUpdate={(data: any) => {
                  // Update step data
                  // This would be handled by parent component
                }}
                isMobile={isMobile}
                screenSize={screenSize}
              />
            )}

            {/* Loading State */}
            {loading && (
              <div className="absolute inset-0 bg-bg-base/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                  <p className="text-sm text-text-secondary">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-none bg-bg-base border-t border-border-primary p-4 pb-safe">
        <div className="flex items-center gap-3">
          {/* Previous Button */}
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={!canGoPrevious || loading}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {/* Next/Complete Button */}
          <Button
            onClick={handleNext}
            disabled={!canProceed || loading}
            className={cn(
              "flex-1",
              currentStep === totalSteps - 1
                ? "bg-green-600 hover:bg-green-700"
                : "",
            )}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Swipe Hint */}
        {enableSwipeNavigation && isMobile && (
          <div className="text-center mt-2">
            <p className="text-xs text-text-tertiary">
              Swipe left/right to navigate steps
            </p>
          </div>
        )}
      </div>

      {/* Overlay for closing dropdowns */}
      {(showStepOverview || showActions) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowStepOverview(false);
            setShowActions(false);
          }}
        />
      )}
    </div>
  );
}

export default MobileGuidedFlowLayout;

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
// PHASE 3 FIX: Import swipe gesture hooks and visual indicators
import { useStepSwipeNavigation } from "@/hooks/useSwipeGestures";
import { SwipeIndicator, SwipeHints } from "./SwipeIndicator";
import { MobileStepProgress, type ProgressStep } from "../enhanced-progress";
import { useFocusable, useFocusManager } from "../focus-management";

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

  // Enhanced focus management
  const { announceToScreenReader } = useFocusManager();

  // Convert steps to progress steps format
  const progressSteps: ProgressStep[] = steps.map((step) => ({
    id: step.id,
    name: step.name,
    shortName: step.name.split(" ")[0], // First word as short name
    status: getStepStatus(step.id) as ProgressStep["status"],
    description: `Step ${step.id} of ${steps.length}`,
    estimatedTime:
      step.id <= 3 ? "5-10 min" : step.id <= 6 ? "10-15 min" : "15-20 min",
  }));

  // PHASE 3 FIX: Swipe gesture navigation integration
  const {
    getSwipeHandlers,
    bindSwipeGestures,
    isActive: isSwipeActive,
    currentDirection: swipeDirection,
  } = useStepSwipeNavigation(onNext, onBack, {
    hapticFeedback: true,
    enableVerticalSwipe: false,
  });

  // PHASE 2 FIX: Enhanced mobile touch and keyboard handling
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState<number>(0);
  const navigationRef = useRef<HTMLDivElement>(null);
  const stepButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Enhanced haptic feedback
  const triggerHaptic = useCallback(
    (intensity: "light" | "medium" | "strong" = "light") => {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        const patterns = {
          light: 5,
          medium: 10,
          strong: 15,
        };
        navigator.vibrate(patterns[intensity]);
      }
    },
    [],
  );

  // Enhanced touch handling
  const handleTouchStart = useCallback(
    (buttonId: string) => {
      const now = Date.now();
      if (now - lastTouchTime < 50) return; // Prevent rapid touches

      setPressedButton(buttonId);
      triggerHaptic("light");
      setLastTouchTime(now);
    },
    [lastTouchTime, triggerHaptic],
  );

  // Enhanced step navigation with announcements
  const handleStepNavigation = useCallback(
    (stepId: number, source: "touch" | "keyboard" | "swipe" = "touch") => {
      const targetStep = steps.find((s) => s.id === stepId);
      if (targetStep) {
        onStepChange(stepId);
        announceToScreenReader(
          `Navigated to ${targetStep.name} via ${source}`,
          "assertive",
        );
        triggerHaptic("medium");
      }
    },
    [steps, onStepChange, announceToScreenReader, triggerHaptic],
  );

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      onNext();
      announceToScreenReader(
        `Moving to next step: ${steps[currentStep]?.name}`,
        "assertive",
      );
      triggerHaptic("medium");
    }
  }, [
    isLastStep,
    onNext,
    steps,
    currentStep,
    announceToScreenReader,
    triggerHaptic,
  ]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      onBack();
      announceToScreenReader(
        `Moving to previous step: ${steps[currentStep - 2]?.name}`,
        "assertive",
      );
      triggerHaptic("medium");
    }
  }, [
    isFirstStep,
    onBack,
    steps,
    currentStep,
    announceToScreenReader,
    triggerHaptic,
  ]);

  const handleTouchEnd = useCallback(() => {
    setPressedButton(null);
  }, []);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!navigationRef.current) return;

      const { key, ctrlKey, metaKey } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Arrow key navigation between steps
      if (key === "ArrowLeft" && !isFirstStep) {
        event.preventDefault();
        handleBack();
      } else if (key === "ArrowRight" && !isLastStep) {
        event.preventDefault();
        handleNext();
      }

      // Number keys for direct step navigation
      const stepNumber = parseInt(key);
      if (stepNumber >= 1 && stepNumber <= steps.length && !isModifierPressed) {
        event.preventDefault();
        handleStepNavigation(stepNumber, "keyboard");
      }

      // Tab navigation for accessibility
      if (key === "Tab") {
        const buttons = stepButtonsRef.current.filter(Boolean);
        const currentIndex = buttons.findIndex(
          (btn) => btn === document.activeElement,
        );

        if (event.shiftKey && currentIndex > 0) {
          event.preventDefault();
          buttons[currentIndex - 1]?.focus();
        } else if (!event.shiftKey && currentIndex < buttons.length - 1) {
          event.preventDefault();
          buttons[currentIndex + 1]?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    currentStep,
    isFirstStep,
    isLastStep,
    steps.length,
    onBack,
    onNext,
    handleBack,
    handleNext,
    handleStepNavigation,
    onStepChange,
    triggerHaptic,
  ]);

  // PHASE 3 FIX: Bind swipe gestures to navigation container
  useEffect(() => {
    if (navigationRef.current) {
      return bindSwipeGestures(navigationRef.current);
    }
  }, [bindSwipeGestures]);

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
    <motion.div
      ref={navigationRef}
      className="bg-white border-t border-gray-200 p-4 space-y-4 relative"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      role="navigation"
      aria-label="Step navigation"
      tabIndex={-1}
      {...getSwipeHandlers()}
    >
      {/* PHASE 3 FIX: Swipe visual indicators */}
      <SwipeIndicator
        direction={swipeDirection}
        isActive={isSwipeActive}
        variant="full"
        showHints={true}
      />

      {/* PHASE 3 FIX: Swipe hints for first-time users */}
      {currentStep === 1 && (
        <SwipeHints
          showLeft={!isLastStep}
          showRight={!isFirstStep}
          variant="ghost"
        />
      )}
      {/* Enhanced Mobile Progress Indicator */}
      <MobileStepProgress
        steps={progressSteps}
        currentStep={currentStep}
        onStepClick={handleStepNavigation}
        className="border-none p-0 bg-transparent"
      />

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
                Navigate between steps. All steps are now accessible.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-2 overflow-y-auto max-h-[40vh]">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                // PHASE 1 FIX: Allow navigation to any step on mobile
                const canNavigate = true;
                const isPressed = pressedButton === `step-${step.id}`;

                return (
                  <motion.button
                    key={step.id}
                    ref={(el) => {
                      stepButtonsRef.current[index] = el;
                    }}
                    onClick={() => handleStepNavigation(step.id, "touch")}
                    onTouchStart={() => handleTouchStart(`step-${step.id}`)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(`step-${step.id}`)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    disabled={false}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all duration-200 touch-manipulation",
                      "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
                      getStepColor(step.id),
                    )}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{
                      scale: isPressed ? 0.96 : 1,
                      backgroundColor: isPressed
                        ? "var(--color-primary-50)"
                        : "rgba(0, 0, 0, 0)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    aria-label={`Navigate to ${step.name}`}
                    aria-current={status === "current" ? "step" : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{
                          scale: isPressed ? 0.9 : 1,
                          rotate: isPressed ? 5 : 0,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 25,
                        }}
                      >
                        {getStepIcon(step.id)}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.name}</span>
                          {status === "current" && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                            >
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Step {step.id} of {steps.length}
                        </p>
                      </div>
                    </div>
                  </motion.button>
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

      {/* Enhanced Navigation Buttons */}
      <div className="flex gap-3">
        <motion.div className="flex-1">
          <Button
            variant="outline"
            onClick={handleBack}
            onTouchStart={() => handleTouchStart("back-button")}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart("back-button")}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            disabled={isFirstStep}
            className={cn(
              "w-full touch-manipulation transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            whileHover={!isFirstStep ? { scale: 1.02, y: -1 } : {}}
            whileTap={!isFirstStep ? { scale: 0.98 } : {}}
            animate={{
              scale: pressedButton === "back-button" ? 0.96 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            aria-label="Go to previous step"
            aria-keyshortcuts="ArrowLeft"
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{
                x: pressedButton === "back-button" ? -2 : 0,
              }}
              transition={{ type: "spring", stiffness: 600 }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </motion.div>
          </Button>
        </motion.div>

        <motion.div className="flex-1">
          <Button
            onClick={handleNext}
            onTouchStart={() => handleTouchStart("next-button")}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart("next-button")}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            disabled={false}
            className={cn(
              "w-full touch-manipulation transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
            )}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              scale: pressedButton === "next-button" ? 0.96 : 1,
              backgroundColor:
                pressedButton === "next-button"
                  ? "var(--color-primary-700)"
                  : "rgba(0, 0, 0, 0)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            aria-label={isLastStep ? "Complete estimation" : "Go to next step"}
            aria-keyshortcuts="ArrowRight"
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{
                x: pressedButton === "next-button" ? 2 : 0,
              }}
              transition={{ type: "spring", stiffness: 600 }}
            >
              {isLastStep ? "Complete" : "Next"}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </motion.div>
          </Button>
        </motion.div>
      </div>

      {/* PHASE 3 FIX: Enhanced navigation hints with swipe support */}
      <motion.div
        className="text-xs text-gray-400 text-center mt-2 space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p>
          💡 Swipe ← → to navigate, arrow keys, or press 1-{steps.length} for
          direct access
        </p>
      </motion.div>
    </motion.div>
  );
}

export default MobileStepNavigation;

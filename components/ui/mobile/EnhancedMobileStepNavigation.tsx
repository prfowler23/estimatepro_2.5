/**
 * Enhanced Mobile Step Navigation
 *
 * Features:
 * - Smart step progression with validation feedback
 * - Contextual help and suggestions
 * - Gesture-based navigation with haptic feedback
 * - Progressive disclosure for complex workflows
 * - Mobile-optimized validation feedback
 *
 * Part of Phase 4 Priority 2: Enhanced Mobile Navigation
 */

"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkflowNavigation } from "@/components/layout/hooks/useContextualNavigation";
import { useStepSwipeNavigation } from "@/hooks/useSwipeGestures";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  Lightbulb,
  Zap,
  Clock,
  Users,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  subtitle?: string;
  isRequired?: boolean;
  isCompleted?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  estimatedTime?: number; // minutes
  complexity?: "simple" | "medium" | "complex";
  helpText?: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

interface StepSuggestion {
  id: string;
  type: "tip" | "shortcut" | "warning" | "next_step";
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface EnhancedMobileStepNavigationProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  validationErrors?: ValidationError[];
  isLoading?: boolean;
  showProgress?: boolean;
  suggestions?: StepSuggestion[];
  className?: string;
}

const StepIndicator = React.memo(function StepIndicator({
  step,
  index,
  currentStep,
  isAccessible,
  onClick,
  showDetails = false,
}: {
  step: Step;
  index: number;
  currentStep: number;
  isAccessible: boolean;
  onClick: () => void;
  showDetails?: boolean;
}) {
  const isCurrent = index === currentStep;
  const isPast = index < currentStep;
  const isFuture = index > currentStep;

  const getStepIcon = () => {
    if (step.hasErrors) return <AlertTriangle className="h-3 w-3" />;
    if (step.isCompleted || isPast) return <Check className="h-3 w-3" />;
    if (isCurrent) return <div className="h-2 w-2 rounded-full bg-current" />;
    return <div className="h-2 w-2 rounded-full border border-current" />;
  };

  const getStepColor = () => {
    if (step.hasErrors) return "text-red-600 bg-red-100 border-red-300";
    if (step.hasWarnings)
      return "text-yellow-600 bg-yellow-100 border-yellow-300";
    if (isCurrent) return "text-primary-600 bg-primary-100 border-primary-300";
    if (isPast) return "text-green-600 bg-green-100 border-green-300";
    return "text-gray-400 bg-gray-100 border-gray-300";
  };

  return (
    <motion.button
      onClick={isAccessible ? onClick : undefined}
      disabled={!isAccessible}
      className={cn(
        "relative flex flex-col items-center min-w-0 flex-1",
        isAccessible && "cursor-pointer",
      )}
      whileTap={isAccessible ? { scale: 0.95 } : undefined}
    >
      {/* Step Circle */}
      <motion.div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
          getStepColor(),
          !isAccessible && "opacity-50",
        )}
        animate={{
          scale: isCurrent ? 1.1 : 1,
          boxShadow: isCurrent ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        }}
        transition={{ duration: 0.2 }}
      >
        {getStepIcon()}
      </motion.div>

      {/* Step Label */}
      {showDetails && (
        <div className="mt-2 text-center min-h-[2rem]">
          <div
            className={cn(
              "text-xs font-medium transition-colors",
              isCurrent ? "text-primary-700" : "text-text-secondary",
            )}
          >
            {step.title}
          </div>
          {step.estimatedTime && (
            <div className="text-[10px] text-text-tertiary mt-0.5 flex items-center justify-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {step.estimatedTime}min
            </div>
          )}
        </div>
      )}

      {/* Status Indicators */}
      <div className="absolute -top-1 -right-1 flex gap-0.5">
        {step.hasErrors && (
          <div className="h-2 w-2 bg-red-500 rounded-full ring-1 ring-white" />
        )}
        {step.hasWarnings && (
          <div className="h-2 w-2 bg-yellow-500 rounded-full ring-1 ring-white" />
        )}
        {step.isRequired && !step.isCompleted && (
          <div className="h-2 w-2 bg-blue-500 rounded-full ring-1 ring-white" />
        )}
      </div>

      {/* Connection Line */}
      {index < steps.length - 1 && (
        <div
          className={cn(
            "absolute top-4 left-full w-full h-0.5 -translate-y-0.5 transition-colors",
            isPast ? "bg-green-300" : "bg-gray-300",
          )}
          style={{ zIndex: -1 }}
        />
      )}
    </motion.button>
  );
});

const ValidationFeedback = React.memo(function ValidationFeedback({
  errors,
}: {
  errors: ValidationError[];
}) {
  if (errors.length === 0) return null;

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-2 bg-red-50 border-b border-red-200"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-800">
          {errorCount > 0 && `${errorCount} error${errorCount > 1 ? "s" : ""}`}
          {errorCount > 0 && warningCount > 0 && ", "}
          {warningCount > 0 &&
            `${warningCount} warning${warningCount > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="space-y-1">
        {errors.slice(0, 3).map((error, index) => (
          <div
            key={index}
            className="text-xs text-red-700 flex items-start gap-2"
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                error.severity === "error"
                  ? "bg-red-500"
                  : error.severity === "warning"
                    ? "bg-yellow-500"
                    : "bg-blue-500",
              )}
            />
            <span>{error.message}</span>
          </div>
        ))}
        {errors.length > 3 && (
          <div className="text-xs text-red-600 font-medium">
            +{errors.length - 3} more issues
          </div>
        )}
      </div>
    </motion.div>
  );
});

const SuggestionsPanel = React.memo(function SuggestionsPanel({
  suggestions,
  isVisible,
}: {
  suggestions: StepSuggestion[];
  isVisible: boolean;
}) {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 py-3 bg-blue-50 border-b border-blue-200"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">
          Smart Suggestions
        </span>
        <Badge variant="secondary" className="text-xs">
          {suggestions.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 2).map((suggestion) => {
          const IconComponent = suggestion.icon || Info;
          return (
            <div
              key={suggestion.id}
              className="flex items-start gap-3 p-2 bg-white/50 rounded-lg"
            >
              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg">
                <IconComponent className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-900">
                  {suggestion.title}
                </div>
                <div className="text-xs text-blue-700 mt-0.5">
                  {suggestion.description}
                </div>
                {suggestion.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={suggestion.action.onClick}
                    className="h-6 px-2 mt-1 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                  >
                    {suggestion.action.label}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

export function EnhancedMobileStepNavigation({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onBack,
  canProceed,
  validationErrors = [],
  isLoading = false,
  showProgress = true,
  suggestions = [],
  className,
}: EnhancedMobileStepNavigationProps) {
  const [showStepDetails, setShowStepDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    currentWorkflow,
    nextStep: workflowNextStep,
    previousStep: workflowPreviousStep,
  } = useWorkflowNavigation();

  // Enhanced haptic feedback
  const triggerHaptic = useCallback(
    (pattern: "light" | "medium" | "strong" = "medium") => {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        const patterns = {
          light: 5,
          medium: 10,
          strong: 15,
        };
        navigator.vibrate(patterns[pattern]);
      }
    },
    [],
  );

  // Swipe gesture handlers
  const swipeHandlers = useStepSwipeNavigation(
    () => {
      if (canProceed) {
        triggerHaptic("light");
        onNext();
      }
    },
    () => {
      if (currentStep > 0) {
        triggerHaptic("light");
        onBack();
      }
    },
    {
      enableVerticalSwipe: true,
      onSwipeUp: () => {
        setShowSuggestions(!showSuggestions);
        triggerHaptic("light");
      },
      onSwipeDown: () => {
        setShowStepDetails(!showStepDetails);
        triggerHaptic("light");
      },
      hapticFeedback: true,
    },
  );

  const currentStepData = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const hasErrors =
    validationErrors.filter((e) => e.severity === "error").length > 0;
  const hasWarnings =
    validationErrors.filter((e) => e.severity === "warning").length > 0;

  // Auto-show suggestions for complex steps
  useEffect(() => {
    if (currentStepData?.complexity === "complex" && suggestions.length > 0) {
      const timer = setTimeout(() => setShowSuggestions(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentStepData?.complexity, suggestions.length]);

  const isStepAccessible = useCallback(
    (stepIndex: number) => {
      return stepIndex <= currentStep || steps[stepIndex - 1]?.isCompleted;
    },
    [currentStep, steps],
  );

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (isStepAccessible(stepIndex) && stepIndex !== currentStep) {
        triggerHaptic("medium");
        onStepChange(stepIndex);
      }
    },
    [currentStep, isStepAccessible, onStepChange, triggerHaptic],
  );

  const handleNext = useCallback(() => {
    if (canProceed && !isLoading) {
      triggerHaptic("medium");
      onNext();
    }
  }, [canProceed, isLoading, onNext, triggerHaptic]);

  const handleBack = useCallback(() => {
    if (currentStep > 0 && !isLoading) {
      triggerHaptic("light");
      onBack();
    }
  }, [currentStep, isLoading, onBack, triggerHaptic]);

  return (
    <div className={cn("bg-bg-base border-t border-border-primary", className)}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="h-1 bg-bg-subtle overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Validation Feedback */}
      <AnimatePresence>
        {(hasErrors || hasWarnings) && (
          <ValidationFeedback errors={validationErrors} />
        )}
      </AnimatePresence>

      {/* Smart Suggestions */}
      <AnimatePresence>
        <SuggestionsPanel
          suggestions={suggestions}
          isVisible={showSuggestions}
        />
      </AnimatePresence>

      {/* Main Navigation Content */}
      <div
        ref={containerRef}
        className="px-4 py-3"
        {...swipeHandlers.getSwipeHandlers()}
      >
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {steps.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              index={index}
              currentStep={currentStep}
              isAccessible={isStepAccessible(index)}
              onClick={() => handleStepClick(index)}
              showDetails={showStepDetails && steps.length <= 5}
            />
          ))}
        </div>

        {/* Current Step Info */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-text-primary">
              {currentStepData?.title}
            </h3>
            {currentStepData?.isRequired && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
            {currentStepData?.complexity && (
              <Badge
                variant={
                  currentStepData.complexity === "complex"
                    ? "destructive"
                    : currentStepData.complexity === "medium"
                      ? "secondary"
                      : "outline"
                }
                className="text-xs"
              >
                {currentStepData.complexity}
              </Badge>
            )}
          </div>
          {currentStepData?.subtitle && (
            <p className="text-sm text-text-secondary">
              {currentStepData.subtitle}
            </p>
          )}

          {/* Step Meta Info */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Step {currentStep + 1} of {steps.length}
            </span>
            {currentStepData?.estimatedTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />~{currentStepData.estimatedTime}{" "}
                min
              </span>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className="flex items-center gap-2 flex-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Help/Suggestions Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSuggestions(!showSuggestions);
              triggerHaptic("light");
            }}
            className="p-2"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            size="sm"
            className={cn(
              "flex items-center gap-2 flex-1 transition-colors",
              hasErrors
                ? "bg-red-600 hover:bg-red-700"
                : currentStep === steps.length - 1
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-primary-600 hover:bg-primary-700",
            )}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {currentStep === steps.length - 1 ? "Complete" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => {
              setShowStepDetails(!showStepDetails);
              triggerHaptic("light");
            }}
            className="text-xs text-text-secondary hover:text-primary-600 transition-colors flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {showStepDetails ? "Hide" : "Show"} Details
          </button>

          {currentWorkflow && (
            <button
              onClick={() => {
                // Navigate to workflow overview
                triggerHaptic("light");
              }}
              className="text-xs text-text-secondary hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              <Zap className="h-3 w-3" />
              Workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedMobileStepNavigation;

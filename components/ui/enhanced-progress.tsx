"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: number;
  name: string;
  shortName?: string;
  status: "completed" | "current" | "available" | "locked" | "error";
  description?: string;
  estimatedTime?: string;
  completionRate?: number;
}

interface EnhancedProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  variant?: "minimal" | "detailed" | "compact";
  showLabels?: boolean;
  showProgress?: boolean;
  showEstimatedTime?: boolean;
  animated?: boolean;
  className?: string;
  onStepClick?: (stepId: number) => void;
}

export function EnhancedProgressIndicator({
  steps,
  currentStep,
  orientation = "horizontal",
  variant = "detailed",
  showLabels = true,
  showProgress = true,
  showEstimatedTime = false,
  animated = true,
  className,
  onStepClick,
}: EnhancedProgressIndicatorProps) {
  const completedSteps = steps.filter(
    (step) => step.status === "completed",
  ).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case "current":
        return (
          <motion.div
            className="w-5 h-5 bg-primary-600 rounded-full border-2 border-white shadow-lg"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        );
      case "available":
        return (
          <div className="w-5 h-5 bg-gray-300 rounded-full border-2 border-white" />
        );
      case "error":
        return <AlertCircle className="w-5 h-5 text-error-600" />;
      case "locked":
        return <Lock className="w-4 h-4 text-gray-400" />;
      default:
        return <div className="w-5 h-5 bg-gray-200 rounded-full" />;
    }
  };

  const getStepColor = (step: ProgressStep): string => {
    switch (step.status) {
      case "completed":
        return "text-success-600 bg-success-50 border-success-200";
      case "current":
        return "text-primary-600 bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-50";
      case "available":
        return "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100";
      case "error":
        return "text-error-600 bg-error-50 border-error-200";
      case "locked":
        return "text-gray-400 bg-gray-50 border-gray-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const isClickable = (step: ProgressStep): boolean => {
    return step.status !== "locked" && onStepClick !== undefined;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Overall Progress Bar */}
      {showProgress && variant !== "minimal" && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-gray-500">
              {Math.round(progressPercentage)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Step Indicators */}
      <div
        className={cn(
          "flex",
          orientation === "vertical"
            ? "flex-col space-y-4"
            : "items-center space-x-2 overflow-x-auto",
          orientation === "horizontal" && "pb-2",
        )}
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const displayName =
            variant === "compact" ? step.shortName || step.name : step.name;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <motion.div
                className={cn(
                  "flex items-center",
                  orientation === "vertical"
                    ? "flex-row space-x-3"
                    : "flex-col items-center text-center",
                  variant === "minimal" ? "space-y-1" : "space-y-2",
                  isClickable(step) && "cursor-pointer group",
                  "transition-all duration-200",
                )}
                onClick={() => isClickable(step) && onStepClick!(step.id)}
                whileHover={isClickable(step) ? { scale: 1.02 } : {}}
                whileTap={isClickable(step) ? { scale: 0.98 } : {}}
              >
                {/* Step Icon/Number */}
                <motion.div
                  className={cn(
                    "relative flex items-center justify-center",
                    "transition-all duration-200",
                    isClickable(step) && "group-hover:shadow-md",
                  )}
                  initial={animated ? { scale: 0, opacity: 0 } : {}}
                  animate={animated ? { scale: 1, opacity: 1 } : {}}
                  transition={
                    animated ? { delay: index * 0.1, duration: 0.3 } : {}
                  }
                >
                  {variant === "minimal" ? (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                        getStepColor(step),
                      )}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium shadow-sm",
                        getStepColor(step),
                      )}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : step.status === "error" ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                  )}

                  {/* Current step pulse animation */}
                  {step.status === "current" && animated && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary-500"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}

                  {/* Completion rate indicator */}
                  {step.completionRate !== undefined &&
                    step.status === "current" && (
                      <div className="absolute -bottom-1 -right-1">
                        <div className="w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                          <div
                            className="w-2 h-2 bg-primary-500 rounded-full"
                            style={{
                              transform: `scale(${step.completionRate / 100})`,
                              transition: "transform 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}
                </motion.div>

                {/* Step Label and Details */}
                {showLabels && variant !== "minimal" && (
                  <div
                    className={cn(
                      "flex flex-col",
                      orientation === "horizontal"
                        ? "items-center max-w-24"
                        : "flex-1 min-w-0",
                    )}
                  >
                    <motion.span
                      className={cn(
                        "font-medium text-sm",
                        step.status === "current"
                          ? "text-primary-700"
                          : step.status === "completed"
                            ? "text-success-700"
                            : step.status === "error"
                              ? "text-error-700"
                              : "text-gray-600",
                        orientation === "horizontal" &&
                          "text-center leading-tight",
                      )}
                      initial={animated ? { opacity: 0, y: 10 } : {}}
                      animate={animated ? { opacity: 1, y: 0 } : {}}
                      transition={
                        animated
                          ? { delay: index * 0.1 + 0.1, duration: 0.3 }
                          : {}
                      }
                    >
                      {displayName}
                    </motion.span>

                    {/* Step Description */}
                    {step.description && variant === "detailed" && (
                      <span
                        className={cn(
                          "text-xs text-gray-500 mt-1",
                          orientation === "horizontal" ? "text-center" : "",
                        )}
                      >
                        {step.description}
                      </span>
                    )}

                    {/* Estimated Time */}
                    {showEstimatedTime && step.estimatedTime && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {step.estimatedTime}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Connector Line */}
              {!isLast && variant !== "minimal" && (
                <motion.div
                  className={cn(
                    orientation === "horizontal"
                      ? "flex-1 h-0.5 mx-2"
                      : "w-0.5 h-8 ml-5",
                    step.status === "completed"
                      ? "bg-success-300"
                      : "bg-gray-200",
                  )}
                  initial={
                    animated
                      ? {
                          scaleX: orientation === "horizontal" ? 0 : 1,
                          scaleY: orientation === "vertical" ? 0 : 1,
                        }
                      : {}
                  }
                  animate={animated ? { scaleX: 1, scaleY: 1 } : {}}
                  transition={
                    animated ? { delay: index * 0.1 + 0.2, duration: 0.4 } : {}
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Summary */}
      {variant === "detailed" && (
        <motion.div
          className="mt-4 p-3 bg-gray-50 rounded-lg border"
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={animated ? { delay: 0.5, duration: 0.3 } : {}}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {completedSteps} of {steps.length} steps completed
            </span>
            <span className="text-gray-500">
              {steps.filter((s) => s.status === "error").length > 0 && (
                <span className="text-error-600 font-medium">
                  {steps.filter((s) => s.status === "error").length} error(s)
                </span>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Mobile-optimized step navigation with enhanced visual hierarchy
interface MobileStepProgressProps {
  steps: ProgressStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export function MobileStepProgress({
  steps,
  currentStep,
  onStepClick,
  className,
}: MobileStepProgressProps) {
  const currentStepData = steps.find((s) => s.id === currentStep);
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className={cn("bg-white border-b border-gray-200 p-4", className)}>
      {/* Current Step Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {currentStepData?.name}
          </h2>
          <p className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progressPercentage)}%
          </span>
          <div className="w-12 h-12 relative">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                className="text-primary-500"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${progressPercentage} 100` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {currentStepData?.status === "completed" ? (
                <CheckCircle className="w-4 h-4 text-success-600" />
              ) : (
                <span className="text-xs font-bold text-gray-600">
                  {currentStep}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Step Dots */}
      <div className="flex items-center justify-between mt-3 px-1">
        {steps.map((step, index) => (
          <motion.button
            key={step.id}
            onClick={() => onStepClick?.(step.id)}
            className={cn(
              "w-3 h-3 rounded-full border-2 transition-all duration-200",
              step.status === "completed"
                ? "bg-success-500 border-success-600"
                : step.status === "current"
                  ? "bg-primary-500 border-primary-600 ring-2 ring-primary-200"
                  : step.status === "available"
                    ? "bg-gray-300 border-gray-400"
                    : "bg-gray-200 border-gray-300",
              onStepClick && "hover:scale-110 active:scale-95",
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            disabled={step.status === "locked"}
            aria-label={`Go to ${step.name}`}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

// PHASE 3 FIX: Extracted step content area into focused component
import React, { memo, useRef, useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ValidationResult } from "@/lib/validation/guided-flow-validation";
import { GuidedFlowData } from "@/lib/types/estimate-types";
// PHASE 3 FIX: Import swipe gesture support
import { useStepSwipeNavigation } from "@/hooks/useSwipeGestures";
import { SwipeIndicator } from "@/components/ui/mobile/SwipeIndicator";
import { useMobileDetection } from "@/hooks/useMobileDetection";

interface Step {
  id: number;
  name: string;
  component: React.ComponentType<any>;
}

interface StepContentAreaProps {
  CurrentStepComponent: React.ComponentType<any>;
  flowData: GuidedFlowData;
  currentStep: number;
  steps: Step[];
  currentValidation?: ValidationResult;
  attemptedNavigation: boolean;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

function StepContentAreaComponent({
  CurrentStepComponent,
  flowData,
  currentStep,
  steps,
  currentValidation,
  attemptedNavigation,
  onUpdate,
  onNext,
  onBack,
  className = "",
}: StepContentAreaProps) {
  const { isMobile } = useMobileDetection();
  const contentRef = useRef<HTMLDivElement>(null);

  // PHASE 3 FIX: Add swipe gesture support to step content area
  const {
    getSwipeHandlers,
    bindSwipeGestures,
    isActive: isSwipeActive,
    currentDirection: swipeDirection,
  } = useStepSwipeNavigation(onNext, onBack, {
    hapticFeedback: true,
    enableVerticalSwipe: false,
  });

  // Bind swipe gestures to content area
  useEffect(() => {
    if (isMobile && contentRef.current) {
      return bindSwipeGestures(contentRef.current);
    }
  }, [isMobile, bindSwipeGestures]);

  const validationErrors =
    currentValidation && !currentValidation.isValid
      ? currentValidation.errors
      : [];

  const showValidationAlert =
    attemptedNavigation && validationErrors.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Error Alert */}
      {showValidationAlert && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Please fix the following issues:</h4>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Current Step Content with Swipe Support */}
      <div
        ref={contentRef}
        className="bg-white rounded-lg border shadow-sm p-4 sm:p-6 relative"
        {...(isMobile ? getSwipeHandlers() : {})}
      >
        {/* PHASE 3 FIX: Swipe indicators for mobile step content */}
        {isMobile && (
          <SwipeIndicator
            direction={swipeDirection}
            isActive={isSwipeActive}
            variant="minimal"
            size="sm"
            className="opacity-70"
          />
        )}

        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {steps[currentStep - 1]?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Step {currentStep} of {steps.length}
            {isMobile && <span className="ml-2">• Swipe to navigate</span>}
          </p>
        </div>

        <CurrentStepComponent
          data={flowData}
          onUpdate={onUpdate}
          onNext={onNext}
          onBack={onBack}
        />
      </div>

      {/* Step-specific validation warnings */}
      {currentValidation?.warnings && currentValidation.warnings.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <div>
            <h4 className="font-medium text-yellow-800">Recommendations:</h4>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {currentValidation.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Step-specific suggestions */}
      {currentValidation?.suggestions &&
        currentValidation.suggestions.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-800">Suggestions:</h4>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {currentValidation.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-700">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </Alert>
        )}
    </div>
  );
}

// PHASE 3 FIX: Memoize to prevent unnecessary re-renders when props haven't changed
// Custom comparison function to handle function props properly
export const StepContentArea = memo(
  StepContentAreaComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.currentStep === nextProps.currentStep &&
      prevProps.className === nextProps.className &&
      prevProps.attemptedNavigation === nextProps.attemptedNavigation &&
      prevProps.CurrentStepComponent === nextProps.CurrentStepComponent &&
      prevProps.steps === nextProps.steps &&
      prevProps.flowData === nextProps.flowData &&
      prevProps.currentValidation === nextProps.currentValidation
      // Note: onUpdate, onNext, onBack are functions and will have new references
      // Parent should wrap these in useCallback to prevent re-renders
    );
  },
);

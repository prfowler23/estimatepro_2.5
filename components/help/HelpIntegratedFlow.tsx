"use client";

import React, { useEffect } from "react";
import { useHelp } from "./HelpProvider";
import { HelpContext } from "@/lib/help/help-context-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";

interface HelpIntegratedFlowProps {
  children: React.ReactNode;
  currentStep: number;
  flowData: GuidedFlowData;
  validationErrors?: string[];
  className?: string;
}

const STEP_IDS = [
  "initial-contact",
  "scope-details",
  "files-photos",
  "area-of-work",
  "takeoff",
  "duration",
  "expenses",
  "pricing",
  "summary",
];

export function HelpIntegratedFlow({
  children,
  currentStep,
  flowData,
  validationErrors = [],
  className = "",
}: HelpIntegratedFlowProps) {
  const { setContext, updateFlowData, trackBehavior } = useHelp();

  // Update help context when step changes
  useEffect(() => {
    const stepId = STEP_IDS[currentStep - 1] || "unknown";
    const formState = analyzeFormState(currentStep, flowData);

    const context: HelpContext = {
      stepId,
      stepNumber: currentStep,
      hasErrors: validationErrors.length > 0,
      formState,
      userBehavior: {
        timeOnStep: 0,
        errorCount: validationErrors.length,
        hesitationIndicators: [],
      },
    };

    setContext(context);
    trackBehavior("step_change", {
      stepId,
      stepNumber: currentStep,
      formState,
      errorCount: validationErrors.length,
    });
  }, [currentStep, validationErrors.length, setContext, trackBehavior]);

  // Update flow data in help context
  useEffect(() => {
    updateFlowData(flowData);
  }, [flowData, updateFlowData]);

  // Track validation errors
  useEffect(() => {
    if (validationErrors.length > 0) {
      trackBehavior("validation_errors", {
        errors: validationErrors,
        stepNumber: currentStep,
        stepId: STEP_IDS[currentStep - 1],
      });
    }
  }, [validationErrors, currentStep, trackBehavior]);

  return (
    <div
      className={className}
      data-help-step={currentStep}
      data-help-step-id={STEP_IDS[currentStep - 1]}
    >
      {children}
    </div>
  );
}

/**
 * Analyze the current form state for help context
 */
function analyzeFormState(
  stepNumber: number,
  flowData: GuidedFlowData,
): "empty" | "partial" | "complete" {
  const stepData = getStepData(stepNumber, flowData);

  if (!stepData) return "empty";

  const completionScore = calculateStepCompletion(stepNumber, stepData);

  if (completionScore === 0) return "empty";
  if (completionScore >= 80) return "complete";
  return "partial";
}

/**
 * Get data for a specific step
 */
function getStepData(stepNumber: number, flowData: GuidedFlowData): any {
  switch (stepNumber) {
    case 1:
      return flowData.initialContact;
    case 2:
      return flowData.scopeDetails;
    case 3:
      return flowData.filesPhotos;
    case 4:
      return flowData.areaOfWork;
    case 5:
      return flowData.takeoff;
    case 6:
      return flowData.duration;
    case 7:
      return flowData.expenses;
    case 8:
      return flowData.pricing;
    case 9:
      return flowData.summary;
    default:
      return null;
  }
}

/**
 * Calculate completion percentage for a step
 */
function calculateStepCompletion(stepNumber: number, stepData: any): number {
  if (!stepData) return 0;

  switch (stepNumber) {
    case 1: // Initial Contact
      const fields1 = [
        stepData.contactMethod,
        stepData.originalContent || stepData.initialNotes,
        stepData.extractedData?.customer?.name ||
          stepData.aiExtractedData?.customer?.name,
        stepData.extractedData?.customer?.email ||
          stepData.aiExtractedData?.customer?.email,
      ];
      return (fields1.filter(Boolean).length / fields1.length) * 100;

    case 2: // Scope Details
      const fields2 = [
        stepData.selectedServices?.length > 0,
        stepData.buildingType,
        stepData.projectPriority,
      ];
      return (fields2.filter(Boolean).length / fields2.length) * 100;

    case 3: // Files/Photos
      const fields3 = [stepData.files?.length > 0, stepData.analysisComplete];
      return (fields3.filter(Boolean).length / fields3.length) * 100;

    case 4: // Area of Work
      const fields4 = [
        stepData.selectedAreas?.length > 0,
        stepData.totalArea > 0,
      ];
      return (fields4.filter(Boolean).length / fields4.length) * 100;

    case 5: // Takeoff
      const fields5 = [
        stepData.measurements?.length > 0,
        stepData.totalQuantity > 0,
      ];
      return (fields5.filter(Boolean).length / fields5.length) * 100;

    case 6: // Duration
      const fields6 = [
        stepData.startDate,
        stepData.duration > 0,
        stepData.workingHours,
      ];
      return (fields6.filter(Boolean).length / fields6.length) * 100;

    case 7: // Expenses
      const fields7 = [
        stepData.materials?.length > 0,
        stepData.equipment?.length > 0,
        stepData.labor,
      ];
      return (fields7.filter(Boolean).length / fields7.length) * 100;

    case 8: // Pricing
      const fields8 = [
        stepData.pricingStrategy,
        stepData.markup > 0,
        stepData.totalPrice > 0,
      ];
      return (fields8.filter(Boolean).length / fields8.length) * 100;

    case 9: // Summary
      const fields9 = [
        stepData.deliveryMethod,
        stepData.followUpDate,
        stepData.notes,
      ];
      return (fields9.filter(Boolean).length / fields9.length) * 100;

    default:
      return 0;
  }
}

export default HelpIntegratedFlow;

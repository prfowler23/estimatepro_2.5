"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { validateClientEnv } from "@/lib/config/env-validation";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation?: (data: GuidedFlowData) => { isValid: boolean; errors: string[] };
}

interface EstimateFlowContextType {
  // Flow state
  currentStep: number;
  totalSteps: number;
  flowData: GuidedFlowData;
  isLegacyMode: boolean;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;

  // Data management
  updateFlowData: (data: Partial<GuidedFlowData>) => void;
  updateStepData: (stepId: string, data: any) => void;
  clearFlowData: () => void;

  // Validation
  validateCurrentStep: () => { isValid: boolean; errors: string[] };
  validateAllSteps: () => boolean;

  // Progress
  getProgress: () => number;
  getCompletedSteps: () => string[];
  isStepCompleted: (stepId: string) => boolean;

  // Save state
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

const EstimateFlowContext = createContext<EstimateFlowContextType | undefined>(
  undefined,
);

// Define the 4-step flow
const FOUR_STEP_FLOW: FlowStep[] = [
  {
    id: "project-setup",
    title: "Project Setup",
    description: "Customer info and services",
    component: React.lazy(() => import("./guided-flow/steps/ProjectSetup")),
    validation: (data) => {
      const errors: string[] = [];
      if (!data.initialContact?.customerName)
        errors.push("Customer name is required");
      if (!data.scopeDetails?.selectedServices?.length)
        errors.push("Select at least one service");
      return { isValid: errors.length === 0, errors };
    },
  },
  {
    id: "measurements",
    title: "Measurements",
    description: "Area and dimensions",
    component: React.lazy(() => import("./guided-flow/steps/Measurements")),
    validation: (data) => {
      const errors: string[] = [];
      if (!data.areaOfWork?.totalArea || data.areaOfWork.totalArea <= 0) {
        errors.push("Total area must be greater than 0");
      }
      return { isValid: errors.length === 0, errors };
    },
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Costs and duration",
    component: React.lazy(() => import("./guided-flow/steps/UnifiedPricing")),
    validation: (data) => {
      const errors: string[] = [];
      if (!data.pricing?.totalPrice || data.pricing.totalPrice <= 0) {
        errors.push("Total price must be greater than 0");
      }
      return { isValid: errors.length === 0, errors };
    },
  },
  {
    id: "review",
    title: "Review & Send",
    description: "Finalize and deliver",
    component: React.lazy(() => import("./guided-flow/steps/ReviewSend")),
    validation: () => ({ isValid: true, errors: [] }),
  },
];

// Legacy 8-step flow (for backward compatibility)
const LEGACY_FLOW: FlowStep[] = [
  {
    id: "initial-contact",
    title: "Initial Contact",
    description: "Customer information",
    component: React.lazy(() => import("./guided-flow/steps/InitialContact")),
  },
  {
    id: "scope-details",
    title: "Scope Details",
    description: "Service selection",
    component: React.lazy(() => import("./guided-flow/steps/ScopeDetails")),
  },
  {
    id: "area-of-work",
    title: "Area of Work",
    description: "Work areas",
    component: React.lazy(() => import("./guided-flow/steps/AreaOfWork")),
  },
  {
    id: "takeoff",
    title: "Takeoff",
    description: "Measurements",
    component: React.lazy(() => import("./guided-flow/steps/Takeoff")),
  },
  {
    id: "duration",
    title: "Duration",
    description: "Timeline",
    component: React.lazy(() => import("./guided-flow/steps/Duration")),
  },
  {
    id: "expenses",
    title: "Expenses",
    description: "Additional costs",
    component: React.lazy(() => import("./guided-flow/steps/Expenses")),
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Final pricing",
    component: React.lazy(() => import("./guided-flow/steps/Pricing")),
  },
  {
    id: "files-photos",
    title: "Files & Photos",
    description: "Attachments",
    component: React.lazy(() => import("./guided-flow/steps/FilesPhotos")),
  },
];

export function EstimateFlowProvider({
  children,
  estimateId,
}: {
  children: React.ReactNode;
  estimateId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const env = validateClientEnv();

  // Determine if we're in legacy mode
  const isLegacyMode =
    searchParams.get("legacy") === "true" &&
    env.NEXT_PUBLIC_LEGACY_FLOW_SUPPORT;
  const steps = isLegacyMode ? LEGACY_FLOW : FOUR_STEP_FLOW;

  // Core state
  const [currentStep, setCurrentStep] = useState(0);
  const [flowData, setFlowData] = useState<GuidedFlowData>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Check for template selection on mount
  useEffect(() => {
    const selectedTemplateId = sessionStorage.getItem("selectedTemplateId");
    if (selectedTemplateId) {
      // Import WorkflowTemplateService dynamically to avoid circular dependencies
      import("@/lib/services/workflow-templates").then(
        ({ WorkflowTemplateService }) => {
          const templateData = WorkflowTemplateService.applyTemplate(
            selectedTemplateId,
            {},
          );
          setFlowData(templateData);
          setTemplateId(selectedTemplateId);
          // Clear the session storage
          sessionStorage.removeItem("selectedTemplateId");
        },
      );
    }
  }, []);

  // Auto-save hook
  const { isSaving, lastSaved, hasUnsavedChanges } = useAutoSave({
    data: flowData,
    estimateId,
    enabled: true,
    debounceMs: 2000,
  });

  // Session recovery hook
  const { recoveredData } = useSessionRecovery({
    estimateId,
    enabled: true,
  });

  // Restore recovered data on mount
  useEffect(() => {
    if (recoveredData && Object.keys(recoveredData).length > 0) {
      setFlowData(recoveredData);
    }
  }, [recoveredData]);

  // Navigation functions
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const validation = validateCurrentStep();
      if (validation.isValid) {
        setCompletedSteps((prev) => new Set(prev).add(steps[currentStep].id));
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, steps]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
      }
    },
    [steps.length],
  );

  // Data management
  const updateFlowData = useCallback((data: Partial<GuidedFlowData>) => {
    setFlowData((prev) => ({ ...prev, ...data }));
  }, []);

  const updateStepData = useCallback((stepId: string, data: any) => {
    setFlowData((prev) => ({
      ...prev,
      [stepId]: data,
    }));
  }, []);

  const clearFlowData = useCallback(() => {
    setFlowData({});
    setCompletedSteps(new Set());
    setCurrentStep(0);
  }, []);

  // Validation
  const validateCurrentStep = useCallback(() => {
    const step = steps[currentStep];
    if (step.validation) {
      return step.validation(flowData);
    }
    return { isValid: true, errors: [] };
  }, [currentStep, flowData, steps]);

  const validateAllSteps = useCallback(() => {
    return steps.every((step) => {
      if (step.validation) {
        return step.validation(flowData).isValid;
      }
      return true;
    });
  }, [flowData, steps]);

  // Progress tracking
  const getProgress = useCallback(() => {
    return ((currentStep + 1) / steps.length) * 100;
  }, [currentStep, steps.length]);

  const getCompletedSteps = useCallback(() => {
    return Array.from(completedSteps);
  }, [completedSteps]);

  const isStepCompleted = useCallback(
    (stepId: string) => {
      return completedSteps.has(stepId);
    },
    [completedSteps],
  );

  // Context value
  const value: EstimateFlowContextType = {
    // Flow state
    currentStep,
    totalSteps: steps.length,
    flowData,
    isLegacyMode,

    // Navigation
    nextStep,
    previousStep,
    goToStep,
    canGoNext: currentStep < steps.length - 1,
    canGoPrevious: currentStep > 0,

    // Data management
    updateFlowData,
    updateStepData,
    clearFlowData,

    // Validation
    validateCurrentStep,
    validateAllSteps,

    // Progress
    getProgress,
    getCompletedSteps,
    isStepCompleted,

    // Save state
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };

  return (
    <EstimateFlowContext.Provider value={value}>
      {children}
    </EstimateFlowContext.Provider>
  );
}

export function useEstimateFlow() {
  const context = useContext(EstimateFlowContext);
  if (!context) {
    throw new Error("useEstimateFlow must be used within EstimateFlowProvider");
  }
  return context;
}

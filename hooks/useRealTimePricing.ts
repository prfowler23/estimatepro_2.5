// React Hook for Real-time Pricing Integration
// Provides easy integration of live pricing updates and cross-step validation

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  RealTimePricingService,
  RealTimePricingResult,
  RealTimePricingConfig,
} from "@/lib/services/real-time-pricing-service";
import {
  CrossStepValidationService,
  CrossStepValidationResult,
  CrossStepValidationConfig,
} from "@/lib/services/cross-step-validation-service";

export interface UseRealTimePricingOptions {
  estimateId: string;
  enabled?: boolean;
  pricingConfig?: Partial<RealTimePricingConfig>;
  validationConfig?: Partial<CrossStepValidationConfig>;
  debounceMs?: number;
  onPricingUpdate?: (result: RealTimePricingResult) => void;
  onValidationUpdate?: (result: CrossStepValidationResult) => void;
  onError?: (error: Error) => void;
}

export interface UseRealTimePricingReturn {
  // Pricing state
  pricingResult: RealTimePricingResult | null;
  isPricingLoading: boolean;
  pricingError: Error | null;

  // Validation state
  validationResult: CrossStepValidationResult | null;
  isValidationLoading: boolean;
  validationError: Error | null;

  // Combined state
  isLoading: boolean;
  hasErrors: boolean;
  confidence: "high" | "medium" | "low";

  // Actions
  updatePricing: (
    flowData: GuidedFlowData,
    changedStep?: string,
    immediate?: boolean,
  ) => void;
  recalculate: (flowData: GuidedFlowData) => Promise<void>;

  // Service instances (for advanced usage)
  pricingService: RealTimePricingService;
  validationService: CrossStepValidationService;
}

export function useRealTimePricing({
  estimateId,
  enabled = true,
  pricingConfig,
  validationConfig,
  debounceMs = 1000,
  onPricingUpdate,
  onValidationUpdate,
  onError,
}: UseRealTimePricingOptions): UseRealTimePricingReturn {
  // State management
  const [pricingResult, setPricingResult] =
    useState<RealTimePricingResult | null>(null);
  const [validationResult, setValidationResult] =
    useState<CrossStepValidationResult | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [pricingError, setPricingError] = useState<Error | null>(null);
  const [validationError, setValidationError] = useState<Error | null>(null);

  // Service instances
  const pricingService = useRef(
    RealTimePricingService.getInstance(pricingConfig),
  );
  const validationService = useRef(
    CrossStepValidationService.getInstance(validationConfig),
  );

  // Debouncing
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<GuidedFlowData>({});

  // Initialize subscriptions
  useEffect(() => {
    if (!enabled || !estimateId) return;

    // Subscribe to pricing updates
    const pricingUnsubscribe = pricingService.current.subscribe(
      estimateId,
      (result) => {
        setPricingResult(result);
        setIsPricingLoading(false);
        setPricingError(null);
        onPricingUpdate?.(result);
      },
    );

    // Subscribe to validation updates
    const validationUnsubscribe = validationService.current.subscribe(
      estimateId,
      (result) => {
        setValidationResult(result);
        setIsValidationLoading(false);
        setValidationError(null);
        onValidationUpdate?.(result);
      },
    );

    return () => {
      pricingUnsubscribe();
      validationUnsubscribe();
    };
  }, [enabled, estimateId, onPricingUpdate, onValidationUpdate]);

  // Debounced update function
  const updatePricing = useCallback(
    (
      flowData: GuidedFlowData,
      changedStep?: string,
      immediate: boolean = false,
    ) => {
      if (!enabled || !estimateId) return;

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Check if data actually changed
      const currentDataString = JSON.stringify(flowData);
      const lastDataString = JSON.stringify(lastUpdateRef.current);

      if (currentDataString === lastDataString && !immediate) {
        return;
      }

      lastUpdateRef.current = flowData;

      const performUpdate = () => {
        try {
          setIsPricingLoading(true);
          setIsValidationLoading(true);

          // Update pricing
          pricingService.current.updatePricing(
            flowData,
            estimateId,
            changedStep,
          );

          // Update validation
          validationService.current.updateValidation(
            flowData,
            estimateId,
            changedStep,
          );
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error("Update failed");
          setPricingError(err);
          setValidationError(err);
          setIsPricingLoading(false);
          setIsValidationLoading(false);
          onError?.(err);
        }
      };

      if (immediate) {
        performUpdate();
      } else {
        updateTimeoutRef.current = setTimeout(performUpdate, debounceMs);
      }
    },
    [enabled, estimateId, debounceMs, onError],
  );

  // Manual recalculation
  const recalculate = useCallback(
    async (flowData: GuidedFlowData) => {
      if (!enabled || !estimateId) return;

      try {
        setIsPricingLoading(true);
        setIsValidationLoading(true);
        setPricingError(null);
        setValidationError(null);

        // Calculate pricing
        const pricingResult = pricingService.current.calculateRealTimePricing(
          flowData,
          estimateId,
        );
        setPricingResult(pricingResult);
        onPricingUpdate?.(pricingResult);

        // Validate cross-step data
        const validationResult =
          validationService.current.validateCrossStepData(flowData, estimateId);
        setValidationResult(validationResult);
        onValidationUpdate?.(validationResult);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Recalculation failed");
        setPricingError(err);
        setValidationError(err);
        onError?.(err);
      } finally {
        setIsPricingLoading(false);
        setIsValidationLoading(false);
      }
    },
    [enabled, estimateId, onPricingUpdate, onValidationUpdate, onError],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Derived state
  const isLoading = isPricingLoading || isValidationLoading;
  const hasErrors = pricingError !== null || validationError !== null;

  const confidence = useMemo(() => {
    if (!pricingResult && !validationResult) return "high";

    const pricingConfidence = pricingResult?.confidence || "high";
    const validationConfidence = validationResult?.confidence || "high";

    if (pricingConfidence === "low" || validationConfidence === "low")
      return "low";
    if (pricingConfidence === "medium" || validationConfidence === "medium")
      return "medium";
    return "high";
  }, [pricingResult, validationResult]);

  return {
    // Pricing state
    pricingResult,
    isPricingLoading,
    pricingError,

    // Validation state
    validationResult,
    isValidationLoading,
    validationError,

    // Combined state
    isLoading,
    hasErrors,
    confidence,

    // Actions
    updatePricing,
    recalculate,

    // Service instances
    pricingService: pricingService.current,
    validationService: validationService.current,
  };
}

// Specialized hook for guided flow integration
export function useGuidedFlowRealTimePricing(
  estimateId: string,
  options: Omit<UseRealTimePricingOptions, "estimateId"> = {},
) {
  const [currentData, setCurrentData] = useState<GuidedFlowData>({});
  const [currentStep, setCurrentStep] = useState<string>("");

  const realTimePricing = useRealTimePricing({
    estimateId,
    ...options,
  });

  // Auto-update when data or step changes (removed function dependency to prevent infinite loop)
  useEffect(() => {
    if (Object.keys(currentData).length > 0) {
      realTimePricing.updatePricing(currentData, currentStep);
    }
  }, [currentData, currentStep]);

  const updateFlowData = useCallback(
    (
      updater: GuidedFlowData | ((prevData: GuidedFlowData) => GuidedFlowData),
      immediate: boolean = false,
    ) => {
      setCurrentData((prevData) => {
        const newData =
          typeof updater === "function" ? updater(prevData) : updater;

        if (immediate) {
          realTimePricing.updatePricing(newData, currentStep, true);
        }

        return newData;
      });
    },
    [currentStep, realTimePricing.updatePricing],
  );

  const updateCurrentStep = useCallback(
    (step: string, immediate: boolean = false) => {
      setCurrentStep(step);

      if (immediate && Object.keys(currentData).length > 0) {
        realTimePricing.updatePricing(currentData, step, true);
      }
    },
    [currentData, realTimePricing.updatePricing],
  );

  return {
    ...realTimePricing,
    currentData,
    currentStep,
    updateFlowData,
    updateCurrentStep,

    // Convenience methods
    updateStepData: (
      stepData: Partial<GuidedFlowData>,
      immediate?: boolean,
    ) => {
      updateFlowData((prevData) => ({ ...prevData, ...stepData }), immediate);
    },

    recalculateForCurrentData: () => realTimePricing.recalculate(currentData),
  };
}

// Helper hook for step-specific updates
export function useStepPricingUpdates(
  stepId: string,
  realTimePricing: UseRealTimePricingReturn,
  flowData: GuidedFlowData,
) {
  const [hasStepErrors, setHasStepErrors] = useState(false);
  const [stepWarnings, setStepWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!realTimePricing.validationResult) return;

    const stepErrors = realTimePricing.validationResult.errors.filter(
      (error) => error.stepId === stepId,
    );

    const stepWarnings = realTimePricing.validationResult.warnings.filter(
      (warning) => warning.affectedSteps.includes(stepId),
    );

    setHasStepErrors(stepErrors.length > 0);
    setStepWarnings(stepWarnings.map((w) => w.message));
  }, [stepId, realTimePricing.validationResult]);

  const updateStepData = useCallback(
    (stepData: Partial<GuidedFlowData>, immediate: boolean = false) => {
      const updatedData = { ...flowData, ...stepData };
      realTimePricing.updatePricing(updatedData, stepId, immediate);
    },
    [stepId, flowData, realTimePricing.updatePricing],
  );

  const affectsOtherSteps = useMemo(() => {
    return realTimePricing.pricingService.doesStepAffectPricing(stepId);
  }, [stepId, realTimePricing.pricingService]);

  return {
    hasStepErrors,
    stepWarnings,
    updateStepData,
    affectsOtherSteps,

    // Step-specific pricing info
    stepContributions:
      realTimePricing.pricingResult?.serviceBreakdown.filter((service) =>
        service.dependencies?.includes(stepId),
      ) || [],
  };
}

export default useRealTimePricing;

/**
 * Cross-Step Validators
 * Individual validation methods for different aspects
 */

import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";
import {
  RealTimePricingService,
  RealTimePricingResult,
} from "../real-time-pricing-service";
import {
  CrossStepValidationResult,
  ValidationWarning,
  ValidationError,
  ValidationSuggestion,
} from "./validation-rules-engine";

export class CrossStepValidators {
  private pricingService: RealTimePricingService;

  constructor() {
    this.pricingService = RealTimePricingService.getInstance();
  }

  /**
   * Validate service area consistency across takeoff and area calculations
   */
  validateServiceAreaConsistency(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const selectedServices = data.scopeDetails?.selectedServices || [];
    const totalArea = data.areaOfWork?.measurements?.totalArea || 0;
    const takeoffMeasurements = data.takeoff?.measurements || {};

    for (const service of selectedServices) {
      const serviceArea = takeoffMeasurements[service]?.area || 0;

      if (serviceArea === 0 && totalArea > 0) {
        warnings.push({
          id: `missing-service-area-${service}`,
          type: "inconsistency",
          severity: "medium",
          message: `${service} service selected but no specific area measured`,
          affectedSteps: ["takeoff"],
          suggestedAction: `Measure specific area for ${service} service`,
          canAutoFix: true,
        });
      }

      if (serviceArea > totalArea * 1.1) {
        // Allow 10% variance
        errors.push({
          id: `area-exceeds-total-${service}`,
          type: "invalid",
          severity: "error",
          field: `takeoff.measurements.${service}.area`,
          stepId: "takeoff",
          message: `${service} area (${serviceArea} sq ft) exceeds total building area (${totalArea} sq ft)`,
          expectedValue: `≤ ${totalArea}`,
          currentValue: serviceArea,
          blocksProgression: true,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps: errors
        .filter((e) => e.blocksProgression)
        .map((e) => e.stepId),
      confidence: warnings.length > 0 ? "medium" : "high",
      lastValidated: new Date(),
    };
  }

  /**
   * Validate duration feasibility for selected services and area
   */
  validateDurationFeasibility(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const selectedServices = data.scopeDetails?.selectedServices || [];
    const totalArea = data.areaOfWork?.measurements?.totalArea || 0;
    const estimatedHours = data.duration?.timeline?.estimatedHours || 0;
    const crewSize = data.duration?.crew?.size || 2;

    if (estimatedHours === 0 && selectedServices.length > 0) {
      errors.push({
        id: "missing-duration",
        type: "required",
        severity: "error",
        field: "duration.timeline.estimatedHours",
        stepId: "duration",
        message: "Estimated duration is required when services are selected",
        blocksProgression: true,
      });
    }

    // Calculate rough estimates based on industry standards
    let expectedMinHours = 0;
    let expectedMaxHours = 0;

    for (const service of selectedServices) {
      const serviceArea =
        data.takeoff?.measurements?.[service]?.area || totalArea;

      // Rough industry estimates (hours per sq ft)
      const ratesPerSqFt = {
        WC: { min: 0.02, max: 0.05 }, // Window cleaning
        PW: { min: 0.01, max: 0.03 }, // Pressure washing
        SW: { min: 0.015, max: 0.035 }, // Soft washing
        BF: { min: 0.03, max: 0.06 }, // Biofilm removal
        GR: { min: 0.05, max: 0.1 }, // Glass restoration
      };

      const rate = ratesPerSqFt[service as keyof typeof ratesPerSqFt] || {
        min: 0.02,
        max: 0.05,
      };
      expectedMinHours += (serviceArea * rate.min) / crewSize;
      expectedMaxHours += (serviceArea * rate.max) / crewSize;
    }

    if (estimatedHours > 0) {
      if (estimatedHours < expectedMinHours * 0.8) {
        warnings.push({
          id: "duration-too-short",
          type: "optimization",
          severity: "medium",
          message: `Estimated duration (${estimatedHours}h) may be too short. Expected minimum: ${Math.ceil(expectedMinHours)}h`,
          affectedSteps: ["duration"],
          suggestedAction: "Consider increasing estimated duration",
          canAutoFix: true,
        });
      }

      if (estimatedHours > expectedMaxHours * 1.5) {
        warnings.push({
          id: "duration-too-long",
          type: "optimization",
          severity: "low",
          message: `Estimated duration (${estimatedHours}h) may be longer than necessary. Expected maximum: ${Math.ceil(expectedMaxHours)}h`,
          affectedSteps: ["duration", "pricing"],
          suggestedAction:
            "Review duration estimate for efficiency opportunities",
          canAutoFix: false,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps: errors
        .filter((e) => e.blocksProgression)
        .map((e) => e.stepId),
      confidence:
        warnings.length > 2 ? "low" : warnings.length > 0 ? "medium" : "high",
      lastValidated: new Date(),
    };
  }

  /**
   * Validate pricing consistency with service requirements and market rates
   */
  validatePricingConsistency(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Get real-time pricing calculation
    const pricingResult = this.pricingService.calculateRealTimePricing(data);
    const proposedPrice = data.pricing?.strategy?.totalPrice || 0;

    if (proposedPrice > 0 && pricingResult.totalCost > 0) {
      const variance =
        Math.abs(proposedPrice - pricingResult.totalCost) /
        pricingResult.totalCost;

      if (variance > 0.2) {
        // 20% variance threshold
        warnings.push({
          id: "pricing-variance",
          type: "inconsistency",
          severity: "medium",
          message: `Proposed price ($${proposedPrice.toLocaleString()}) differs significantly from calculated cost ($${pricingResult.totalCost.toLocaleString()})`,
          affectedSteps: ["pricing"],
          suggestedAction: "Review pricing strategy and calculations",
          canAutoFix: true,
        });

        suggestions.push({
          id: "align-pricing",
          type: "consistency",
          priority: "medium",
          message: "Consider aligning proposed price with calculated costs",
          targetStep: "pricing",
          targetField: "strategy.totalPrice",
          suggestedValue: Math.round(pricingResult.totalCost),
          reasoning: "Ensures pricing consistency with service calculations",
          potentialImpact: "Improves quote accuracy and profitability",
        });
      }
    }

    // Check for missing pricing components
    if (pricingResult.missingData.length > 0) {
      for (const missing of pricingResult.missingData) {
        warnings.push({
          id: `pricing-missing-${missing.replace(/\s+/g, "-").toLowerCase()}`,
          type: "dependency",
          severity: "medium",
          message: `Pricing calculation missing: ${missing}`,
          affectedSteps: ["pricing"],
          canAutoFix: false,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps: [],
      confidence: pricingResult.confidence === "high" ? "high" : "medium",
      lastValidated: new Date(),
    };
  }

  /**
   * Validate equipment choices match building access requirements
   */
  validateEquipmentAccess(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const height = data.areaOfWork?.buildingDetails?.height || 0;
    const accessType = data.takeoff?.equipment?.access || "ladder";
    const selectedServices = data.scopeDetails?.selectedServices || [];

    // Validate access method for building height
    if (height > 30 && accessType === "ladder") {
      errors.push({
        id: "inadequate-access",
        type: "invalid",
        severity: "error",
        field: "takeoff.equipment.access",
        stepId: "takeoff",
        message: `Ladder access inappropriate for ${height}ft building. Consider lift or scaffold.`,
        blocksProgression: true,
      });

      suggestions.push({
        id: "upgrade-access",
        type: "accuracy",
        priority: "high",
        message: "Upgrade to appropriate access equipment",
        targetStep: "takeoff",
        targetField: "equipment.access",
        suggestedValue: height > 50 ? "scaffold" : "lift",
        reasoning: "Safety requirements for high buildings",
        potentialImpact: "Ensures worker safety and project feasibility",
      });
    }

    // Check service-specific access requirements
    if (
      selectedServices.includes("WC") &&
      height > 20 &&
      accessType === "ladder"
    ) {
      warnings.push({
        id: "window-cleaning-access",
        type: "risk",
        severity: "high",
        message:
          "Window cleaning at height requires specialized access equipment",
        affectedSteps: ["takeoff", "duration", "expenses"],
        suggestedAction: "Consider lift or rope access for window cleaning",
        canAutoFix: true,
      });
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      blockedSteps: errors
        .filter((e) => e.blocksProgression)
        .map((e) => e.stepId),
      confidence: "high",
      lastValidated: new Date(),
    };
  }

  /**
   * Validate service order and dependencies are logical
   */
  validateServiceDependencies(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const selectedServices = data.scopeDetails?.selectedServices || [];
    const serviceTimelines = data.duration?.serviceTimelines || {};

    // Define service dependencies
    const dependencies = {
      GR: ["WC"], // Glass restoration should follow window cleaning
      FR: ["WC"], // Frame restoration should follow window cleaning
      PWS: ["PW"], // Pressure wash & seal requires pressure washing
    };

    for (const [service, deps] of Object.entries(dependencies)) {
      if (selectedServices.includes(service as ServiceType)) {
        for (const dep of deps) {
          if (!selectedServices.includes(dep as ServiceType)) {
            warnings.push({
              id: `missing-dependency-${service}-${dep}`,
              type: "dependency",
              severity: "medium",
              message: `${service} typically requires ${dep} service`,
              affectedSteps: ["scope-details"],
              suggestedAction: `Consider adding ${dep} service`,
              canAutoFix: true,
            });
          }
        }
      }
    }

    return {
      isValid: true,
      warnings,
      errors,
      suggestions,
      blockedSteps: [],
      confidence: "high",
      lastValidated: new Date(),
    };
  }

  /**
   * Compare estimated costs with customer budget expectations
   */
  validateBudgetFeasibility(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const customerBudget =
      data.initialContact?.aiExtractedData?.requirements?.budget;
    const estimatedCost =
      this.pricingService.calculateRealTimePricing(data).totalCost;

    if (customerBudget && estimatedCost > 0) {
      // Parse budget string (e.g., "$5,000-$10,000" or "$15,000")
      const budgetNumbers = customerBudget
        .match(/\d+(?:,\d{3})*/g)
        ?.map((n) => parseInt(n.replace(/,/g, "")));

      if (budgetNumbers && budgetNumbers.length > 0) {
        const maxBudget = budgetNumbers[budgetNumbers.length - 1];

        if (estimatedCost > maxBudget * 1.2) {
          // 20% over budget
          warnings.push({
            id: "over-budget",
            type: "risk",
            severity: "high",
            message: `Estimated cost ($${estimatedCost.toLocaleString()}) exceeds customer budget (~$${maxBudget.toLocaleString()})`,
            affectedSteps: ["pricing"],
            suggestedAction:
              "Consider cost reduction strategies or value justification",
            canAutoFix: false,
          });

          suggestions.push({
            id: "budget-optimization",
            type: "optimization",
            priority: "high",
            message: "Optimize services to meet budget constraints",
            targetStep: "scope-details",
            reasoning: "Align services with customer budget expectations",
            potentialImpact: "Increases likelihood of quote acceptance",
          });
        }
      }
    }

    return {
      isValid: true,
      warnings,
      errors,
      suggestions,
      blockedSteps: [],
      confidence: "medium",
      lastValidated: new Date(),
    };
  }

  /**
   * Validate timeline meets customer requirements and is realistic
   */
  validateTimelineConstraints(data: GuidedFlowData): CrossStepValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];

    const customerTimeline = data.initialContact?.aiExtractedData?.timeline;
    const estimatedHours = data.duration?.timeline?.estimatedHours || 0;
    const crewSize = data.duration?.crew?.size || 2;

    if (customerTimeline?.urgency === "urgent" && estimatedHours > 16) {
      warnings.push({
        id: "urgent-timeline-conflict",
        type: "risk",
        severity: "high",
        message:
          "Customer requires urgent completion but estimated duration is substantial",
        affectedSteps: ["duration"],
        suggestedAction:
          "Consider increasing crew size or adjusting timeline expectations",
        canAutoFix: true,
      });

      suggestions.push({
        id: "increase-crew",
        type: "efficiency",
        priority: "medium",
        message: "Increase crew size to meet urgent timeline",
        targetStep: "duration",
        targetField: "crew.size",
        suggestedValue: Math.ceil(crewSize * 1.5),
        reasoning: "Reduce project duration to meet customer urgency",
        potentialImpact: "Meets customer timeline requirements",
      });
    }

    return {
      isValid: true,
      warnings,
      errors,
      suggestions,
      blockedSteps: [],
      confidence: "high",
      lastValidated: new Date(),
    };
  }
}

// Cross-Step Validation Service
// Handles validation that spans multiple steps and updates when dependencies change

import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";
import {
  RealTimePricingService,
  RealTimePricingResult,
} from "./real-time-pricing-service";

export interface CrossStepValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  suggestions: ValidationSuggestion[];
  blockedSteps: string[];
  confidence: "high" | "medium" | "low";
  lastValidated: Date;
}

export interface ValidationWarning {
  id: string;
  type: "inconsistency" | "optimization" | "risk" | "dependency";
  severity: "low" | "medium" | "high";
  message: string;
  affectedSteps: string[];
  suggestedAction?: string;
  canAutoFix: boolean;
  autoFixAction?: () => void;
}

export interface ValidationError {
  id: string;
  type: "required" | "invalid" | "conflict" | "dependency";
  severity: "warning" | "error" | "critical";
  field: string;
  stepId: string;
  message: string;
  expectedValue?: any;
  currentValue?: any;
  blocksProgression: boolean;
}

export interface ValidationSuggestion {
  id: string;
  type: "optimization" | "consistency" | "efficiency" | "accuracy";
  priority: "low" | "medium" | "high";
  message: string;
  targetStep: string;
  targetField?: string;
  suggestedValue?: any;
  reasoning: string;
  potentialImpact: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  dependsOn: string[]; // step IDs
  validator: (data: GuidedFlowData) => CrossStepValidationResult;
  priority: "low" | "medium" | "high" | "critical";
  autoFix?: (data: GuidedFlowData) => Partial<GuidedFlowData>;
}

export interface CrossStepValidationConfig {
  enableRealTimeValidation: boolean;
  enableAutoFix: boolean;
  validationInterval: number; // milliseconds
  priorityThreshold: "low" | "medium" | "high" | "critical";
}

export class CrossStepValidationService {
  private static instance: CrossStepValidationService | null = null;
  private config: CrossStepValidationConfig;
  private validationRules: Map<string, ValidationRule>;
  private listeners: Map<
    string,
    ((result: CrossStepValidationResult) => void)[]
  >;
  private lastResults: Map<string, CrossStepValidationResult>;
  private validationTimers: Map<string, NodeJS.Timeout>;
  private pricingService: RealTimePricingService;

  private constructor(config: Partial<CrossStepValidationConfig> = {}) {
    this.config = {
      enableRealTimeValidation: true,
      enableAutoFix: false, // Conservative default
      validationInterval: 2000, // 2 seconds
      priorityThreshold: "medium",
      ...config,
    };

    this.validationRules = new Map();
    this.listeners = new Map();
    this.lastResults = new Map();
    this.validationTimers = new Map();
    this.pricingService = RealTimePricingService.getInstance();

    this.initializeValidationRules();
  }

  static getInstance(
    config?: Partial<CrossStepValidationConfig>,
  ): CrossStepValidationService {
    if (!CrossStepValidationService.instance) {
      CrossStepValidationService.instance = new CrossStepValidationService(
        config,
      );
    }
    return CrossStepValidationService.instance;
  }

  // Initialize all validation rules
  private initializeValidationRules(): void {
    const rules: ValidationRule[] = [
      // Service consistency validation
      {
        id: "service-area-consistency",
        name: "Service Area Consistency",
        description:
          "Ensures service areas are consistent across takeoff and area calculations",
        dependsOn: ["scope-details", "area-of-work", "takeoff"],
        priority: "high",
        validator: this.validateServiceAreaConsistency.bind(this),
        autoFix: this.autoFixServiceAreaConsistency.bind(this),
      },

      // Duration feasibility validation
      {
        id: "duration-feasibility",
        name: "Duration Feasibility",
        description:
          "Validates if estimated duration is realistic for selected services and area",
        dependsOn: ["scope-details", "area-of-work", "takeoff", "duration"],
        priority: "high",
        validator: this.validateDurationFeasibility.bind(this),
      },

      // Pricing consistency validation
      {
        id: "pricing-consistency",
        name: "Pricing Consistency",
        description:
          "Ensures pricing aligns with service requirements and market rates",
        dependsOn: [
          "scope-details",
          "area-of-work",
          "takeoff",
          "duration",
          "expenses",
          "pricing",
        ],
        priority: "medium",
        validator: this.validatePricingConsistency.bind(this),
      },

      // Equipment access validation
      {
        id: "equipment-access",
        name: "Equipment Access Validation",
        description:
          "Validates equipment choices match building access requirements",
        dependsOn: ["area-of-work", "takeoff", "duration", "expenses"],
        priority: "high",
        validator: this.validateEquipmentAccess.bind(this),
        autoFix: this.autoFixEquipmentAccess.bind(this),
      },

      // Service dependencies validation
      {
        id: "service-dependencies",
        name: "Service Dependencies",
        description: "Validates service order and dependencies are logical",
        dependsOn: ["scope-details", "duration"],
        priority: "medium",
        validator: this.validateServiceDependencies.bind(this),
      },

      // Budget feasibility validation
      {
        id: "budget-feasibility",
        name: "Budget Feasibility",
        description:
          "Compares estimated costs with customer budget expectations",
        dependsOn: ["initial-contact", "pricing"],
        priority: "medium",
        validator: this.validateBudgetFeasibility.bind(this),
      },

      // Timeline constraints validation
      {
        id: "timeline-constraints",
        name: "Timeline Constraints",
        description:
          "Validates timeline meets customer requirements and is realistic",
        dependsOn: ["initial-contact", "duration"],
        priority: "high",
        validator: this.validateTimelineConstraints.bind(this),
      },
    ];

    rules.forEach((rule) => {
      this.validationRules.set(rule.id, rule);
    });
  }

  // Subscribe to validation updates
  subscribe(
    estimateId: string,
    callback: (result: CrossStepValidationResult) => void,
  ): () => void {
    if (!this.listeners.has(estimateId)) {
      this.listeners.set(estimateId, []);
    }

    this.listeners.get(estimateId)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(estimateId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.listeners.delete(estimateId);
          this.clearValidationTimer(estimateId);
        }
      }
    };
  }

  // Validate all cross-step rules
  validateCrossStepData(
    flowData: GuidedFlowData,
    estimateId?: string,
    changedStep?: string,
  ): CrossStepValidationResult {
    const allWarnings: ValidationWarning[] = [];
    const allErrors: ValidationError[] = [];
    const allSuggestions: ValidationSuggestion[] = [];
    const blockedSteps: Set<string> = new Set();
    let overallConfidence: "high" | "medium" | "low" = "high";

    // Run applicable validation rules
    for (const rule of this.validationRules.values()) {
      // Skip rules that don't apply to the changed step (if specified)
      if (changedStep && !rule.dependsOn.includes(changedStep)) {
        continue;
      }

      // Check if rule should run based on priority threshold
      if (this.shouldSkipRule(rule)) {
        continue;
      }

      try {
        const ruleResult = rule.validator(flowData);

        allWarnings.push(...ruleResult.warnings);
        allErrors.push(...ruleResult.errors);
        allSuggestions.push(...ruleResult.suggestions);
        ruleResult.blockedSteps.forEach((step) => blockedSteps.add(step));

        // Update confidence
        if (ruleResult.confidence === "low") {
          overallConfidence = "low";
        } else if (
          ruleResult.confidence === "medium" &&
          overallConfidence === "high"
        ) {
          overallConfidence = "medium";
        }
      } catch (error) {
        console.error(`Validation rule ${rule.id} failed:`, error);
        allErrors.push({
          id: `rule-error-${rule.id}`,
          type: "invalid",
          severity: "warning",
          field: "validation",
          stepId: "system",
          message: `Validation rule "${rule.name}" encountered an error`,
          blocksProgression: false,
        });
      }
    }

    const result: CrossStepValidationResult = {
      isValid:
        allErrors.filter(
          (e) => e.severity === "error" || e.severity === "critical",
        ).length === 0,
      warnings: allWarnings.sort((a, b) =>
        this.compareSeverity(a.severity, b.severity),
      ),
      errors: allErrors.sort((a, b) =>
        this.compareSeverity(a.severity, b.severity),
      ),
      suggestions: allSuggestions.sort((a, b) =>
        this.comparePriority(a.priority, b.priority),
      ),
      blockedSteps: Array.from(blockedSteps),
      confidence: overallConfidence,
      lastValidated: new Date(),
    };

    // Cache result
    if (estimateId) {
      this.lastResults.set(estimateId, result);
    }

    return result;
  }

  // Update validation with debouncing
  updateValidation(
    flowData: GuidedFlowData,
    estimateId: string,
    changedStep?: string,
  ): void {
    if (!this.config.enableRealTimeValidation) {
      return;
    }

    // Clear existing timer
    this.clearValidationTimer(estimateId);

    // Set up debounced validation
    const timer = setTimeout(() => {
      const result = this.validateCrossStepData(
        flowData,
        estimateId,
        changedStep,
      );
      this.notifyListeners(estimateId, result);

      // Trigger auto-fix if enabled and there are fixable issues
      if (this.config.enableAutoFix && this.hasAutoFixableIssues(result)) {
        this.performAutoFix(flowData, result, estimateId);
      }
    }, this.config.validationInterval);

    this.validationTimers.set(estimateId, timer);
  }

  // Individual validation rules
  private validateServiceAreaConsistency(
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

  private validateDurationFeasibility(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  private validatePricingConsistency(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  private validateEquipmentAccess(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  private validateServiceDependencies(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  private validateBudgetFeasibility(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  private validateTimelineConstraints(
    data: GuidedFlowData,
  ): CrossStepValidationResult {
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

  // Auto-fix implementations
  private autoFixServiceAreaConsistency(
    data: GuidedFlowData,
  ): Partial<GuidedFlowData> {
    const fixes: Partial<GuidedFlowData> = {};
    const selectedServices = data.scopeDetails?.selectedServices || [];
    const totalArea = data.areaOfWork?.measurements?.totalArea || 0;

    if (totalArea > 0) {
      const takeoffMeasurements = { ...data.takeoff?.measurements } || {};

      for (const service of selectedServices) {
        if (!takeoffMeasurements[service]?.area && totalArea > 0) {
          // Auto-assign reasonable area based on service type
          const serviceAreaRatio = {
            WC: 0.8, // Window cleaning - most of building
            PW: 1.0, // Pressure washing - full building
            SW: 0.9, // Soft washing - most of building
            BF: 0.3, // Biofilm removal - specific areas
            GR: 0.2, // Glass restoration - specific damaged areas
          };

          const ratio =
            serviceAreaRatio[service as keyof typeof serviceAreaRatio] || 0.5;
          takeoffMeasurements[service] = {
            ...takeoffMeasurements[service],
            area: Math.round(totalArea * ratio),
          };
        }
      }

      fixes.takeoff = {
        ...data.takeoff,
        measurements: takeoffMeasurements,
      };
    }

    return fixes;
  }

  private autoFixEquipmentAccess(
    data: GuidedFlowData,
  ): Partial<GuidedFlowData> {
    const height = data.areaOfWork?.buildingDetails?.height || 0;
    let accessType = "ladder";

    if (height > 50) {
      accessType = "scaffold";
    } else if (height > 20) {
      accessType = "lift";
    }

    return {
      takeoff: {
        ...data.takeoff,
        equipment: {
          ...data.takeoff?.equipment,
          access: accessType,
        },
      },
    };
  }

  // Utility methods
  private shouldSkipRule(rule: ValidationRule): boolean {
    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const thresholdOrder = priorityOrder[this.config.priorityThreshold];
    const rulePriorityOrder = priorityOrder[rule.priority];

    return rulePriorityOrder < thresholdOrder;
  }

  private compareSeverity(a: string, b: string): number {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return (
      (order[b as keyof typeof order] || 0) -
      (order[a as keyof typeof order] || 0)
    );
  }

  private comparePriority(a: string, b: string): number {
    const order = { low: 0, medium: 1, high: 2 };
    return (
      (order[b as keyof typeof order] || 0) -
      (order[a as keyof typeof order] || 0)
    );
  }

  private notifyListeners(
    estimateId: string,
    result: CrossStepValidationResult,
  ): void {
    const listeners = this.listeners.get(estimateId);
    if (listeners) {
      listeners.forEach((callback) => callback(result));
    }
  }

  private clearValidationTimer(estimateId: string): void {
    const timer = this.validationTimers.get(estimateId);
    if (timer) {
      clearTimeout(timer);
      this.validationTimers.delete(estimateId);
    }
  }

  private hasAutoFixableIssues(result: CrossStepValidationResult): boolean {
    return result.warnings.some((w) => w.canAutoFix);
  }

  private performAutoFix(
    flowData: GuidedFlowData,
    validationResult: CrossStepValidationResult,
    estimateId: string,
  ): void {
    // This would trigger auto-fix actions
    // Implementation depends on how the consumer wants to handle data updates
    console.log(
      "Auto-fix triggered for",
      estimateId,
      validationResult.warnings.filter((w) => w.canAutoFix),
    );
  }

  // Public methods
  getLastResult(estimateId: string): CrossStepValidationResult | null {
    return this.lastResults.get(estimateId) || null;
  }

  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  enableRule(ruleId: string): void {
    // Implementation to enable/disable specific rules
  }

  disableRule(ruleId: string): void {
    // Implementation to enable/disable specific rules
  }

  cleanup(): void {
    for (const timer of this.validationTimers.values()) {
      clearTimeout(timer);
    }
    this.validationTimers.clear();
    this.listeners.clear();
    this.lastResults.clear();
  }
}

export default CrossStepValidationService;

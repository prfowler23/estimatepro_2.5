// Dependency Tracking Service
// Manages automatic recalculations when dependencies change

import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";
import { RealTimePricingService } from "./real-time-pricing-service";
import { CrossStepValidationService } from "./cross-step-validation-service";
import { CrossStepPopulationService } from "./cross-step-population-service";

export interface DependencyRule {
  id: string;
  sourceStep: string;
  sourceField: string;
  targetSteps: string[];
  type: "auto-populate" | "recalculate" | "validate" | "clear";
  priority: "low" | "medium" | "high" | "critical";
  condition?: (value: any, flowData: GuidedFlowData) => boolean;
  transformer?: (value: any, flowData: GuidedFlowData) => any;
}

export interface DependencyUpdate {
  sourceStep: string;
  sourceField: string;
  value: any;
  affectedSteps: string[];
  updateType: "auto-populate" | "recalculate" | "validate" | "clear";
  timestamp: Date;
}

export interface DependencyTrackingConfig {
  enableAutoPopulation: boolean;
  enableRecalculation: boolean;
  enableValidation: boolean;
  debounceMs: number;
  priorityThreshold: "low" | "medium" | "high" | "critical";
}

export class DependencyTrackingService {
  private static instance: DependencyTrackingService | null = null;
  private config: DependencyTrackingConfig;
  private dependencyRules: Map<string, DependencyRule[]>;
  private listeners: Map<string, ((update: DependencyUpdate) => void)[]>;
  private updateTimers: Map<string, NodeJS.Timeout>;
  private lastUpdates: Map<string, Map<string, any>>;
  private pricingService: RealTimePricingService;
  private validationService: CrossStepValidationService;

  private constructor(config: Partial<DependencyTrackingConfig> = {}) {
    this.config = {
      enableAutoPopulation: true,
      enableRecalculation: true,
      enableValidation: true,
      debounceMs: 1000,
      priorityThreshold: "medium",
      ...config,
    };

    this.dependencyRules = new Map();
    this.listeners = new Map();
    this.updateTimers = new Map();
    this.lastUpdates = new Map();
    this.pricingService = RealTimePricingService.getInstance();
    this.validationService = CrossStepValidationService.getInstance();

    this.initializeDependencyRules();
  }

  static getInstance(
    config?: Partial<DependencyTrackingConfig>,
  ): DependencyTrackingService {
    if (!DependencyTrackingService.instance) {
      DependencyTrackingService.instance = new DependencyTrackingService(
        config,
      );
    }
    return DependencyTrackingService.instance;
  }

  // Initialize dependency rules
  private initializeDependencyRules(): void {
    const rules: DependencyRule[] = [
      // Initial Contact → Auto-populate subsequent steps
      {
        id: "initial-contact-services-to-scope",
        sourceStep: "initial-contact",
        sourceField: "aiExtractedData.requirements.services",
        targetSteps: ["scope-details"],
        type: "auto-populate",
        priority: "high",
        condition: (services) => Array.isArray(services) && services.length > 0,
      },

      {
        id: "initial-contact-building-to-area",
        sourceStep: "initial-contact",
        sourceField: "aiExtractedData.requirements.buildingType",
        targetSteps: ["area-of-work"],
        type: "auto-populate",
        priority: "high",
      },

      // Scope Details → Update calculations
      {
        id: "scope-services-to-calculations",
        sourceStep: "scope-details",
        sourceField: "selectedServices",
        targetSteps: ["takeoff", "duration", "expenses", "pricing"],
        type: "recalculate",
        priority: "critical",
        condition: (services) => Array.isArray(services) && services.length > 0,
      },

      // Area of Work → Update all calculations
      {
        id: "area-measurements-to-calculations",
        sourceStep: "area-of-work",
        sourceField: "measurements.totalArea",
        targetSteps: ["takeoff", "duration", "expenses", "pricing"],
        type: "recalculate",
        priority: "critical",
        condition: (area) => typeof area === "number" && area > 0,
      },

      {
        id: "building-height-to-calculations",
        sourceStep: "area-of-work",
        sourceField: "buildingDetails.height",
        targetSteps: ["duration", "expenses", "pricing"],
        type: "recalculate",
        priority: "high",
        condition: (height) => typeof height === "number" && height > 0,
      },

      // Takeoff → Update duration and pricing
      {
        id: "takeoff-measurements-to-duration",
        sourceStep: "takeoff",
        sourceField: "measurements",
        targetSteps: ["duration", "expenses", "pricing"],
        type: "recalculate",
        priority: "high",
        condition: (measurements) =>
          measurements && Object.keys(measurements).length > 0,
      },

      // Duration → Update expenses and pricing
      {
        id: "duration-hours-to-expenses",
        sourceStep: "duration",
        sourceField: "timeline.estimatedHours",
        targetSteps: ["expenses", "pricing"],
        type: "recalculate",
        priority: "high",
        condition: (hours) => typeof hours === "number" && hours > 0,
      },

      {
        id: "crew-size-to-calculations",
        sourceStep: "duration",
        sourceField: "crew.size",
        targetSteps: ["expenses", "pricing"],
        type: "recalculate",
        priority: "medium",
        condition: (size) => typeof size === "number" && size > 0,
      },

      // Expenses → Update pricing
      {
        id: "expenses-breakdown-to-pricing",
        sourceStep: "expenses",
        sourceField: "breakdown",
        targetSteps: ["pricing"],
        type: "recalculate",
        priority: "high",
        condition: (breakdown) => breakdown && breakdown.totalCost > 0,
      },

      // Clear dependent data when source changes
      {
        id: "services-change-clear-takeoff",
        sourceStep: "scope-details",
        sourceField: "selectedServices",
        targetSteps: ["takeoff"],
        type: "clear",
        priority: "medium",
        condition: (services, flowData) => {
          // Clear takeoff if services have changed significantly
          const existingMeasurements = flowData.takeoff?.measurements || {};
          const existingServices = Object.keys(existingMeasurements);
          const newServices = services || [];

          return !this.arraysEqual(existingServices, newServices);
        },
      },

      // Validation triggers
      {
        id: "area-change-validate-consistency",
        sourceStep: "area-of-work",
        sourceField: "measurements.totalArea",
        targetSteps: ["takeoff", "duration"],
        type: "validate",
        priority: "medium",
      },

      {
        id: "duration-change-validate-feasibility",
        sourceStep: "duration",
        sourceField: "timeline.estimatedHours",
        targetSteps: ["expenses", "pricing"],
        type: "validate",
        priority: "medium",
      },
    ];

    // Group rules by source step
    rules.forEach((rule) => {
      const stepRules = this.dependencyRules.get(rule.sourceStep) || [];
      stepRules.push(rule);
      this.dependencyRules.set(rule.sourceStep, stepRules);
    });
  }

  // Subscribe to dependency updates
  subscribe(
    estimateId: string,
    callback: (update: DependencyUpdate) => void,
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
          this.clearUpdateTimer(estimateId);
        }
      }
    };
  }

  // Process data changes and trigger dependencies
  processDataChange(
    estimateId: string,
    stepId: string,
    fieldPath: string,
    newValue: any,
    flowData: GuidedFlowData,
    immediate: boolean = false,
  ): void {
    const rules = this.dependencyRules.get(stepId) || [];
    const applicableRules = rules.filter(
      (rule) =>
        this.doesFieldMatch(rule.sourceField, fieldPath) &&
        this.shouldApplyRule(rule) &&
        (!rule.condition || rule.condition(newValue, flowData)),
    );

    if (applicableRules.length === 0) {
      return;
    }

    // Check if value actually changed
    const lastUpdate = this.lastUpdates.get(estimateId);
    const lastValue = lastUpdate?.get(`${stepId}.${fieldPath}`);

    if (this.valuesEqual(lastValue, newValue) && !immediate) {
      return;
    }

    // Store the new value
    if (!lastUpdate) {
      this.lastUpdates.set(estimateId, new Map());
    }
    this.lastUpdates.get(estimateId)!.set(`${stepId}.${fieldPath}`, newValue);

    // Clear existing timer
    this.clearUpdateTimer(estimateId);

    const performUpdates = () => {
      // Group rules by type and priority
      const groupedRules = this.groupRulesByType(applicableRules);

      // Process in priority order
      const priorityOrder: Array<DependencyRule["type"]> = [
        "clear",
        "auto-populate",
        "recalculate",
        "validate",
      ];

      priorityOrder.forEach((type) => {
        const typeRules = groupedRules[type] || [];
        if (typeRules.length > 0) {
          this.processRulesOfType(
            type,
            typeRules,
            estimateId,
            stepId,
            fieldPath,
            newValue,
            flowData,
          );
        }
      });
    };

    if (immediate) {
      performUpdates();
    } else {
      const timer = setTimeout(performUpdates, this.config.debounceMs);
      this.updateTimers.set(estimateId, timer);
    }
  }

  // Process rules of a specific type
  private processRulesOfType(
    type: DependencyRule["type"],
    rules: DependencyRule[],
    estimateId: string,
    stepId: string,
    fieldPath: string,
    value: any,
    flowData: GuidedFlowData,
  ): void {
    const affectedSteps = new Set<string>();

    rules.forEach((rule) => {
      rule.targetSteps.forEach((targetStep) => affectedSteps.add(targetStep));
    });

    const update: DependencyUpdate = {
      sourceStep: stepId,
      sourceField: fieldPath,
      value,
      affectedSteps: Array.from(affectedSteps),
      updateType: type,
      timestamp: new Date(),
    };

    try {
      switch (type) {
        case "auto-populate":
          this.handleAutoPopulation(rules, flowData, estimateId);
          break;

        case "recalculate":
          this.handleRecalculation(rules, flowData, estimateId, stepId);
          break;

        case "validate":
          this.handleValidation(rules, flowData, estimateId, stepId);
          break;

        case "clear":
          this.handleClearOperation(rules, flowData, estimateId);
          break;
      }

      // Notify listeners
      this.notifyListeners(estimateId, update);
    } catch (error) {
      console.error(`Error processing ${type} dependencies:`, error);
    }
  }

  // Handle auto-population
  private async handleAutoPopulation(
    rules: DependencyRule[],
    flowData: GuidedFlowData,
    estimateId: string,
  ): Promise<void> {
    if (!this.config.enableAutoPopulation) return;

    try {
      const { updatedFlowData } =
        await CrossStepPopulationService.populateFromExtractedData(flowData, {
          enableServiceSuggestions: true,
          enableScopeGeneration: true,
          enableTimelineEstimation: true,
        });

      // Trigger pricing update with the populated data
      this.pricingService.updatePricing(updatedFlowData, estimateId);
    } catch (error) {
      console.error("Auto-population failed:", error);
    }
  }

  // Handle recalculation
  private handleRecalculation(
    rules: DependencyRule[],
    flowData: GuidedFlowData,
    estimateId: string,
    sourceStep: string,
  ): void {
    if (!this.config.enableRecalculation) return;

    // Trigger real-time pricing update
    this.pricingService.updatePricing(flowData, estimateId, sourceStep);
  }

  // Handle validation
  private handleValidation(
    rules: DependencyRule[],
    flowData: GuidedFlowData,
    estimateId: string,
    sourceStep: string,
  ): void {
    if (!this.config.enableValidation) return;

    // Trigger cross-step validation
    this.validationService.updateValidation(flowData, estimateId, sourceStep);
  }

  // Handle clear operations
  private handleClearOperation(
    rules: DependencyRule[],
    flowData: GuidedFlowData,
    estimateId: string,
  ): void {
    // This would clear dependent data
    // Implementation depends on specific requirements
    console.log(
      "Clear operation triggered for:",
      rules.map((r) => r.targetSteps).flat(),
    );
  }

  // Utility methods
  private doesFieldMatch(ruleField: string, changedField: string): boolean {
    // Exact match
    if (ruleField === changedField) return true;

    // Parent field match (e.g., "measurements" matches "measurements.totalArea")
    if (changedField.startsWith(ruleField + ".")) return true;

    // Child field match (e.g., "measurements.totalArea" matches "measurements")
    if (ruleField.startsWith(changedField + ".")) return true;

    return false;
  }

  private shouldApplyRule(rule: DependencyRule): boolean {
    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const thresholdOrder = priorityOrder[this.config.priorityThreshold];
    const rulePriorityOrder = priorityOrder[rule.priority];

    return rulePriorityOrder >= thresholdOrder;
  }

  private groupRulesByType(
    rules: DependencyRule[],
  ): Record<string, DependencyRule[]> {
    return rules.reduce(
      (acc, rule) => {
        if (!acc[rule.type]) acc[rule.type] = [];
        acc[rule.type].push(rule);
        return acc;
      },
      {} as Record<string, DependencyRule[]>,
    );
  }

  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;

    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => b[index] === val);
  }

  private notifyListeners(estimateId: string, update: DependencyUpdate): void {
    const listeners = this.listeners.get(estimateId);
    if (listeners) {
      listeners.forEach((callback) => callback(update));
    }
  }

  private clearUpdateTimer(estimateId: string): void {
    const timer = this.updateTimers.get(estimateId);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(estimateId);
    }
  }

  // Public API methods
  getDependencyRules(): DependencyRule[] {
    const allRules: DependencyRule[] = [];
    for (const rules of this.dependencyRules.values()) {
      allRules.push(...rules);
    }
    return allRules;
  }

  addDependencyRule(rule: DependencyRule): void {
    const stepRules = this.dependencyRules.get(rule.sourceStep) || [];
    stepRules.push(rule);
    this.dependencyRules.set(rule.sourceStep, stepRules);
  }

  removeDependencyRule(ruleId: string): void {
    for (const [stepId, rules] of this.dependencyRules.entries()) {
      const updatedRules = rules.filter((rule) => rule.id !== ruleId);
      if (updatedRules.length !== rules.length) {
        this.dependencyRules.set(stepId, updatedRules);
        return;
      }
    }
  }

  getAffectedSteps(sourceStep: string, fieldPath?: string): string[] {
    const rules = this.dependencyRules.get(sourceStep) || [];
    const affectedSteps = new Set<string>();

    rules.forEach((rule) => {
      if (!fieldPath || this.doesFieldMatch(rule.sourceField, fieldPath)) {
        rule.targetSteps.forEach((step) => affectedSteps.add(step));
      }
    });

    return Array.from(affectedSteps);
  }

  // Cleanup
  cleanup(): void {
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();
    this.listeners.clear();
    this.lastUpdates.clear();
  }
}

export default DependencyTrackingService;

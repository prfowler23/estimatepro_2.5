/**
 * Validation Rules Engine
 * Rule definitions, initialization, and execution logic
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";

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

export class ValidationRulesEngine {
  private static validationRules = new Map<string, ValidationRule>();

  /**
   * Initialize all validation rules
   */
  static initializeValidationRules(
    crossStepValidators: any,
    autoFixEngine: any,
  ): void {
    const rules: ValidationRule[] = [
      // Service consistency validation
      {
        id: "service-area-consistency",
        name: "Service Area Consistency",
        description:
          "Ensures service areas are consistent across takeoff and area calculations",
        dependsOn: ["scope-details", "area-of-work", "takeoff"],
        priority: "high",
        validator:
          crossStepValidators.validateServiceAreaConsistency.bind(
            crossStepValidators,
          ),
        autoFix:
          autoFixEngine.autoFixServiceAreaConsistency.bind(autoFixEngine),
      },

      // Duration feasibility validation
      {
        id: "duration-feasibility",
        name: "Duration Feasibility",
        description:
          "Validates if estimated duration is realistic for selected services and area",
        dependsOn: ["scope-details", "area-of-work", "takeoff", "duration"],
        priority: "high",
        validator:
          crossStepValidators.validateDurationFeasibility.bind(
            crossStepValidators,
          ),
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
        validator:
          crossStepValidators.validatePricingConsistency.bind(
            crossStepValidators,
          ),
      },

      // Equipment access validation
      {
        id: "equipment-access",
        name: "Equipment Access Validation",
        description:
          "Validates equipment choices match building access requirements",
        dependsOn: ["area-of-work", "takeoff", "duration", "expenses"],
        priority: "high",
        validator:
          crossStepValidators.validateEquipmentAccess.bind(crossStepValidators),
        autoFix: autoFixEngine.autoFixEquipmentAccess.bind(autoFixEngine),
      },

      // Service dependencies validation
      {
        id: "service-dependencies",
        name: "Service Dependencies",
        description: "Validates service order and dependencies are logical",
        dependsOn: ["scope-details", "duration"],
        priority: "medium",
        validator:
          crossStepValidators.validateServiceDependencies.bind(
            crossStepValidators,
          ),
      },

      // Budget feasibility validation
      {
        id: "budget-feasibility",
        name: "Budget Feasibility",
        description:
          "Compares estimated costs with customer budget expectations",
        dependsOn: ["initial-contact", "pricing"],
        priority: "medium",
        validator:
          crossStepValidators.validateBudgetFeasibility.bind(
            crossStepValidators,
          ),
      },

      // Timeline constraints validation
      {
        id: "timeline-constraints",
        name: "Timeline Constraints",
        description:
          "Validates timeline meets customer requirements and is realistic",
        dependsOn: ["initial-contact", "duration"],
        priority: "high",
        validator:
          crossStepValidators.validateTimelineConstraints.bind(
            crossStepValidators,
          ),
      },
    ];

    rules.forEach((rule) => {
      this.validationRules.set(rule.id, rule);
    });
  }

  /**
   * Get all validation rules
   */
  static getValidationRules(): Map<string, ValidationRule> {
    return this.validationRules;
  }

  /**
   * Get validation rules as array
   */
  static getValidationRulesArray(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  /**
   * Get specific validation rule
   */
  static getValidationRule(ruleId: string): ValidationRule | undefined {
    return this.validationRules.get(ruleId);
  }

  /**
   * Validate all cross-step rules
   */
  static validateCrossStepData(
    flowData: GuidedFlowData,
    config: CrossStepValidationConfig,
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
      if (this.shouldSkipRule(rule, config)) {
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

    return result;
  }

  /**
   * Check if rule should be skipped based on priority threshold
   */
  private static shouldSkipRule(
    rule: ValidationRule,
    config: CrossStepValidationConfig,
  ): boolean {
    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const thresholdOrder = priorityOrder[config.priorityThreshold];
    const rulePriorityOrder = priorityOrder[rule.priority];

    return rulePriorityOrder < thresholdOrder;
  }

  /**
   * Compare severity levels for sorting
   */
  private static compareSeverity(a: string, b: string): number {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return (
      (order[b as keyof typeof order] || 0) -
      (order[a as keyof typeof order] || 0)
    );
  }

  /**
   * Compare priority levels for sorting
   */
  private static comparePriority(a: string, b: string): number {
    const order = { low: 0, medium: 1, high: 2 };
    return (
      (order[b as keyof typeof order] || 0) -
      (order[a as keyof typeof order] || 0)
    );
  }

  /**
   * Enable specific validation rule
   */
  static enableRule(ruleId: string): void {
    // Implementation to enable/disable specific rules
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      // Could add enabled/disabled flag to rule interface
      console.log(`Enabled validation rule: ${ruleId}`);
    }
  }

  /**
   * Disable specific validation rule
   */
  static disableRule(ruleId: string): void {
    // Implementation to enable/disable specific rules
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      // Could add enabled/disabled flag to rule interface
      console.log(`Disabled validation rule: ${ruleId}`);
    }
  }

  /**
   * Check if there are auto-fixable issues in result
   */
  static hasAutoFixableIssues(result: CrossStepValidationResult): boolean {
    return result.warnings.some((w) => w.canAutoFix);
  }
}

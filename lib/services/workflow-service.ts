// Workflow service layer for guided estimation flows

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import {
  isNotNull,
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";
import { invalidateCache } from "@/lib/utils/cache";
import {
  GuidedFlowData,
  ServiceType,
  AIExtractedData,
  ServiceDependency,
  WorkArea,
  TakeoffData,
  Measurement,
  WeatherAnalysis,
  PricingCalculation,
  FinalEstimate,
} from "@/lib/types/estimate-types";

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  data?: any;
  validationRules?: ValidationRule[];
  conditionalRules?: ConditionalRule[];
  estimatedDuration?: number; // Minutes
  category?: "data-collection" | "analysis" | "calculation" | "review";
  dependencies?: string[]; // Step IDs this step depends on
  allowParallel?: boolean; // Can be worked on while other steps are incomplete
}

export interface ValidationRule {
  field: string;
  type: "required" | "minLength" | "maxLength" | "pattern" | "custom";
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ConditionalRule {
  id: string;
  condition: ConditionExpression;
  action: ConditionalAction;
  priority: number; // Higher numbers execute first
}

export interface ConditionExpression {
  type:
    | "service-selected"
    | "service-not-selected"
    | "field-value"
    | "step-completed"
    | "composite";
  field?: string;
  value?: any;
  operator?:
    | "equals"
    | "not-equals"
    | "contains"
    | "greater-than"
    | "less-than"
    | "in"
    | "not-in";
  conditions?: ConditionExpression[]; // For composite conditions
  logic?: "and" | "or"; // For composite conditions
}

export interface ConditionalAction {
  type:
    | "skip-step"
    | "require-step"
    | "auto-populate"
    | "show-warning"
    | "redirect-to-step";
  targetStep?: string;
  data?: any;
  message?: string;
}

export interface StepNavigationResult {
  canNavigate: boolean;
  nextStep?: WorkflowStep;
  skipReason?: string;
  requiredActions?: ConditionalAction[];
  warnings?: string[];
}

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  availableSteps: string[];
  completionPercentage: number;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  canProceed: boolean;
}

export class WorkflowService {
  private static readonly WORKFLOW_STEPS: WorkflowStep[] = [
    {
      id: "initial-contact",
      title: "Initial Contact",
      description: "Capture initial customer contact and project information",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 10,
      category: "data-collection",
      allowParallel: false,
      validationRules: [
        {
          field: "contactMethod",
          type: "required",
          message: "Contact method is required",
        },
        {
          field: "contactDate",
          type: "required",
          message: "Contact date is required",
        },
      ],
    },
    {
      id: "scope-details",
      title: "Scope Details",
      description: "Define project scope and select services",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 15,
      category: "data-collection",
      allowParallel: false,
      dependencies: ["initial-contact"],
      validationRules: [
        {
          field: "selectedServices",
          type: "required",
          message: "At least one service must be selected",
        },
        {
          field: "selectedServices",
          type: "custom",
          message: "Selected services must be valid",
          validator: (value: string[]) =>
            Array.isArray(value) && value.length > 0,
        },
      ],
      conditionalRules: [
        {
          id: "skip-files-for-simple-services",
          condition: {
            type: "composite",
            conditions: [
              {
                type: "service-selected",
                value: "window-cleaning",
                operator: "equals",
              },
              {
                type: "service-not-selected",
                value: "glass-restoration",
                operator: "equals",
              },
              {
                type: "service-not-selected",
                value: "frame-restoration",
                operator: "equals",
              },
            ],
            logic: "and",
          },
          action: {
            type: "show-warning",
            message: "Consider uploading photos for more accurate estimates",
          },
          priority: 1,
        },
      ],
    },
    {
      id: "files-photos",
      title: "Files & Photos",
      description: "Upload project files and photos for analysis",
      isRequired: false,
      isCompleted: false,
      estimatedDuration: 20,
      category: "data-collection",
      allowParallel: true,
      dependencies: ["scope-details"],
      validationRules: [],
      conditionalRules: [
        {
          id: "require-photos-for-restoration",
          condition: {
            type: "composite",
            conditions: [
              {
                type: "service-selected",
                value: "glass-restoration",
                operator: "equals",
              },
              {
                type: "service-selected",
                value: "frame-restoration",
                operator: "equals",
              },
            ],
            logic: "or",
          },
          action: {
            type: "require-step",
            message:
              "Photos are required for restoration services to assess damage",
          },
          priority: 10,
        },
      ],
    },
    {
      id: "area-of-work",
      title: "Area of Work",
      description: "Define work areas and measurements",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 25,
      category: "data-collection",
      allowParallel: true,
      dependencies: ["scope-details"],
      validationRules: [
        {
          field: "workAreas",
          type: "required",
          message: "At least one work area is required",
        },
      ],
    },
    {
      id: "takeoff",
      title: "Takeoff",
      description: "Detailed measurements and quantity takeoffs",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 30,
      category: "data-collection",
      allowParallel: false,
      dependencies: ["area-of-work"],
      validationRules: [
        {
          field: "takeoffData",
          type: "required",
          message: "Takeoff data is required",
        },
      ],
      conditionalRules: [
        {
          id: "simplified-takeoff-for-basic-services",
          condition: {
            type: "composite",
            conditions: [
              {
                type: "service-selected",
                value: "window-cleaning",
                operator: "equals",
              },
              {
                type: "service-not-selected",
                value: "pressure-washing",
                operator: "equals",
              },
            ],
            logic: "and",
          },
          action: {
            type: "auto-populate",
            data: { simplified: true },
            message: "Using simplified takeoff for basic window cleaning",
          },
          priority: 5,
        },
      ],
    },
    {
      id: "duration",
      title: "Duration",
      description: "Estimate project duration and timeline",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 15,
      category: "calculation",
      allowParallel: true,
      dependencies: ["takeoff"],
      validationRules: [
        {
          field: "estimatedDuration",
          type: "required",
          message: "Estimated duration is required",
        },
        {
          field: "estimatedDuration",
          type: "custom",
          message: "Duration must be greater than 0",
          validator: (value: number) => safeNumber(value) > 0,
        },
      ],
    },
    {
      id: "expenses",
      title: "Expenses",
      description: "Calculate equipment and material costs",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 20,
      category: "calculation",
      allowParallel: true,
      dependencies: ["takeoff", "duration"],
      validationRules: [
        {
          field: "equipmentCosts",
          type: "required",
          message: "Equipment costs are required",
        },
        {
          field: "materialCosts",
          type: "required",
          message: "Material costs are required",
        },
      ],
    },
    {
      id: "pricing",
      title: "Pricing",
      description: "Calculate final pricing and apply adjustments",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 15,
      category: "calculation",
      allowParallel: false,
      dependencies: ["expenses"],
      validationRules: [
        {
          field: "pricingCalculations",
          type: "required",
          message: "Pricing calculations are required",
        },
      ],
    },
    {
      id: "summary",
      title: "Summary",
      description: "Review and finalize estimate",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 10,
      category: "review",
      allowParallel: false,
      dependencies: ["pricing"],
      validationRules: [
        {
          field: "finalEstimate",
          type: "required",
          message: "Final estimate is required",
        },
      ],
    },
  ];

  // Workflow management methods
  static getWorkflowSteps(): WorkflowStep[] {
    return [...this.WORKFLOW_STEPS];
  }

  static getStepById(stepId: string): WorkflowStep | null {
    return this.WORKFLOW_STEPS.find((step) => step.id === stepId) || null;
  }

  static getStepByIndex(index: number): WorkflowStep | null {
    return this.WORKFLOW_STEPS[index] || null;
  }

  static getStepIndex(stepId: string): number {
    return this.WORKFLOW_STEPS.findIndex((step) => step.id === stepId);
  }

  static getNextStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex >= 0 && currentIndex < this.WORKFLOW_STEPS.length - 1
      ? this.WORKFLOW_STEPS[currentIndex + 1]
      : null;
  }

  static getPreviousStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex > 0 ? this.WORKFLOW_STEPS[currentIndex - 1] : null;
  }

  static calculateProgress(guidedFlowData: GuidedFlowData): WorkflowProgress {
    const totalSteps = this.WORKFLOW_STEPS.length;
    const completedSteps: string[] = [];
    const availableSteps: string[] = [];

    // Ensure guidedFlowData is not null/undefined
    const safeFlowData = guidedFlowData || {};

    // Check which steps are completed
    this.WORKFLOW_STEPS.forEach((step) => {
      const stepData = safeFlowData[step.id as keyof GuidedFlowData];
      const isCompleted = this.isStepCompleted(step.id, stepData);

      if (isCompleted) {
        completedSteps.push(step.id);
      }

      // Step is available if it's not required to be sequential or previous steps are completed
      const isAvailable = this.isStepAvailable(step.id, safeFlowData);
      if (isAvailable) {
        availableSteps.push(step.id);
      }
    });

    const completionPercentage = (completedSteps.length / totalSteps) * 100;
    const currentStep = completedSteps.length + 1;

    return {
      currentStep: Math.min(currentStep, totalSteps),
      totalSteps,
      completedSteps,
      availableSteps,
      completionPercentage,
    };
  }

  // Step validation methods
  static validateStep(stepId: string, data: any): WorkflowValidationResult {
    const step = this.getStepById(stepId);
    if (!step) {
      return {
        isValid: false,
        errors: { general: ["Invalid step ID"] },
        warnings: {},
        canProceed: false,
      };
    }

    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Run validation rules
    step.validationRules?.forEach((rule) => {
      const fieldValue = data?.[rule.field];
      const fieldErrors: string[] = [];

      switch (rule.type) {
        case "required":
          if (
            !fieldValue ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          ) {
            fieldErrors.push(rule.message);
          }
          break;

        case "minLength":
          if (safeString(fieldValue).length < (rule.value || 0)) {
            fieldErrors.push(rule.message);
          }
          break;

        case "maxLength":
          if (safeString(fieldValue).length > (rule.value || 0)) {
            fieldErrors.push(rule.message);
          }
          break;

        case "pattern":
          if (
            rule.value &&
            !new RegExp(rule.value).test(safeString(fieldValue))
          ) {
            fieldErrors.push(rule.message);
          }
          break;

        case "custom":
          if (rule.validator && !rule.validator(fieldValue)) {
            fieldErrors.push(rule.message);
          }
          break;
      }

      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors;
      }
    });

    // Step-specific validation
    const stepValidation = this.validateStepData(stepId, data);
    Object.keys(stepValidation.errors).forEach((field) => {
      errors[field] = [
        ...(errors[field] || []),
        ...stepValidation.errors[field],
      ];
    });
    Object.keys(stepValidation.warnings).forEach((field) => {
      warnings[field] = [
        ...(warnings[field] || []),
        ...stepValidation.warnings[field],
      ];
    });

    const isValid = Object.keys(errors).length === 0;
    const canProceed = isValid || !step.isRequired;

    return {
      isValid,
      errors,
      warnings,
      canProceed,
    };
  }

  static validateEntireWorkflow(
    guidedFlowData: GuidedFlowData,
  ): WorkflowValidationResult {
    const allErrors: Record<string, string[]> = {};
    const allWarnings: Record<string, string[]> = {};

    // Ensure guidedFlowData is not null/undefined
    const safeFlowData = guidedFlowData || {};

    // Validate each step
    this.WORKFLOW_STEPS.forEach((step) => {
      const stepData = safeFlowData[step.id as keyof GuidedFlowData];
      const stepValidation = this.validateStep(step.id, stepData);

      Object.keys(stepValidation.errors).forEach((field) => {
        const key = `${step.id}.${field}`;
        allErrors[key] = stepValidation.errors[field];
      });

      Object.keys(stepValidation.warnings).forEach((field) => {
        const key = `${step.id}.${field}`;
        allWarnings[key] = stepValidation.warnings[field];
      });
    });

    // Cross-step validation
    const crossValidation = this.validateCrossStepDependencies(safeFlowData);
    Object.keys(crossValidation.errors).forEach((field) => {
      allErrors[field] = crossValidation.errors[field];
    });
    Object.keys(crossValidation.warnings).forEach((field) => {
      allWarnings[field] = crossValidation.warnings[field];
    });

    const isValid = Object.keys(allErrors).length === 0;
    const canProceed = isValid;

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      canProceed,
    };
  }

  // Smart navigation and conditional routing methods
  static evaluateCondition(
    condition: ConditionExpression,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    const safeFlowData = guidedFlowData || {};

    switch (condition.type) {
      case "service-selected":
        const selectedServices =
          safeFlowData.scopeDetails?.selectedServices || [];
        return selectedServices.includes(condition.value);

      case "service-not-selected":
        const services = safeFlowData.scopeDetails?.selectedServices || [];
        return !services.includes(condition.value);

      case "field-value":
        const fieldValue = this.getFieldValue(
          safeFlowData,
          condition.field || "",
        );
        return this.evaluateFieldCondition(
          fieldValue,
          condition.operator || "equals",
          condition.value,
        );

      case "step-completed":
        const stepData = safeFlowData[condition.value as keyof GuidedFlowData];
        return this.isStepCompleted(condition.value, stepData);

      case "composite":
        if (!condition.conditions) return false;
        const results = condition.conditions.map((c) =>
          this.evaluateCondition(c, safeFlowData),
        );
        return condition.logic === "and"
          ? results.every((r) => r)
          : results.some((r) => r);

      default:
        return false;
    }
  }

  static evaluateFieldCondition(
    fieldValue: any,
    operator: string,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === expectedValue;
      case "not-equals":
        return fieldValue !== expectedValue;
      case "contains":
        return Array.isArray(fieldValue)
          ? fieldValue.includes(expectedValue)
          : String(fieldValue).includes(expectedValue);
      case "greater-than":
        return safeNumber(fieldValue) > safeNumber(expectedValue);
      case "less-than":
        return safeNumber(fieldValue) < safeNumber(expectedValue);
      case "in":
        return Array.isArray(expectedValue)
          ? expectedValue.includes(fieldValue)
          : false;
      case "not-in":
        return Array.isArray(expectedValue)
          ? !expectedValue.includes(fieldValue)
          : true;
      default:
        return false;
    }
  }

  static getFieldValue(guidedFlowData: GuidedFlowData, fieldPath: string): any {
    const parts = fieldPath.split(".");
    let value: any = guidedFlowData;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    return value;
  }

  static getSmartNextStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): StepNavigationResult {
    const currentStep = this.getStepById(currentStepId);
    if (!currentStep) {
      return {
        canNavigate: false,
        warnings: ["Invalid current step"],
      };
    }

    const currentIndex = this.getStepIndex(currentStepId);
    let nextIndex = currentIndex + 1;
    let requiredActions: ConditionalAction[] = [];
    let warnings: string[] = [];

    // Process conditional rules for current step
    if (currentStep.conditionalRules) {
      const applicableRules = currentStep.conditionalRules
        .filter((rule) =>
          this.evaluateCondition(rule.condition, guidedFlowData),
        )
        .sort((a, b) => b.priority - a.priority);

      for (const rule of applicableRules) {
        if (rule.action.type === "redirect-to-step" && rule.action.targetStep) {
          nextIndex = this.getStepIndex(rule.action.targetStep);
        } else if (rule.action.type === "show-warning" && rule.action.message) {
          warnings.push(rule.action.message);
        }
        requiredActions.push(rule.action);
      }
    }

    // Find next available step considering dependencies and conditional rules
    while (nextIndex < this.WORKFLOW_STEPS.length) {
      const nextStep = this.WORKFLOW_STEPS[nextIndex];

      // Check if step should be skipped
      const shouldSkip = this.shouldSkipStep(nextStep.id, guidedFlowData);
      if (shouldSkip.skip) {
        nextIndex++;
        if (shouldSkip.reason) warnings.push(shouldSkip.reason);
        continue;
      }

      // Check dependencies
      if (nextStep.dependencies) {
        const unmetDependencies = nextStep.dependencies.filter((depId) => {
          const depData = guidedFlowData[depId as keyof GuidedFlowData];
          return !this.isStepCompleted(depId, depData);
        });

        if (unmetDependencies.length > 0) {
          // If dependencies not met and step doesn't allow parallel work, suggest completing dependencies first
          if (!nextStep.allowParallel) {
            const nextAvailableStep = this.findNextAvailableStep(
              currentStepId,
              guidedFlowData,
            );
            return {
              canNavigate: nextAvailableStep !== null,
              nextStep: nextAvailableStep || undefined,
              warnings: [
                `Complete ${unmetDependencies.join(", ")} before proceeding to ${nextStep.title}`,
              ],
            };
          }
        }
      }

      return {
        canNavigate: true,
        nextStep: nextStep,
        requiredActions,
        warnings,
      };
    }

    // No more steps available
    return {
      canNavigate: false,
      warnings: ["Workflow completed"],
    };
  }

  static shouldSkipStep(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): { skip: boolean; reason?: string } {
    const step = this.getStepById(stepId);
    if (!step?.conditionalRules) return { skip: false };

    for (const rule of step.conditionalRules) {
      if (this.evaluateCondition(rule.condition, guidedFlowData)) {
        if (rule.action.type === "skip-step") {
          return {
            skip: true,
            reason:
              rule.action.message ||
              `Skipping ${step.title} based on current selections`,
          };
        }
      }
    }

    return { skip: false };
  }

  static findNextAvailableStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);

    for (let i = currentIndex + 1; i < this.WORKFLOW_STEPS.length; i++) {
      const step = this.WORKFLOW_STEPS[i];

      // Skip if step should be skipped
      if (this.shouldSkipStep(step.id, guidedFlowData).skip) {
        continue;
      }

      // Check if step can be worked on (either no dependencies or allows parallel work)
      if (!step.dependencies || step.allowParallel) {
        return step;
      }

      // Check if all dependencies are met
      const unmetDependencies = step.dependencies.filter((depId) => {
        const depData = guidedFlowData[depId as keyof GuidedFlowData];
        return !this.isStepCompleted(depId, depData);
      });

      if (unmetDependencies.length === 0) {
        return step;
      }
    }

    return null;
  }

  static getAvailableSteps(guidedFlowData: GuidedFlowData): WorkflowStep[] {
    // PHASE 1 FIX: Enable free navigation - return all steps as available
    // Users should be able to navigate freely between steps
    return [...this.WORKFLOW_STEPS];
  }

  // New method to get step navigation warnings instead of blocking
  static getStepNavigationInfo(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): {
    canNavigate: boolean;
    warnings: string[];
    isCompleted: boolean;
    hasRequiredData: boolean;
  } {
    const safeFlowData = guidedFlowData || {};
    const step = this.getStepById(stepId);

    if (!step) {
      return {
        canNavigate: false,
        warnings: ["Invalid step"],
        isCompleted: false,
        hasRequiredData: false,
      };
    }

    const stepData = safeFlowData[step.id as keyof GuidedFlowData];
    const isCompleted = this.isStepCompleted(step.id, stepData);
    const warnings: string[] = [];

    // Check if step should be skipped
    const skipResult = this.shouldSkipStep(step.id, safeFlowData);
    if (skipResult.skip && skipResult.reason) {
      warnings.push(skipResult.reason);
    }

    // Check dependencies and add warnings instead of blocking
    if (step.dependencies) {
      const unmetDependencies = step.dependencies.filter((depId) => {
        const depData = safeFlowData[depId as keyof GuidedFlowData];
        return !this.isStepCompleted(depId, depData);
      });

      if (unmetDependencies.length > 0) {
        const depNames = unmetDependencies
          .map((depId) => this.getStepById(depId)?.title || depId)
          .join(", ");
        warnings.push(
          `Recommended: Complete ${depNames} first for optimal workflow`,
        );
      }
    }

    // Check if step has required data
    const hasRequiredData = isCompleted || !step.isRequired;

    return {
      canNavigate: true, // Always allow navigation in Phase 1
      warnings,
      isCompleted,
      hasRequiredData,
    };
  }

  static calculateEstimatedTimeRemaining(
    guidedFlowData: GuidedFlowData,
  ): number {
    const availableSteps = this.getAvailableSteps(guidedFlowData);
    return availableSteps.reduce(
      (total, step) => total + (step.estimatedDuration || 0),
      0,
    );
  }

  static getStepsByCategory(category: string): WorkflowStep[] {
    return this.WORKFLOW_STEPS.filter((step) => step.category === category);
  }

  static applyConditionalActions(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): ConditionalAction[] {
    const step = this.getStepById(stepId);
    if (!step?.conditionalRules) return [];

    const applicableActions: ConditionalAction[] = [];

    for (const rule of step.conditionalRules) {
      if (this.evaluateCondition(rule.condition, guidedFlowData)) {
        applicableActions.push(rule.action);
      }
    }

    return applicableActions.sort(
      (a, b) => (b as any).priority - (a as any).priority,
    );
  }

  // Database operations
  static async saveWorkflowProgress(
    userId: string,
    estimateId: string,
    guidedFlowData: GuidedFlowData,
    currentStep: number,
  ): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await createClient()
        .from("estimation_flows")
        .upsert({
          user_id: userId,
          estimate_id: estimateId,
          flow_data: guidedFlowData as any,
          current_step: currentStep,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    });

    if (result.success) {
      invalidateCache.estimationFlow(estimateId);
    }

    return result.success;
  }

  static async loadWorkflowProgress(estimateId: string): Promise<{
    guidedFlowData: GuidedFlowData;
    currentStep: number;
  } | null> {
    const result = await withDatabaseRetry(async () => {
      const { data, error } = await createClient()
        .from("estimation_flows")
        .select("flow_data, current_step")
        .eq("estimate_id", estimateId)
        .single();

      if (error) throw error;
      return data;
    });

    if (result.success && result.data) {
      return {
        guidedFlowData:
          (result.data.flow_data as GuidedFlowData) || ({} as GuidedFlowData),
        currentStep: result.data.current_step || 1,
      };
    }

    return null;
  }

  static async deleteWorkflowProgress(estimateId: string): Promise<boolean> {
    const result = await withDatabaseRetry(async () => {
      const { error } = await createClient()
        .from("estimation_flows")
        .delete()
        .eq("estimate_id", estimateId);

      if (error) throw error;
      return true;
    });

    if (result.success) {
      invalidateCache.estimationFlow(estimateId);
    }

    return result.success;
  }

  // Business logic methods
  static generateServiceDependencies(
    selectedServices: ServiceType[],
  ): ServiceDependency[] {
    const dependencies: ServiceDependency[] = [];

    // Define service dependencies
    const dependencyMap = {
      "glass-restoration": ["window-cleaning"],
      "frame-restoration": ["window-cleaning"],
      "pressure-wash-seal": ["pressure-washing"],
      "final-clean": ["high-dusting", "window-cleaning"],
      "granite-reconditioning": ["pressure-washing"],
    };

    selectedServices.forEach((service) => {
      const requiredServices =
        dependencyMap[service as keyof typeof dependencyMap];
      if (requiredServices) {
        requiredServices.forEach((required) => {
          if (selectedServices.includes(required as ServiceType)) {
            dependencies.push({
              serviceType: service,
              dependsOn: [required as ServiceType], // Array as expected by interface
            });
          }
        });
      }
    });

    return dependencies;
  }

  static calculateEstimatedDuration(
    workAreas: WorkArea[],
    selectedServices: ServiceType[],
  ): number {
    let totalDuration = 0;

    workAreas.forEach((area) => {
      selectedServices.forEach((service) => {
        // Base duration rates (hours per sq ft)
        const durationRates: Record<ServiceType, number> = {
          WC: 0.01, // window-cleaning
          PW: 0.005, // pressure-washing
          SW: 0.007, // soft-washing
          BF: 0.02, // biofilm-removal
          GR: 0.04, // glass-restoration
          FR: 0.03, // frame-restoration
          HD: 0.003, // high-dusting
          FC: 0.002, // final-clean
          GRC: 0.015, // granite-reconditioning
          PWS: 0.01, // pressure-wash-seal
          PD: 0.003, // parking-deck
          GC: 0.008, // general-cleaning
        };

        const rate = durationRates[service];
        const areaDuration = (area.measurements?.totalArea || 0) * rate;
        totalDuration += areaDuration;
      });
    });

    // Add setup and breakdown time
    totalDuration += selectedServices.length * 2; // 2 hours per service for setup/breakdown

    return Math.max(totalDuration, 4); // Minimum 4 hours
  }

  static generateDefaultTakeoffData(workAreas: WorkArea[]): TakeoffData {
    const measurements: Measurement[] = [];
    let totalArea = 0;
    let totalPerimeter = 0;

    workAreas.forEach((area, index) => {
      if (area.measurements) {
        // Create measurement entries for each work area
        measurements.push({
          id: `measurement-${area.id}-area`,
          workAreaId: area.id,
          type: "area",
          value: area.measurements.totalArea || 0,
          unit: "sqft",
          accuracy: 0.9,
          method: "manual",
          takenAt: new Date(),
          notes: `Total area for ${area.name}`,
        });

        totalArea += area.measurements.totalArea || 0;
        totalPerimeter += area.measurements.linearFeet || 0;
      }
    });

    return {
      id: `takeoff-${Date.now()}`,
      workAreas,
      measurements,
      calculations: {
        totalArea,
        totalPerimeter,
        complexityFactor: 1.0,
        accessDifficulty: 1.0,
      },
      accuracy: 0.9,
      method: "manual",
      notes: "Generated from work area measurements",
    };
  }

  // Private helper methods
  private static isStepCompleted(stepId: string, stepData: any): boolean {
    if (!stepData) return false;

    switch (stepId) {
      case "initial-contact":
        return !!(stepData.contactMethod && stepData.contactDate);

      case "scope-details":
        return !!(
          stepData.selectedServices && stepData.selectedServices.length > 0
        );

      case "files-photos":
        return true; // Optional step

      case "area-of-work":
        return !!(stepData.workAreas && stepData.workAreas.length > 0);

      case "takeoff":
        return !!stepData.takeoffData;

      case "duration":
        return !!(stepData.estimatedDuration && stepData.estimatedDuration > 0);

      case "expenses":
        return !!(stepData.equipmentCosts && stepData.materialCosts);

      case "pricing":
        return !!stepData.pricingCalculations;

      case "summary":
        return !!(stepData.finalEstimate && stepData.proposalGenerated);

      default:
        return false;
    }
  }

  private static isStepAvailable(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    const stepIndex = this.getStepIndex(stepId);
    if (stepIndex === 0) return true; // First step is always available

    // Check if previous required steps are completed
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = this.WORKFLOW_STEPS[i];
      if (prevStep.isRequired) {
        const prevStepData =
          guidedFlowData[prevStep.id as keyof GuidedFlowData];
        if (!this.isStepCompleted(prevStep.id, prevStepData)) {
          return false;
        }
      }
    }

    return true;
  }

  private static validateStepData(
    stepId: string,
    data: any,
  ): {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    switch (stepId) {
      case "scope-details":
        if (data?.selectedServices && data.selectedServices.length > 5) {
          warnings.selectedServices = [
            "Many services selected - consider project complexity",
          ];
        }
        break;

      case "duration":
        if (data?.estimatedDuration && data.estimatedDuration > 80) {
          warnings.estimatedDuration = [
            "Long project duration - consider breaking into phases",
          ];
        }
        break;

      case "expenses":
        if (data?.equipmentCosts && data.materialCosts) {
          const totalCosts =
            safeNumber(data.equipmentCosts) + safeNumber(data.materialCosts);
          if (totalCosts > 10000) {
            warnings.totalCosts = [
              "High material/equipment costs - verify estimates",
            ];
          }
        }
        break;
    }

    return { errors, warnings };
  }

  private static validateCrossStepDependencies(
    guidedFlowData: GuidedFlowData,
  ): {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Check service dependencies
    const scopeData = guidedFlowData.scopeDetails;
    if (scopeData?.selectedServices) {
      const dependencies = this.generateServiceDependencies(
        scopeData.selectedServices,
      );
      if (dependencies.length > 0) {
        warnings["cross-step.dependencies"] = [
          `Service dependencies detected: ${dependencies.length} dependencies to consider`,
        ];
      }
    }

    // Check duration vs work areas
    const durationData = guidedFlowData.duration;
    const areaData = guidedFlowData.areaOfWork;
    if (durationData?.estimatedDuration && areaData?.workAreas) {
      const calculatedDuration = this.calculateEstimatedDuration(
        areaData.workAreas,
        scopeData?.selectedServices || [],
      );
      // Convert estimatedDuration to number if it's an object
      const estimatedDurationHours =
        typeof durationData.estimatedDuration === "number"
          ? durationData.estimatedDuration
          : durationData.estimatedDuration.days * 8 +
            durationData.estimatedDuration.hours;
      const difference = Math.abs(estimatedDurationHours - calculatedDuration);
      if (difference > calculatedDuration * 0.5) {
        warnings["cross-step.duration"] = [
          "Estimated duration significantly differs from calculated duration",
        ];
      }
    }

    return { errors, warnings };
  }
}

export default WorkflowService;

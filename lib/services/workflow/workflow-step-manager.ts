/**
 * Workflow Step Manager
 * Handles step definitions, navigation, and basic step queries
 */

import {
  GuidedFlowData,
  ServiceType,
  WorkArea,
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

export class WorkflowStepManager {
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
      description: "Generate measurements and takeoff data",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 30,
      category: "analysis",
      allowParallel: false,
      dependencies: ["area-of-work"],
      validationRules: [
        {
          field: "takeoffData",
          type: "required",
          message: "Takeoff data is required",
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
      ],
    },
    {
      id: "expenses",
      title: "Expenses",
      description: "Calculate material and equipment costs",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 20,
      category: "calculation",
      allowParallel: true,
      dependencies: ["takeoff"],
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
      description: "Calculate final pricing and profit margins",
      isRequired: true,
      isCompleted: false,
      estimatedDuration: 20,
      category: "calculation",
      allowParallel: false,
      dependencies: ["duration", "expenses"],
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
      estimatedDuration: 15,
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

  /**
   * Get all workflow steps
   */
  static getWorkflowSteps(): WorkflowStep[] {
    return [...this.WORKFLOW_STEPS];
  }

  /**
   * Get step by ID
   */
  static getStepById(stepId: string): WorkflowStep | null {
    return this.WORKFLOW_STEPS.find((step) => step.id === stepId) || null;
  }

  /**
   * Get step by index
   */
  static getStepByIndex(index: number): WorkflowStep | null {
    return this.WORKFLOW_STEPS[index] || null;
  }

  /**
   * Get step index by ID
   */
  static getStepIndex(stepId: string): number {
    return this.WORKFLOW_STEPS.findIndex((step) => step.id === stepId);
  }

  /**
   * Get next step in sequence
   */
  static getNextStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex >= 0 && currentIndex < this.WORKFLOW_STEPS.length - 1
      ? this.WORKFLOW_STEPS[currentIndex + 1]
      : null;
  }

  /**
   * Get previous step in sequence
   */
  static getPreviousStep(currentStepId: string): WorkflowStep | null {
    const currentIndex = this.getStepIndex(currentStepId);
    return currentIndex > 0 ? this.WORKFLOW_STEPS[currentIndex - 1] : null;
  }

  /**
   * Get steps by category
   */
  static getStepsByCategory(category: string): WorkflowStep[] {
    return this.WORKFLOW_STEPS.filter((step) => step.category === category);
  }

  /**
   * Get total number of steps
   */
  static getTotalSteps(): number {
    return this.WORKFLOW_STEPS.length;
  }

  /**
   * Check if step has dependencies
   */
  static hasDependencies(stepId: string): boolean {
    const step = this.getStepById(stepId);
    return !!(step?.dependencies && step.dependencies.length > 0);
  }

  /**
   * Get step dependencies
   */
  static getStepDependencies(stepId: string): string[] {
    const step = this.getStepById(stepId);
    return step?.dependencies || [];
  }

  /**
   * Check if step can be worked on in parallel
   */
  static canWorkInParallel(stepId: string): boolean {
    const step = this.getStepById(stepId);
    return step?.allowParallel || false;
  }

  /**
   * Get estimated duration for step
   */
  static getStepEstimatedDuration(stepId: string): number {
    const step = this.getStepById(stepId);
    return step?.estimatedDuration || 0;
  }

  /**
   * Get total estimated duration for all steps
   */
  static getTotalEstimatedDuration(): number {
    return this.WORKFLOW_STEPS.reduce(
      (total, step) => total + (step.estimatedDuration || 0),
      0,
    );
  }

  /**
   * Check if step is required
   */
  static isStepRequired(stepId: string): boolean {
    const step = this.getStepById(stepId);
    return step?.isRequired || false;
  }

  /**
   * Get validation rules for step
   */
  static getStepValidationRules(stepId: string): ValidationRule[] {
    const step = this.getStepById(stepId);
    return step?.validationRules || [];
  }

  /**
   * Get conditional rules for step
   */
  static getStepConditionalRules(stepId: string): ConditionalRule[] {
    const step = this.getStepById(stepId);
    return step?.conditionalRules || [];
  }
}

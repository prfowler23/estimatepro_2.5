/**
 * Workflow Validation Engine
 * Handles all validation logic for steps, workflows, and cross-step dependencies
 */

import {
  GuidedFlowData,
  ServiceType,
  WorkArea,
} from "@/lib/types/estimate-types";
import { safeNumber, safeString } from "@/lib/utils/null-safety";
import { WorkflowStepManager, ValidationRule } from "./workflow-step-manager";

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  canProceed: boolean;
}

export interface ServiceDependency {
  service: ServiceType;
  dependsOn: ServiceType[];
  reason: string;
}

export class WorkflowValidationEngine {
  /**
   * Validate a single step's data
   */
  static validateStep(stepId: string, data: any): WorkflowValidationResult {
    const step = WorkflowStepManager.getStepById(stepId);
    if (!step) {
      return {
        isValid: false,
        errors: { step: ["Step not found"] },
        warnings: {},
        canProceed: false,
      };
    }

    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    // Validate against step's validation rules
    if (step.validationRules) {
      for (const rule of step.validationRules) {
        const fieldErrors = this.validateField(rule, data);
        if (fieldErrors.length > 0) {
          errors[rule.field] = fieldErrors;
        }
      }
    }

    // Validate step-specific business logic
    const stepValidation = this.validateStepData(stepId, data);
    Object.assign(errors, stepValidation.errors);
    Object.assign(warnings, stepValidation.warnings);

    const isValid = Object.keys(errors).length === 0;
    const canProceed = isValid && this.isStepCompleted(stepId, data);

    return {
      isValid,
      errors,
      warnings,
      canProceed,
    };
  }

  /**
   * Validate the entire workflow
   */
  static validateEntireWorkflow(
    guidedFlowData: GuidedFlowData,
  ): WorkflowValidationResult {
    const allErrors: Record<string, string[]> = {};
    const allWarnings: Record<string, string[]> = {};

    // Validate each step
    const steps = WorkflowStepManager.getWorkflowSteps();
    for (const step of steps) {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      const stepValidation = this.validateStep(step.id, stepData);

      // Prefix field names with step ID to avoid conflicts
      Object.entries(stepValidation.errors).forEach(([field, errors]) => {
        allErrors[`${step.id}.${field}`] = errors;
      });

      Object.entries(stepValidation.warnings).forEach(([field, warnings]) => {
        allWarnings[`${step.id}.${field}`] = warnings;
      });
    }

    // Validate cross-step dependencies
    const crossStepValidation =
      this.validateCrossStepDependencies(guidedFlowData);
    Object.assign(allErrors, crossStepValidation.errors);
    Object.assign(allWarnings, crossStepValidation.warnings);

    const isValid = Object.keys(allErrors).length === 0;
    const canProceed = this.canCompleteWorkflow(guidedFlowData);

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      canProceed,
    };
  }

  /**
   * Check if a step is completed based on its data
   */
  static isStepCompleted(stepId: string, stepData: any): boolean {
    if (!stepData) return false;

    switch (stepId) {
      case "initial-contact":
        return !!(
          stepData.contactMethod &&
          stepData.contactDate &&
          stepData.customerInfo
        );

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

  /**
   * Check if workflow can be completed
   */
  static canCompleteWorkflow(guidedFlowData: GuidedFlowData): boolean {
    const steps = WorkflowStepManager.getWorkflowSteps();

    for (const step of steps) {
      if (step.isRequired) {
        const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
        if (!this.isStepCompleted(step.id, stepData)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a step is available (dependencies met)
   */
  static isStepAvailable(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    const stepIndex = WorkflowStepManager.getStepIndex(stepId);
    if (stepIndex === 0) return true; // First step is always available

    const steps = WorkflowStepManager.getWorkflowSteps();

    // Check if previous required steps are completed
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = steps[i];
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

  /**
   * Validate a single field against a validation rule
   */
  private static validateField(rule: ValidationRule, data: any): string[] {
    const errors: string[] = [];
    const fieldValue = data?.[rule.field];

    switch (rule.type) {
      case "required":
        if (
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === ""
        ) {
          errors.push(rule.message);
        }
        break;

      case "minLength":
        if (fieldValue && fieldValue.length < rule.value) {
          errors.push(rule.message);
        }
        break;

      case "maxLength":
        if (fieldValue && fieldValue.length > rule.value) {
          errors.push(rule.message);
        }
        break;

      case "pattern":
        if (fieldValue && !new RegExp(rule.value).test(fieldValue)) {
          errors.push(rule.message);
        }
        break;

      case "custom":
        if (rule.validator && !rule.validator(fieldValue)) {
          errors.push(rule.message);
        }
        break;
    }

    return errors;
  }

  /**
   * Validate step-specific business logic and generate warnings
   */
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

  /**
   * Validate cross-step dependencies
   */
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

  /**
   * Generate service dependencies for validation
   */
  private static generateServiceDependencies(
    selectedServices: ServiceType[],
  ): ServiceDependency[] {
    const dependencies: ServiceDependency[] = [];

    // Frame restoration typically requires window cleaning first
    if (
      selectedServices.includes("frame-restoration" as ServiceType) &&
      !selectedServices.includes("window-cleaning" as ServiceType)
    ) {
      dependencies.push({
        service: "frame-restoration" as ServiceType,
        dependsOn: ["window-cleaning" as ServiceType],
        reason: "Frames should be cleaned before restoration work",
      });
    }

    // Glass restoration works better with clean frames
    if (
      selectedServices.includes("glass-restoration" as ServiceType) &&
      selectedServices.includes("frame-restoration" as ServiceType)
    ) {
      dependencies.push({
        service: "glass-restoration" as ServiceType,
        dependsOn: ["frame-restoration" as ServiceType],
        reason: "Frame restoration should complete before glass restoration",
      });
    }

    // Pressure washing should happen before window cleaning for better results
    if (
      selectedServices.includes("window-cleaning" as ServiceType) &&
      selectedServices.includes("pressure-washing" as ServiceType)
    ) {
      dependencies.push({
        service: "window-cleaning" as ServiceType,
        dependsOn: ["pressure-washing" as ServiceType],
        reason: "Pressure washing creates debris that affects window cleaning",
      });
    }

    return dependencies;
  }

  /**
   * Calculate estimated duration based on work areas and services
   */
  private static calculateEstimatedDuration(
    workAreas: WorkArea[],
    selectedServices: ServiceType[],
  ): number {
    let totalHours = 0;

    // Base time per service per work area
    const serviceTimeRates: Record<string, number> = {
      "window-cleaning": 0.5, // 30 minutes per area
      "pressure-washing": 1.0, // 1 hour per area
      "soft-washing": 0.75, // 45 minutes per area
      "glass-restoration": 2.0, // 2 hours per area
      "frame-restoration": 1.5, // 1.5 hours per area
      "high-dusting": 0.25, // 15 minutes per area
      "final-clean": 0.5, // 30 minutes per area
    };

    // Calculate time for each work area
    workAreas.forEach((area) => {
      const areaMultiplier = Math.max(1, (area.squareFootage || 1000) / 1000); // Scale based on size

      selectedServices.forEach((service) => {
        const baseTime = serviceTimeRates[service] || 1.0;
        totalHours += baseTime * areaMultiplier;
      });
    });

    // Add complexity factors
    if (selectedServices.length > 3) {
      totalHours *= 1.2; // 20% overhead for complexity
    }

    if (workAreas.length > 5) {
      totalHours *= 1.1; // 10% overhead for multiple areas
    }

    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  }
}

/**
 * Workflow Condition Evaluator
 * Handles evaluation of conditional rules and expressions
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import {
  ConditionExpression,
  ConditionalAction,
  ConditionalRule,
  WorkflowStepManager,
} from "./workflow-step-manager";
import { WorkflowValidationEngine } from "./workflow-validation-engine";

export interface StepNavigationResult {
  canNavigate: boolean;
  nextStep?: import("./workflow-step-manager").WorkflowStep;
  skipReason?: string;
  requiredActions?: ConditionalAction[];
  warnings?: string[];
}

export class WorkflowConditionEvaluator {
  /**
   * Get smart next step considering conditional rules
   */
  static getSmartNextStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): StepNavigationResult {
    const currentStep = WorkflowStepManager.getStepById(currentStepId);
    if (!currentStep) {
      return { canNavigate: false };
    }

    // Check if current step is completed
    const currentStepData =
      guidedFlowData[currentStep.id as keyof GuidedFlowData];
    if (
      !WorkflowValidationEngine.isStepCompleted(currentStepId, currentStepData)
    ) {
      return {
        canNavigate: false,
        requiredActions: [
          {
            type: "show-warning",
            message: "Please complete the current step before proceeding",
          },
        ],
      };
    }

    // Find the next available step
    const nextStep = this.findNextAvailableStep(currentStepId, guidedFlowData);
    if (!nextStep) {
      return { canNavigate: false };
    }

    // Apply conditional actions for the next step
    const actions = this.applyConditionalActions(nextStep.id, guidedFlowData);
    const warnings: string[] = [];

    // Check for skip conditions
    if (this.shouldSkipStep(nextStep.id, guidedFlowData)) {
      const skipReason = `Step skipped based on conditional rules`;
      // Recursively find the next available step
      const recursiveResult = this.getSmartNextStep(
        nextStep.id,
        guidedFlowData,
      );
      return {
        ...recursiveResult,
        skipReason,
      };
    }

    // Collect warnings from conditional actions
    actions.forEach((action) => {
      if (action.type === "show-warning" && action.message) {
        warnings.push(action.message);
      }
    });

    return {
      canNavigate: true,
      nextStep,
      requiredActions: actions,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Evaluate a condition expression
   */
  static evaluateCondition(
    condition: ConditionExpression,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    switch (condition.type) {
      case "service-selected":
        return this.evaluateServiceCondition(condition, guidedFlowData, true);

      case "service-not-selected":
        return this.evaluateServiceCondition(condition, guidedFlowData, false);

      case "field-value":
        return this.evaluateFieldCondition(
          this.getFieldValue(guidedFlowData, condition.field || ""),
          condition.operator || "equals",
          condition.value,
        );

      case "step-completed":
        const stepData =
          guidedFlowData[condition.value as keyof GuidedFlowData];
        return WorkflowValidationEngine.isStepCompleted(
          condition.value,
          stepData,
        );

      case "composite":
        return this.evaluateCompositeCondition(condition, guidedFlowData);

      default:
        return false;
    }
  }

  /**
   * Check if a step should be skipped based on conditional rules
   */
  static shouldSkipStep(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    const step = WorkflowStepManager.getStepById(stepId);
    if (!step?.conditionalRules) return false;

    // Sort by priority (higher numbers first)
    const sortedRules = [...step.conditionalRules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      if (
        rule.action.type === "skip-step" &&
        this.evaluateCondition(rule.condition, guidedFlowData)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find the next available step, skipping unavailable ones
   */
  static findNextAvailableStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): import("./workflow-step-manager").WorkflowStep | null {
    const steps = WorkflowStepManager.getWorkflowSteps();
    const currentIndex = WorkflowStepManager.getStepIndex(currentStepId);

    for (let i = currentIndex + 1; i < steps.length; i++) {
      const step = steps[i];

      // Check if step is available (dependencies met)
      if (WorkflowValidationEngine.isStepAvailable(step.id, guidedFlowData)) {
        // Check if step should be skipped
        if (!this.shouldSkipStep(step.id, guidedFlowData)) {
          return step;
        }
      }
    }

    return null;
  }

  /**
   * Get available steps that can be worked on
   */
  static getAvailableSteps(
    guidedFlowData: GuidedFlowData,
  ): import("./workflow-step-manager").WorkflowStep[] {
    const steps = WorkflowStepManager.getWorkflowSteps();
    return steps.filter((step) => {
      return (
        WorkflowValidationEngine.isStepAvailable(step.id, guidedFlowData) &&
        !this.shouldSkipStep(step.id, guidedFlowData)
      );
    });
  }

  /**
   * Get step navigation information
   */
  static getStepNavigationInfo(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): {
    canNavigateForward: boolean;
    canNavigateBackward: boolean;
    nextStep?: import("./workflow-step-manager").WorkflowStep;
    previousStep?: import("./workflow-step-manager").WorkflowStep;
    availableSteps: import("./workflow-step-manager").WorkflowStep[];
    conditionalActions: ConditionalAction[];
  } {
    const step = WorkflowStepManager.getStepById(stepId);
    if (!step) {
      return {
        canNavigateForward: false,
        canNavigateBackward: false,
        availableSteps: [],
        conditionalActions: [],
      };
    }

    const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
    const isCompleted = WorkflowValidationEngine.isStepCompleted(
      stepId,
      stepData,
    );

    // Check forward navigation
    const smartNext = this.getSmartNextStep(stepId, guidedFlowData);
    const canNavigateForward = isCompleted && smartNext.canNavigate;

    // Check backward navigation
    const previousStep = WorkflowStepManager.getPreviousStep(stepId);
    const canNavigateBackward = !!previousStep;

    // Get available steps
    const availableSteps = this.getAvailableSteps(guidedFlowData);

    // Get conditional actions for current step
    const conditionalActions = this.applyConditionalActions(
      stepId,
      guidedFlowData,
    );

    return {
      canNavigateForward,
      canNavigateBackward,
      nextStep: smartNext.nextStep,
      previousStep,
      availableSteps,
      conditionalActions,
    };
  }

  /**
   * Apply conditional actions for a step
   */
  static applyConditionalActions(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): ConditionalAction[] {
    const step = WorkflowStepManager.getStepById(stepId);
    if (!step?.conditionalRules) return [];

    const actions: ConditionalAction[] = [];

    // Sort by priority (higher numbers first)
    const sortedRules = [...step.conditionalRules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, guidedFlowData)) {
        actions.push(rule.action);
      }
    }

    return actions;
  }

  /**
   * Get field value from guided flow data using dot notation
   */
  static getFieldValue(guidedFlowData: GuidedFlowData, fieldPath: string): any {
    const parts = fieldPath.split(".");
    let value: any = guidedFlowData;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate service-related conditions
   */
  private static evaluateServiceCondition(
    condition: ConditionExpression,
    guidedFlowData: GuidedFlowData,
    shouldBeSelected: boolean,
  ): boolean {
    const scopeData = guidedFlowData.scopeDetails;
    if (!scopeData?.selectedServices) return !shouldBeSelected;

    const isSelected = scopeData.selectedServices.includes(condition.value);
    return shouldBeSelected ? isSelected : !isSelected;
  }

  /**
   * Evaluate field value conditions
   */
  private static evaluateFieldCondition(
    fieldValue: any,
    operator: string,
    compareValue: any,
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === compareValue;

      case "not-equals":
        return fieldValue !== compareValue;

      case "contains":
        return Array.isArray(fieldValue) && fieldValue.includes(compareValue);

      case "greater-than":
        return Number(fieldValue) > Number(compareValue);

      case "less-than":
        return Number(fieldValue) < Number(compareValue);

      case "in":
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);

      case "not-in":
        return (
          !Array.isArray(compareValue) || !compareValue.includes(fieldValue)
        );

      default:
        return false;
    }
  }

  /**
   * Evaluate composite conditions (AND/OR logic)
   */
  private static evaluateCompositeCondition(
    condition: ConditionExpression,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    if (!condition.conditions) return false;

    const results = condition.conditions.map((subCondition) =>
      this.evaluateCondition(subCondition, guidedFlowData),
    );

    switch (condition.logic) {
      case "and":
        return results.every((result) => result);

      case "or":
        return results.some((result) => result);

      default:
        return false;
    }
  }
}

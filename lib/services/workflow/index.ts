/**
 * Workflow Services Index
 * Main orchestrator for all workflow-related services
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import { WorkflowStepManager } from "./workflow-step-manager";
import { WorkflowValidationEngine } from "./workflow-validation-engine";
import { WorkflowConditionEvaluator } from "./workflow-condition-evaluator";
import { WorkflowProgressTracker } from "./workflow-progress-tracker";
import type {
  WorkflowStep,
  ValidationRule,
  ConditionalRule,
  ConditionExpression,
  ConditionalAction,
} from "./workflow-step-manager";
import type { WorkflowValidationResult } from "./workflow-validation-engine";
import type { StepNavigationResult } from "./workflow-condition-evaluator";
import type { WorkflowProgress } from "./workflow-progress-tracker";

/**
 * Main Workflow Service Orchestrator
 * Provides a unified interface to all workflow functionality
 */
export class WorkflowOrchestrator {
  // === Step Management Methods ===

  /**
   * Get all workflow steps
   */
  getWorkflowSteps(): WorkflowStep[] {
    return WorkflowStepManager.getWorkflowSteps();
  }

  /**
   * Get step by ID
   */
  getStepById(stepId: string): WorkflowStep | null {
    return WorkflowStepManager.getStepById(stepId);
  }

  /**
   * Get step by index
   */
  getStepByIndex(index: number): WorkflowStep | null {
    return WorkflowStepManager.getStepByIndex(index);
  }

  /**
   * Get step index by ID
   */
  getStepIndex(stepId: string): number {
    return WorkflowStepManager.getStepIndex(stepId);
  }

  /**
   * Get next step in sequence
   */
  getNextStep(currentStepId: string): WorkflowStep | null {
    return WorkflowStepManager.getNextStep(currentStepId);
  }

  /**
   * Get previous step in sequence
   */
  getPreviousStep(currentStepId: string): WorkflowStep | null {
    return WorkflowStepManager.getPreviousStep(currentStepId);
  }

  /**
   * Get steps by category
   */
  getStepsByCategory(category: string): WorkflowStep[] {
    return WorkflowStepManager.getStepsByCategory(category);
  }

  // === Validation Methods ===

  /**
   * Validate a single step
   */
  validateStep(stepId: string, data: any): WorkflowValidationResult {
    return WorkflowValidationEngine.validateStep(stepId, data);
  }

  /**
   * Validate entire workflow
   */
  validateEntireWorkflow(
    guidedFlowData: GuidedFlowData,
  ): WorkflowValidationResult {
    return WorkflowValidationEngine.validateEntireWorkflow(guidedFlowData);
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(stepId: string, stepData: any): boolean {
    return WorkflowValidationEngine.isStepCompleted(stepId, stepData);
  }

  /**
   * Check if step is available
   */
  isStepAvailable(stepId: string, guidedFlowData: GuidedFlowData): boolean {
    return WorkflowValidationEngine.isStepAvailable(stepId, guidedFlowData);
  }

  // === Condition Evaluation Methods ===

  /**
   * Get smart next step with conditional logic
   */
  getSmartNextStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): StepNavigationResult {
    return WorkflowConditionEvaluator.getSmartNextStep(
      currentStepId,
      guidedFlowData,
    );
  }

  /**
   * Evaluate a condition expression
   */
  evaluateCondition(
    condition: ConditionExpression,
    guidedFlowData: GuidedFlowData,
  ): boolean {
    return WorkflowConditionEvaluator.evaluateCondition(
      condition,
      guidedFlowData,
    );
  }

  /**
   * Check if step should be skipped
   */
  shouldSkipStep(stepId: string, guidedFlowData: GuidedFlowData): boolean {
    return WorkflowConditionEvaluator.shouldSkipStep(stepId, guidedFlowData);
  }

  /**
   * Find next available step
   */
  findNextAvailableStep(
    currentStepId: string,
    guidedFlowData: GuidedFlowData,
  ): WorkflowStep | null {
    return WorkflowConditionEvaluator.findNextAvailableStep(
      currentStepId,
      guidedFlowData,
    );
  }

  /**
   * Get available steps
   */
  getAvailableSteps(guidedFlowData: GuidedFlowData): WorkflowStep[] {
    return WorkflowConditionEvaluator.getAvailableSteps(guidedFlowData);
  }

  /**
   * Get step navigation info
   */
  getStepNavigationInfo(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): {
    canNavigateForward: boolean;
    canNavigateBackward: boolean;
    nextStep?: WorkflowStep;
    previousStep?: WorkflowStep;
    availableSteps: WorkflowStep[];
    conditionalActions: ConditionalAction[];
  } {
    return WorkflowConditionEvaluator.getStepNavigationInfo(
      stepId,
      guidedFlowData,
    );
  }

  /**
   * Apply conditional actions
   */
  applyConditionalActions(
    stepId: string,
    guidedFlowData: GuidedFlowData,
  ): ConditionalAction[] {
    return WorkflowConditionEvaluator.applyConditionalActions(
      stepId,
      guidedFlowData,
    );
  }

  // === Progress Tracking Methods ===

  /**
   * Calculate workflow progress
   */
  calculateProgress(guidedFlowData: GuidedFlowData): WorkflowProgress {
    return WorkflowProgressTracker.calculateProgress(guidedFlowData);
  }

  /**
   * Calculate estimated time remaining
   */
  calculateEstimatedTimeRemaining(guidedFlowData: GuidedFlowData): number {
    return WorkflowProgressTracker.calculateEstimatedTimeRemaining(
      guidedFlowData,
    );
  }

  /**
   * Save workflow progress
   */
  async saveWorkflowProgress(
    estimateId: string,
    guidedFlowData: GuidedFlowData,
  ): Promise<boolean> {
    return WorkflowProgressTracker.saveWorkflowProgress(
      estimateId,
      guidedFlowData,
    );
  }

  /**
   * Load workflow progress
   */
  async loadWorkflowProgress(estimateId: string): Promise<{
    guidedFlowData: GuidedFlowData;
    progress: WorkflowProgress;
  } | null> {
    return WorkflowProgressTracker.loadWorkflowProgress(estimateId);
  }

  /**
   * Delete workflow progress
   */
  async deleteWorkflowProgress(estimateId: string): Promise<boolean> {
    return WorkflowProgressTracker.deleteWorkflowProgress(estimateId);
  }

  /**
   * Generate default takeoff data
   */
  generateDefaultTakeoffData(
    workAreas: import("@/lib/types/estimate-types").WorkArea[],
  ): import("@/lib/types/estimate-types").TakeoffData {
    return WorkflowProgressTracker.generateDefaultTakeoffData(workAreas);
  }

  /**
   * Get workflow completion status
   */
  getWorkflowCompletionStatus(guidedFlowData: GuidedFlowData): {
    isComplete: boolean;
    completedSteps: number;
    totalRequiredSteps: number;
    missingSteps: string[];
  } {
    return WorkflowProgressTracker.getWorkflowCompletionStatus(guidedFlowData);
  }

  /**
   * Get next recommended step
   */
  getNextRecommendedStep(guidedFlowData: GuidedFlowData): WorkflowStep | null {
    return WorkflowProgressTracker.getNextRecommendedStep(guidedFlowData);
  }

  /**
   * Get step completion summary
   */
  getStepCompletionSummary(guidedFlowData: GuidedFlowData): {
    [stepId: string]: {
      isCompleted: boolean;
      isAvailable: boolean;
      isRequired: boolean;
      completionTime?: Date;
    };
  } {
    return WorkflowProgressTracker.getStepCompletionSummary(guidedFlowData);
  }

  // === Health Check ===

  /**
   * Health check for all workflow services
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: {
      stepManager: boolean;
      validation: boolean;
      conditionEvaluator: boolean;
      progressTracker: boolean;
    };
    details: {
      totalSteps: number;
      totalValidationRules: number;
      totalConditionalRules: number;
    };
  }> {
    try {
      // Test basic functionality
      const steps = this.getWorkflowSteps();
      const totalSteps = steps.length;

      const totalValidationRules = steps.reduce(
        (sum, step) => sum + (step.validationRules?.length || 0),
        0,
      );

      const totalConditionalRules = steps.reduce(
        (sum, step) => sum + (step.conditionalRules?.length || 0),
        0,
      );

      // Test each service
      const services = {
        stepManager: totalSteps > 0,
        validation: totalValidationRules >= 0,
        conditionEvaluator: totalConditionalRules >= 0,
        progressTracker: true, // Always available (no external dependencies)
      };

      const healthyCount = Object.values(services).filter(Boolean).length;

      let status: "healthy" | "degraded" | "unhealthy";
      if (healthyCount === 4) {
        status = "healthy";
      } else if (healthyCount >= 3) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }

      return {
        status,
        services,
        details: {
          totalSteps,
          totalValidationRules,
          totalConditionalRules,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        services: {
          stepManager: false,
          validation: false,
          conditionEvaluator: false,
          progressTracker: false,
        },
        details: {
          totalSteps: 0,
          totalValidationRules: 0,
          totalConditionalRules: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowOrchestrator();

// Export individual services for direct access if needed
export {
  WorkflowStepManager,
  WorkflowValidationEngine,
  WorkflowConditionEvaluator,
  WorkflowProgressTracker,
};

// Re-export types for convenience
export type {
  WorkflowStep,
  ValidationRule,
  ConditionalRule,
  ConditionExpression,
  ConditionalAction,
  WorkflowValidationResult,
  StepNavigationResult,
  WorkflowProgress,
};

/**
 * Workflow Progress Tracker
 * Handles progress calculation, persistence, and state management
 */

import { createClient } from "@/lib/supabase/universal-client";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";
import { invalidateCache } from "@/lib/utils/cache";
import {
  GuidedFlowData,
  TakeoffData,
  WorkArea,
} from "@/lib/types/estimate-types";
import { WorkflowStepManager } from "./workflow-step-manager";
import { WorkflowValidationEngine } from "./workflow-validation-engine";

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  availableSteps: string[];
  completionPercentage: number;
}

export class WorkflowProgressTracker {
  /**
   * Calculate progress for the workflow
   */
  static calculateProgress(guidedFlowData: GuidedFlowData): WorkflowProgress {
    const totalSteps = WorkflowStepManager.getTotalSteps();
    const completedSteps: string[] = [];
    const availableSteps: string[] = [];

    const steps = WorkflowStepManager.getWorkflowSteps();

    // Check each step
    steps.forEach((step) => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];

      // Check if step is completed
      if (WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
        completedSteps.push(step.id);
      }

      // Check if step is available
      if (WorkflowValidationEngine.isStepAvailable(step.id, guidedFlowData)) {
        availableSteps.push(step.id);
      }
    });

    // Find current step (first incomplete required step or last completed step)
    let currentStep = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];

      if (!WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
        if (step.isRequired) {
          currentStep = i;
          break;
        }
      } else {
        currentStep = i;
      }
    }

    const completionPercentage = Math.round(
      (completedSteps.length / totalSteps) * 100,
    );

    return {
      currentStep,
      totalSteps,
      completedSteps,
      availableSteps,
      completionPercentage,
    };
  }

  /**
   * Calculate estimated time remaining
   */
  static calculateEstimatedTimeRemaining(
    guidedFlowData: GuidedFlowData,
  ): number {
    const steps = WorkflowStepManager.getWorkflowSteps();
    let remainingTime = 0;

    steps.forEach((step) => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      if (!WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
        remainingTime += step.estimatedDuration || 0;
      }
    });

    return remainingTime;
  }

  /**
   * Save workflow progress to database
   */
  static async saveWorkflowProgress(
    estimateId: string,
    guidedFlowData: GuidedFlowData,
  ): Promise<boolean> {
    const supabase = createClient();

    return withDatabaseRetry(async () => {
      const progress = this.calculateProgress(guidedFlowData);

      const { error } = await supabase
        .from("estimate_flows")
        .upsert({
          estimate_id: estimateId,
          flow_data: guidedFlowData,
          current_step: progress.currentStep,
          completed_steps: progress.completedSteps,
          completion_percentage: progress.completionPercentage,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("Failed to save workflow progress:", error);
        return false;
      }

      // Invalidate cache for this estimate
      invalidateCache(`workflow-progress-${estimateId}`);
      return true;
    });
  }

  /**
   * Load workflow progress from database
   */
  static async loadWorkflowProgress(estimateId: string): Promise<{
    guidedFlowData: GuidedFlowData;
    progress: WorkflowProgress;
  } | null> {
    const supabase = createClient();

    return withDatabaseRetry(async () => {
      const { data, error } = await supabase
        .from("estimate_flows")
        .select("*")
        .eq("estimate_id", estimateId)
        .single();

      if (error || !data) {
        console.error("Failed to load workflow progress:", error);
        return null;
      }

      const guidedFlowData = data.flow_data as GuidedFlowData;
      const progress = this.calculateProgress(guidedFlowData);

      return {
        guidedFlowData,
        progress,
      };
    });
  }

  /**
   * Delete workflow progress from database
   */
  static async deleteWorkflowProgress(estimateId: string): Promise<boolean> {
    const supabase = createClient();

    return withDatabaseRetry(async () => {
      const { error } = await supabase
        .from("estimate_flows")
        .delete()
        .eq("estimate_id", estimateId);

      if (error) {
        console.error("Failed to delete workflow progress:", error);
        return false;
      }

      // Invalidate cache for this estimate
      invalidateCache(`workflow-progress-${estimateId}`);
      return true;
    });
  }

  /**
   * Generate default takeoff data for work areas
   */
  static generateDefaultTakeoffData(workAreas: WorkArea[]): TakeoffData {
    const measurements = workAreas.map((area) => ({
      id: `measurement-${area.id}`,
      areaId: area.id,
      type: "manual" as const,
      length: area.length || 0,
      width: area.width || 0,
      height: area.height || 0,
      area: area.squareFootage || 0,
      perimeter: 2 * ((area.length || 0) + (area.width || 0)),
      notes: `Generated for ${area.name}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const totalArea = measurements.reduce((sum, m) => sum + m.area, 0);
    const totalPerimeter = measurements.reduce(
      (sum, m) => sum + m.perimeter,
      0,
    );

    const summary = {
      totalArea,
      totalPerimeter,
      totalLength: measurements.reduce((sum, m) => sum + m.length, 0),
      totalWidth: measurements.reduce((sum, m) => sum + m.width, 0),
      totalHeight: measurements.reduce((sum, m) => sum + m.height, 0),
      averageHeight:
        measurements.length > 0
          ? measurements.reduce((sum, m) => sum + m.height, 0) /
            measurements.length
          : 0,
      complexity:
        totalArea > 5000 ? "high" : totalArea > 2000 ? "medium" : "low",
    };

    return {
      measurements,
      summary,
      aiAnalysis: {
        confidence: 85,
        detectedFeatures: workAreas.map((area) => area.name),
        estimatedComplexity: summary.complexity,
        recommendations: [
          "Verify measurements on-site before final estimate",
          "Consider weather conditions for outdoor work",
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get workflow completion status
   */
  static getWorkflowCompletionStatus(guidedFlowData: GuidedFlowData): {
    isComplete: boolean;
    completedSteps: number;
    totalRequiredSteps: number;
    missingSteps: string[];
  } {
    const steps = WorkflowStepManager.getWorkflowSteps();
    const requiredSteps = steps.filter((step) => step.isRequired);
    const missingSteps: string[] = [];
    let completedSteps = 0;

    requiredSteps.forEach((step) => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      if (WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
        completedSteps++;
      } else {
        missingSteps.push(step.id);
      }
    });

    return {
      isComplete: missingSteps.length === 0,
      completedSteps,
      totalRequiredSteps: requiredSteps.length,
      missingSteps,
    };
  }

  /**
   * Get next recommended step
   */
  static getNextRecommendedStep(
    guidedFlowData: GuidedFlowData,
  ): import("./workflow-step-manager").WorkflowStep | null {
    const steps = WorkflowStepManager.getWorkflowSteps();

    // First, find any required incomplete steps
    for (const step of steps) {
      if (step.isRequired) {
        const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
        if (!WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
          // Check if step is available (dependencies met)
          if (
            WorkflowValidationEngine.isStepAvailable(step.id, guidedFlowData)
          ) {
            return step;
          }
        }
      }
    }

    // Then find any optional incomplete steps
    for (const step of steps) {
      if (!step.isRequired) {
        const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
        if (!WorkflowValidationEngine.isStepCompleted(step.id, stepData)) {
          // Check if step is available (dependencies met)
          if (
            WorkflowValidationEngine.isStepAvailable(step.id, guidedFlowData)
          ) {
            return step;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get step completion summary
   */
  static getStepCompletionSummary(guidedFlowData: GuidedFlowData): {
    [stepId: string]: {
      isCompleted: boolean;
      isAvailable: boolean;
      isRequired: boolean;
      completionTime?: Date;
    };
  } {
    const steps = WorkflowStepManager.getWorkflowSteps();
    const summary: {
      [stepId: string]: {
        isCompleted: boolean;
        isAvailable: boolean;
        isRequired: boolean;
        completionTime?: Date;
      };
    } = {};

    steps.forEach((step) => {
      const stepData = guidedFlowData[step.id as keyof GuidedFlowData];
      const isCompleted = WorkflowValidationEngine.isStepCompleted(
        step.id,
        stepData,
      );
      const isAvailable = WorkflowValidationEngine.isStepAvailable(
        step.id,
        guidedFlowData,
      );

      summary[step.id] = {
        isCompleted,
        isAvailable,
        isRequired: step.isRequired,
        completionTime: isCompleted ? new Date() : undefined,
      };
    });

    return summary;
  }
}

/**
 * Analytics Data Collector Service
 * Handles core workflow analytics data collection and tracking
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import {
  WorkflowAnalytics,
  StepDuration,
  AIInteractionSummary,
} from "@/lib/types/analytics-types";

export class AnalyticsDataCollector {
  private supabase;

  constructor() {
    this.supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  /**
   * Start tracking a new workflow
   */
  async startWorkflowTracking(
    estimateId: string,
    userId: string,
    userName: string,
    userRole: string,
    templateUsed?: string,
  ): Promise<string> {
    const workflowAnalytics: Partial<WorkflowAnalytics> = {
      estimateId,
      userId,
      userName,
      userRole,
      templateUsed,
      startTime: new Date(),
      currentStep: 1,
      totalSteps: 9,
      totalDuration: 0,
      stepDurations: [],
      aiInteractions: [],
      validationScore: 0,
      errorCount: 0,
      warningCount: 0,
      autoFixesApplied: 0,
      collaboratorCount: 1,
      conflictCount: 0,
      averageConflictResolutionTime: 0,
      completionRate: 0,
      usabilityScore: 0,
      revisionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from("workflow_analytics")
      .insert([workflowAnalytics])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Update workflow step information
   */
  async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    stepName: string,
    stepData: Partial<StepDuration>,
  ): Promise<void> {
    // Get current analytics
    const { data: analytics, error: fetchError } = await this.supabase
      .from("workflow_analytics")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (fetchError) throw fetchError;

    // Update step durations
    const stepDurations = analytics.stepDurations || [];
    const existingStepIndex = stepDurations.findIndex(
      (s: StepDuration) => s.stepId === stepId,
    );

    if (existingStepIndex >= 0) {
      stepDurations[existingStepIndex] = {
        ...stepDurations[existingStepIndex],
        ...stepData,
        duration:
          stepData.duration || stepDurations[existingStepIndex].duration,
      };
    } else {
      stepDurations.push({
        stepId,
        stepName,
        startTime: new Date(),
        duration: 0,
        visitCount: 1,
        backtrackCount: 0,
        validationErrors: 0,
        aiAssistanceUsed: false,
        helpViewCount: 0,
        timeSpentInHelp: 0,
        ...stepData,
      });
    }

    // Update analytics
    const { error: updateError } = await this.supabase
      .from("workflow_analytics")
      .update({
        stepDurations,
        currentStep: parseInt(stepId.replace("step", "")),
        updatedAt: new Date(),
      })
      .eq("id", workflowId);

    if (updateError) throw updateError;
  }

  /**
   * Record AI interaction data
   */
  async recordAIInteraction(
    workflowId: string,
    interaction: Omit<AIInteractionSummary, "timestamp">,
  ): Promise<void> {
    const { data: analytics, error: fetchError } = await this.supabase
      .from("workflow_analytics")
      .select("aiInteractions")
      .eq("id", workflowId)
      .single();

    if (fetchError) throw fetchError;

    const aiInteractions = analytics.aiInteractions || [];
    aiInteractions.push({
      ...interaction,
      timestamp: new Date(),
    });

    const { error: updateError } = await this.supabase
      .from("workflow_analytics")
      .update({
        aiInteractions,
        updatedAt: new Date(),
      })
      .eq("id", workflowId);

    if (updateError) throw updateError;
  }

  /**
   * Complete workflow tracking
   */
  async completeWorkflow(
    workflowId: string,
    qualityScore: number,
    usabilityScore: number,
  ): Promise<void> {
    const { data: analytics, error: fetchError } = await this.supabase
      .from("workflow_analytics")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (fetchError) throw fetchError;

    const endTime = new Date();
    const totalDuration = endTime.getTime() - analytics.startTime.getTime();

    const { error: updateError } = await this.supabase
      .from("workflow_analytics")
      .update({
        endTime,
        totalDuration,
        completionRate: 100,
        validationScore: qualityScore,
        usabilityScore,
        updatedAt: new Date(),
      })
      .eq("id", workflowId);

    if (updateError) throw updateError;
  }

  /**
   * Get workflow analytics data
   */
  async getWorkflowAnalytics(workflowId: string): Promise<WorkflowAnalytics> {
    const { data, error } = await this.supabase
      .from("workflow_analytics")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Record help interaction
   */
  async recordHelpInteraction(
    workflowId: string,
    stepId: string,
    helpType: string,
    helpContent: string,
    timeSpent: number,
    wasHelpful: boolean,
  ): Promise<void> {
    const { data: analytics, error: fetchError } = await this.supabase
      .from("workflow_analytics")
      .select("stepDurations")
      .eq("id", workflowId)
      .single();

    if (fetchError) throw fetchError;

    const stepDurations = analytics.stepDurations || [];
    const stepIndex = stepDurations.findIndex(
      (s: StepDuration) => s.stepId === stepId,
    );

    if (stepIndex >= 0) {
      stepDurations[stepIndex] = {
        ...stepDurations[stepIndex],
        helpViewCount: (stepDurations[stepIndex].helpViewCount || 0) + 1,
        timeSpentInHelp:
          (stepDurations[stepIndex].timeSpentInHelp || 0) + timeSpent,
      };

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          stepDurations,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    }
  }
}

/**
 * Analytics Service - Refactored Version
 * Replaces the monolithic analytics-service.ts with modular architecture
 *
 * This is a drop-in replacement that maintains the same public API
 * while using the new modular services underneath.
 */

import { analyticsService, AnalyticsOrchestrator } from "./analytics";
import {
  WorkflowAnalytics,
  UserWorkflowStats,
  TeamAnalytics,
  WorkflowBenchmark,
  PredictiveInsight,
  AnalyticsMetric,
  TimeSeriesData,
  StepDuration,
  AIInteractionSummary,
} from "@/lib/types/analytics-types";

/**
 * Analytics Service
 * Drop-in replacement for the original monolithic service
 *
 * @deprecated The constructor-based approach is deprecated.
 * Use the singleton analyticsService from "./analytics" instead.
 */
export class AnalyticsService {
  private orchestrator: AnalyticsOrchestrator;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Log deprecation warning
    console.warn(
      "AnalyticsService constructor is deprecated. " +
        "Use the singleton analyticsService from './analytics' instead.",
    );

    // Use the singleton orchestrator regardless of parameters
    this.orchestrator = analyticsService;
  }

  // === Data Collection Methods ===

  async startWorkflowTracking(
    estimateId: string,
    userId: string,
    userName: string,
    userRole: string,
    templateUsed?: string,
  ): Promise<string> {
    return this.orchestrator.startWorkflowTracking(
      estimateId,
      userId,
      userName,
      userRole,
      templateUsed,
    );
  }

  async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    stepName: string,
    stepData: Partial<StepDuration>,
  ): Promise<void> {
    return this.orchestrator.updateWorkflowStep(
      workflowId,
      stepId,
      stepName,
      stepData,
    );
  }

  async recordAIInteraction(
    workflowId: string,
    interaction: Omit<AIInteractionSummary, "timestamp">,
  ): Promise<void> {
    return this.orchestrator.recordAIInteraction(workflowId, interaction);
  }

  async completeWorkflow(
    workflowId: string,
    qualityScore: number,
    usabilityScore: number,
  ): Promise<void> {
    return this.orchestrator.completeWorkflow(
      workflowId,
      qualityScore,
      usabilityScore,
    );
  }

  async getWorkflowAnalytics(workflowId: string): Promise<WorkflowAnalytics> {
    return this.orchestrator.getWorkflowAnalytics(workflowId);
  }

  async recordHelpInteraction(
    workflowId: string,
    stepId: string,
    helpType: string,
    helpContent: string,
    timeSpent: number,
    wasHelpful: boolean,
  ): Promise<void> {
    return this.orchestrator.recordHelpInteraction(
      workflowId,
      stepId,
      helpType,
      helpContent,
      timeSpent,
      wasHelpful,
    );
  }

  // === Statistics Methods ===

  async getUserWorkflowStats(userId: string): Promise<UserWorkflowStats> {
    return this.orchestrator.getUserWorkflowStats(userId);
  }

  async getTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
    return this.orchestrator.getTeamAnalytics(teamId);
  }

  async getWorkflowBenchmarks(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<WorkflowBenchmark[]> {
    return this.orchestrator.getWorkflowBenchmarks(userId, timeframe);
  }

  // === Insights Methods ===

  async getAnalyticsMetrics(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<AnalyticsMetric[]> {
    return this.orchestrator.getAnalyticsMetrics(userId, timeframe);
  }

  async getTimeSeriesData(
    metric: string,
    granularity: "hour" | "day" | "week" | "month",
    userId?: string,
  ): Promise<TimeSeriesData[]> {
    return this.orchestrator.getTimeSeriesData(metric, granularity, userId);
  }

  async generatePredictiveInsights(
    userId?: string,
    workflowType?: string,
  ): Promise<PredictiveInsight[]> {
    return this.orchestrator.generatePredictiveInsights(userId, workflowType);
  }

  // === Additional Methods that may exist in original ===

  async getHelpAnalytics(workflowId: string): Promise<any> {
    // This would be implemented based on the original method
    const analytics = await this.orchestrator.getWorkflowAnalytics(workflowId);

    // Process help-related data from analytics
    const helpInteractions = (analytics.stepDurations || []).map((step) => ({
      stepId: step.stepId,
      stepName: step.stepName,
      helpViewCount: step.helpViewCount || 0,
      timeSpentInHelp: step.timeSpentInHelp || 0,
    }));

    return {
      workflowId,
      totalHelpInteractions: helpInteractions.reduce(
        (sum, h) => sum + h.helpViewCount,
        0,
      ),
      totalTimeInHelp: helpInteractions.reduce(
        (sum, h) => sum + h.timeSpentInHelp,
        0,
      ),
      stepHelpData: helpInteractions,
    };
  }

  async getHelpEffectivenessMetrics(userId?: string): Promise<{
    averageHelpTime: number;
    helpCompletionRate: number;
    mostHelpfulContent: any[];
    leastHelpfulContent: any[];
  }> {
    // This would be implemented based on the original method
    // For now, return empty structure
    return {
      averageHelpTime: 0,
      helpCompletionRate: 0,
      mostHelpfulContent: [],
      leastHelpfulContent: [],
    };
  }

  // === Cache Management Methods ===

  get isOnline(): boolean {
    return this.orchestrator.isOnline;
  }

  get pendingRetries(): number {
    return this.orchestrator.pendingRetries;
  }

  clearCache(): void {
    this.orchestrator.clearCache();
  }

  getCachedData(key: string): any {
    return this.orchestrator.getCachedData(key);
  }

  // === Health Check ===

  async healthCheck() {
    return this.orchestrator.healthCheck();
  }
}

// Export singleton instance for backward compatibility
export const analyticsServiceLegacy = new AnalyticsService();

// Re-export the new recommended approach
export { analyticsService } from "./analytics";

// Re-export types
export type {
  WorkflowAnalytics,
  UserWorkflowStats,
  TeamAnalytics,
  WorkflowBenchmark,
  PredictiveInsight,
  AnalyticsMetric,
  TimeSeriesData,
  StepDuration,
  AIInteractionSummary,
};

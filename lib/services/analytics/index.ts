/**
 * Analytics Services Index
 * Main orchestrator for all analytics services
 */

import { AnalyticsDataCollector } from "./analytics-data-collector";
import { AnalyticsCacheService } from "./analytics-cache-service";
import { AnalyticsStatsService } from "./analytics-stats-service";
import { AnalyticsInsightsService } from "./analytics-insights-service";
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
 * Main Analytics Service Orchestrator
 * Coordinates all analytics sub-services with caching and error handling
 */
export class AnalyticsOrchestrator {
  private dataCollector: AnalyticsDataCollector;
  private cacheService: AnalyticsCacheService;
  private statsService: AnalyticsStatsService;
  private insightsService: AnalyticsInsightsService;

  constructor() {
    // Initialize cache service first (dependency for others)
    this.cacheService = new AnalyticsCacheService();

    // Initialize other services with cache dependency
    this.dataCollector = new AnalyticsDataCollector();
    this.statsService = new AnalyticsStatsService(this.cacheService);
    this.insightsService = new AnalyticsInsightsService(this.cacheService);
  }

  // === Data Collection Methods ===

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
    return this.cacheService.withFallback(
      () =>
        this.dataCollector.startWorkflowTracking(
          estimateId,
          userId,
          userName,
          userRole,
          templateUsed,
        ),
      `workflow_start_${estimateId}`,
      `temp_${Date.now()}`,
      false, // Not retryable for creation operations
    );
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
    return this.cacheService.withFallback(
      () =>
        this.dataCollector.updateWorkflowStep(
          workflowId,
          stepId,
          stepName,
          stepData,
        ),
      `workflow_step_${workflowId}_${stepId}`,
      undefined,
      true, // Retryable
    );
  }

  /**
   * Record AI interaction data
   */
  async recordAIInteraction(
    workflowId: string,
    interaction: Omit<AIInteractionSummary, "timestamp">,
  ): Promise<void> {
    return this.cacheService.withFallback(
      () => this.dataCollector.recordAIInteraction(workflowId, interaction),
      `ai_interaction_${workflowId}`,
      undefined,
      true, // Retryable
    );
  }

  /**
   * Complete workflow tracking
   */
  async completeWorkflow(
    workflowId: string,
    qualityScore: number,
    usabilityScore: number,
  ): Promise<void> {
    return this.cacheService.withFallback(
      () =>
        this.dataCollector.completeWorkflow(
          workflowId,
          qualityScore,
          usabilityScore,
        ),
      `workflow_complete_${workflowId}`,
      undefined,
      true, // Retryable
    );
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
    return this.cacheService.withFallback(
      () =>
        this.dataCollector.recordHelpInteraction(
          workflowId,
          stepId,
          helpType,
          helpContent,
          timeSpent,
          wasHelpful,
        ),
      `help_interaction_${workflowId}_${stepId}`,
      undefined,
      true, // Retryable
    );
  }

  // === Data Retrieval Methods ===

  /**
   * Get workflow analytics data
   */
  async getWorkflowAnalytics(workflowId: string): Promise<WorkflowAnalytics> {
    return this.cacheService.withFallback(
      () => this.dataCollector.getWorkflowAnalytics(workflowId),
      `workflow_analytics_${workflowId}`,
      undefined,
      true, // Retryable
    );
  }

  // === Statistics Methods ===

  /**
   * Get user-specific workflow statistics
   */
  async getUserWorkflowStats(userId: string): Promise<UserWorkflowStats> {
    return this.statsService.getUserWorkflowStats(userId);
  }

  /**
   * Get team analytics data
   */
  async getTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
    return this.statsService.getTeamAnalytics(teamId);
  }

  /**
   * Get workflow benchmarks
   */
  async getWorkflowBenchmarks(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<WorkflowBenchmark[]> {
    return this.statsService.getWorkflowBenchmarks(userId, timeframe);
  }

  // === Insights Methods ===

  /**
   * Get analytics metrics
   */
  async getAnalyticsMetrics(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<AnalyticsMetric[]> {
    return this.insightsService.getAnalyticsMetrics(userId, timeframe);
  }

  /**
   * Get time series data for analytics charts
   */
  async getTimeSeriesData(
    metric: string,
    granularity: "hour" | "day" | "week" | "month",
    userId?: string,
  ): Promise<TimeSeriesData[]> {
    return this.insightsService.getTimeSeriesData(metric, granularity, userId);
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(
    userId?: string,
    workflowType?: string,
  ): Promise<PredictiveInsight[]> {
    return this.insightsService.generatePredictiveInsights(
      userId,
      workflowType,
    );
  }

  // === Cache Management Methods ===

  /**
   * Check if service is online
   */
  get isOnline(): boolean {
    return this.cacheService.isConnected;
  }

  /**
   * Get number of pending retry operations
   */
  get pendingRetries(): number {
    return this.cacheService.pendingRetries;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cacheService.clearCache();
  }

  /**
   * Get cached data for debugging
   */
  getCachedData(key: string): any {
    return this.cacheService.getCachedData(key);
  }

  // === Health Check Methods ===

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: {
      dataCollector: boolean;
      cache: boolean;
      stats: boolean;
      insights: boolean;
    };
    details: {
      isOnline: boolean;
      pendingRetries: number;
      cacheSize: number;
    };
  }> {
    try {
      // Test basic functionality
      const testWorkflowId = "health-check-test";

      // Test cache service
      const cacheWorking = this.cacheService.isConnected;

      // Count healthy services
      const services = {
        dataCollector: true, // Always available (synchronous operations)
        cache: cacheWorking,
        stats: cacheWorking, // Depends on cache
        insights: cacheWorking, // Depends on cache
      };

      const healthyCount = Object.values(services).filter(Boolean).length;

      let status: "healthy" | "degraded" | "unhealthy";
      if (healthyCount === 4) {
        status = "healthy";
      } else if (healthyCount >= 2) {
        status = "degraded";
      } else {
        status = "unhealthy";
      }

      return {
        status,
        services,
        details: {
          isOnline: this.isOnline,
          pendingRetries: this.pendingRetries,
          cacheSize: 0, // Would need to expose cache size if needed
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        services: {
          dataCollector: false,
          cache: false,
          stats: false,
          insights: false,
        },
        details: {
          isOnline: false,
          pendingRetries: 0,
          cacheSize: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsOrchestrator();

// Export individual services for direct access if needed
export {
  AnalyticsDataCollector,
  AnalyticsCacheService,
  AnalyticsStatsService,
  AnalyticsInsightsService,
};

// Re-export types for convenience
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

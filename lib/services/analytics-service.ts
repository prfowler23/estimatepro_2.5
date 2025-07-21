/**
 * Advanced Analytics Service
 * Handles workflow analytics data collection, processing, and insights
 */

import { createClient } from "@supabase/supabase-js";
import {
  WorkflowAnalytics,
  UserWorkflowStats,
  TeamAnalytics,
  WorkflowBenchmark,
  PredictiveInsight,
  AnalyticsFilter,
  AnalyticsMetric,
  TimeSeriesData,
  StepDuration,
  AIInteractionSummary,
  WorkflowQuality,
  ActionItem,
} from "@/lib/types/analytics-types";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export class AnalyticsService {
  private supabase;
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private isOnline = true;
  private fallbackData = new Map<string, any>();
  private retryQueue: Array<() => Promise<void>> = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeErrorHandling();
  }

  private initializeErrorHandling() {
    // Monitor connection status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.processRetryQueue();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  private async withFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackValue?: T,
    retryable = true,
  ): Promise<T> {
    try {
      const result = await this.executeWithRetry(operation);
      // Cache successful result for fallback
      this.fallbackData.set(fallbackKey, result);
      return result;
    } catch (error) {
      console.warn(
        `Analytics operation failed, using fallback for ${fallbackKey}:`,
        error,
      );

      // Try cached fallback data first
      const cachedFallback = this.fallbackData.get(fallbackKey);
      if (cachedFallback) {
        return cachedFallback;
      }

      // Use provided fallback value
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      // Queue for retry if retryable and offline
      if (retryable && !this.isOnline) {
        this.retryQueue.push(async () => {
          try {
            const result = await operation();
            this.fallbackData.set(fallbackKey, result);
          } catch (retryError) {
            console.warn(`Retry failed for ${fallbackKey}:`, retryError);
          }
        });
      }

      // Return empty/default data structure based on the expected type
      return this.getEmptyFallback(fallbackKey) as T;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Determine if error is worth retrying
    if (!error) return false;

    const retryableErrors = [
      "NETWORK_ERROR",
      "TIMEOUT",
      "CONNECTION_ERROR",
      "TEMPORARY_ERROR",
      "RATE_LIMIT_ERROR",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message?.includes(errorType) ||
        error.code?.includes(errorType) ||
        error.status >= 500, // Server errors
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processRetryQueue(): Promise<void> {
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.warn("Retry queue operation failed:", error);
        }
      }
    }
  }

  private getEmptyFallback(key: string): any {
    if (key.includes("metrics")) {
      return [];
    }
    if (key.includes("stats")) {
      return {
        userId: "",
        userName: "",
        userRole: "",
        totalWorkflows: 0,
        completedWorkflows: 0,
        averageCompletionTime: 0,
        averageQualityScore: 0,
        averageStepDuration: 0,
        averageBacktrackRate: 0,
        averageErrorRate: 0,
        averageAIUsage: 0,
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        qualityTrend: "stable" as const,
        efficiencyTrend: "stable" as const,
        slowestSteps: [],
        mostCommonErrors: [],
        underutilizedFeatures: [],
      };
    }
    if (key.includes("insights")) {
      return [];
    }
    if (key.includes("benchmarks")) {
      return [];
    }
    if (key.includes("timeseries")) {
      return [];
    }
    return null;
  }

  /**
   * Workflow Analytics Collection
   */
  async startWorkflowTracking(
    estimateId: string,
    userId: string,
    userName: string,
    userRole: string,
    templateUsed?: string,
  ): Promise<string> {
    return this.withFallback(
      async () => {
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
      },
      `workflow_tracking_${estimateId}`,
      `temp_${Date.now()}`, // Temporary ID fallback
      false, // Not retryable for creation operations
    );
  }

  async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    stepName: string,
    stepData: Partial<StepDuration>,
  ): Promise<void> {
    try {
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
          currentStep:
            parseInt(stepId.replace("step-", "")) || analytics.currentStep,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error updating workflow step:", error);
      throw error;
    }
  }

  async recordAIInteraction(
    workflowId: string,
    interaction: Partial<AIInteractionSummary>,
  ): Promise<void> {
    try {
      const { data: analytics, error: fetchError } = await this.supabase
        .from("workflow_analytics")
        .select("aiInteractions")
        .eq("id", workflowId)
        .single();

      if (fetchError) throw fetchError;

      const aiInteractions = analytics.aiInteractions || [];
      aiInteractions.push({
        interactionId: `ai-${Date.now()}`,
        timestamp: new Date(),
        duration: 0,
        tokensUsed: 0,
        cost: 0,
        accuracy: 0,
        userAcceptanceRate: 0,
        confidence: 0,
        ...interaction,
      });

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          aiInteractions,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error recording AI interaction:", error);
      throw error;
    }
  }

  async completeWorkflow(
    workflowId: string,
    completionData: {
      completionQuality: WorkflowQuality;
      estimateValue?: number;
      userSatisfactionScore?: number;
    },
  ): Promise<void> {
    try {
      const endTime = new Date();

      const { data: analytics, error: fetchError } = await this.supabase
        .from("workflow_analytics")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (fetchError) throw fetchError;

      const startTime = new Date(analytics.startTime);
      const totalDuration = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000 / 60,
      );

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          endTime,
          totalDuration,
          completionRate: 100,
          completionQuality: completionData.completionQuality,
          estimateValue: completionData.estimateValue,
          userSatisfactionScore: completionData.userSatisfactionScore,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error completing workflow:", error);
      throw error;
    }
  }

  /**
   * Analytics Queries and Aggregations
   */
  async getWorkflowAnalytics(
    filters: AnalyticsFilter = {},
  ): Promise<WorkflowAnalytics[]> {
    const cacheKey = `workflow_analytics_${JSON.stringify(filters)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    return this.withFallback(
      async () => {
        let query = this.supabase
          .from("workflow_analytics")
          .select("*")
          .order("createdAt", { ascending: false });

        // Apply filters
        if (filters.startDate) {
          query = query.gte("createdAt", filters.startDate.toISOString());
        }
        if (filters.endDate) {
          query = query.lte("createdAt", filters.endDate.toISOString());
        }
        if (filters.userIds?.length) {
          query = query.in("userId", filters.userIds);
        }
        if (filters.templates?.length) {
          query = query.in("templateUsed", filters.templates);
        }
        if (filters.completionStatus === "completed") {
          query = query.eq("completionRate", 100);
        } else if (filters.completionStatus === "abandoned") {
          query = query.lt("completionRate", 100);
        }

        const { data, error } = await query;
        if (error) throw error;

        this.setCachedData(cacheKey, data, 300); // 5 minutes
        return data;
      },
      cacheKey,
      [], // Empty array fallback
      true, // Retryable
    );
  }

  async getUserWorkflowStats(userId: string): Promise<UserWorkflowStats> {
    const cacheKey = `user_stats_${userId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    return this.withFallback(
      async () => {
        const { data: workflows, error } = await this.supabase
          .from("workflow_analytics")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: false });

        if (error) throw error;

        const stats = this.calculateUserStats(workflows);
        this.setCachedData(cacheKey, stats, 600); // 10 minutes
        return stats;
      },
      cacheKey,
      undefined, // Will use getEmptyFallback for stats
      true, // Retryable
    );
  }

  async getTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
    try {
      const cacheKey = `team_analytics_${teamId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Get team members (this would need to be implemented in the database)
      const { data: teamMembers, error: teamError } = await this.supabase
        .from("team_members")
        .select("userId")
        .eq("teamId", teamId);

      if (teamError) throw teamError;

      const userIds = teamMembers.map((m) => m.userId);

      const { data: workflows, error } = await this.supabase
        .from("workflow_analytics")
        .select("*")
        .in("userId", userIds)
        .order("createdAt", { ascending: false });

      if (error) throw error;

      const analytics = this.calculateTeamAnalytics(teamId, workflows);

      this.setCachedData(cacheKey, analytics, 300); // 5 minutes
      return analytics;
    } catch (error) {
      console.error("Error getting team analytics:", error);
      throw error;
    }
  }

  async getWorkflowBenchmarks(
    benchmarkType: string,
    filters: AnalyticsFilter = {},
  ): Promise<WorkflowBenchmark[]> {
    try {
      const workflows = await this.getWorkflowAnalytics(filters);
      return this.calculateBenchmarks(workflows, benchmarkType);
    } catch (error) {
      console.error("Error getting workflow benchmarks:", error);
      throw error;
    }
  }

  async getAnalyticsMetrics(
    filters: AnalyticsFilter = {},
  ): Promise<AnalyticsMetric[]> {
    try {
      const workflows = await this.getWorkflowAnalytics(filters);
      return this.calculateMetrics(workflows);
    } catch (error) {
      console.error("Error getting analytics metrics:", error);
      throw error;
    }
  }

  async getTimeSeriesData(
    metric: string,
    timeRange: {
      start: Date;
      end: Date;
      granularity: "hour" | "day" | "week" | "month";
    },
    filters: AnalyticsFilter = {},
  ): Promise<TimeSeriesData[]> {
    try {
      const workflows = await this.getWorkflowAnalytics({
        ...filters,
        startDate: timeRange.start,
        endDate: timeRange.end,
      });

      return this.aggregateTimeSeriesData(
        workflows,
        metric,
        timeRange.granularity,
      );
    } catch (error) {
      console.error("Error getting time series data:", error);
      throw error;
    }
  }

  /**
   * Predictive Analytics and Insights
   */
  async generatePredictiveInsights(
    workflowId?: string,
    userId?: string,
  ): Promise<PredictiveInsight[]> {
    try {
      const insights: PredictiveInsight[] = [];

      // Get relevant data
      const filters: AnalyticsFilter = {};
      if (userId) filters.userIds = [userId];

      const workflows = await this.getWorkflowAnalytics(filters);

      // Generate completion time prediction
      const completionPrediction = this.predictCompletionTime(workflows);
      if (completionPrediction) insights.push(completionPrediction);

      // Generate quality prediction
      const qualityPrediction = this.predictQualityScore(workflows);
      if (qualityPrediction) insights.push(qualityPrediction);

      // Detect bottlenecks
      const bottleneckInsights = this.detectBottlenecks(workflows);
      insights.push(...bottleneckInsights);

      // Resource optimization suggestions
      const optimizationInsights =
        this.generateOptimizationSuggestions(workflows);
      insights.push(...optimizationInsights);

      return insights;
    } catch (error) {
      console.error("Error generating predictive insights:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private calculateUserStats(
    workflows: WorkflowAnalytics[],
  ): UserWorkflowStats {
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    const totalWorkflows = workflows.length;

    return {
      userId: workflows[0]?.userId || "",
      userName: workflows[0]?.userName || "",
      userRole: workflows[0]?.userRole || "",
      totalWorkflows,
      completedWorkflows: completedWorkflows.length,
      averageCompletionTime: this.calculateAverage(
        completedWorkflows.map((w) => w.totalDuration),
      ),
      averageQualityScore: this.calculateAverage(
        completedWorkflows.map((w) => w.completionQuality?.overallScore || 0),
      ),
      averageStepDuration: this.calculateAverageStepDuration(workflows),
      averageBacktrackRate: this.calculateAverageBacktrackRate(workflows),
      averageErrorRate: this.calculateAverageErrorRate(workflows),
      averageAIUsage: this.calculateAverageAIUsage(workflows),
      weeklyCompletionRate: this.calculateWeeklyCompletionRate(workflows),
      monthlyCompletionRate: this.calculateMonthlyCompletionRate(workflows),
      qualityTrend: this.calculateQualityTrend(workflows),
      efficiencyTrend: this.calculateEfficiencyTrend(workflows),
      slowestSteps: this.findSlowestSteps(workflows),
      mostCommonErrors: this.findMostCommonErrors(workflows),
      underutilizedFeatures: this.findUnderutilizedFeatures(workflows),
    };
  }

  private calculateTeamAnalytics(
    teamId: string,
    workflows: WorkflowAnalytics[],
  ): TeamAnalytics {
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    const uniqueUsers = new Set(workflows.map((w) => w.userId));

    return {
      teamId,
      teamName: "Team", // This would come from team data
      totalWorkflows: workflows.length,
      averageCompletionTime: this.calculateAverage(
        completedWorkflows.map((w) => w.totalDuration),
      ),
      averageQualityScore: this.calculateAverage(
        completedWorkflows.map((w) => w.completionQuality?.overallScore || 0),
      ),
      collaborationEfficiency: this.calculateCollaborationEfficiency(workflows),
      memberCount: uniqueUsers.size,
      roleDistribution: this.calculateRoleDistribution(workflows),
      experienceLevels: this.calculateExperienceLevels(workflows),
      workflowsByTemplate: this.calculateWorkflowsByTemplate(workflows),
      workflowsByComplexity: this.calculateWorkflowsByComplexity(workflows),
      averageCollaboratorCount: this.calculateAverage(
        workflows.map((w) => w.collaboratorCount),
      ),
      conflictResolutionTime: this.calculateAverage(
        workflows.map((w) => w.averageConflictResolutionTime),
      ),
      knowledgeSharing: this.calculateKnowledgeSharing(workflows),
      weeklyTrends: this.calculateWeeklyTrends(workflows),
      monthlyTrends: this.calculateMonthlyTrends(workflows),
    };
  }

  private calculateBenchmarks(
    workflows: WorkflowAnalytics[],
    benchmarkType: string,
  ): WorkflowBenchmark[] {
    // Implementation for calculating benchmarks
    const values = this.extractBenchmarkValues(workflows, benchmarkType);
    values.sort((a, b) => a - b);

    const benchmark: WorkflowBenchmark = {
      benchmarkType: benchmarkType as any,
      p25: this.percentile(values, 0.25),
      p50: this.percentile(values, 0.5),
      p75: this.percentile(values, 0.75),
      p90: this.percentile(values, 0.9),
      p95: this.percentile(values, 0.95),
      average: this.calculateAverage(values),
      sampleSize: values.length,
      lastUpdated: new Date(),
    };

    return [benchmark];
  }

  private calculateMetrics(workflows: WorkflowAnalytics[]): AnalyticsMetric[] {
    const metrics: AnalyticsMetric[] = [];

    // Completion rate metric
    const completionRate =
      (workflows.filter((w) => w.completionRate === 100).length /
        workflows.length) *
      100;
    metrics.push({
      id: "completion_rate",
      name: "Completion Rate",
      description: "Percentage of workflows completed successfully",
      value: completionRate,
      unit: "%",
      trend: "stable",
      trendPercentage: 0,
      chartType: "gauge",
      colorScheme:
        completionRate >= 90
          ? "success"
          : completionRate >= 70
            ? "warning"
            : "error",
    });

    // Average completion time
    const avgCompletionTime = this.calculateAverage(
      workflows
        .filter((w) => w.completionRate === 100)
        .map((w) => w.totalDuration),
    );
    metrics.push({
      id: "avg_completion_time",
      name: "Average Completion Time",
      description: "Average time to complete a workflow",
      value: avgCompletionTime,
      unit: "minutes",
      trend: "stable",
      trendPercentage: 0,
      chartType: "number",
      colorScheme: "info",
    });

    // Quality score
    const avgQualityScore = this.calculateAverage(
      workflows.map((w) => w.completionQuality?.overallScore || 0),
    );
    metrics.push({
      id: "avg_quality_score",
      name: "Average Quality Score",
      description: "Average quality score across all workflows",
      value: avgQualityScore,
      unit: "points",
      trend: "stable",
      trendPercentage: 0,
      chartType: "gauge",
      colorScheme:
        avgQualityScore >= 80
          ? "success"
          : avgQualityScore >= 60
            ? "warning"
            : "error",
    });

    return metrics;
  }

  private aggregateTimeSeriesData(
    workflows: WorkflowAnalytics[],
    metric: string,
    granularity: string,
  ): TimeSeriesData[] {
    // Implementation for aggregating time series data
    const groupedData = new Map<string, WorkflowAnalytics[]>();

    workflows.forEach((workflow) => {
      const key = this.getTimeKey(workflow.createdAt, granularity);
      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      groupedData.get(key)!.push(workflow);
    });

    const timeSeriesData: TimeSeriesData[] = [];

    for (const [dateKey, workflowGroup] of groupedData) {
      const value = this.calculateMetricValue(workflowGroup, metric);
      timeSeriesData.push({
        date: new Date(dateKey),
        value,
        metric,
        metadata: {
          count: workflowGroup.length,
        },
      });
    }

    return timeSeriesData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private predictCompletionTime(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight | null {
    // Implementation for completion time prediction
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    if (completedWorkflows.length < 10) return null;

    const avgTime = this.calculateAverage(
      completedWorkflows.map((w) => w.totalDuration),
    );
    const trend = this.calculateTrend(
      completedWorkflows.map((w) => w.totalDuration),
    );

    return {
      insightId: `completion_prediction_${Date.now()}`,
      type: "completion_prediction",
      confidence: 0.8,
      severity: "medium",
      prediction: `Based on recent trends, workflows are expected to take ${Math.round(avgTime)} minutes on average`,
      probability: 0.8,
      impact: "medium",
      recommendations: [
        "Monitor step durations for bottlenecks",
        "Consider workflow optimization",
        "Provide additional training for slow steps",
      ],
      actionItems: [],
      affectedWorkflows: workflows.map((w) => w.id),
      affectedUsers: [...new Set(workflows.map((w) => w.userId))],
      dataPoints: completedWorkflows,
      createdAt: new Date(),
    };
  }

  private predictQualityScore(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight | null {
    // Implementation for quality prediction
    const workflowsWithQuality = workflows.filter(
      (w) => w.completionQuality?.overallScore,
    );
    if (workflowsWithQuality.length < 5) return null;

    const avgQuality = this.calculateAverage(
      workflowsWithQuality.map((w) => w.completionQuality.overallScore),
    );

    return {
      insightId: `quality_prediction_${Date.now()}`,
      type: "quality_prediction",
      confidence: 0.7,
      severity: avgQuality < 70 ? "high" : avgQuality < 85 ? "medium" : "low",
      prediction: `Quality score is trending at ${Math.round(avgQuality)}%`,
      probability: 0.7,
      impact: avgQuality < 70 ? "high" : "medium",
      recommendations: [
        "Focus on validation improvements",
        "Increase AI assistance usage",
        "Provide quality-focused training",
      ],
      actionItems: [],
      affectedWorkflows: workflows.map((w) => w.id),
      affectedUsers: [...new Set(workflows.map((w) => w.userId))],
      dataPoints: workflowsWithQuality,
      createdAt: new Date(),
    };
  }

  private detectBottlenecks(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight[] {
    // Implementation for bottleneck detection
    const insights: PredictiveInsight[] = [];

    // Analyze step durations to find bottlenecks
    const stepDurations = new Map<string, number[]>();

    workflows.forEach((workflow) => {
      workflow.stepDurations?.forEach((step) => {
        if (!stepDurations.has(step.stepId)) {
          stepDurations.set(step.stepId, []);
        }
        stepDurations.get(step.stepId)!.push(step.duration);
      });
    });

    for (const [stepId, durations] of stepDurations) {
      const avgDuration = this.calculateAverage(durations);
      const p95Duration = this.percentile(durations, 0.95);

      if (p95Duration > avgDuration * 2) {
        insights.push({
          insightId: `bottleneck_${stepId}_${Date.now()}`,
          type: "bottleneck_detection",
          confidence: 0.9,
          severity: "high",
          prediction: `Step ${stepId} is a bottleneck with 95th percentile duration of ${Math.round(p95Duration)} seconds`,
          probability: 0.9,
          impact: "high",
          recommendations: [
            `Optimize step ${stepId} interface`,
            "Provide targeted training for this step",
            "Consider breaking down complex steps",
          ],
          actionItems: [],
          affectedWorkflows: workflows.map((w) => w.id),
          affectedUsers: [...new Set(workflows.map((w) => w.userId))],
          dataPoints: durations,
          createdAt: new Date(),
        });
      }
    }

    return insights;
  }

  private generateOptimizationSuggestions(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight[] {
    // Implementation for optimization suggestions
    const insights: PredictiveInsight[] = [];

    // AI usage optimization
    const lowAIUsage = workflows.filter(
      (w) => (w.aiInteractions?.length || 0) < 3 && w.totalDuration > 60,
    );

    if (lowAIUsage.length > workflows.length * 0.3) {
      insights.push({
        insightId: `ai_optimization_${Date.now()}`,
        type: "resource_optimization",
        confidence: 0.8,
        severity: "medium",
        prediction:
          "Low AI assistance usage detected in time-consuming workflows",
        probability: 0.8,
        impact: "medium",
        recommendations: [
          "Promote AI assistance features",
          "Provide training on AI tools",
          "Make AI suggestions more prominent",
        ],
        actionItems: [],
        affectedWorkflows: lowAIUsage.map((w) => w.id),
        affectedUsers: [...new Set(lowAIUsage.map((w) => w.userId))],
        dataPoints: lowAIUsage,
        createdAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Utility methods
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private calculateTrend(values: number[]): "up" | "down" | "stable" {
    if (values.length < 2) return "stable";

    const recent = values.slice(-Math.min(10, values.length));
    const older = values.slice(0, -Math.min(10, values.length));

    if (older.length === 0) return "stable";

    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 5) return "up";
    if (changePercent < -5) return "down";
    return "stable";
  }

  private getTimeKey(date: Date, granularity: string): string {
    const d = new Date(date);

    switch (granularity) {
      case "hour":
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      case "day":
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      case "week":
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      case "month":
        return `${d.getFullYear()}-${d.getMonth()}`;
      default:
        return d.toISOString().split("T")[0];
    }
  }

  private calculateMetricValue(
    workflows: WorkflowAnalytics[],
    metric: string,
  ): number {
    switch (metric) {
      case "completion_rate":
        return (
          (workflows.filter((w) => w.completionRate === 100).length /
            workflows.length) *
          100
        );
      case "average_duration":
        return this.calculateAverage(workflows.map((w) => w.totalDuration));
      case "quality_score":
        return this.calculateAverage(
          workflows.map((w) => w.completionQuality?.overallScore || 0),
        );
      default:
        return 0;
    }
  }

  // Additional helper methods would be implemented here
  private calculateAverageStepDuration(workflows: WorkflowAnalytics[]): number {
    const allSteps = workflows.flatMap((w) => w.stepDurations || []);
    return this.calculateAverage(allSteps.map((s) => s.duration));
  }

  private calculateAverageBacktrackRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const allSteps = workflows.flatMap((w) => w.stepDurations || []);
    return this.calculateAverage(allSteps.map((s) => s.backtrackCount));
  }

  private calculateAverageErrorRate(workflows: WorkflowAnalytics[]): number {
    return this.calculateAverage(workflows.map((w) => w.errorCount));
  }

  private calculateAverageAIUsage(workflows: WorkflowAnalytics[]): number {
    return this.calculateAverage(
      workflows.map((w) => w.aiInteractions?.length || 0),
    );
  }

  private calculateWeeklyCompletionRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentWorkflows = workflows.filter(
      (w) => new Date(w.createdAt) >= oneWeekAgo,
    );
    if (recentWorkflows.length === 0) return 0;

    return (
      (recentWorkflows.filter((w) => w.completionRate === 100).length /
        recentWorkflows.length) *
      100
    );
  }

  private calculateMonthlyCompletionRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentWorkflows = workflows.filter(
      (w) => new Date(w.createdAt) >= oneMonthAgo,
    );
    if (recentWorkflows.length === 0) return 0;

    return (
      (recentWorkflows.filter((w) => w.completionRate === 100).length /
        recentWorkflows.length) *
      100
    );
  }

  private calculateQualityTrend(
    workflows: WorkflowAnalytics[],
  ): "improving" | "stable" | "declining" {
    const qualityScores = workflows
      .filter((w) => w.completionQuality?.overallScore)
      .map((w) => w.completionQuality.overallScore);

    return this.calculateTrend(qualityScores) as
      | "improving"
      | "stable"
      | "declining";
  }

  private calculateEfficiencyTrend(
    workflows: WorkflowAnalytics[],
  ): "improving" | "stable" | "declining" {
    const durations = workflows.map((w) => w.totalDuration);
    const trend = this.calculateTrend(durations);

    // For efficiency, down trend is improving (less time)
    return trend === "down"
      ? "improving"
      : trend === "up"
        ? "declining"
        : "stable";
  }

  private findSlowestSteps(workflows: WorkflowAnalytics[]): string[] {
    const stepDurations = new Map<string, number[]>();

    workflows.forEach((workflow) => {
      workflow.stepDurations?.forEach((step) => {
        if (!stepDurations.has(step.stepId)) {
          stepDurations.set(step.stepId, []);
        }
        stepDurations.get(step.stepId)!.push(step.duration);
      });
    });

    const avgDurations = Array.from(stepDurations.entries())
      .map(([stepId, durations]) => ({
        stepId,
        avgDuration: this.calculateAverage(durations),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    return avgDurations.slice(0, 3).map((s) => s.stepId);
  }

  private findMostCommonErrors(workflows: WorkflowAnalytics[]): string[] {
    // This would analyze error patterns - simplified implementation
    return ["validation_error", "missing_data", "upload_failure"];
  }

  private findUnderutilizedFeatures(workflows: WorkflowAnalytics[]): string[] {
    // This would analyze feature usage - simplified implementation
    return ["ai_suggestions", "templates", "collaboration"];
  }

  private calculateCollaborationEfficiency(
    workflows: WorkflowAnalytics[],
  ): number {
    const collaborativeWorkflows = workflows.filter(
      (w) => w.collaboratorCount > 1,
    );
    if (collaborativeWorkflows.length === 0) return 0;

    const avgCollaborationTime = this.calculateAverage(
      collaborativeWorkflows.map((w) => w.totalDuration),
    );
    const avgSoloTime = this.calculateAverage(
      workflows
        .filter((w) => w.collaboratorCount === 1)
        .map((w) => w.totalDuration),
    );

    return avgSoloTime > 0 ? (avgSoloTime / avgCollaborationTime) * 100 : 0;
  }

  private calculateRoleDistribution(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    workflows.forEach((workflow) => {
      distribution[workflow.userRole] =
        (distribution[workflow.userRole] || 0) + 1;
    });

    return distribution;
  }

  private calculateExperienceLevels(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    // This would be based on user experience data - simplified implementation
    return {
      beginner: Math.floor(workflows.length * 0.3),
      intermediate: Math.floor(workflows.length * 0.5),
      advanced: Math.floor(workflows.length * 0.2),
    };
  }

  private calculateWorkflowsByTemplate(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    workflows.forEach((workflow) => {
      const template = workflow.templateUsed || "none";
      distribution[template] = (distribution[template] || 0) + 1;
    });

    return distribution;
  }

  private calculateWorkflowsByComplexity(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    workflows.forEach((workflow) => {
      const complexity =
        workflow.totalDuration < 30
          ? "simple"
          : workflow.totalDuration < 60
            ? "medium"
            : "complex";
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    });

    return distribution;
  }

  private calculateKnowledgeSharing(workflows: WorkflowAnalytics[]): number {
    if (workflows.length === 0) return 0;

    // Calculate knowledge sharing based on workflow completion patterns and collaboration
    let sharingScore = 0;
    let totalWorkflows = workflows.length;

    // Factor 1: Template reuse (indicates knowledge sharing)
    const templateUsage = new Map<string, number>();
    workflows.forEach((workflow) => {
      const template = workflow.templateUsed || "custom";
      templateUsage.set(template, (templateUsage.get(template) || 0) + 1);
    });

    // Higher reuse of templates indicates better knowledge sharing
    const reuseRatio =
      Math.max(...Array.from(templateUsage.values())) / totalWorkflows;
    sharingScore += reuseRatio * 30; // Up to 30 points for template reuse

    // Factor 2: Completion rate consistency (indicates standardization)
    const completionRates = workflows
      .map((w) => w.completionRate)
      .filter((r) => r > 0);
    if (completionRates.length > 0) {
      const avgCompletion =
        completionRates.reduce((sum, rate) => sum + rate, 0) /
        completionRates.length;
      const variance =
        completionRates.reduce(
          (sum, rate) => sum + Math.pow(rate - avgCompletion, 2),
          0,
        ) / completionRates.length;
      const consistency = Math.max(0, 100 - Math.sqrt(variance));
      sharingScore += (consistency / 100) * 25; // Up to 25 points for consistency
    }

    // Factor 3: Team collaboration indicators
    const userIds = new Set(workflows.map((w) => w.userId).filter((id) => id));
    const collaborationScore = Math.min(userIds.size / 5, 1) * 20; // Up to 20 points for team size
    sharingScore += collaborationScore;

    // Factor 4: Time efficiency improvements
    const timeData = workflows
      .filter((w) => w.totalDuration && w.totalDuration > 0)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

    if (timeData.length >= 3) {
      const firstHalf = timeData.slice(0, Math.floor(timeData.length / 2));
      const secondHalf = timeData.slice(Math.floor(timeData.length / 2));

      const avgFirstHalf =
        firstHalf.reduce((sum, w) => sum + (w.totalDuration || 0), 0) /
        firstHalf.length;
      const avgSecondHalf =
        secondHalf.reduce((sum, w) => sum + (w.totalDuration || 0), 0) /
        secondHalf.length;

      if (avgFirstHalf > 0) {
        const improvement = Math.max(
          0,
          (avgFirstHalf - avgSecondHalf) / avgFirstHalf,
        );
        sharingScore += improvement * 25; // Up to 25 points for time improvement
      }
    }

    return Math.min(Math.round(sharingScore), 100);
  }

  private calculateWeeklyTrends(
    workflows: WorkflowAnalytics[],
  ): TimeSeriesData[] {
    return this.aggregateTimeSeriesData(workflows, "completion_rate", "week");
  }

  private calculateMonthlyTrends(
    workflows: WorkflowAnalytics[],
  ): TimeSeriesData[] {
    return this.aggregateTimeSeriesData(workflows, "completion_rate", "month");
  }

  private extractBenchmarkValues(
    workflows: WorkflowAnalytics[],
    benchmarkType: string,
  ): number[] {
    switch (benchmarkType) {
      case "completion_time":
        return workflows
          .filter((w) => w.completionRate === 100)
          .map((w) => w.totalDuration);
      case "quality_score":
        return workflows.map((w) => w.completionQuality?.overallScore || 0);
      case "error_rate":
        return workflows.map((w) => w.errorCount);
      default:
        return [];
    }
  }

  /**
   * Help Analytics Methods
   */
  async recordHelpInteraction(
    workflowId: string,
    helpId: string,
    interactionType: "helpful" | "not_helpful" | "viewed" | "dismissed",
    metadata?: {
      helpContent?: string;
      context?: string;
      timeSpent?: number;
    },
  ): Promise<void> {
    await this.withFallback(
      async () => {
        const { data: analytics, error: fetchError } = await this.supabase
          .from("workflow_analytics")
          .select("helpAnalytics")
          .eq("id", workflowId)
          .single();

        if (fetchError) throw fetchError;

        const helpAnalytics = analytics.helpAnalytics || {
          totalHelpViews: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          timeSpentInHelp: 0,
          mostUsedHelpTopics: [],
          helpInteractions: [],
        };

        // Update counters
        if (interactionType === "helpful") {
          helpAnalytics.helpfulCount++;
        } else if (interactionType === "not_helpful") {
          helpAnalytics.notHelpfulCount++;
        } else if (interactionType === "viewed") {
          helpAnalytics.totalHelpViews++;
        }

        if (metadata?.timeSpent) {
          helpAnalytics.timeSpentInHelp += metadata.timeSpent;
        }

        // Record the interaction
        helpAnalytics.helpInteractions.push({
          helpId,
          interactionType,
          timestamp: new Date().toISOString(),
          metadata: metadata || {},
        });

        // Update most used help topics
        if (metadata?.helpContent && interactionType === "viewed") {
          const topic = metadata.helpContent.substring(0, 50); // First 50 chars as topic
          const existingTopic = helpAnalytics.mostUsedHelpTopics.find(
            (t: any) => t.topic === topic,
          );
          if (existingTopic) {
            existingTopic.count++;
          } else {
            helpAnalytics.mostUsedHelpTopics.push({ topic, count: 1 });
          }

          // Keep only top 10 topics
          helpAnalytics.mostUsedHelpTopics = helpAnalytics.mostUsedHelpTopics
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 10);
        }

        const { error: updateError } = await this.supabase
          .from("workflow_analytics")
          .update({
            helpAnalytics,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", workflowId);

        if (updateError) throw updateError;
        return; // Successful void operation
      },
      `help_interaction_${workflowId}_${helpId}`,
      undefined, // No fallback value needed for void operation
      true, // Retryable
    );
  }

  async getHelpAnalytics(workflowId: string): Promise<any> {
    return this.withFallback(
      async () => {
        const { data: analytics, error } = await this.supabase
          .from("workflow_analytics")
          .select("helpAnalytics")
          .eq("id", workflowId)
          .single();

        if (error) throw error;

        return (
          analytics.helpAnalytics || {
            totalHelpViews: 0,
            helpfulCount: 0,
            notHelpfulCount: 0,
            timeSpentInHelp: 0,
            mostUsedHelpTopics: [],
            helpInteractions: [],
          }
        );
      },
      `help_analytics_${workflowId}`,
      {
        totalHelpViews: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        timeSpentInHelp: 0,
        mostUsedHelpTopics: [],
        helpInteractions: [],
      },
      true, // Retryable
    );
  }

  async getHelpEffectivenessMetrics(userId?: string): Promise<{
    overallHelpfulnessRate: number;
    averageTimeSpentInHelp: number;
    mostEffectiveHelpTopics: Array<{ topic: string; helpfulnessRate: number }>;
    helpUsageTrends: Array<{
      date: string;
      views: number;
      helpfulCount: number;
    }>;
  }> {
    try {
      let query = this.supabase
        .from("workflow_analytics")
        .select("helpAnalytics");

      if (userId) {
        query = query.eq("userId", userId);
      }

      const { data: workflows, error } = await query;
      if (error) throw error;

      const allHelpAnalytics = workflows
        .map((w: any) => w.helpAnalytics)
        .filter((h: any) => h);

      if (allHelpAnalytics.length === 0) {
        return {
          overallHelpfulnessRate: 0,
          averageTimeSpentInHelp: 0,
          mostEffectiveHelpTopics: [],
          helpUsageTrends: [],
        };
      }

      // Calculate overall helpfulness rate
      const totalHelpful = allHelpAnalytics.reduce(
        (sum: number, h: any) => sum + (h.helpfulCount || 0),
        0,
      );
      const totalNotHelpful = allHelpAnalytics.reduce(
        (sum: number, h: any) => sum + (h.notHelpfulCount || 0),
        0,
      );
      const overallHelpfulnessRate =
        totalHelpful + totalNotHelpful > 0
          ? totalHelpful / (totalHelpful + totalNotHelpful)
          : 0;

      // Calculate average time spent
      const totalTime = allHelpAnalytics.reduce(
        (sum: number, h: any) => sum + (h.timeSpentInHelp || 0),
        0,
      );
      const averageTimeSpentInHelp = totalTime / allHelpAnalytics.length;

      // Most effective help topics (simplified)
      const topicMap = new Map<string, { helpful: number; total: number }>();
      allHelpAnalytics.forEach((h: any) => {
        if (h.mostUsedHelpTopics) {
          h.mostUsedHelpTopics.forEach((topic: any) => {
            if (!topicMap.has(topic.topic)) {
              topicMap.set(topic.topic, { helpful: 0, total: 0 });
            }
            const stats = topicMap.get(topic.topic)!;
            stats.total += topic.count;
            // Simplified: assume half of views are helpful
            stats.helpful += Math.floor(topic.count * overallHelpfulnessRate);
          });
        }
      });

      const mostEffectiveHelpTopics = Array.from(topicMap.entries())
        .map(([topic, stats]) => ({
          topic,
          helpfulnessRate: stats.total > 0 ? stats.helpful / stats.total : 0,
        }))
        .sort((a, b) => b.helpfulnessRate - a.helpfulnessRate)
        .slice(0, 5);

      return {
        overallHelpfulnessRate,
        averageTimeSpentInHelp,
        mostEffectiveHelpTopics,
        helpUsageTrends: [], // Would require time-series data analysis
      };
    } catch (error) {
      console.error("Error getting help effectiveness metrics:", error);
      return {
        overallHelpfulnessRate: 0,
        averageTimeSpentInHelp: 0,
        mostEffectiveHelpTopics: [],
        helpUsageTrends: [],
      };
    }
  }
}

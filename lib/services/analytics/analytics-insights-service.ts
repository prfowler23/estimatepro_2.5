/**
 * Analytics Insights Service
 * Handles predictive analytics, insights generation, and optimization suggestions
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import {
  WorkflowAnalytics,
  PredictiveInsight,
  AnalyticsMetric,
  TimeSeriesData,
  ActionItem,
} from "@/lib/types/analytics-types";
import { AnalyticsCacheService } from "./analytics-cache-service";

export class AnalyticsInsightsService {
  private supabase;
  private cacheService: AnalyticsCacheService;

  constructor(cacheService: AnalyticsCacheService) {
    this.supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    this.cacheService = cacheService;
  }

  /**
   * Get analytics metrics
   */
  async getAnalyticsMetrics(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<AnalyticsMetric[]> {
    return this.cacheService.withFallback(
      async () => {
        let query = this.supabase.from("workflow_analytics").select("*");

        if (userId) {
          query = query.eq("userId", userId);
        }

        if (timeframe) {
          const startDate = this.getTimeframeStartDate(timeframe);
          query = query.gte("createdAt", startDate.toISOString());
        }

        const { data: workflows, error } = await query;
        if (error) throw error;

        return this.calculateMetrics(workflows);
      },
      `metrics_${userId || "all"}_${timeframe || "all"}`,
      [],
    );
  }

  /**
   * Get time series data for analytics charts
   */
  async getTimeSeriesData(
    metric: string,
    granularity: "hour" | "day" | "week" | "month",
    userId?: string,
  ): Promise<TimeSeriesData[]> {
    return this.cacheService.withFallback(
      async () => {
        let query = this.supabase.from("workflow_analytics").select("*");

        if (userId) {
          query = query.eq("userId", userId);
        }

        // Get data for the last 30 days for day/week granularity, 12 months for month
        const daysBack = granularity === "month" ? 365 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        query = query.gte("createdAt", startDate.toISOString());

        const { data: workflows, error } = await query;
        if (error) throw error;

        return this.aggregateTimeSeriesData(workflows, metric, granularity);
      },
      `timeseries_${metric}_${granularity}_${userId || "all"}`,
      [],
    );
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(
    userId?: string,
    workflowType?: string,
  ): Promise<PredictiveInsight[]> {
    return this.cacheService.withFallback(
      async () => {
        let query = this.supabase.from("workflow_analytics").select("*");

        if (userId) {
          query = query.eq("userId", userId);
        }

        if (workflowType) {
          query = query.eq("templateUsed", workflowType);
        }

        const { data: workflows, error } = await query;
        if (error) throw error;

        const insights: PredictiveInsight[] = [];

        // Completion time prediction
        const completionPrediction = this.predictCompletionTime(workflows);
        if (completionPrediction) insights.push(completionPrediction);

        // Quality score prediction
        const qualityPrediction = this.predictQualityScore(workflows);
        if (qualityPrediction) insights.push(qualityPrediction);

        // Bottleneck detection
        const bottlenecks = this.detectBottlenecks(workflows);
        insights.push(...bottlenecks);

        // Optimization suggestions
        const optimizations = this.generateOptimizationSuggestions(workflows);
        insights.push(...optimizations);

        return insights;
      },
      `insights_${userId || "all"}_${workflowType || "all"}`,
      [],
    );
  }

  /**
   * Calculate analytics metrics from workflow data
   */
  private calculateMetrics(workflows: WorkflowAnalytics[]): AnalyticsMetric[] {
    const metrics: AnalyticsMetric[] = [];

    // Completion rate metric
    const completedCount = workflows.filter(
      (w) => w.completionRate === 100,
    ).length;
    const completionRate =
      workflows.length > 0 ? (completedCount / workflows.length) * 100 : 0;

    metrics.push({
      name: "Completion Rate",
      value: completionRate,
      unit: "%",
      trend: this.calculateMetricTrend(workflows, "completionRate"),
      category: "efficiency",
      description: "Percentage of workflows completed successfully",
    });

    // Average completion time metric
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    const avgTime =
      completedWorkflows.length > 0
        ? completedWorkflows.reduce((sum, w) => sum + w.totalDuration, 0) /
          completedWorkflows.length
        : 0;

    metrics.push({
      name: "Average Completion Time",
      value: avgTime / (1000 * 60), // Convert to minutes
      unit: "min",
      trend: this.calculateMetricTrend(workflows, "totalDuration"),
      category: "performance",
      description: "Average time to complete workflows",
    });

    // Quality score metric
    const withQuality = workflows.filter((w) => w.validationScore > 0);
    const avgQuality =
      withQuality.length > 0
        ? withQuality.reduce((sum, w) => sum + w.validationScore, 0) /
          withQuality.length
        : 0;

    metrics.push({
      name: "Quality Score",
      value: avgQuality,
      unit: "pts",
      trend: this.calculateMetricTrend(workflows, "validationScore"),
      category: "quality",
      description: "Average workflow quality score",
    });

    // Error rate metric
    const avgErrors =
      workflows.length > 0
        ? workflows.reduce((sum, w) => sum + (w.errorCount || 0), 0) /
          workflows.length
        : 0;

    metrics.push({
      name: "Error Rate",
      value: avgErrors,
      unit: "errors/workflow",
      trend: this.calculateMetricTrend(workflows, "errorCount"),
      category: "reliability",
      description: "Average number of errors per workflow",
    });

    // AI usage metric
    const avgAIUsage =
      workflows.length > 0
        ? workflows.reduce(
            (sum, w) => sum + (w.aiInteractions?.length || 0),
            0,
          ) / workflows.length
        : 0;

    metrics.push({
      name: "AI Usage",
      value: avgAIUsage,
      unit: "interactions/workflow",
      trend: this.calculateMetricTrend(workflows, "aiUsage"),
      category: "automation",
      description: "Average AI interactions per workflow",
    });

    return metrics;
  }

  /**
   * Aggregate time series data
   */
  private aggregateTimeSeriesData(
    workflows: WorkflowAnalytics[],
    metric: string,
    granularity: string,
  ): TimeSeriesData[] {
    const dataPoints = new Map<string, number[]>();

    workflows.forEach((workflow) => {
      const timeKey = this.getTimeKey(
        new Date(workflow.createdAt),
        granularity,
      );
      const value = this.calculateMetricValue(workflow, metric);

      if (!dataPoints.has(timeKey)) {
        dataPoints.set(timeKey, []);
      }
      dataPoints.get(timeKey)!.push(value);
    });

    return Array.from(dataPoints.entries())
      .map(([timestamp, values]) => ({
        timestamp: new Date(timestamp),
        value: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Predict completion time for future workflows
   */
  private predictCompletionTime(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight | null {
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    if (completedWorkflows.length < 3) return null;

    const times = completedWorkflows.map((w) => w.totalDuration);
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance =
      times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
      times.length;
    const stdDev = Math.sqrt(variance);

    const confidence = Math.max(0.5, Math.min(0.95, 1 - stdDev / avgTime));

    return {
      type: "prediction",
      category: "performance",
      title: "Completion Time Prediction",
      description: `Based on recent workflows, estimated completion time is ${Math.round(avgTime / (1000 * 60))} minutes`,
      confidence,
      value: avgTime,
      unit: "ms",
      trend: this.calculateTrend(times),
      actionItems: this.generateTimeOptimizationActions(avgTime, stdDev),
      createdAt: new Date(),
    };
  }

  /**
   * Predict quality score for future workflows
   */
  private predictQualityScore(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight | null {
    const withQuality = workflows.filter((w) => w.validationScore > 0);
    if (withQuality.length < 3) return null;

    const scores = withQuality.map((w) => w.validationScore);
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const trend = this.calculateTrend(scores);

    return {
      type: "prediction",
      category: "quality",
      title: "Quality Score Prediction",
      description: `Expected quality score: ${Math.round(avgScore)}`,
      confidence: 0.8,
      value: avgScore,
      unit: "pts",
      trend,
      actionItems: this.generateQualityImprovementActions(avgScore, trend),
      createdAt: new Date(),
    };
  }

  /**
   * Detect workflow bottlenecks
   */
  private detectBottlenecks(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];
    const stepDurations = new Map<string, number[]>();

    workflows.forEach((workflow) => {
      (workflow.stepDurations || []).forEach((step) => {
        if (!stepDurations.has(step.stepName)) {
          stepDurations.set(step.stepName, []);
        }
        stepDurations.get(step.stepName)!.push(step.duration);
      });
    });

    // Find steps that take significantly longer than average
    const averages = Array.from(stepDurations.entries())
      .map(([name, durations]) => ({
        name,
        average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        count: durations.length,
      }))
      .sort((a, b) => b.average - a.average);

    const overallAverage =
      averages.reduce((sum, s) => sum + s.average, 0) / averages.length;

    // Identify bottlenecks (steps taking > 150% of average time)
    const bottlenecks = averages.filter(
      (step) => step.average > overallAverage * 1.5,
    );

    bottlenecks.forEach((bottleneck) => {
      insights.push({
        type: "bottleneck",
        category: "performance",
        title: "Step Bottleneck Detected",
        description: `Step "${bottleneck.name}" takes ${Math.round((bottleneck.average / overallAverage - 1) * 100)}% longer than average`,
        confidence: 0.9,
        value: bottleneck.average,
        unit: "ms",
        trend: "stable",
        actionItems: this.generateBottleneckActions(bottleneck.name),
        createdAt: new Date(),
      });
    });

    return insights;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    workflows: WorkflowAnalytics[],
  ): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Low AI usage suggestion
    const avgAIUsage =
      workflows.reduce((sum, w) => sum + (w.aiInteractions?.length || 0), 0) /
      workflows.length;
    if (avgAIUsage < 2) {
      insights.push({
        type: "optimization",
        category: "automation",
        title: "Increase AI Assistance Usage",
        description:
          "Consider using AI assistance more frequently to improve efficiency",
        confidence: 0.7,
        value: avgAIUsage,
        unit: "interactions/workflow",
        trend: "stable",
        actionItems: [
          {
            title: "Enable AI suggestions in complex steps",
            description:
              "Turn on AI assistance for steps that typically take longer",
            priority: "medium",
            estimatedImpact: "15% time reduction",
          },
        ],
        createdAt: new Date(),
      });
    }

    // High error rate suggestion
    const avgErrors =
      workflows.reduce((sum, w) => sum + (w.errorCount || 0), 0) /
      workflows.length;
    if (avgErrors > 2) {
      insights.push({
        type: "optimization",
        category: "quality",
        title: "Reduce Error Rate",
        description: "High error rate detected, consider additional validation",
        confidence: 0.85,
        value: avgErrors,
        unit: "errors/workflow",
        trend: "up",
        actionItems: this.generateErrorReductionActions(),
        createdAt: new Date(),
      });
    }

    return insights;
  }

  // Helper methods
  private calculateMetricTrend(
    workflows: WorkflowAnalytics[],
    metric: string,
  ): "up" | "down" | "stable" {
    if (workflows.length < 2) return "stable";

    const values = workflows.map((w) => this.calculateMetricValue(w, metric));
    return this.calculateTrend(values);
  }

  private calculateTrend(values: number[]): "up" | "down" | "stable" {
    if (values.length < 2) return "stable";

    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half);
    const secondHalf = values.slice(half);

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const threshold = 0.05; // 5% change threshold
    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > threshold) return "up";
    if (change < -threshold) return "down";
    return "stable";
  }

  private getTimeKey(date: Date, granularity: string): string {
    switch (granularity) {
      case "hour":
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case "day":
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      case "month":
        return `${date.getFullYear()}-${date.getMonth()}`;
      default:
        return date.toISOString();
    }
  }

  private calculateMetricValue(
    workflow: WorkflowAnalytics,
    metric: string,
  ): number {
    switch (metric) {
      case "completionRate":
        return workflow.completionRate || 0;
      case "totalDuration":
        return workflow.totalDuration || 0;
      case "validationScore":
        return workflow.validationScore || 0;
      case "errorCount":
        return workflow.errorCount || 0;
      case "aiUsage":
        return workflow.aiInteractions?.length || 0;
      default:
        return 0;
    }
  }

  private getTimeframeStartDate(timeframe: "week" | "month" | "quarter"): Date {
    const now = new Date();
    switch (timeframe) {
      case "week":
        now.setDate(now.getDate() - 7);
        break;
      case "month":
        now.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        now.setMonth(now.getMonth() - 3);
        break;
    }
    return now;
  }

  private generateTimeOptimizationActions(
    avgTime: number,
    stdDev: number,
  ): ActionItem[] {
    const actions: ActionItem[] = [];

    if (stdDev > avgTime * 0.3) {
      actions.push({
        title: "Standardize workflow processes",
        description: "High time variance suggests inconsistent processes",
        priority: "high",
        estimatedImpact: "20% time reduction",
      });
    }

    if (avgTime > 30 * 60 * 1000) {
      // More than 30 minutes
      actions.push({
        title: "Consider workflow automation",
        description: "Long workflows may benefit from AI assistance",
        priority: "medium",
        estimatedImpact: "25% time reduction",
      });
    }

    return actions;
  }

  private generateQualityImprovementActions(
    avgScore: number,
    trend: "up" | "down" | "stable",
  ): ActionItem[] {
    const actions: ActionItem[] = [];

    if (avgScore < 80) {
      actions.push({
        title: "Implement additional validation checks",
        description: "Quality scores below 80 indicate room for improvement",
        priority: "high",
        estimatedImpact: "15 point increase",
      });
    }

    if (trend === "down") {
      actions.push({
        title: "Review recent process changes",
        description: "Declining quality trend requires investigation",
        priority: "high",
        estimatedImpact: "Prevent further decline",
      });
    }

    return actions;
  }

  private generateBottleneckActions(stepName: string): ActionItem[] {
    return [
      {
        title: `Optimize ${stepName} step`,
        description: "Focus on improving the slowest workflow step",
        priority: "high",
        estimatedImpact: "30% step time reduction",
      },
      {
        title: "Add AI assistance to slow steps",
        description: "Enable AI suggestions for bottleneck steps",
        priority: "medium",
        estimatedImpact: "20% step time reduction",
      },
    ];
  }

  private generateErrorReductionActions(): ActionItem[] {
    return [
      {
        title: "Implement real-time validation",
        description: "Add validation checks to prevent common errors",
        priority: "high",
        estimatedImpact: "50% error reduction",
      },
      {
        title: "Improve user guidance",
        description: "Add contextual help for error-prone steps",
        priority: "medium",
        estimatedImpact: "30% error reduction",
      },
    ];
  }
}

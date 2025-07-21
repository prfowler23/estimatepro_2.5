/**
 * Analytics Hook
 * Provides analytics data and operations for the dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { AnalyticsService } from "@/lib/services/analytics-service";
import {
  AnalyticsMetric,
  AnalyticsFilter,
  PredictiveInsight,
  WorkflowBenchmark,
  UserWorkflowStats,
  TimeSeriesData,
} from "@/lib/types/analytics-types";

interface UseAnalyticsReturn {
  metrics: AnalyticsMetric[];
  insights: PredictiveInsight[];
  benchmarks: WorkflowBenchmark[];
  userStats: UserWorkflowStats[];
  timeSeriesData: TimeSeriesData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
}

export function useAnalytics(
  filters: AnalyticsFilter,
  userId?: string,
  teamId?: string,
): UseAnalyticsReturn {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [benchmarks, setBenchmarks] = useState<WorkflowBenchmark[]>([]);
  const [userStats, setUserStats] = useState<UserWorkflowStats[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize analytics service
  const analyticsService = new AnalyticsService(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all analytics data in parallel
      const [
        metricsData,
        insightsData,
        benchmarksData,
        userStatsData,
        timeSeriesMetrics,
      ] = await Promise.all([
        analyticsService.getAnalyticsMetrics(filters),
        analyticsService.generatePredictiveInsights(undefined, userId),
        analyticsService.getWorkflowBenchmarks("completion_time", filters),
        userId ? [await analyticsService.getUserWorkflowStats(userId)] : [],
        analyticsService.getTimeSeriesData(
          "completion_rate",
          {
            start:
              filters.startDate ||
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: filters.endDate || new Date(),
            granularity: "day",
          },
          filters,
        ),
      ]);

      setMetrics(metricsData);
      setInsights(insightsData);
      setBenchmarks(benchmarksData);
      setUserStats(userStatsData);
      setTimeSeriesData(timeSeriesMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics data",
      );
      console.error("Analytics error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userId, analyticsService]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Mock data for development/testing
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setMetrics([
        {
          id: "total_workflows",
          name: "Total Workflows",
          description: "Total number of workflows started",
          value: 1247,
          unit: "",
          trend: "up",
          trendPercentage: 12.5,
          chartType: "number",
          colorScheme: "info",
        },
        {
          id: "completion_rate",
          name: "Completion Rate",
          description: "Percentage of workflows completed successfully",
          value: 87.3,
          unit: "%",
          trend: "up",
          trendPercentage: 5.2,
          benchmark: 80,
          target: 90,
          chartType: "gauge",
          colorScheme: "success",
        },
        {
          id: "avg_quality_score",
          name: "Average Quality Score",
          description: "Average quality score across all workflows",
          value: 78.5,
          unit: "pts",
          trend: "stable",
          trendPercentage: 1.1,
          benchmark: 75,
          target: 85,
          chartType: "gauge",
          colorScheme: "warning",
        },
        {
          id: "avg_completion_time",
          name: "Average Completion Time",
          description: "Average time to complete a workflow",
          value: 42.3,
          unit: "min",
          trend: "down",
          trendPercentage: -8.7,
          benchmark: 50,
          target: 40,
          chartType: "number",
          colorScheme: "success",
        },
        {
          id: "active_users",
          name: "Active Users",
          description: "Number of users active in the last 30 days",
          value: 156,
          unit: "",
          trend: "up",
          trendPercentage: 18.2,
          chartType: "number",
          colorScheme: "info",
        },
        {
          id: "ai_usage_rate",
          name: "AI Usage Rate",
          description: "Percentage of workflows using AI assistance",
          value: 64.8,
          unit: "%",
          trend: "up",
          trendPercentage: 23.4,
          chartType: "gauge",
          colorScheme: "info",
        },
      ]);

      setInsights([
        {
          insightId: "insight_1",
          type: "bottleneck_detection",
          confidence: 0.9,
          severity: "high",
          prediction:
            "Step 5 (Takeoff) is causing significant delays with 95th percentile duration of 18 minutes",
          probability: 0.85,
          impact: "high",
          recommendations: [
            "Simplify the takeoff interface for better usability",
            "Provide targeted training for takeoff measurements",
            "Consider breaking down complex takeoff steps",
            "Implement auto-save more frequently in takeoff step",
          ],
          actionItems: [
            {
              id: "action_1",
              title: "Redesign Takeoff Interface",
              description:
                "Simplify the takeoff measurement interface to reduce completion time",
              priority: "high",
              category: "technology",
              estimatedImpact: "High - could reduce step time by 40%",
              estimatedEffort: "Medium - 2-3 weeks development",
              status: "pending",
            },
            {
              id: "action_2",
              title: "Create Takeoff Training Module",
              description:
                "Develop comprehensive training for efficient takeoff measurements",
              priority: "medium",
              category: "training",
              estimatedImpact: "Medium - improve user efficiency by 25%",
              estimatedEffort: "Low - 1 week content creation",
              status: "pending",
            },
          ],
          affectedWorkflows: ["wf_1", "wf_2", "wf_3"],
          affectedUsers: ["user_1", "user_2", "user_3"],
          dataPoints: [],
          createdAt: new Date(),
        },
        {
          insightId: "insight_2",
          type: "quality_prediction",
          confidence: 0.75,
          severity: "medium",
          prediction:
            "Quality scores are trending downward for new users in their first month",
          probability: 0.7,
          impact: "medium",
          recommendations: [
            "Implement enhanced onboarding program",
            "Provide mentorship for new users",
            "Add more validation checkpoints",
            "Create quality-focused tutorials",
          ],
          actionItems: [
            {
              id: "action_3",
              title: "Enhanced Onboarding Program",
              description: "Create comprehensive onboarding with quality focus",
              priority: "medium",
              category: "process",
              estimatedImpact: "Medium - improve new user quality by 30%",
              estimatedEffort: "Medium - 2 weeks development",
              status: "in_progress",
            },
          ],
          affectedWorkflows: ["wf_4", "wf_5"],
          affectedUsers: ["user_4", "user_5"],
          dataPoints: [],
          createdAt: new Date(),
        },
        {
          insightId: "insight_3",
          type: "resource_optimization",
          confidence: 0.8,
          severity: "low",
          prediction:
            "AI assistance usage is below optimal levels - 35% of users rarely use AI features",
          probability: 0.75,
          impact: "medium",
          recommendations: [
            "Promote AI features more prominently",
            "Create AI usage tutorials",
            "Implement smart suggestions in workflow",
            "Add AI usage metrics to user dashboards",
          ],
          actionItems: [
            {
              id: "action_4",
              title: "AI Features Promotion Campaign",
              description:
                "Increase awareness and usage of AI assistance features",
              priority: "low",
              category: "training",
              estimatedImpact: "Low - increase AI usage by 20%",
              estimatedEffort: "Low - 1 week marketing effort",
              status: "pending",
            },
          ],
          affectedWorkflows: ["wf_6", "wf_7"],
          affectedUsers: ["user_6", "user_7"],
          dataPoints: [],
          createdAt: new Date(),
        },
      ]);

      setBenchmarks([
        {
          benchmarkType: "completion_time",
          p25: 25,
          p50: 35,
          p75: 55,
          p90: 75,
          p95: 95,
          average: 42.3,
          sampleSize: 1247,
          lastUpdated: new Date(),
        },
        {
          benchmarkType: "quality_score",
          p25: 65,
          p50: 78,
          p75: 88,
          p90: 94,
          p95: 98,
          average: 78.5,
          sampleSize: 1247,
          lastUpdated: new Date(),
        },
      ]);

      setUserStats([
        {
          userId: "user_1",
          userName: "John Smith",
          userRole: "estimator",
          totalWorkflows: 45,
          completedWorkflows: 41,
          averageCompletionTime: 38.5,
          averageQualityScore: 85.2,
          averageStepDuration: 4.2,
          averageBacktrackRate: 0.8,
          averageErrorRate: 2.1,
          averageAIUsage: 8.3,
          weeklyCompletionRate: 92.3,
          monthlyCompletionRate: 89.7,
          qualityTrend: "improving",
          efficiencyTrend: "improving",
          slowestSteps: ["takeoff", "pricing", "expenses"],
          mostCommonErrors: ["validation_error", "missing_data"],
          underutilizedFeatures: ["ai_suggestions", "templates"],
        },
        {
          userId: "user_2",
          userName: "Sarah Johnson",
          userRole: "senior_estimator",
          totalWorkflows: 67,
          completedWorkflows: 63,
          averageCompletionTime: 32.1,
          averageQualityScore: 91.8,
          averageStepDuration: 3.6,
          averageBacktrackRate: 0.5,
          averageErrorRate: 1.2,
          averageAIUsage: 12.7,
          weeklyCompletionRate: 95.8,
          monthlyCompletionRate: 94.2,
          qualityTrend: "stable",
          efficiencyTrend: "improving",
          slowestSteps: ["duration", "files-photos"],
          mostCommonErrors: ["upload_failure"],
          underutilizedFeatures: ["collaboration"],
        },
      ]);

      // Generate time series data for the last 30 days with realistic patterns
      const timeSeriesData: TimeSeriesData[] = [];
      const now = new Date();

      // Base completion rate with seasonal patterns
      const baseCompletionRate = 87; // Base rate around 87%

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Weekly pattern: lower completion on weekends
        const dayOfWeek = date.getDay();
        let weekendPenalty = 0;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Sunday or Saturday
          weekendPenalty = 8;
        }

        // Gradual improvement over time (learning curve)
        const improvementFactor = (30 - i) * 0.3; // 0.3% improvement per day

        // Add some realistic variation (±5%)
        const variation = (Math.sin(i * 0.5) + Math.cos(i * 0.3)) * 2.5;

        // Calculate completion rate
        const completionRate = Math.max(
          75,
          Math.min(
            98,
            baseCompletionRate + improvementFactor - weekendPenalty + variation,
          ),
        );

        // Calculate workflow count based on business patterns
        let baseCount = 25; // Base daily workflows

        // Higher volume on weekdays
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          baseCount += 15;
        }

        // Monthly growth pattern
        const monthlyGrowth = (30 - i) * 0.5;
        const workflowCount = Math.round(
          baseCount + monthlyGrowth + Math.sin(i * 0.4) * 5,
        );

        timeSeriesData.push({
          date,
          value: Math.round(completionRate * 10) / 10, // Round to 1 decimal
          metric: "completion_rate",
          metadata: {
            count: Math.max(10, workflowCount),
          },
        });
      }

      setTimeSeriesData(timeSeriesData);
      setLastUpdated(new Date());
    }
  }, []);

  return {
    metrics,
    insights,
    benchmarks,
    userStats,
    timeSeriesData,
    isLoading,
    error,
    lastUpdated,
    refreshData,
  };
}

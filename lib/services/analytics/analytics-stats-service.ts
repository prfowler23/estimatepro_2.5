/**
 * Analytics Statistics Service
 * Handles user and team statistics calculation and retrieval
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import {
  WorkflowAnalytics,
  UserWorkflowStats,
  TeamAnalytics,
  WorkflowBenchmark,
} from "@/lib/types/analytics-types";
import { AnalyticsCacheService } from "./analytics-cache-service";

export class AnalyticsStatsService {
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
   * Get user-specific workflow statistics
   */
  async getUserWorkflowStats(userId: string): Promise<UserWorkflowStats> {
    return this.cacheService.withFallback(
      async () => {
        const { data: workflows, error } = await this.supabase
          .from("workflow_analytics")
          .select("*")
          .eq("userId", userId);

        if (error) throw error;

        return this.calculateUserStats(workflows, userId);
      },
      `user_stats_${userId}`,
      this.getEmptyUserStats(userId),
    );
  }

  /**
   * Get team analytics data
   */
  async getTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
    return this.cacheService.withFallback(
      async () => {
        // Get team members (this would need to be implemented based on your team structure)
        const { data: workflows, error } = await this.supabase
          .from("workflow_analytics")
          .select("*")
          .eq("teamId", teamId); // Assuming teamId exists in your schema

        if (error) throw error;

        return this.calculateTeamAnalytics(workflows, teamId);
      },
      `team_analytics_${teamId}`,
      this.getEmptyTeamAnalytics(teamId),
    );
  }

  /**
   * Get workflow benchmarks
   */
  async getWorkflowBenchmarks(
    userId?: string,
    timeframe?: "week" | "month" | "quarter",
  ): Promise<WorkflowBenchmark[]> {
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

        return this.calculateBenchmarks(workflows);
      },
      `benchmarks_${userId || "all"}_${timeframe || "all"}`,
      [],
    );
  }

  /**
   * Calculate user statistics from workflow data
   */
  private calculateUserStats(
    workflows: WorkflowAnalytics[],
    userId: string,
  ): UserWorkflowStats {
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    const totalWorkflows = workflows.length;

    return {
      userId,
      userName: workflows[0]?.userName || "",
      userRole: workflows[0]?.userRole || "",
      totalWorkflows,
      completedWorkflows: completedWorkflows.length,
      averageCompletionTime: this.calculateAverageCompletionTime(workflows),
      averageQualityScore: this.calculateAverageQualityScore(workflows),
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

  /**
   * Calculate team analytics from workflow data
   */
  private calculateTeamAnalytics(
    workflows: WorkflowAnalytics[],
    teamId: string,
  ): TeamAnalytics {
    return {
      teamId,
      teamName: `Team ${teamId}`, // This would need to be fetched from a teams table
      totalMembers: new Set(workflows.map((w) => w.userId)).size,
      totalWorkflows: workflows.length,
      completedWorkflows: workflows.filter((w) => w.completionRate === 100)
        .length,
      averageCompletionTime: this.calculateAverageCompletionTime(workflows),
      collaborationEfficiency: this.calculateCollaborationEfficiency(workflows),
      roleDistribution: this.calculateRoleDistribution(workflows),
      experienceLevels: this.calculateExperienceLevels(workflows),
      workflowsByTemplate: this.calculateWorkflowsByTemplate(workflows),
      workflowsByComplexity: this.calculateWorkflowsByComplexity(workflows),
      knowledgeSharing: this.calculateKnowledgeSharing(workflows),
      topPerformers: [], // Would need additional logic to determine this
      improvementAreas: [], // Would need additional logic to determine this
      weeklyTrends: this.calculateWeeklyTrends(workflows),
      monthlyTrends: this.calculateMonthlyTrends(workflows),
    };
  }

  /**
   * Calculate benchmarks from workflow data
   */
  private calculateBenchmarks(
    workflows: WorkflowAnalytics[],
  ): WorkflowBenchmark[] {
    const benchmarks: WorkflowBenchmark[] = [];

    // Group by template or workflow type
    const groupedWorkflows = this.groupWorkflowsByType(workflows);

    Object.entries(groupedWorkflows).forEach(([type, typeWorkflows]) => {
      const values = this.extractBenchmarkValues(typeWorkflows);

      benchmarks.push({
        workflowType: type,
        sampleSize: typeWorkflows.length,
        averageTime: this.calculateAverage(values.times),
        medianTime: this.percentile(values.times, 0.5),
        p90Time: this.percentile(values.times, 0.9),
        averageQuality: this.calculateAverage(values.qualities),
        topPercentile: this.percentile(values.times, 0.1), // Top 10% fastest
      });
    });

    return benchmarks;
  }

  // Helper methods for calculations
  private calculateAverageCompletionTime(
    workflows: WorkflowAnalytics[],
  ): number {
    const completed = workflows.filter((w) => w.completionRate === 100);
    if (completed.length === 0) return 0;

    const times = completed.map((w) => w.totalDuration);
    return this.calculateAverage(times);
  }

  private calculateAverageQualityScore(workflows: WorkflowAnalytics[]): number {
    const withQuality = workflows.filter((w) => w.validationScore > 0);
    if (withQuality.length === 0) return 0;

    const scores = withQuality.map((w) => w.validationScore);
    return this.calculateAverage(scores);
  }

  private calculateAverageStepDuration(workflows: WorkflowAnalytics[]): number {
    const allStepDurations = workflows.flatMap((w) =>
      (w.stepDurations || []).map((s) => s.duration),
    );
    return this.calculateAverage(allStepDurations);
  }

  private calculateAverageBacktrackRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const backtrackRates = workflows.map((w) => {
      const totalSteps = w.stepDurations?.length || 0;
      const totalBacktracks =
        w.stepDurations?.reduce((sum, s) => sum + (s.backtrackCount || 0), 0) ||
        0;
      return totalSteps > 0 ? totalBacktracks / totalSteps : 0;
    });
    return this.calculateAverage(backtrackRates);
  }

  private calculateAverageErrorRate(workflows: WorkflowAnalytics[]): number {
    const errorRates = workflows.map((w) => w.errorCount || 0);
    return this.calculateAverage(errorRates);
  }

  private calculateAverageAIUsage(workflows: WorkflowAnalytics[]): number {
    const aiUsageRates = workflows.map((w) => (w.aiInteractions || []).length);
    return this.calculateAverage(aiUsageRates);
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

    const completed = recentWorkflows.filter((w) => w.completionRate === 100);
    return (completed.length / recentWorkflows.length) * 100;
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

    const completed = recentWorkflows.filter((w) => w.completionRate === 100);
    return (completed.length / recentWorkflows.length) * 100;
  }

  private calculateQualityTrend(
    workflows: WorkflowAnalytics[],
  ): "up" | "down" | "stable" {
    const scores = workflows
      .filter((w) => w.validationScore > 0)
      .map((w) => w.validationScore);
    return this.calculateTrend(scores);
  }

  private calculateEfficiencyTrend(
    workflows: WorkflowAnalytics[],
  ): "up" | "down" | "stable" {
    const times = workflows
      .filter((w) => w.totalDuration > 0)
      .map((w) => w.totalDuration);
    // For efficiency, lower times mean better trend, so we invert
    return this.calculateTrend(times.map((t) => -t));
  }

  private findSlowestSteps(workflows: WorkflowAnalytics[]): string[] {
    const stepDurations = new Map<string, number[]>();

    workflows.forEach((w) => {
      (w.stepDurations || []).forEach((s) => {
        if (!stepDurations.has(s.stepName)) {
          stepDurations.set(s.stepName, []);
        }
        stepDurations.get(s.stepName)!.push(s.duration);
      });
    });

    const averages = Array.from(stepDurations.entries())
      .map(([name, durations]) => ({
        name,
        average: this.calculateAverage(durations),
      }))
      .sort((a, b) => b.average - a.average);

    return averages.slice(0, 3).map((s) => s.name);
  }

  private findMostCommonErrors(workflows: WorkflowAnalytics[]): string[] {
    // This would need to be implemented based on your error tracking structure
    return [];
  }

  private findUnderutilizedFeatures(workflows: WorkflowAnalytics[]): string[] {
    // This would need to be implemented based on your feature usage tracking
    return [];
  }

  // Additional helper methods
  private calculateCollaborationEfficiency(
    workflows: WorkflowAnalytics[],
  ): number {
    return 0; // Placeholder implementation
  }

  private calculateRoleDistribution(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    workflows.forEach((w) => {
      distribution[w.userRole] = (distribution[w.userRole] || 0) + 1;
    });
    return distribution;
  }

  private calculateExperienceLevels(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    // This would need additional user experience data
    return {};
  }

  private calculateWorkflowsByTemplate(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    workflows.forEach((w) => {
      const template = w.templateUsed || "default";
      distribution[template] = (distribution[template] || 0) + 1;
    });
    return distribution;
  }

  private calculateWorkflowsByComplexity(
    workflows: WorkflowAnalytics[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    workflows.forEach((w) => {
      const complexity = this.determineComplexity(w);
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    });
    return distribution;
  }

  private calculateKnowledgeSharing(workflows: WorkflowAnalytics[]): number {
    // Placeholder implementation
    return 0;
  }

  private calculateWeeklyTrends(workflows: WorkflowAnalytics[]): any {
    // Placeholder implementation
    return {};
  }

  private calculateMonthlyTrends(workflows: WorkflowAnalytics[]): any {
    // Placeholder implementation
    return {};
  }

  // Utility methods
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateTrend(values: number[]): "up" | "down" | "stable" {
    if (values.length < 2) return "stable";

    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half);
    const secondHalf = values.slice(half);

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const threshold = 0.05; // 5% change threshold
    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > threshold) return "up";
    if (change < -threshold) return "down";
    return "stable";
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

  private groupWorkflowsByType(
    workflows: WorkflowAnalytics[],
  ): Record<string, WorkflowAnalytics[]> {
    const grouped: Record<string, WorkflowAnalytics[]> = {};
    workflows.forEach((w) => {
      const type = w.templateUsed || "default";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(w);
    });
    return grouped;
  }

  private extractBenchmarkValues(workflows: WorkflowAnalytics[]): {
    times: number[];
    qualities: number[];
  } {
    return {
      times: workflows.map((w) => w.totalDuration).filter((t) => t > 0),
      qualities: workflows.map((w) => w.validationScore).filter((q) => q > 0),
    };
  }

  private determineComplexity(workflow: WorkflowAnalytics): string {
    const stepCount = workflow.stepDurations?.length || 0;
    const aiUsage = workflow.aiInteractions?.length || 0;

    if (stepCount > 8 || aiUsage > 5) return "high";
    if (stepCount > 5 || aiUsage > 2) return "medium";
    return "low";
  }

  private getEmptyUserStats(userId: string): UserWorkflowStats {
    return {
      userId,
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
      qualityTrend: "stable",
      efficiencyTrend: "stable",
      slowestSteps: [],
      mostCommonErrors: [],
      underutilizedFeatures: [],
    };
  }

  private getEmptyTeamAnalytics(teamId: string): TeamAnalytics {
    return {
      teamId,
      teamName: `Team ${teamId}`,
      totalMembers: 0,
      totalWorkflows: 0,
      completedWorkflows: 0,
      averageCompletionTime: 0,
      collaborationEfficiency: 0,
      roleDistribution: {},
      experienceLevels: {},
      workflowsByTemplate: {},
      workflowsByComplexity: {},
      knowledgeSharing: 0,
      topPerformers: [],
      improvementAreas: [],
      weeklyTrends: {},
      monthlyTrends: {},
    };
  }
}

/**
 * AI Analytics Service - Fixed version without background processing
 * Tracks and analyzes AI assistant usage patterns and performance
 */

import { createClient } from "@/lib/supabase/server";
import { AIPerformanceMonitor } from "../monitoring/ai-performance-monitor";
import { productionConfig } from "../deployment/production-config";

interface AIUsageMetrics {
  userId: string;
  conversationId?: string;
  timestamp: Date;
  endpoint: string;
  model: string;
  tokensUsed: number;
  responseTime: number;
  success: boolean;
  error?: string;
  features: {
    streaming: boolean;
    tools: boolean;
    contextMemory: boolean;
  };
  metadata?: Record<string, any>;
}

interface AIAnalyticsSummary {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  uniqueUsers: number;
  modelUsage: Record<string, number>;
  featureUsage: Record<string, number>;
  errorTypes: Record<string, number>;
  peakUsageHours: number[];
}

interface UserAnalytics {
  userId: string;
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  averageConversationLength: number;
  mostUsedFeatures: string[];
  lastActive: Date;
  engagementScore: number;
}

export class AIAnalyticsService {
  private static instance: AIAnalyticsService;
  private readonly BATCH_SIZE = 50;

  private constructor() {
    // No background processing in constructor
  }

  static getInstance(): AIAnalyticsService {
    if (!AIAnalyticsService.instance) {
      AIAnalyticsService.instance = new AIAnalyticsService();
    }
    return AIAnalyticsService.instance;
  }

  /**
   * Track AI usage event - now processes immediately
   */
  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    try {
      const supabase = createClient();

      // Insert directly into analytics table instead of queue
      const { error } = await supabase.from("ai_analytics").insert({
        user_id: metrics.userId,
        conversation_id: metrics.conversationId,
        timestamp: metrics.timestamp.toISOString(),
        endpoint: metrics.endpoint,
        model: metrics.model,
        tokens_used: metrics.tokensUsed,
        response_time: metrics.responseTime,
        success: metrics.success,
        error: metrics.error,
        features: metrics.features,
        metadata: metrics.metadata,
      });

      if (error) {
        console.error("Failed to track AI usage:", error);
        // Don't throw - analytics should not break the main flow
      }

      // Also record in performance monitor for in-memory metrics
      const monitor = AIPerformanceMonitor.getInstance();
      monitor.recordMetric({
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        duration: metrics.responseTime,
        model: metrics.model,
        mode: metrics.endpoint,
        toolsUsed: metrics.features.tools ? ["tools"] : [],
        tokensUsed: metrics.tokensUsed,
        cacheHit: false,
        streamingEnabled: metrics.features.streaming,
        error: metrics.error,
        statusCode: metrics.success ? 200 : 500,
      });
    } catch (error) {
      console.error("Error tracking AI usage:", error);
      // Don't throw - analytics should not break the main flow
    }
  }

  /**
   * Get analytics summary for a date range
   */
  async getAnalyticsSummary(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    summary: AIAnalyticsSummary;
    recentActivity: any[];
    pagination: { page: number; limit: number; total: number };
  }> {
    try {
      const supabase = createClient();

      // Get summary data
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        "get_ai_analytics_summary",
        {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      );

      if (summaryError) throw summaryError;

      // Get recent activity with pagination
      const offset = (page - 1) * limit;
      const {
        data: activityData,
        error: activityError,
        count,
      } = await supabase
        .from("ai_analytics")
        .select("*", { count: "exact" })
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", endDate.toISOString())
        .order("timestamp", { ascending: false })
        .range(offset, offset + limit - 1);

      if (activityError) throw activityError;

      // Process summary data
      const summary: AIAnalyticsSummary = {
        totalRequests: summaryData?.[0]?.total_requests || 0,
        successRate: summaryData?.[0]?.success_rate || 0,
        averageResponseTime: summaryData?.[0]?.avg_response_time || 0,
        totalTokensUsed: summaryData?.[0]?.total_tokens || 0,
        uniqueUsers: summaryData?.[0]?.unique_users || 0,
        modelUsage: summaryData?.[0]?.model_usage || {},
        featureUsage: summaryData?.[0]?.feature_usage || {},
        errorTypes: summaryData?.[0]?.error_types || {},
        peakUsageHours: summaryData?.[0]?.peak_hours || [],
      };

      return {
        summary,
        recentActivity: activityData || [],
        pagination: {
          page,
          limit,
          total: count || 0,
        },
      };
    } catch (error) {
      console.error("Error getting analytics summary:", error);
      throw error;
    }
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserAnalytics> {
    try {
      const supabase = createClient();

      const query = supabase
        .from("ai_analytics")
        .select("*")
        .eq("user_id", userId);

      if (startDate) {
        query.gte("timestamp", startDate.toISOString());
      }
      if (endDate) {
        query.lte("timestamp", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process user analytics
      const conversations = new Set(
        data
          ?.map((d) => d.conversation_id)
          .filter((id): id is string => Boolean(id)),
      );
      const totalTokens =
        data?.reduce((sum, d) => sum + (d.tokens_used || 0), 0) || 0;
      const features: Record<string, number> = {};

      data?.forEach((d) => {
        if (d.features?.streaming)
          features.streaming = (features.streaming || 0) + 1;
        if (d.features?.tools) features.tools = (features.tools || 0) + 1;
        if (d.features?.contextMemory)
          features.contextMemory = (features.contextMemory || 0) + 1;
      });

      const mostUsedFeatures = Object.entries(features)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([feature]) => feature);

      return {
        userId,
        totalConversations: conversations.size,
        totalMessages: data?.length || 0,
        totalTokensUsed: totalTokens,
        averageConversationLength:
          conversations.size > 0 ? (data?.length || 0) / conversations.size : 0,
        mostUsedFeatures,
        lastActive: data?.[0]?.timestamp
          ? new Date(data[0].timestamp)
          : new Date(),
        engagementScore: this.calculateEngagementScore(data || []),
      };
    } catch (error) {
      console.error("Error getting user analytics:", error);
      throw error;
    }
  }

  /**
   * Calculate user engagement score
   */
  private calculateEngagementScore(data: any[]): number {
    if (!data.length) return 0;

    // Factors: frequency, recency, feature usage, success rate
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Recency score (0-25)
    const lastActive = new Date(data[0].timestamp).getTime();
    const daysSinceActive = (now - lastActive) / dayInMs;
    const recencyScore = Math.max(0, 25 - daysSinceActive);

    // Frequency score (0-25)
    const messagesPerDay = data.length / 30; // Assuming 30-day window
    const frequencyScore = Math.min(25, messagesPerDay * 5);

    // Feature usage score (0-25)
    const featureUsage = data.filter(
      (d) => d.features?.tools || d.features?.contextMemory,
    ).length;
    const featureScore = Math.min(25, (featureUsage / data.length) * 50);

    // Success rate score (0-25)
    const successRate = data.filter((d) => d.success).length / data.length;
    const successScore = successRate * 25;

    return Math.round(
      recencyScore + frequencyScore + featureScore + successScore,
    );
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    startDate: Date,
    endDate: Date,
    format: "json" | "csv" = "json",
  ): Promise<string> {
    try {
      const { summary, recentActivity } = await this.getAnalyticsSummary(
        startDate,
        endDate,
        1,
        10000, // Get all data for export
      );

      if (format === "json") {
        return JSON.stringify({ summary, data: recentActivity }, null, 2);
      } else {
        // CSV format
        const headers = [
          "timestamp",
          "user_id",
          "endpoint",
          "model",
          "tokens_used",
          "response_time",
          "success",
          "error",
        ];

        const rows = recentActivity.map((row) =>
          [
            row.timestamp,
            row.user_id,
            row.endpoint,
            row.model,
            row.tokens_used,
            row.response_time,
            row.success,
            row.error || "",
          ].join(","),
        );

        return [headers.join(","), ...rows].join("\n");
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      throw error;
    }
  }

  /**
   * Get dashboard data combining multiple analytics views
   */
  async getDashboardData(userId?: string): Promise<{
    performanceMetrics: any;
    systemHealth: any;
    userEngagement: any;
    costAnalysis: any;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

      // Get performance metrics from monitor
      const monitor = AIPerformanceMonitor.getInstance();
      const performanceMetrics = monitor.getAggregatedMetrics();
      const systemHealth = monitor.getHealthStatus();

      // Get analytics summary
      const { summary } = await this.getAnalyticsSummary(startDate, endDate);

      // Get user engagement data if userId provided
      let userEngagement = null;
      if (userId) {
        userEngagement = await this.getUserAnalytics(
          userId,
          startDate,
          endDate,
        );
      }

      // Calculate cost analysis
      const costAnalysis = {
        totalCost: this.calculateCost(
          summary.totalTokensUsed,
          summary.modelUsage,
        ),
        costByModel: this.calculateCostByModel(summary.modelUsage),
        projectedMonthlyCost: this.projectMonthlyCost(
          summary.totalTokensUsed,
          7,
        ),
      };

      return {
        performanceMetrics,
        systemHealth,
        userEngagement,
        costAnalysis,
      };
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      throw error;
    }
  }

  /**
   * Calculate AI usage costs
   */
  private calculateCost(
    totalTokens: number,
    modelUsage: Record<string, number>,
  ): number {
    // Simplified cost calculation - adjust rates as needed
    const rates = {
      "gpt-4": 0.03,
      "gpt-4-turbo": 0.01,
      "gpt-3.5-turbo": 0.002,
    };

    let totalCost = 0;
    Object.entries(modelUsage).forEach(([model, count]) => {
      const rate = rates[model as keyof typeof rates] || 0.01;
      const tokensPerRequest =
        totalTokens / Object.values(modelUsage).reduce((a, b) => a + b, 1);
      totalCost += (count * tokensPerRequest * rate) / 1000;
    });

    return totalCost;
  }

  private calculateCostByModel(
    modelUsage: Record<string, number>,
  ): Record<string, number> {
    const rates = {
      "gpt-4": 0.03,
      "gpt-4-turbo": 0.01,
      "gpt-3.5-turbo": 0.002,
    };

    const costByModel: Record<string, number> = {};
    Object.entries(modelUsage).forEach(([model, count]) => {
      const rate = rates[model as keyof typeof rates] || 0.01;
      costByModel[model] = count * rate;
    });

    return costByModel;
  }

  private projectMonthlyCost(
    tokensInPeriod: number,
    periodDays: number,
  ): number {
    const tokensPerDay = tokensInPeriod / periodDays;
    const monthlyTokens = tokensPerDay * 30;
    return (monthlyTokens * 0.01) / 1000; // Average rate
  }
}

// Export singleton instance
export const aiAnalytics = AIAnalyticsService.getInstance();

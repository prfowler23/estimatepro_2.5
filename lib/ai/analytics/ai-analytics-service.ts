/**
 * AI Analytics Service
 * Tracks and analyzes AI assistant usage patterns and performance
 */

import { createClient } from "@/lib/supabase/server";
import { aiPerformanceMonitor } from "../monitoring/ai-performance-monitor";
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
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_SIZE = 50;

  private constructor() {
    // Start processor only in server environment
    if (typeof window === "undefined") {
      this.startQueueProcessor();
    }
  }

  static getInstance(): AIAnalyticsService {
    if (!AIAnalyticsService.instance) {
      AIAnalyticsService.instance = new AIAnalyticsService();
    }
    return AIAnalyticsService.instance;
  }

  /**
   * Track AI usage event
   */
  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    try {
      const supabase = createClient();

      // Insert into persistent queue
      const { error } = await supabase.from("ai_analytics_queue").insert({
        event_data: {
          userId: metrics.userId,
          conversationId: metrics.conversationId,
          timestamp: metrics.timestamp.toISOString(),
          endpoint: metrics.endpoint,
          model: metrics.model,
          tokensUsed: metrics.tokensUsed,
          responseTime: metrics.responseTime,
          success: metrics.success,
          error: metrics.error,
          features: metrics.features,
          metadata: metrics.metadata,
        },
      });

      if (error) {
        console.error("Failed to queue analytics event:", error);
      }

      // Also send to performance monitor for real-time tracking
      if (productionConfig.getConfig().ai.monitoring.performanceTracking) {
        aiPerformanceMonitor.recordMetric(metrics.endpoint, {
          duration: metrics.responseTime,
          tokensUsed: metrics.tokensUsed,
          cacheHit: false,
          toolsUsed: [],
          modelFallback: false,
        });
      }
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    // Process queue periodically
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.PROCESS_INTERVAL);

    // Also process on startup
    this.processQueue().catch(console.error);
  }

  /**
   * Process analytics queue
   */
  private async processQueue(): Promise<void> {
    try {
      const supabase = createClient();

      // Call the database function to process queue
      const { data, error } = await supabase.rpc("process_analytics_queue", {
        batch_size: this.BATCH_SIZE,
      });

      if (error) {
        console.error("Failed to process analytics queue:", error);
        return;
      }

      if (data && data > 0) {
        console.log(`Processed ${data} analytics events`);
      }

      // Cleanup old processed items periodically (10% chance)
      if (Math.random() < 0.1) {
        const { error: cleanupError } = await supabase.rpc(
          "cleanup_analytics_queue",
          { days_to_keep: 7 },
        );

        if (cleanupError) {
          console.error("Failed to cleanup analytics queue:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Analytics queue processing error:", error);
    }
  }

  /**
   * Get analytics summary for a time period
   */
  async getAnalyticsSummary(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 1000,
  ): Promise<
    AIAnalyticsSummary & {
      pagination: { page: number; limit: number; total: number };
    }
  > {
    const supabase = createClient();

    // Get total count first
    const { count } = await supabase
      .from("ai_analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", startDate.toISOString())
      .lte("timestamp", endDate.toISOString());

    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from("ai_analytics_events")
      .select("*")
      .gte("timestamp", startDate.toISOString())
      .lte("timestamp", endDate.toISOString())
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      throw new Error(`Failed to fetch analytics: ${error?.message}`);
    }

    // Calculate summary metrics
    const summary: AIAnalyticsSummary = {
      totalRequests: data.length,
      successRate: data.filter((d) => d.success).length / data.length,
      averageResponseTime:
        data.reduce((sum, d) => sum + d.response_time, 0) / data.length,
      totalTokensUsed: data.reduce((sum, d) => sum + d.tokens_used, 0),
      uniqueUsers: new Set(data.map((d) => d.user_id)).size,
      modelUsage: {},
      featureUsage: {},
      errorTypes: {},
      peakUsageHours: this.calculatePeakHours(data),
    };

    // Calculate model usage
    data.forEach((event) => {
      summary.modelUsage[event.model] =
        (summary.modelUsage[event.model] || 0) + 1;

      // Calculate feature usage
      if (event.features_used) {
        Object.entries(event.features_used).forEach(([feature, used]) => {
          if (used) {
            summary.featureUsage[feature] =
              (summary.featureUsage[feature] || 0) + 1;
          }
        });
      }

      // Track error types
      if (!event.success && event.error) {
        const errorType = this.categorizeError(event.error);
        summary.errorTypes[errorType] =
          (summary.errorTypes[errorType] || 0) + 1;
      }
    });

    return {
      ...summary,
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    const supabase = createClient();

    // Get user's AI conversations
    const { data: conversations, error: convError } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId);

    if (convError) {
      throw new Error(
        `Failed to fetch user conversations: ${convError.message}`,
      );
    }

    // Get user's analytics events
    const { data: events, error: eventError } = await supabase
      .from("ai_analytics_events")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (eventError) {
      throw new Error(`Failed to fetch user events: ${eventError.message}`);
    }

    const totalMessages =
      conversations?.reduce(
        (sum, conv) => sum + (conv.message_count || 0),
        0,
      ) || 0;

    const totalTokens =
      events?.reduce((sum, event) => sum + event.tokens_used, 0) || 0;

    // Calculate feature usage
    const featureUsage: Record<string, number> = {};
    events?.forEach((event) => {
      if (event.features_used) {
        Object.entries(event.features_used).forEach(([feature, used]) => {
          if (used) {
            featureUsage[feature] = (featureUsage[feature] || 0) + 1;
          }
        });
      }
    });

    const mostUsedFeatures = Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);

    return {
      userId,
      totalConversations: conversations?.length || 0,
      totalMessages,
      totalTokensUsed: totalTokens,
      averageConversationLength: conversations?.length
        ? totalMessages / conversations.length
        : 0,
      mostUsedFeatures,
      lastActive: events?.[0]?.timestamp
        ? new Date(events[0].timestamp)
        : new Date(),
      engagementScore: this.calculateEngagementScore({
        conversations: conversations?.length || 0,
        messages: totalMessages,
        features: mostUsedFeatures.length,
        lastActive: events?.[0]?.timestamp,
      }),
    };
  }

  /**
   * Get real-time analytics dashboard data
   */
  async getDashboardMetrics(): Promise<{
    current: {
      activeUsers: number;
      requestsPerMinute: number;
      averageResponseTime: number;
      errorRate: number;
    };
    trends: {
      requestsOverTime: Array<{ time: string; count: number }>;
      tokensOverTime: Array<{ time: string; tokens: number }>;
      errorRateOverTime: Array<{ time: string; rate: number }>;
    };
    health: {
      status: "healthy" | "degraded" | "critical";
      issues: string[];
    };
  }> {
    const supabase = createClient();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent events
    const { data: recentEvents, error } = await supabase
      .from("ai_analytics_events")
      .select("*")
      .gte("timestamp", oneHourAgo.toISOString())
      .order("timestamp", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    // Calculate current metrics
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentFiveMinEvents =
      recentEvents?.filter((e) => new Date(e.timestamp) >= fiveMinutesAgo) ||
      [];

    const current = {
      activeUsers: new Set(recentFiveMinEvents.map((e) => e.user_id)).size,
      requestsPerMinute: recentFiveMinEvents.length / 5,
      averageResponseTime:
        recentFiveMinEvents.reduce((sum, e) => sum + e.response_time, 0) /
        (recentFiveMinEvents.length || 1),
      errorRate:
        recentFiveMinEvents.filter((e) => !e.success).length /
        (recentFiveMinEvents.length || 1),
    };

    // Calculate trends (group by 5-minute intervals)
    const trends = this.calculateTrends(recentEvents || []);

    // Determine health status
    const health = this.determineHealthStatus(current, recentEvents || []);

    return { current, trends, health };
  }

  /**
   * Calculate peak usage hours
   */
  private calculatePeakHours(events: any[]): number[] {
    const hourCounts: Record<number, number> = {};

    events.forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  /**
   * Categorize error types
   */
  private categorizeError(error: string): string {
    if (error.includes("rate limit")) return "rate_limit";
    if (error.includes("timeout")) return "timeout";
    if (error.includes("model")) return "model_error";
    if (error.includes("auth")) return "authentication";
    if (error.includes("network")) return "network";
    return "other";
  }

  /**
   * Calculate user engagement score
   */
  private calculateEngagementScore(data: {
    conversations: number;
    messages: number;
    features: number;
    lastActive?: string;
  }): number {
    let score = 0;

    // Conversation frequency (max 30 points)
    score += Math.min(data.conversations * 3, 30);

    // Message volume (max 30 points)
    score += Math.min(data.messages * 0.5, 30);

    // Feature diversity (max 20 points)
    score += Math.min(data.features * 4, 20);

    // Recency (max 20 points)
    if (data.lastActive) {
      const daysSinceActive =
        (Date.now() - new Date(data.lastActive).getTime()) /
        (1000 * 60 * 60 * 24);
      score += Math.max(20 - daysSinceActive * 2, 0);
    }

    return Math.round(score);
  }

  /**
   * Calculate trend data
   */
  private calculateTrends(events: any[]) {
    const intervals: Record<
      string,
      { count: number; tokens: number; errors: number }
    > = {};

    events.forEach((event) => {
      const time = new Date(event.timestamp);
      const intervalKey = `${time.getHours()}:${Math.floor(time.getMinutes() / 5) * 5}`;

      if (!intervals[intervalKey]) {
        intervals[intervalKey] = { count: 0, tokens: 0, errors: 0 };
      }

      intervals[intervalKey].count++;
      intervals[intervalKey].tokens += event.tokens_used;
      if (!event.success) intervals[intervalKey].errors++;
    });

    const sortedKeys = Object.keys(intervals).sort();

    return {
      requestsOverTime: sortedKeys.map((time) => ({
        time,
        count: intervals[time].count,
      })),
      tokensOverTime: sortedKeys.map((time) => ({
        time,
        tokens: intervals[time].tokens,
      })),
      errorRateOverTime: sortedKeys.map((time) => ({
        time,
        rate: intervals[time].errors / intervals[time].count,
      })),
    };
  }

  /**
   * Determine system health status
   */
  private determineHealthStatus(
    current: any,
    events: any[],
  ): { status: "healthy" | "degraded" | "critical"; issues: string[] } {
    const issues: string[] = [];

    if (current.errorRate > 0.2) {
      issues.push("High error rate detected");
    }

    if (current.averageResponseTime > 5000) {
      issues.push("Slow response times");
    }

    if (current.requestsPerMinute > 100) {
      issues.push("High request volume");
    }

    const status =
      issues.length === 0
        ? "healthy"
        : issues.length === 1
          ? "degraded"
          : "critical";

    return { status, issues };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    startDate: Date,
    endDate: Date,
    format: "json" | "csv" = "json",
  ): Promise<string> {
    const summary = await this.getAnalyticsSummary(startDate, endDate);

    if (format === "json") {
      return JSON.stringify(summary, null, 2);
    }

    // CSV format
    const csv = [
      "Metric,Value",
      `Total Requests,${summary.totalRequests}`,
      `Success Rate,${(summary.successRate * 100).toFixed(2)}%`,
      `Average Response Time,${summary.averageResponseTime.toFixed(2)}ms`,
      `Total Tokens Used,${summary.totalTokensUsed}`,
      `Unique Users,${summary.uniqueUsers}`,
      "",
      "Model,Usage Count",
      ...Object.entries(summary.modelUsage).map(
        ([model, count]) => `${model},${count}`,
      ),
      "",
      "Feature,Usage Count",
      ...Object.entries(summary.featureUsage).map(
        ([feature, count]) => `${feature},${count}`,
      ),
    ].join("\n");

    return csv;
  }

  /**
   * Cleanup old analytics data
   */
  async cleanupOldAnalytics(daysToKeep: number = 90): Promise<number> {
    const supabase = createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from("ai_analytics_events")
      .delete()
      .lt("timestamp", cutoffDate.toISOString())
      .select("id");

    if (error) {
      throw new Error(`Failed to cleanup analytics: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Stop the analytics service
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Singleton instance
export const aiAnalytics = AIAnalyticsService.getInstance();

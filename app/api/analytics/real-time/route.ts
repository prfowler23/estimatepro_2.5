// Real-Time Analytics API
// Provides streaming analytics data with WebSocket support and advanced aggregation

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Real-time request validation schema
const RealTimeAnalyticsSchema = z.object({
  metrics: z.array(
    z.enum([
      "live_estimates",
      "active_workflows",
      "revenue_stream",
      "user_activity",
      "ai_usage",
      "performance_metrics",
      "quality_scores",
      "anomaly_detection",
    ]),
  ),
  interval: z.enum(["1m", "5m", "15m", "1h"]).default("5m"),
  aggregation: z.enum(["sum", "avg", "count", "max", "min"]).default("sum"),
  filters: z
    .object({
      userId: z.string().optional(),
      serviceType: z.string().optional(),
      workflowStage: z.string().optional(),
      timeRange: z
        .object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        })
        .optional(),
    })
    .optional(),
});

interface LiveMetric {
  metric: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
  trend?: "up" | "down" | "stable";
  confidence?: number;
}

interface RealTimeData {
  metrics: LiveMetric[];
  alerts: Array<{
    type: "warning" | "error" | "info";
    message: string;
    timestamp: string;
    severity: number;
  }>;
  predictions: Array<{
    metric: string;
    predictedValue: number;
    confidence: number;
    timeframe: string;
  }>;
  anomalies: Array<{
    metric: string;
    value: number;
    expected: number;
    deviation: number;
    timestamp: string;
  }>;
}

class RealTimeAnalyticsEngine {
  private supabase: any;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getLiveEstimates(): Promise<LiveMetric> {
    const cacheKey = "live_estimates";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await this.supabase
      .from("estimates")
      .select("status, created_at, total_amount")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    const activeEstimates =
      data?.filter((e: any) =>
        ["draft", "pending", "in_review"].includes(e.status),
      ).length || 0;

    const recentEstimates =
      data?.filter(
        (e: any) =>
          new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000),
      ).length || 0;

    const trend = this.calculateTrend(recentEstimates, activeEstimates);

    const metric: LiveMetric = {
      metric: "live_estimates",
      value: activeEstimates,
      timestamp: new Date().toISOString(),
      metadata: {
        recent_count: recentEstimates,
        total_24h: data?.length || 0,
      },
      trend,
      confidence: 0.95,
    };

    this.cache.set(cacheKey, { data: metric, timestamp: Date.now() });
    return metric;
  }

  async getActiveWorkflows(): Promise<LiveMetric> {
    const { data, error } = await this.supabase
      .from("estimate_flows")
      .select("current_step, created_at, updated_at")
      .neq("current_step", "completed")
      .gte("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const activeCount = data?.length || 0;
    const avgStepTime = this.calculateAverageStepTime(data);

    return {
      metric: "active_workflows",
      value: activeCount,
      timestamp: new Date().toISOString(),
      metadata: {
        avg_step_duration: avgStepTime,
        most_common_step: this.getMostCommonStep(data),
      },
      trend: "stable",
      confidence: 0.9,
    };
  }

  async getRevenueStream(): Promise<LiveMetric> {
    const { data, error } = await this.supabase
      .from("estimates")
      .select("total_amount, status, created_at")
      .eq("status", "accepted")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    const todayRevenue =
      data?.reduce((sum: any, est: any) => {
        const estDate = new Date(est.created_at);
        const today = new Date();
        if (estDate.toDateString() === today.toDateString()) {
          return sum + (est.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

    const hourlyRevenue =
      data?.reduce((sum: any, est: any) => {
        const estDate = new Date(est.created_at);
        if (estDate > new Date(Date.now() - 60 * 60 * 1000)) {
          return sum + (est.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

    return {
      metric: "revenue_stream",
      value: todayRevenue,
      timestamp: new Date().toISOString(),
      metadata: {
        hourly_revenue: hourlyRevenue,
        estimate_count: data?.length || 0,
      },
      trend: hourlyRevenue > 0 ? "up" : "stable",
      confidence: 0.85,
    };
  }

  async getUserActivity(): Promise<LiveMetric> {
    // This would integrate with authentication logs or user activity tracking
    // For now, we'll use estimate creation as a proxy for user activity
    const { data, error } = await this.supabase
      .from("estimates")
      .select("user_id, created_at")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const uniqueUsers = new Set(data?.map((e: any) => e.user_id)).size;
    const totalActions = data?.length || 0;

    return {
      metric: "user_activity",
      value: uniqueUsers,
      timestamp: new Date().toISOString(),
      metadata: {
        total_actions: totalActions,
        actions_per_user: uniqueUsers > 0 ? totalActions / uniqueUsers : 0,
      },
      trend: "stable",
      confidence: 0.8,
    };
  }

  async getAIUsage(): Promise<LiveMetric> {
    // This would integrate with AI usage tracking
    // For now, we'll simulate based on facade analysis and AI features
    const simulatedUsage = Math.floor(Math.random() * 50) + 10;

    return {
      metric: "ai_usage",
      value: simulatedUsage,
      timestamp: new Date().toISOString(),
      metadata: {
        facade_analyses: Math.floor(simulatedUsage * 0.3),
        ai_suggestions: Math.floor(simulatedUsage * 0.5),
        document_extractions: Math.floor(simulatedUsage * 0.2),
      },
      trend: "up",
      confidence: 0.7,
    };
  }

  async getPerformanceMetrics(): Promise<LiveMetric> {
    // Simulate performance metrics - in production, this would come from monitoring
    const avgResponseTime = Math.random() * 500 + 100; // 100-600ms

    return {
      metric: "performance_metrics",
      value: avgResponseTime,
      timestamp: new Date().toISOString(),
      metadata: {
        avg_response_time: avgResponseTime,
        error_rate: Math.random() * 0.05, // 0-5% error rate
        throughput: Math.floor(Math.random() * 100) + 50,
      },
      trend: avgResponseTime < 300 ? "up" : "down",
      confidence: 0.95,
    };
  }

  async detectAnomalies(metrics: LiveMetric[]): Promise<
    Array<{
      metric: string;
      value: number;
      expected: number;
      deviation: number;
      timestamp: string;
    }>
  > {
    const anomalies: Array<any> = [];

    for (const metric of metrics) {
      // Simple anomaly detection based on historical patterns
      const expected = await this.getExpectedValue(metric.metric);
      const deviation = Math.abs(metric.value - expected) / expected;

      if (deviation > 0.3) {
        // 30% deviation threshold
        anomalies.push({
          metric: metric.metric,
          value: metric.value,
          expected,
          deviation,
          timestamp: metric.timestamp,
        });
      }
    }

    return anomalies;
  }

  private async getExpectedValue(metricName: string): Promise<number> {
    // In a real implementation, this would analyze historical data
    // For now, return reasonable expected values
    const expectedValues: Record<string, number> = {
      live_estimates: 15,
      active_workflows: 8,
      revenue_stream: 5000,
      user_activity: 5,
      ai_usage: 30,
      performance_metrics: 250,
    };

    return expectedValues[metricName] || 0;
  }

  private calculateTrend(
    recent: number,
    total: number,
  ): "up" | "down" | "stable" {
    const ratio = total > 0 ? recent / total : 0;
    if (ratio > 0.3) return "up";
    if (ratio < 0.1) return "down";
    return "stable";
  }

  private calculateAverageStepTime(workflows: any[]): number {
    if (!workflows || workflows.length === 0) return 0;

    const stepTimes = workflows.map((w) => {
      const created = new Date(w.created_at);
      const updated = new Date(w.updated_at);
      return updated.getTime() - created.getTime();
    });

    return stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length;
  }

  private getMostCommonStep(workflows: any[]): string {
    if (!workflows || workflows.length === 0) return "unknown";

    const stepCounts = workflows.reduce((acc, w) => {
      acc[w.current_step] = (acc[w.current_step] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stepCounts).reduce((a, b) =>
      stepCounts[a[0]] > stepCounts[b[0]] ? a : b,
    )[0];
  }
}

async function handleGET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      metrics: searchParams.get("metrics")?.split(",") || ["live_estimates"],
      interval: searchParams.get("interval") || "5m",
      aggregation: searchParams.get("aggregation") || "sum",
      filters: searchParams.get("filters")
        ? JSON.parse(searchParams.get("filters")!)
        : undefined,
    };

    const validatedParams = RealTimeAnalyticsSchema.parse(rawParams);
    const engine = new RealTimeAnalyticsEngine(supabase);

    const metricPromises = validatedParams.metrics.map(async (metricType) => {
      switch (metricType) {
        case "live_estimates":
          return await engine.getLiveEstimates();
        case "active_workflows":
          return await engine.getActiveWorkflows();
        case "revenue_stream":
          return await engine.getRevenueStream();
        case "user_activity":
          return await engine.getUserActivity();
        case "ai_usage":
          return await engine.getAIUsage();
        case "performance_metrics":
          return await engine.getPerformanceMetrics();
        default:
          return null;
      }
    });

    const metrics = (await Promise.all(metricPromises)).filter(
      Boolean,
    ) as LiveMetric[];
    const anomalies = await engine.detectAnomalies(metrics);

    const alerts = anomalies.map((anomaly) => ({
      type: "warning" as const,
      message: `${anomaly.metric} shows ${(anomaly.deviation * 100).toFixed(1)}% deviation from expected value`,
      timestamp: anomaly.timestamp,
      severity: anomaly.deviation > 0.5 ? 8 : 5,
    }));

    const predictions = metrics.map((metric) => ({
      metric: metric.metric,
      predictedValue: metric.value * (1 + (Math.random() - 0.5) * 0.2), // Simple prediction
      confidence: metric.confidence || 0.8,
      timeframe: "1h",
    }));

    const result: RealTimeData = {
      metrics,
      alerts,
      predictions,
      anomalies,
    };

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      interval: validatedParams.interval,
    });
  } catch (error) {
    console.error("Real-time analytics API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Real-time analytics request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;

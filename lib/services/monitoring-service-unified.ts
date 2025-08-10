/**
 * Unified Monitoring Service
 * Consolidates monitoring, performance tracking, and optimization functionality
 *
 * This service combines three previous services:
 * 1. monitoring-service.ts - API client and alerts
 * 2. enhanced-performance-monitoring-service.ts - Database performance monitoring
 * 3. performance-optimization-service.ts - Performance optimization tracking
 */

import { createClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";
import {
  performanceMonitor,
  PerformanceEntry,
  PerformanceMetrics,
} from "@/lib/performance/performance-monitor";
// Conditional server-side import to avoid Redis in client bundle
const cacheManager =
  typeof window === "undefined"
    ? require("@/lib/cache/cache-manager").cacheManager
    : null;
// Conditional server-side import to avoid Redis in client bundle
const queryOptimizer =
  typeof window === "undefined"
    ? require("@/lib/performance/query-optimization").queryOptimizer
    : null;
import { BaseService } from "./core/base-service";
import {
  ValidationError,
  DatabaseError,
  NetworkError,
  ServiceError,
} from "./core/errors";
import { RetryableOperation } from "@/lib/utils/retry-logic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Database } from "@/types/database";

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

// System Monitoring Types
export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  timestamp: number;
}

export interface HealthCheck {
  service: string;
  status: "healthy" | "warning" | "critical";
  message: string;
  timestamp: number;
  responseTime?: number;
}

export interface MonitoringMetricsResponse {
  current?: SystemMetrics;
  history?: SystemMetrics[];
  health?: {
    checks: HealthCheck[];
    status: "healthy" | "warning" | "critical";
  };
  performance?: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    recentLogs: any[];
  };
  stats?: {
    uptime: number;
    totalRequests: number;
    totalErrors: number;
    peakCpuUsage: number;
    peakMemoryUsage: number;
  };
}

export interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  resolved?: boolean;
  acknowledgedBy?: string;
  details?: any;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retentionDays: number;
  autoRefresh: boolean;
  refreshInterval: number;
  alertThresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
}

// Performance Monitoring Types
export interface PerformanceMetric {
  id: string;
  operation_name: string;
  operation_type:
    | "api"
    | "database"
    | "cache"
    | "ai"
    | "calculation"
    | "component";
  duration_ms: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface QueryPerformance {
  table_name: string;
  query_hash: string;
  avg_execution_time: number;
  execution_count: number;
  last_executed: string;
}

export interface CacheStats {
  cache_type: string;
  total_keys: number;
  avg_hit_rate: number;
  total_requests: number;
  total_hits: number;
  total_misses: number;
}

export interface PerformanceAlert {
  id: string;
  alert_type: "warning" | "critical";
  metric_name: string;
  threshold_value: number;
  actual_value: number;
  message: string;
  resolved: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_estimates: number;
  draft_estimates: number;
  pending_estimates: number;
  approved_estimates: number;
  completed_estimates: number;
  total_value: number;
  avg_estimate_value: number;
  last_estimate_date: string;
  estimates_this_month: number;
}

export interface ConnectionStats {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  max_connections: number;
  connection_utilization: number;
}

// Optimization Types
export interface OptimizationMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

// ==============================================================================
// UNIFIED MONITORING SERVICE CLASS
// ==============================================================================

export class UnifiedMonitoringService extends BaseService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private isClient: boolean;
  private baseUrl: string;
  private abortController: AbortController | null = null;

  // Performance optimization tracking
  private static optimizationMetrics: OptimizationMetric[] = [];
  private static baselineMetrics: Record<string, number> = {};
  private static sessionMetrics: Map<string, OptimizationMetric[]> = new Map();
  private static userMetrics: Map<string, OptimizationMetric[]> = new Map();
  private static aggregationInterval: NodeJS.Timeout | null = null;
  private static aggregationPeriod = 60000; // 1 minute

  constructor() {
    super("UnifiedMonitoringService", {
      enableCache: true,
      cachePrefix: "monitoring",
      defaultCacheTTL: 300, // 5 minutes
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
    });

    this.supabase = createClient();
    this.isClient = typeof window !== "undefined";
    this.baseUrl = "/api/monitoring";
  }

  // ==============================================================================
  // SYSTEM MONITORING METHODS (from monitoring-service.ts)
  // ==============================================================================

  /**
   * Fetch current system metrics and health data
   */
  async getMetrics(options?: {
    hours?: number;
    include?: string[];
  }): Promise<MonitoringMetricsResponse> {
    return this.executeWithErrorHandling(
      "getMetrics",
      async () => {
        // Cancel any pending requests
        this.abortController?.abort();
        this.abortController = new AbortController();

        const params = new URLSearchParams();
        if (options?.hours) {
          params.append("hours", options.hours.toString());
        }
        if (options?.include) {
          params.append("include", options.include.join(","));
        }

        const response = await fetch(
          `${this.baseUrl}/metrics?${params.toString()}`,
          {
            signal: this.abortController.signal,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new NetworkError(
            `Failed to fetch metrics: ${response.statusText}`,
          );
        }

        return await response.json();
      },
      { operation: "fetch_metrics", metadata: options },
    );
  }

  /**
   * Submit custom metrics or events
   */
  async submitMetric(type: string, data: any): Promise<void> {
    return this.executeWithErrorHandling(
      "submitMetric",
      async () => {
        const response = await fetch(`${this.baseUrl}/metrics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type, data }),
        });

        if (!response.ok) {
          throw new NetworkError(
            `Failed to submit metric: ${response.statusText}`,
          );
        }
      },
      { operation: "submit_metric", metadata: { type } },
    );
  }

  /**
   * Get system alerts
   */
  async getAlerts(options?: {
    severity?: "all" | "critical" | "warning" | "info";
    resolved?: boolean;
    limit?: number;
  }): Promise<Alert[]> {
    return this.executeWithErrorHandling(
      "getAlerts",
      async () => {
        const params = new URLSearchParams();
        if (options?.severity && options.severity !== "all") {
          params.append("severity", options.severity);
        }
        if (options?.resolved !== undefined) {
          params.append("resolved", options.resolved.toString());
        }
        if (options?.limit) {
          params.append("limit", options.limit.toString());
        }

        const response = await fetch(
          `${this.baseUrl}/alerts?${params.toString()}`,
        );

        if (!response.ok) {
          throw new NetworkError(
            `Failed to fetch alerts: ${response.statusText}`,
          );
        }

        return await response.json();
      },
      { operation: "fetch_alerts", metadata: options },
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId?: string): Promise<void> {
    return this.executeWithErrorHandling(
      "acknowledgeAlert",
      async () => {
        const response = await fetch(
          `${this.baseUrl}/alerts/${alertId}/acknowledge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          },
        );

        if (!response.ok) {
          throw new NetworkError(
            `Failed to acknowledge alert: ${response.statusText}`,
          );
        }
      },
      { operation: "acknowledge_alert", metadata: { alertId, userId } },
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    return this.executeWithErrorHandling(
      "resolveAlert",
      async () => {
        const response = await fetch(
          `${this.baseUrl}/alerts/${alertId}/resolve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resolution }),
          },
        );

        if (!response.ok) {
          throw new NetworkError(
            `Failed to resolve alert: ${response.statusText}`,
          );
        }
      },
      { operation: "resolve_alert", metadata: { alertId } },
    );
  }

  /**
   * Get monitoring configuration
   */
  async getConfig(): Promise<MonitoringConfig> {
    return this.executeWithErrorHandling(
      "getConfig",
      async () => {
        const response = await fetch(`${this.baseUrl}/config`);

        if (!response.ok) {
          throw new NetworkError(
            `Failed to fetch config: ${response.statusText}`,
          );
        }

        return await response.json();
      },
      { operation: "fetch_config" },
    );
  }

  /**
   * Update monitoring configuration
   */
  async updateConfig(config: Partial<MonitoringConfig>): Promise<void> {
    return this.executeWithErrorHandling(
      "updateConfig",
      async () => {
        const response = await fetch(`${this.baseUrl}/config`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new NetworkError(
            `Failed to update config: ${response.statusText}`,
          );
        }
      },
      { operation: "update_config", metadata: config },
    );
  }

  /**
   * Export metrics data
   */
  async exportMetrics(
    format: "json" | "csv",
    options?: {
      startDate?: Date;
      endDate?: Date;
      metrics?: string[];
    },
  ): Promise<Blob> {
    return this.executeWithErrorHandling(
      "exportMetrics",
      async () => {
        const params = new URLSearchParams();
        params.append("format", format);
        if (options?.startDate) {
          params.append("startDate", options.startDate.toISOString());
        }
        if (options?.endDate) {
          params.append("endDate", options.endDate.toISOString());
        }
        if (options?.metrics) {
          params.append("metrics", options.metrics.join(","));
        }

        const response = await fetch(
          `${this.baseUrl}/export?${params.toString()}`,
        );

        if (!response.ok) {
          throw new NetworkError(
            `Failed to export metrics: ${response.statusText}`,
          );
        }

        return await response.blob();
      },
      { operation: "export_metrics", metadata: { format, options } },
    );
  }

  /**
   * Cancel any pending requests
   */
  cancelRequests(): void {
    this.abortController?.abort();
  }

  // ==============================================================================
  // PERFORMANCE MONITORING METHODS (from enhanced-performance-monitoring-service.ts)
  // ==============================================================================

  /**
   * Log a performance metric
   */
  async logPerformanceMetric(
    operationName: string,
    operationType: PerformanceMetric["operation_type"],
    durationMs: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    return this.executeWithErrorHandling(
      "logPerformanceMetric",
      async () => {
        const { error } = await this.supabase.from("performance_logs").insert({
          operation_name: operationName,
          operation_type: operationType,
          duration_ms: durationMs,
          success,
          error_message: errorMessage,
          metadata: metadata || {},
          ip_address: this.isClient ? undefined : this.getClientIP(),
          user_agent: this.isClient ? navigator.userAgent : undefined,
        });

        if (error) {
          throw new DatabaseError(
            `Failed to log performance metric: ${error.message}`,
          );
        }

        return { success: true };
      },
      {
        operation: "log_performance",
        metadata: { operationName, operationType, durationMs },
      },
    );
  }

  /**
   * Get performance statistics for a time period
   */
  async getPerformanceStats(
    startTime?: string,
    endTime?: string,
  ): Promise<{
    success: boolean;
    data?: {
      total_operations: number;
      avg_duration: number;
      min_duration: number;
      max_duration: number;
      error_rate: number;
      operations_by_type: Record<string, any>;
    };
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getPerformanceStats",
      async () => {
        const { data, error } = await this.supabase.rpc(
          "get_performance_stats",
          {
            start_time:
              startTime || new Date(Date.now() - 3600000).toISOString(),
            end_time: endTime || new Date().toISOString(),
          },
        );

        if (error) {
          throw new DatabaseError(
            `Failed to get performance stats: ${error.message}`,
          );
        }

        return { success: true, data: data[0] };
      },
      { operation: "get_performance_stats", metadata: { startTime, endTime } },
    );
  }

  /**
   * Get slow queries for optimization
   */
  async getSlowQueries(
    thresholdMs: number = 1000,
    limit: number = 50,
  ): Promise<{
    success: boolean;
    data?: QueryPerformance[];
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getSlowQueries",
      async () => {
        const { data, error } = await this.supabase.rpc("get_slow_queries", {
          threshold_ms: thresholdMs,
          limit_count: limit,
        });

        if (error) {
          throw new DatabaseError(
            `Failed to get slow queries: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      { operation: "get_slow_queries", metadata: { thresholdMs, limit } },
    );
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStats(): Promise<{
    success: boolean;
    data?: CacheStats[];
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getCacheStats",
      async () => {
        const { data, error } = await this.supabase.rpc("get_cache_stats");

        if (error) {
          throw new DatabaseError(
            `Failed to get cache stats: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      { operation: "get_cache_stats" },
    );
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    success: boolean;
    data?: ConnectionStats;
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getConnectionStats",
      async () => {
        const { data, error } = await this.supabase.rpc("get_connection_stats");

        if (error) {
          throw new DatabaseError(
            `Failed to get connection stats: ${error.message}`,
          );
        }

        return { success: true, data: data[0] };
      },
      { operation: "get_connection_stats" },
    );
  }

  /**
   * Get optimized user statistics using materialized view
   */
  async getUserStatisticsFast(userId: string): Promise<{
    success: boolean;
    data?: DashboardStats;
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getUserStatisticsFast",
      async () => {
        const { data, error } = await this.supabase.rpc(
          "get_user_statistics_fast",
          {
            p_user_id: userId,
          },
        );

        if (error) {
          throw new DatabaseError(
            `Failed to get user statistics: ${error.message}`,
          );
        }

        return { success: true, data: data[0] };
      },
      { operation: "get_user_statistics", metadata: { userId } },
    );
  }

  /**
   * Get optimized user estimates
   */
  async getUserEstimatesOptimized(
    userId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getUserEstimatesOptimized",
      async () => {
        const { data, error } = await this.supabase.rpc(
          "get_user_estimates_optimized",
          {
            p_user_id: userId,
            p_status: status,
            p_limit: limit,
            p_offset: offset,
          },
        );

        if (error) {
          throw new DatabaseError(
            `Failed to get optimized estimates: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      {
        operation: "get_user_estimates",
        metadata: { userId, status, limit, offset },
      },
    );
  }

  /**
   * Detect performance anomalies
   */
  async detectPerformanceAnomalies(
    checkPeriodMinutes: number = 60,
    thresholdMultiplier: number = 2.0,
  ): Promise<{
    success: boolean;
    data?: Array<{
      operation_type: string;
      operation_name: string;
      current_avg_duration: number;
      historical_avg_duration: number;
      anomaly_ratio: number;
      severity: string;
    }>;
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "detectPerformanceAnomalies",
      async () => {
        const { data, error } = await this.supabase.rpc(
          "detect_performance_anomalies",
          {
            check_period_minutes: checkPeriodMinutes,
            threshold_multiplier: thresholdMultiplier,
          },
        );

        if (error) {
          throw new DatabaseError(
            `Failed to detect anomalies: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      {
        operation: "detect_anomalies",
        metadata: { checkPeriodMinutes, thresholdMultiplier },
      },
    );
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(
    resolved: boolean = false,
    limit: number = 50,
  ): Promise<{
    success: boolean;
    data?: PerformanceAlert[];
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getPerformanceAlerts",
      async () => {
        const { data, error } = await this.supabase
          .from("performance_alerts")
          .select("*")
          .eq("resolved", resolved)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          throw new DatabaseError(
            `Failed to get performance alerts: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      { operation: "get_performance_alerts", metadata: { resolved, limit } },
    );
  }

  /**
   * Create a performance alert
   */
  async createPerformanceAlert(
    alertType: "warning" | "critical",
    metricName: string,
    thresholdValue: number,
    actualValue: number,
    message: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.executeWithErrorHandling(
      "createPerformanceAlert",
      async () => {
        const { error } = await this.supabase
          .from("performance_alerts")
          .insert({
            alert_type: alertType,
            metric_name: metricName,
            threshold_value: thresholdValue,
            actual_value: actualValue,
            message,
          });

        if (error) {
          throw new DatabaseError(
            `Failed to create performance alert: ${error.message}`,
          );
        }

        return { success: true };
      },
      {
        operation: "create_alert",
        metadata: { alertType, metricName, thresholdValue, actualValue },
      },
    );
  }

  /**
   * Resolve a performance alert
   */
  async resolvePerformanceAlert(
    alertId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.executeWithErrorHandling(
      "resolvePerformanceAlert",
      async () => {
        const { error } = await this.supabase
          .from("performance_alerts")
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", alertId);

        if (error) {
          throw new DatabaseError(
            `Failed to resolve performance alert: ${error.message}`,
          );
        }

        return { success: true };
      },
      { operation: "resolve_performance_alert", metadata: { alertId } },
    );
  }

  /**
   * Refresh materialized views
   */
  async refreshDashboardStats(): Promise<{ success: boolean; error?: string }> {
    return this.executeWithErrorHandling(
      "refreshDashboardStats",
      async () => {
        const { error } = await this.supabase.rpc("refresh_dashboard_stats");

        if (error) {
          throw new DatabaseError(
            `Failed to refresh dashboard stats: ${error.message}`,
          );
        }

        return { success: true };
      },
      { operation: "refresh_dashboard_stats" },
    );
  }

  /**
   * Clean up old performance data
   */
  async cleanupPerformanceData(
    retentionDays: number = 30,
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    return this.executeWithErrorHandling(
      "cleanupPerformanceData",
      async () => {
        const { data, error } = await this.supabase.rpc(
          "cleanup_performance_data",
          {
            retention_days: retentionDays,
          },
        );

        if (error) {
          throw new DatabaseError(
            `Failed to cleanup performance data: ${error.message}`,
          );
        }

        return { success: true, deletedCount: data };
      },
      { operation: "cleanup_performance", metadata: { retentionDays } },
    );
  }

  /**
   * Analyze table bloat and get optimization recommendations
   */
  async analyzeTableBloat(): Promise<{
    success: boolean;
    data?: Array<{
      table_name: string;
      bloat_ratio: number;
      wasted_bytes: number;
      recommendation: string;
    }>;
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "analyzeTableBloat",
      async () => {
        const { data, error } = await this.supabase.rpc("analyze_table_bloat");

        if (error) {
          throw new DatabaseError(
            `Failed to analyze table bloat: ${error.message}`,
          );
        }

        return { success: true, data };
      },
      { operation: "analyze_table_bloat" },
    );
  }

  /**
   * Performance monitoring middleware for API operations
   */
  async monitorOperation<T>(
    operationName: string,
    operationType: PerformanceMetric["operation_type"],
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: Error | null = null;

    try {
      const result = await operation();
      return result;
    } catch (err: any) {
      success = false;
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      // Log performance metric (don't await to avoid blocking)
      this.logPerformanceMetric(
        operationName,
        operationType,
        duration,
        success,
        error?.message,
        {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      ).catch(console.error);

      // Check for performance alerts
      this.checkPerformanceThresholds(
        operationName,
        operationType,
        duration,
      ).catch(console.error);
    }
  }

  /**
   * Check performance thresholds and create alerts if needed
   */
  private async checkPerformanceThresholds(
    operationName: string,
    operationType: string,
    duration: number,
  ): Promise<void> {
    try {
      // Get performance configuration thresholds
      const { data: config } = await this.supabase
        .from("performance_config")
        .select("setting_name, setting_value")
        .in("setting_name", [
          "alert_response_time_warning",
          "alert_response_time_critical",
        ]);

      if (!config) return;

      const warningThreshold = config.find(
        (c) => c.setting_name === "alert_response_time_warning",
      );
      const criticalThreshold = config.find(
        (c) => c.setting_name === "alert_response_time_critical",
      );

      if (
        criticalThreshold &&
        duration > criticalThreshold.setting_value.value
      ) {
        await this.createPerformanceAlert(
          "critical",
          "response_time",
          criticalThreshold.setting_value.value,
          duration,
          `Critical response time detected for ${operationName} (${operationType}): ${duration}ms`,
        );
      } else if (
        warningThreshold &&
        duration > warningThreshold.setting_value.value
      ) {
        await this.createPerformanceAlert(
          "warning",
          "response_time",
          warningThreshold.setting_value.value,
          duration,
          `Slow response time detected for ${operationName} (${operationType}): ${duration}ms`,
        );
      }
    } catch (error) {
      this.logger.error("Error checking performance thresholds:", error);
    }
  }

  /**
   * Get client IP address (server-side only)
   */
  private getClientIP(): string | undefined {
    if (typeof window !== "undefined") return undefined;

    // This would typically get the IP from request headers
    // Implementation depends on your server setup
    return undefined;
  }

  /**
   * Get comprehensive performance insights
   */
  async getPerformanceInsights(): Promise<{
    success: boolean;
    data?: {
      stats: any;
      slowQueries: QueryPerformance[];
      cacheStats: CacheStats[];
      connectionStats: ConnectionStats;
      anomalies: any[];
      alerts: PerformanceAlert[];
      bloatAnalysis: any[];
    };
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getPerformanceInsights",
      async () => {
        const [
          statsResult,
          slowQueriesResult,
          cacheStatsResult,
          connectionStatsResult,
          anomaliesResult,
          alertsResult,
          bloatResult,
        ] = await Promise.all([
          this.getPerformanceStats(),
          this.getSlowQueries(),
          this.getCacheStats(),
          this.getConnectionStats(),
          this.detectPerformanceAnomalies(),
          this.getPerformanceAlerts(),
          this.analyzeTableBloat(),
        ]);

        return {
          success: true,
          data: {
            stats: statsResult.data,
            slowQueries: slowQueriesResult.data || [],
            cacheStats: cacheStatsResult.data || [],
            connectionStats:
              connectionStatsResult.data || ({} as ConnectionStats),
            anomalies: anomaliesResult.data || [],
            alerts: alertsResult.data || [],
            bloatAnalysis: bloatResult.data || [],
          },
        };
      },
      { operation: "get_performance_insights" },
    );
  }

  // ==============================================================================
  // PERFORMANCE OPTIMIZATION METHODS (from performance-optimization-service.ts)
  // ==============================================================================

  /**
   * Record a performance optimization metric
   */
  recordOptimizationMetric(
    name: string,
    value: number,
    context?: Record<string, any>,
    userId?: string,
    sessionId?: string,
  ): void {
    const metric: OptimizationMetric = {
      name,
      value,
      timestamp: Date.now(),
      context,
      userId,
      sessionId,
    };

    UnifiedMonitoringService.optimizationMetrics.push(metric);

    // Track by session
    if (sessionId) {
      if (!UnifiedMonitoringService.sessionMetrics.has(sessionId)) {
        UnifiedMonitoringService.sessionMetrics.set(sessionId, []);
      }
      UnifiedMonitoringService.sessionMetrics.get(sessionId)!.push(metric);
    }

    // Track by user
    if (userId) {
      if (!UnifiedMonitoringService.userMetrics.has(userId)) {
        UnifiedMonitoringService.userMetrics.set(userId, []);
      }
      UnifiedMonitoringService.userMetrics.get(userId)!.push(metric);
    }

    // Integrate with main performance monitor
    performanceMonitor.recordEntry({
      name: `optimization-${name}`,
      type: "calculation",
      duration: value,
      timestamp: Date.now(),
      success: true,
      userId,
      metadata: { ...context, sessionId },
    });

    // Log in development
    if (process.env.NODE_ENV === "development") {
      this.logger.debug(`[Performance] ${name}: ${value}ms`, context);
    }
  }

  /**
   * Set baseline metrics for comparison
   */
  setBaseline(metrics: Record<string, number>): void {
    UnifiedMonitoringService.baselineMetrics = {
      ...UnifiedMonitoringService.baselineMetrics,
      ...metrics,
    };
  }

  /**
   * Compare current metrics to baseline
   */
  compareToBaseline(metricName: string, currentValue: number): number {
    const baseline = UnifiedMonitoringService.baselineMetrics[metricName];
    if (!baseline) return 0;

    const improvement = baseline - currentValue;
    const percentImprovement = (improvement / baseline) * 100;

    return percentImprovement;
  }

  /**
   * Get all recorded optimization metrics
   */
  getOptimizationMetrics(): OptimizationMetric[] {
    return [...UnifiedMonitoringService.optimizationMetrics];
  }

  /**
   * Clear optimization metrics
   */
  clearOptimizationMetrics(): void {
    UnifiedMonitoringService.optimizationMetrics = [];
  }

  /**
   * Generate performance optimization report
   */
  generateOptimizationReport(): {
    metrics: OptimizationMetric[];
    improvements: Record<string, number>;
    summary: string;
  } {
    const improvements: Record<string, number> = {};

    // Calculate improvements for each metric type
    const metricTypes = [
      ...new Set(
        UnifiedMonitoringService.optimizationMetrics.map((m) => m.name),
      ),
    ];

    metricTypes.forEach((type) => {
      const latestMetric = UnifiedMonitoringService.optimizationMetrics
        .filter((m) => m.name === type)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (latestMetric) {
        improvements[type] = this.compareToBaseline(type, latestMetric.value);
      }
    });

    // Generate summary
    const avgImprovement =
      Object.values(improvements).reduce((sum, val) => sum + val, 0) /
      Object.values(improvements).length;

    const summary = `Average performance improvement: ${avgImprovement.toFixed(1)}%`;

    return {
      metrics: UnifiedMonitoringService.optimizationMetrics,
      improvements,
      summary,
    };
  }

  /**
   * Performance measurement utilities
   */
  measureTime<T>(
    fn: () => T,
    metricName: string,
    userId?: string,
    sessionId?: string,
  ): T;
  measureTime<T>(
    fn: () => Promise<T>,
    metricName: string,
    userId?: string,
    sessionId?: string,
  ): Promise<T>;
  measureTime<T>(
    fn: () => T | Promise<T>,
    metricName: string,
    userId?: string,
    sessionId?: string,
  ): T | Promise<T> {
    // Use the performance monitor's measure function
    return performanceMonitor.measure(
      metricName,
      "calculation",
      fn as () => Promise<T>,
      userId,
      { sessionId },
    ) as T | Promise<T>;
  }

  /**
   * Start aggregation of optimization metrics
   */
  startOptimizationAggregation(period: number = 60000): void {
    if (UnifiedMonitoringService.aggregationInterval) {
      clearInterval(UnifiedMonitoringService.aggregationInterval);
    }

    UnifiedMonitoringService.aggregationPeriod = period;
    UnifiedMonitoringService.aggregationInterval = setInterval(() => {
      this.aggregateOptimizationMetrics();
    }, period);
  }

  /**
   * Stop optimization aggregation
   */
  stopOptimizationAggregation(): void {
    if (UnifiedMonitoringService.aggregationInterval) {
      clearInterval(UnifiedMonitoringService.aggregationInterval);
      UnifiedMonitoringService.aggregationInterval = null;
    }
  }

  /**
   * Aggregate optimization metrics by type and time window
   */
  private aggregateOptimizationMetrics(): void {
    const now = Date.now();
    const window = now - UnifiedMonitoringService.aggregationPeriod;

    // Group metrics by name
    const grouped = new Map<string, OptimizationMetric[]>();

    UnifiedMonitoringService.optimizationMetrics
      .filter((m) => m.timestamp >= window)
      .forEach((metric) => {
        if (!grouped.has(metric.name)) {
          grouped.set(metric.name, []);
        }
        grouped.get(metric.name)!.push(metric);
      });

    // Calculate aggregates
    grouped.forEach((metrics, name) => {
      const values = metrics.map((m) => m.value);
      const aggregate = {
        name,
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50: this.percentile(values, 50),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99),
      };

      // Log aggregates
      if (process.env.NODE_ENV === "development") {
        this.logger.debug(`[Aggregate] ${name}:`, aggregate);
      }
    });

    // Clean old metrics
    UnifiedMonitoringService.optimizationMetrics =
      UnifiedMonitoringService.optimizationMetrics.filter(
        (m) => m.timestamp >= window,
      );
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get session optimization metrics
   */
  getSessionOptimizationMetrics(sessionId: string): OptimizationMetric[] {
    return UnifiedMonitoringService.sessionMetrics.get(sessionId) || [];
  }

  /**
   * Get user optimization metrics
   */
  getUserOptimizationMetrics(userId: string): OptimizationMetric[] {
    return UnifiedMonitoringService.userMetrics.get(userId) || [];
  }

  /**
   * Clear session optimization metrics
   */
  clearSessionOptimizationMetrics(sessionId?: string): void {
    if (sessionId) {
      UnifiedMonitoringService.sessionMetrics.delete(sessionId);
    } else {
      UnifiedMonitoringService.sessionMetrics.clear();
    }
  }

  /**
   * Clear user optimization metrics
   */
  clearUserOptimizationMetrics(userId?: string): void {
    if (userId) {
      UnifiedMonitoringService.userMetrics.delete(userId);
    } else {
      UnifiedMonitoringService.userMetrics.clear();
    }
  }

  // ==============================================================================
  // UNIFIED METHODS AND UTILITIES
  // ==============================================================================

  /**
   * Get comprehensive unified monitoring report
   */
  async getUnifiedMonitoringReport(): Promise<{
    success: boolean;
    data?: {
      systemMetrics: MonitoringMetricsResponse;
      performanceInsights: any;
      optimizationReport: any;
      unifiedReport: any;
    };
    error?: string;
  }> {
    return this.executeWithErrorHandling(
      "getUnifiedMonitoringReport",
      async () => {
        const [
          systemMetrics,
          performanceInsights,
          optimizationReport,
          unifiedReport,
        ] = await Promise.all([
          this.getMetrics(),
          this.getPerformanceInsights(),
          Promise.resolve(this.generateOptimizationReport()),
          this.getUnifiedReport(),
        ]);

        return {
          success: true,
          data: {
            systemMetrics,
            performanceInsights: performanceInsights.data,
            optimizationReport,
            unifiedReport,
          },
        };
      },
      { operation: "get_unified_monitoring_report" },
    );
  }

  /**
   * Get unified performance report combining all monitoring sources
   */
  async getUnifiedReport(): Promise<{
    monitor: PerformanceMetrics;
    cache: any;
    queries: any;
    optimizations: any;
  }> {
    return {
      monitor: performanceMonitor.getMetrics(),
      cache: cacheManager?.getMetrics() || {
        hitRate: 0,
        operations: 0,
        size: 0,
      },
      queries: queryOptimizer?.getQueryStats() || {
        total: 0,
        optimized: 0,
        performance: 0,
      },
      optimizations: this.generateOptimizationReport(),
    };
  }

  /**
   * Health check for all monitoring components
   */
  async healthCheck(): Promise<{
    status: "healthy" | "warning" | "critical";
    components: Record<string, { status: string; message: string }>;
  }> {
    const components: Record<string, { status: string; message: string }> = {};

    try {
      // Check system monitoring API
      await this.getMetrics({ hours: 1 });
      components.systemMonitoring = {
        status: "healthy",
        message: "System monitoring API responsive",
      };
    } catch (error) {
      components.systemMonitoring = {
        status: "critical",
        message: `System monitoring API failed: ${error.message}`,
      };
    }

    try {
      // Check database performance monitoring
      await this.getPerformanceStats();
      components.performanceMonitoring = {
        status: "healthy",
        message: "Performance monitoring database responsive",
      };
    } catch (error) {
      components.performanceMonitoring = {
        status: "critical",
        message: `Performance monitoring failed: ${error.message}`,
      };
    }

    try {
      // Check optimization tracking
      this.getOptimizationMetrics();
      components.optimizationTracking = {
        status: "healthy",
        message: "Optimization tracking operational",
      };
    } catch (error) {
      components.optimizationTracking = {
        status: "warning",
        message: `Optimization tracking issues: ${error.message}`,
      };
    }

    // Determine overall status
    const statuses = Object.values(components).map((c) => c.status);
    const overallStatus = statuses.includes("critical")
      ? "critical"
      : statuses.includes("warning")
        ? "warning"
        : "healthy";

    return {
      status: overallStatus,
      components,
    };
  }

  /**
   * Cleanup all monitoring data
   */
  async cleanup(options?: {
    performanceRetentionDays?: number;
    clearOptimizationMetrics?: boolean;
    clearSessionMetrics?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    return this.executeWithErrorHandling(
      "cleanup",
      async () => {
        const promises: Promise<any>[] = [];

        // Cleanup performance data
        if (options?.performanceRetentionDays) {
          promises.push(
            this.cleanupPerformanceData(options.performanceRetentionDays),
          );
        }

        // Clear optimization metrics
        if (options?.clearOptimizationMetrics) {
          this.clearOptimizationMetrics();
        }

        // Clear session metrics
        if (options?.clearSessionMetrics) {
          this.clearSessionOptimizationMetrics();
        }

        await Promise.all(promises);

        return { success: true };
      },
      { operation: "cleanup", metadata: options },
    );
  }
}

// ==============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ==============================================================================

export const unifiedMonitoringService = new UnifiedMonitoringService();

// Factory function for creating instances
export function getUnifiedMonitoringService(): UnifiedMonitoringService {
  return unifiedMonitoringService;
}

// Performance monitoring decorator for easy use
export function MonitorPerformance(
  operationName: string,
  operationType: PerformanceMetric["operation_type"],
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return unifiedMonitoringService.monitorOperation(
        operationName,
        operationType,
        () => originalMethod.apply(this, args),
        { method: propertyKey, class: target.constructor.name },
      );
    };

    return descriptor;
  };
}

export default unifiedMonitoringService;

// ==============================================================================
// REACT HOOKS (client-side helpers)
// ==============================================================================

export function useMonitoringMetrics(options?: {
  hours?: number;
  include?: string[];
  refreshInterval?: number;
}) {
  const [data, setData] = useState<MonitoringMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await unifiedMonitoringService.getMetrics({
        hours: options?.hours,
        include: options?.include,
      });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [options?.hours, options?.include]);

  useEffect(() => {
    refetch();
    if (options?.refreshInterval) {
      const id = setInterval(refetch, options.refreshInterval);
      return () => clearInterval(id);
    }
  }, [refetch, options?.refreshInterval]);

  return { data, loading, error, refetch } as const;
}

export function useMonitoringAlerts(options?: {
  severity?: "all" | "critical" | "warning" | "info";
  resolved?: boolean;
  limit?: number;
  refreshInterval?: number;
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await unifiedMonitoringService.getAlerts({
        severity: options?.severity,
        resolved: options?.resolved,
        limit: options?.limit,
      });
      setAlerts(res);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [options?.severity, options?.resolved, options?.limit]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      await unifiedMonitoringService.acknowledgeAlert(alertId);
      await refetch();
    },
    [refetch],
  );

  const resolveAlert = useCallback(
    async (alertId: string) => {
      await unifiedMonitoringService.resolveAlert(alertId);
      await refetch();
    },
    [refetch],
  );

  useEffect(() => {
    refetch();
    if (options?.refreshInterval) {
      const id = setInterval(refetch, options.refreshInterval);
      return () => clearInterval(id);
    }
  }, [refetch, options?.refreshInterval]);

  return {
    alerts,
    loading,
    error,
    acknowledgeAlert,
    resolveAlert,
    refetch,
  } as const;
}

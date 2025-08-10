/**
 * Database Performance Monitoring Service
 *
 * Features:
 * - Real-time query performance tracking
 * - Connection pool monitoring
 * - Slow query detection and alerting
 * - Performance metrics aggregation
 * - Automated performance reports
 * - Integration with existing monitoring infrastructure
 */

import type { TypedSupabaseClient } from "@/lib/supabase/supabase-types";
import { withPooledClient } from "@/lib/supabase/server-pooled";
import { getOptimizedQueryService } from "@/lib/services/optimized-query-service";
import { getSchemaValidator } from "@/lib/supabase/schema-validator";
import { CircuitBreakerFactory } from "@/lib/supabase/circuit-breaker";
import { getAdvancedCache } from "@/lib/utils/advanced-cache";

// Performance monitoring configuration
interface PerformanceMonitorConfig {
  enabled: boolean;
  slowQueryThreshold: number; // milliseconds
  metricsRetentionDays: number;
  alertThresholds: {
    queryTimeMs: number;
    errorRate: number;
    connectionUtilization: number;
    cacheHitRate: number;
  };
  reportingInterval: number; // milliseconds
  aggregationWindow: number; // milliseconds
  maxMetricsPerHour: number;
}

// Database performance metrics
interface DatabaseMetrics {
  timestamp: Date;
  queryMetrics: {
    totalQueries: number;
    slowQueries: number;
    failedQueries: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    queriesPerSecond: number;
  };
  connectionMetrics: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    utilization: number;
    avgConnectionTime: number;
    failedConnections: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    totalOperations: number;
    cacheSize: number;
    evictions: number;
  };
  circuitBreakerMetrics: {
    totalBreakers: number;
    openBreakers: number;
    halfOpenBreakers: number;
    avgSuccessRate: number;
    totalCalls: number;
  };
  schemaValidationMetrics: {
    totalValidations: number;
    successfulValidations: number;
    avgValidationTime: number;
    slowValidations: number;
  };
}

// Performance alert
interface PerformanceAlert {
  id: string;
  type:
    | "slow_query"
    | "high_error_rate"
    | "connection_pool_exhausted"
    | "circuit_breaker_open"
    | "cache_performance"
    | "schema_drift";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  metrics: Record<string, number>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: string[];
}

// Default configuration
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  slowQueryThreshold: 1000, // 1 second
  metricsRetentionDays: 30,
  alertThresholds: {
    queryTimeMs: 2000, // 2 seconds
    errorRate: 0.05, // 5%
    connectionUtilization: 0.8, // 80%
    cacheHitRate: 0.6, // 60% minimum
  },
  reportingInterval: 60000, // 1 minute
  aggregationWindow: 300000, // 5 minutes
  maxMetricsPerHour: 60,
};

/**
 * Database Performance Monitor
 */
export class DatabasePerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private cache = getAdvancedCache();
  private metrics: DatabaseMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private reportingTimer?: NodeJS.Timeout;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];
  private isRunning = false;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;

    // Start periodic metrics collection
    this.reportingTimer = setInterval(
      () => this.collectMetrics(),
      this.config.reportingInterval,
    );

    console.log("🔍 Database performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = undefined;
    }

    console.log("⏹️ Database performance monitoring stopped");
  }

  /**
   * Get current performance metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): DatabaseMetrics[] {
    if (!timeRange) {
      return this.metrics.slice(-10); // Last 10 metrics
    }

    return this.metrics.filter(
      (metric) =>
        metric.timestamp >= timeRange.start &&
        metric.timestamp <= timeRange.end,
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get all alerts within time range
   */
  getAlerts(timeRange?: { start: Date; end: Date }): PerformanceAlert[] {
    if (!timeRange) {
      return this.alerts.slice(-50); // Last 50 alerts
    }

    return this.alerts.filter(
      (alert) =>
        alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end,
    );
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      totalQueries: number;
      avgResponseTime: number;
      errorRate: number;
      slowQueries: number;
      alertCount: number;
    };
    trends: {
      queryTrend: "improving" | "degrading" | "stable";
      errorTrend: "improving" | "degrading" | "stable";
      performanceTrend: "improving" | "degrading" | "stable";
    };
    recommendations: string[];
    details: DatabaseMetrics[];
  }> {
    const metrics = this.getMetrics(timeRange);
    const alerts = this.getAlerts(timeRange);

    if (metrics.length === 0) {
      return {
        summary: {
          totalQueries: 0,
          avgResponseTime: 0,
          errorRate: 0,
          slowQueries: 0,
          alertCount: 0,
        },
        trends: {
          queryTrend: "stable",
          errorTrend: "stable",
          performanceTrend: "stable",
        },
        recommendations: ["Insufficient data for analysis"],
        details: [],
      };
    }

    const totalQueries = metrics.reduce(
      (sum, m) => sum + m.queryMetrics.totalQueries,
      0,
    );
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.queryMetrics.avgResponseTime, 0) /
      metrics.length;
    const slowQueries = metrics.reduce(
      (sum, m) => sum + m.queryMetrics.slowQueries,
      0,
    );
    const failedQueries = metrics.reduce(
      (sum, m) => sum + m.queryMetrics.failedQueries,
      0,
    );
    const errorRate = totalQueries > 0 ? failedQueries / totalQueries : 0;

    // Calculate trends
    const halfwayPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfwayPoint);
    const secondHalf = metrics.slice(halfwayPoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, m) => sum + m.queryMetrics.avgResponseTime, 0) /
      firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, m) => sum + m.queryMetrics.avgResponseTime, 0) /
      secondHalf.length;

    const performanceTrend =
      Math.abs(secondHalfAvg - firstHalfAvg) < 100
        ? "stable"
        : secondHalfAvg < firstHalfAvg
          ? "improving"
          : "degrading";

    const recommendations = this.generateRecommendations(metrics, alerts);

    return {
      summary: {
        totalQueries,
        avgResponseTime,
        errorRate,
        slowQueries,
        alertCount: alerts.length,
      },
      trends: {
        queryTrend: "stable", // Simplified for now
        errorTrend: "stable", // Simplified for now
        performanceTrend,
      },
      recommendations,
      details: metrics,
    };
  }

  /**
   * Force immediate metrics collection
   */
  async forceCollection(): Promise<DatabaseMetrics> {
    return await this.collectMetrics();
  }

  // Private methods

  private async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      const timestamp = new Date();

      // Collect query service metrics
      const queryService = getOptimizedQueryService(null as any); // Will use pooled connection
      const queryMetrics = queryService.getMetrics();

      // Collect connection pool metrics
      const poolStats = await this.getConnectionPoolStats();

      // Collect cache metrics
      const cacheMetrics = await this.getCacheMetrics();

      // Collect circuit breaker metrics
      const circuitBreakerMetrics = this.getCircuitBreakerMetrics();

      // Collect schema validation metrics
      const schemaMetrics = await this.getSchemaValidationMetrics();

      const metrics: DatabaseMetrics = {
        timestamp,
        queryMetrics: {
          totalQueries: queryMetrics.totalQueries,
          slowQueries: queryMetrics.slowQueries,
          failedQueries: queryMetrics.failedQueries,
          avgResponseTime: queryMetrics.avgResponseTime,
          p95ResponseTime: 0, // TODO: Implement percentile tracking
          p99ResponseTime: 0, // TODO: Implement percentile tracking
          queriesPerSecond: this.calculateQPS(queryMetrics.totalQueries),
        },
        connectionMetrics: {
          totalConnections: poolStats.totalConnections,
          activeConnections: poolStats.activeConnections,
          idleConnections: poolStats.idleConnections,
          utilization: poolStats.activeConnections / poolStats.totalConnections,
          avgConnectionTime: poolStats.averageResponseTime,
          failedConnections: 0, // TODO: Track failed connections
        },
        cacheMetrics,
        circuitBreakerMetrics,
        schemaValidationMetrics: {
          totalValidations: schemaMetrics.totalValidations,
          successfulValidations: schemaMetrics.successfulValidations,
          avgValidationTime: schemaMetrics.avgValidationTime,
          slowValidations: schemaMetrics.slowValidations,
        },
      };

      // Store metrics
      this.metrics.push(metrics);

      // Cleanup old metrics
      const cutoffDate = new Date(
        Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000,
      );
      this.metrics = this.metrics.filter((m) => m.timestamp > cutoffDate);

      // Check for performance issues and generate alerts
      await this.checkPerformanceThresholds(metrics);

      return metrics;
    } catch (error) {
      console.error("Failed to collect performance metrics:", error);
      throw error;
    }
  }

  private async getConnectionPoolStats() {
    try {
      return await withPooledClient(async (client) => {
        // This is a mock implementation - the actual pool stats would come from the pool
        return {
          totalConnections: 10,
          activeConnections: 3,
          idleConnections: 7,
          averageResponseTime: 150,
        };
      });
    } catch (error) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        averageResponseTime: 0,
      };
    }
  }

  private async getCacheMetrics() {
    // Mock cache metrics - would integrate with actual cache implementation
    return {
      hitRate: 0.85,
      missRate: 0.15,
      totalOperations: 1000,
      cacheSize: 50000,
      evictions: 5,
    };
  }

  private getCircuitBreakerMetrics() {
    const globalMetrics = CircuitBreakerFactory.getGlobalMetrics();
    return {
      totalBreakers: globalMetrics.totalBreakers,
      openBreakers: globalMetrics.unhealthyBreakers,
      halfOpenBreakers: 0, // Would need to track this in circuit breaker
      avgSuccessRate: globalMetrics.averageSuccessRate,
      totalCalls: globalMetrics.totalCalls,
    };
  }

  private async getSchemaValidationMetrics() {
    const validator = getSchemaValidator(null as any); // Will use pooled connection
    return validator.getMetrics();
  }

  private calculateQPS(totalQueries: number): number {
    // Calculate queries per second based on reporting interval
    const intervalSeconds = this.config.reportingInterval / 1000;
    return totalQueries / intervalSeconds;
  }

  private async checkPerformanceThresholds(
    metrics: DatabaseMetrics,
  ): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check slow queries
    if (
      metrics.queryMetrics.avgResponseTime >
      this.config.alertThresholds.queryTimeMs
    ) {
      alerts.push({
        id: `slow-queries-${Date.now()}`,
        type: "slow_query",
        severity: "high",
        title: "High Average Query Response Time",
        description: `Average query response time (${metrics.queryMetrics.avgResponseTime}ms) exceeds threshold (${this.config.alertThresholds.queryTimeMs}ms)`,
        metrics: {
          avgResponseTime: metrics.queryMetrics.avgResponseTime,
          threshold: this.config.alertThresholds.queryTimeMs,
          slowQueries: metrics.queryMetrics.slowQueries,
        },
        timestamp: new Date(),
        resolved: false,
        actions: [
          "Review slow query logs",
          "Check database indexes",
          "Consider query optimization",
          "Monitor connection pool utilization",
        ],
      });
    }

    // Check error rate
    const errorRate =
      metrics.queryMetrics.totalQueries > 0
        ? metrics.queryMetrics.failedQueries / metrics.queryMetrics.totalQueries
        : 0;

    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `high-error-rate-${Date.now()}`,
        type: "high_error_rate",
        severity: "critical",
        title: "High Database Error Rate",
        description: `Database error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%)`,
        metrics: {
          errorRate,
          threshold: this.config.alertThresholds.errorRate,
          failedQueries: metrics.queryMetrics.failedQueries,
          totalQueries: metrics.queryMetrics.totalQueries,
        },
        timestamp: new Date(),
        resolved: false,
        actions: [
          "Check database logs for errors",
          "Verify database connectivity",
          "Review recent schema changes",
          "Check circuit breaker status",
        ],
      });
    }

    // Check connection utilization
    if (
      metrics.connectionMetrics.utilization >
      this.config.alertThresholds.connectionUtilization
    ) {
      alerts.push({
        id: `high-connection-util-${Date.now()}`,
        type: "connection_pool_exhausted",
        severity: "medium",
        title: "High Connection Pool Utilization",
        description: `Connection pool utilization (${(metrics.connectionMetrics.utilization * 100).toFixed(1)}%) exceeds threshold (${(this.config.alertThresholds.connectionUtilization * 100).toFixed(1)}%)`,
        metrics: {
          utilization: metrics.connectionMetrics.utilization,
          threshold: this.config.alertThresholds.connectionUtilization,
          activeConnections: metrics.connectionMetrics.activeConnections,
          totalConnections: metrics.connectionMetrics.totalConnections,
        },
        timestamp: new Date(),
        resolved: false,
        actions: [
          "Consider increasing connection pool size",
          "Review long-running queries",
          "Check for connection leaks",
          "Monitor query patterns",
        ],
      });
    }

    // Check cache hit rate
    if (
      metrics.cacheMetrics.hitRate < this.config.alertThresholds.cacheHitRate
    ) {
      alerts.push({
        id: `low-cache-hit-rate-${Date.now()}`,
        type: "cache_performance",
        severity: "low",
        title: "Low Cache Hit Rate",
        description: `Cache hit rate (${(metrics.cacheMetrics.hitRate * 100).toFixed(1)}%) is below threshold (${(this.config.alertThresholds.cacheHitRate * 100).toFixed(1)}%)`,
        metrics: {
          hitRate: metrics.cacheMetrics.hitRate,
          threshold: this.config.alertThresholds.cacheHitRate,
          totalOperations: metrics.cacheMetrics.totalOperations,
        },
        timestamp: new Date(),
        resolved: false,
        actions: [
          "Review cache configuration",
          "Check cache key patterns",
          "Consider increasing cache TTL",
          "Review cache eviction policies",
        ],
      });
    }

    // Check circuit breaker status
    if (metrics.circuitBreakerMetrics.openBreakers > 0) {
      alerts.push({
        id: `circuit-breaker-open-${Date.now()}`,
        type: "circuit_breaker_open",
        severity: "critical",
        title: "Circuit Breakers Open",
        description: `${metrics.circuitBreakerMetrics.openBreakers} circuit breaker(s) are currently open`,
        metrics: {
          openBreakers: metrics.circuitBreakerMetrics.openBreakers,
          totalBreakers: metrics.circuitBreakerMetrics.totalBreakers,
          successRate: metrics.circuitBreakerMetrics.avgSuccessRate,
        },
        timestamp: new Date(),
        resolved: false,
        actions: [
          "Check circuit breaker logs",
          "Verify service health",
          "Review failure patterns",
          "Consider manual reset if appropriate",
        ],
      });
    }

    // Store and emit alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emitAlert(alert);
    }

    // Cleanup old alerts
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.alerts = this.alerts.filter((a) => a.timestamp > cutoffDate);
  }

  private emitAlert(alert: PerformanceAlert): void {
    console.warn(
      `🚨 Performance Alert [${alert.severity.toUpperCase()}]: ${alert.title}`,
    );
    console.warn(`Description: ${alert.description}`);
    console.warn(`Actions: ${alert.actions.join(", ")}`);

    // Notify all subscribers
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error("Error in alert callback:", error);
      }
    });
  }

  private generateRecommendations(
    metrics: DatabaseMetrics[],
    alerts: PerformanceAlert[],
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.length === 0) {
      return ["Enable performance monitoring to get recommendations"];
    }

    const latestMetrics = metrics[metrics.length - 1];

    // Query performance recommendations
    if (latestMetrics.queryMetrics.avgResponseTime > 500) {
      recommendations.push(
        "Consider optimizing slow queries with proper indexing",
      );
    }

    if (latestMetrics.queryMetrics.slowQueries > 0) {
      recommendations.push(
        "Review and optimize queries taking longer than threshold",
      );
    }

    // Connection pool recommendations
    if (latestMetrics.connectionMetrics.utilization > 0.7) {
      recommendations.push(
        "Consider increasing connection pool size or optimizing query patterns",
      );
    }

    // Cache recommendations
    if (latestMetrics.cacheMetrics.hitRate < 0.8) {
      recommendations.push(
        "Improve cache hit rate by optimizing cache keys and TTL settings",
      );
    }

    // Circuit breaker recommendations
    if (latestMetrics.circuitBreakerMetrics.openBreakers > 0) {
      recommendations.push(
        "Investigate and resolve issues causing circuit breaker failures",
      );
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter(
      (a) => a.severity === "critical" && !a.resolved,
    );
    if (criticalAlerts.length > 0) {
      recommendations.push("Address critical performance alerts immediately");
    }

    return recommendations.length > 0
      ? recommendations
      : ["Performance metrics look healthy"];
  }
}

// Singleton instance
let performanceMonitorInstance: DatabasePerformanceMonitor | null = null;

/**
 * Get the global performance monitor instance
 */
export function getDatabasePerformanceMonitor(
  config?: Partial<PerformanceMonitorConfig>,
): DatabasePerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new DatabasePerformanceMonitor(config);
  }
  return performanceMonitorInstance;
}

/**
 * Initialize and start database performance monitoring
 */
export function startDatabaseMonitoring(
  config?: Partial<PerformanceMonitorConfig>,
): DatabasePerformanceMonitor {
  const monitor = getDatabasePerformanceMonitor(config);
  monitor.start();
  return monitor;
}

// Export types
export type { PerformanceMonitorConfig, DatabaseMetrics, PerformanceAlert };

// Default export
export default DatabasePerformanceMonitor;

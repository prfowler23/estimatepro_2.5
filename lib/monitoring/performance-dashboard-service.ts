// Real-Time Performance Monitoring Dashboard Service
// Comprehensive metrics collection and alerting for production-ready monitoring

import { createLogger } from "@/lib/services/core/logger";
import { redisClient } from "@/lib/cache/redis-client";

const logger = createLogger("PerformanceDashboard");

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  value: number;
  severity: "info" | "warning" | "critical";
  enabled: boolean;
  cooldown: number; // seconds
  lastTriggered?: number;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  score: number; // 0-100
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    cache: ComponentHealth;
    ai: ComponentHealth;
    frontend: ComponentHealth;
  };
  alerts: Alert[];
  uptime: number;
  lastUpdated: number;
}

export interface ComponentHealth {
  status: "healthy" | "degraded" | "critical" | "unknown";
  score: number;
  responseTime: number;
  errorRate: number;
  lastCheck: number;
  metrics: PerformanceMetric[];
}

export interface Alert {
  id: string;
  rule: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export class PerformanceDashboardService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private startTime: number = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultRules();
    this.startHealthChecks();
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags || {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricHistory = this.metrics.get(key)!;
    metricHistory.push(metric);

    // Keep only last 1000 entries per metric
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Check alert rules
    this.checkAlertRules(metric);

    logger.debug(
      `Metric recorded: ${metric.name}=${metric.value}${metric.unit}`,
      metric.tags,
    );
  }

  /**
   * Record API response time
   */
  recordAPIResponse(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
  ): void {
    this.recordMetric({
      name: "api_response_time",
      value: responseTime,
      unit: "ms",
      timestamp: Date.now(),
      tags: { endpoint, method, status: statusCode.toString() },
      threshold: { warning: 1000, critical: 3000 },
    });

    this.recordMetric({
      name: "api_requests_total",
      value: 1,
      unit: "count",
      timestamp: Date.now(),
      tags: { endpoint, method, status: statusCode.toString() },
    });

    if (statusCode >= 400) {
      this.recordMetric({
        name: "api_errors_total",
        value: 1,
        unit: "count",
        timestamp: Date.now(),
        tags: { endpoint, method, status: statusCode.toString() },
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(query: string, duration: number, success: boolean): void {
    this.recordMetric({
      name: "db_query_duration",
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      tags: {
        query_type: this.extractQueryType(query),
        success: success.toString(),
      },
      threshold: { warning: 500, critical: 2000 },
    });

    if (!success) {
      this.recordMetric({
        name: "db_errors_total",
        value: 1,
        unit: "count",
        timestamp: Date.now(),
        tags: { query_type: this.extractQueryType(query) },
      });
    }
  }

  /**
   * Record AI service performance
   */
  recordAIOperation(
    operation: string,
    duration: number,
    tokens: number,
    cost: number,
    cached: boolean,
  ): void {
    this.recordMetric({
      name: "ai_operation_duration",
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      tags: { operation, cached: cached.toString() },
      threshold: { warning: 3000, critical: 10000 },
    });

    this.recordMetric({
      name: "ai_tokens_used",
      value: tokens,
      unit: "tokens",
      timestamp: Date.now(),
      tags: { operation, cached: cached.toString() },
    });

    this.recordMetric({
      name: "ai_cost",
      value: cost,
      unit: "usd",
      timestamp: Date.now(),
      tags: { operation, cached: cached.toString() },
    });
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const components = {
      api: await this.checkAPIHealth(),
      database: await this.checkDatabaseHealth(),
      cache: await this.checkCacheHealth(),
      ai: await this.checkAIHealth(),
      frontend: await this.checkFrontendHealth(),
    };

    const scores = Object.values(components).map((c) => c.score);
    const overall = this.calculateOverallHealth(scores);

    const uptime = Date.now() - this.startTime;

    return {
      overall: overall.status,
      score: overall.score,
      components,
      alerts: this.getActiveAlerts(),
      uptime,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get performance metrics for dashboard
   */
  getMetrics(
    metricName?: string,
    timeRange?: { start: number; end: number },
  ): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter((metric) => {
        if (metricName && !key.startsWith(metricName)) return false;
        if (
          timeRange &&
          (metric.timestamp < timeRange.start ||
            metric.timestamp > timeRange.end)
        )
          return false;
        return true;
      });

      allMetrics.push(...filteredMetrics);
    }

    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get aggregated metrics (avg, min, max, p95, p99)
   */
  getAggregatedMetrics(
    metricName: string,
    timeRange: { start: number; end: number },
  ): {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    count: number;
  } {
    const metrics = this.getMetrics(metricName, timeRange);
    const values = metrics.map((m) => m.value).sort((a, b) => a - b);

    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const p50 = values[Math.floor(values.length * 0.5)];
    const p95 = values[Math.floor(values.length * 0.95)];
    const p99 = values[Math.floor(values.length * 0.99)];

    return { avg, min, max, p50, p95, p99, count: values.length };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    logger.info(`Alert rule added: ${rule.name}`, { rule });
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      logger.info(`Alert resolved: ${alert.message}`, { alertId });
      return true;
    }
    return false;
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: "api_response_time_critical",
        name: "API Response Time Critical",
        metric: "api_response_time",
        operator: ">",
        value: 3000,
        severity: "critical",
        enabled: true,
        cooldown: 300,
      },
      {
        id: "api_error_rate_high",
        name: "High API Error Rate",
        metric: "api_error_rate",
        operator: ">",
        value: 5,
        severity: "warning",
        enabled: true,
        cooldown: 600,
      },
      {
        id: "db_query_slow",
        name: "Slow Database Queries",
        metric: "db_query_duration",
        operator: ">",
        value: 2000,
        severity: "warning",
        enabled: true,
        cooldown: 300,
      },
      {
        id: "ai_operation_timeout",
        name: "AI Operation Timeout",
        metric: "ai_operation_duration",
        operator: ">",
        value: 10000,
        severity: "critical",
        enabled: true,
        cooldown: 600,
      },
    ];

    this.alertRules.push(...defaultRules);
  }

  private checkAlertRules(metric: PerformanceMetric): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled || rule.metric !== metric.name) continue;

      // Check cooldown
      if (
        rule.lastTriggered &&
        Date.now() - rule.lastTriggered < rule.cooldown * 1000
      ) {
        continue;
      }

      const shouldAlert = this.evaluateCondition(
        metric.value,
        rule.operator,
        rule.value,
      );

      if (shouldAlert) {
        const alert: Alert = {
          id: `${rule.id}_${Date.now()}`,
          rule: rule.id,
          severity: rule.severity,
          message: `${rule.name}: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${rule.value}${metric.unit})`,
          timestamp: Date.now(),
          resolved: false,
        };

        this.alerts.push(alert);
        rule.lastTriggered = Date.now();

        logger.warn(`Alert triggered: ${alert.message}`, { rule, metric });
      }
    }
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case ">":
        return value > threshold;
      case "<":
        return value < threshold;
      case ">=":
        return value >= threshold;
      case "<=":
        return value <= threshold;
      case "==":
        return value === threshold;
      case "!=":
        return value !== threshold;
      default:
        return false;
    }
  }

  private async checkAPIHealth(): Promise<ComponentHealth> {
    // Calculate API health based on recent metrics
    const recentMetrics = this.getMetrics("api_response_time", {
      start: Date.now() - 300000, // Last 5 minutes
      end: Date.now(),
    });

    if (recentMetrics.length === 0) {
      return {
        status: "unknown",
        score: 0,
        responseTime: 0,
        errorRate: 0,
        lastCheck: Date.now(),
        metrics: [],
      };
    }

    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    const errorMetrics = this.getMetrics("api_errors_total", {
      start: Date.now() - 300000,
      end: Date.now(),
    });
    const totalRequests = this.getMetrics("api_requests_total", {
      start: Date.now() - 300000,
      end: Date.now(),
    }).length;

    const errorRate =
      totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0;

    let status: "healthy" | "degraded" | "critical";
    let score: number;

    if (avgResponseTime > 3000 || errorRate > 10) {
      status = "critical";
      score = 25;
    } else if (avgResponseTime > 1000 || errorRate > 5) {
      status = "degraded";
      score = 60;
    } else {
      status = "healthy";
      score = 100;
    }

    return {
      status,
      score,
      responseTime: avgResponseTime,
      errorRate,
      lastCheck: Date.now(),
      metrics: recentMetrics,
    };
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    // Similar implementation for database health
    const recentMetrics = this.getMetrics("db_query_duration", {
      start: Date.now() - 300000,
      end: Date.now(),
    });

    const avgDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.value, 0) /
          recentMetrics.length
        : 0;

    const errorMetrics = this.getMetrics("db_errors_total", {
      start: Date.now() - 300000,
      end: Date.now(),
    });

    const errorRate =
      recentMetrics.length > 0
        ? (errorMetrics.length / recentMetrics.length) * 100
        : 0;

    let status: "healthy" | "degraded" | "critical";
    let score: number;

    if (avgDuration > 2000 || errorRate > 5) {
      status = "critical";
      score = 25;
    } else if (avgDuration > 500 || errorRate > 2) {
      status = "degraded";
      score = 60;
    } else {
      status = "healthy";
      score = 100;
    }

    return {
      status,
      score,
      responseTime: avgDuration,
      errorRate,
      lastCheck: Date.now(),
      metrics: recentMetrics,
    };
  }

  private async checkCacheHealth(): Promise<ComponentHealth> {
    try {
      const healthCheck = await redisClient.healthCheck();
      const metrics = redisClient.getMetrics();

      let status: "healthy" | "degraded" | "critical";
      let score: number;

      if (healthCheck.status === "unhealthy" || !metrics.isConnected) {
        status = "critical";
        score = 0;
      } else if (healthCheck.latency > 100 || metrics.hitRate < 70) {
        status = "degraded";
        score = 60;
      } else {
        status = "healthy";
        score = 100;
      }

      return {
        status,
        score,
        responseTime: healthCheck.latency,
        errorRate: (metrics.errors / Math.max(metrics.totalCommands, 1)) * 100,
        lastCheck: Date.now(),
        metrics: [
          {
            name: "cache_hit_rate",
            value: metrics.hitRate,
            unit: "%",
            timestamp: Date.now(),
          },
        ],
      };
    } catch (error) {
      return {
        status: "critical",
        score: 0,
        responseTime: 0,
        errorRate: 100,
        lastCheck: Date.now(),
        metrics: [],
      };
    }
  }

  private async checkAIHealth(): Promise<ComponentHealth> {
    const recentMetrics = this.getMetrics("ai_operation_duration", {
      start: Date.now() - 300000,
      end: Date.now(),
    });

    const avgDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.value, 0) /
          recentMetrics.length
        : 0;

    let status: "healthy" | "degraded" | "critical";
    let score: number;

    if (avgDuration > 10000) {
      status = "critical";
      score = 25;
    } else if (avgDuration > 3000) {
      status = "degraded";
      score = 60;
    } else {
      status = "healthy";
      score = 100;
    }

    return {
      status,
      score,
      responseTime: avgDuration,
      errorRate: 0,
      lastCheck: Date.now(),
      metrics: recentMetrics,
    };
  }

  private async checkFrontendHealth(): Promise<ComponentHealth> {
    // Frontend health would be reported by client-side monitoring
    return {
      status: "healthy",
      score: 100,
      responseTime: 0,
      errorRate: 0,
      lastCheck: Date.now(),
      metrics: [],
    };
  }

  private calculateOverallHealth(scores: number[]): {
    status: "healthy" | "degraded" | "critical";
    score: number;
  } {
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    let status: "healthy" | "degraded" | "critical";
    if (avgScore >= 80) status = "healthy";
    else if (avgScore >= 50) status = "degraded";
    else status = "critical";

    return { status, score: Math.round(avgScore) };
  }

  private extractQueryType(query: string): string {
    const normalized = query.trim().toLowerCase();
    if (normalized.startsWith("select")) return "select";
    if (normalized.startsWith("insert")) return "insert";
    if (normalized.startsWith("update")) return "update";
    if (normalized.startsWith("delete")) return "delete";
    return "other";
  }

  private startHealthChecks(): void {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        logger.debug("System health check completed", {
          overall: health.overall,
          score: health.score,
          activeAlerts: health.alerts.length,
        });
      } catch (error) {
        logger.error("Health check failed:", error);
      }
    }, 30000);
  }

  /**
   * Clean shutdown
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info("Performance dashboard service shut down");
  }
}

// Singleton instance for application-wide use
export const performanceDashboard = new PerformanceDashboardService();

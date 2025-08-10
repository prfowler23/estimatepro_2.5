// Unified Performance Dashboard API
// Centralized performance monitoring and reporting interface

import {
  performanceMonitor,
  PerformanceMetrics,
  PerformanceEntry,
  PerformanceAlert,
} from "./performance-monitor";
import { cacheManager } from "@/lib/cache/cache-manager";
import { queryOptimizer, QueryMetrics } from "./query-optimization";
import { unifiedMonitoringService } from "@/lib/services/monitoring-service-unified";
import {
  performanceBudget,
  BudgetViolation,
  PerformanceBudget,
} from "./performance-budget";

// Dashboard configuration
export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number;
  historyWindow: number;
  enableRealtime: boolean;
  enableAlerts: boolean;
  customMetrics?: Map<string, () => Promise<number>>;
}

// Dashboard metrics
export interface DashboardMetrics {
  timestamp: number;
  performance: PerformanceMetrics;
  cache: {
    hitRate: number;
    size: number;
    memory: number;
    avgResponseTime: number;
    compressionRatio?: number;
  };
  database: {
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRate: number;
    activeConnections?: number;
  };
  budget: {
    violations: number;
    criticalViolations: number;
    warningViolations: number;
    compliance: number;
  };
  custom?: Record<string, number>;
}

// Historical data point
export interface HistoricalDataPoint {
  timestamp: number;
  metrics: DashboardMetrics;
}

// Alert configuration
export interface AlertConfig {
  metric: string;
  threshold: number;
  condition: "above" | "below" | "equals";
  severity: "info" | "warning" | "critical";
  message: string;
}

// Real-time update
export interface RealtimeUpdate {
  type: "metric" | "alert" | "violation" | "status";
  data: any;
  timestamp: number;
}

const DEFAULT_CONFIG: DashboardConfig = {
  enabled: true,
  refreshInterval: 5000, // 5 seconds
  historyWindow: 3600000, // 1 hour
  enableRealtime: true,
  enableAlerts: true,
};

export class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private config: DashboardConfig;
  private history: HistoricalDataPoint[] = [];
  private refreshInterval?: NodeJS.Timeout;
  private subscribers: Map<string, Set<(update: RealtimeUpdate) => void>> =
    new Map();
  private customAlerts: AlertConfig[] = [];
  private lastMetrics?: DashboardMetrics;

  private constructor(config: DashboardConfig = DEFAULT_CONFIG) {
    this.config = config;

    if (this.config.enabled) {
      this.startMonitoring();
      this.setupSubscriptions();
    }
  }

  static getInstance(config?: DashboardConfig): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard(config);
    }
    return PerformanceDashboard.instance;
  }

  private startMonitoring(): void {
    // Initial collection
    this.collectMetrics();

    // Set up refresh interval
    this.refreshInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.refreshInterval);
  }

  private setupSubscriptions(): void {
    // Subscribe to performance alerts
    performanceMonitor.subscribe((alert) => {
      this.broadcastUpdate("alert", {
        type: "performance",
        alert,
      });
    });

    // Subscribe to budget violations
    performanceBudget.subscribe((violation) => {
      this.broadcastUpdate("violation", {
        type: "budget",
        violation,
      });
    });
  }

  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    // Collect from all sources
    const metrics = await this.gatherAllMetrics();

    // Check custom alerts
    this.checkCustomAlerts(metrics);

    // Store in history
    this.addToHistory({ timestamp, metrics });

    // Broadcast real-time update if enabled
    if (this.config.enableRealtime) {
      this.broadcastUpdate("metric", metrics);
    }

    this.lastMetrics = metrics;
  }

  private async gatherAllMetrics(): Promise<DashboardMetrics> {
    // Performance metrics
    const performance = performanceMonitor.getMetrics();

    // Cache metrics
    const cacheMetrics = cacheManager.getMetrics();
    const cacheHitRatios = cacheManager.getHitRatios();
    const avgCompressionRatio =
      this.calculateAvgCompressionRatio(cacheHitRatios);

    // Database metrics
    const queryStats = queryOptimizer.getQueryStats();
    const slowQueries = queryOptimizer.getSlowQueries();
    const dbMetrics = this.calculateDatabaseMetrics(queryStats, slowQueries);

    // Budget metrics
    const budgetStatus = performanceBudget.getStatusReport();
    const violations = performanceBudget.getViolations(
      Date.now() - this.config.historyWindow,
    );

    // Custom metrics
    let custom: Record<string, number> | undefined;
    if (this.config.customMetrics && this.config.customMetrics.size > 0) {
      custom = {};
      for (const [name, collector] of this.config.customMetrics) {
        try {
          custom[name] = await collector();
        } catch (error) {
          console.error(`Failed to collect custom metric ${name}:`, error);
          custom[name] = 0;
        }
      }
    }

    return {
      timestamp: Date.now(),
      performance,
      cache: {
        hitRate: cacheMetrics.hitRate,
        size: cacheMetrics.size,
        memory: cacheMetrics.memory,
        avgResponseTime: cacheMetrics.avgResponseTime,
        compressionRatio: avgCompressionRatio,
      },
      database: dbMetrics,
      budget: {
        violations: violations.length,
        criticalViolations: violations.filter((v) => v.severity === "critical")
          .length,
        warningViolations: violations.filter((v) => v.severity === "warning")
          .length,
        compliance:
          (budgetStatus.summary.ok / budgetStatus.summary.total) * 100,
      },
      custom,
    };
  }

  private calculateAvgCompressionRatio(hitRatios: Map<string, any>): number {
    // This would need actual compression metrics from cache manager
    // For now, return a placeholder
    return 0.65; // 65% compression ratio
  }

  private calculateDatabaseMetrics(
    queryStats: Record<string, QueryMetrics[]>,
    slowQueries: Map<string, number>,
  ): DashboardMetrics["database"] {
    let totalTime = 0;
    let totalQueries = 0;
    let cacheHits = 0;

    Object.values(queryStats).forEach((stats) => {
      if (Array.isArray(stats)) {
        stats.forEach((stat) => {
          totalTime += stat.queryTime || 0;
          totalQueries++;
          if (stat.cacheHit) cacheHits++;
        });
      }
    });

    return {
      avgQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      slowQueries: slowQueries.size,
      cacheHitRate: totalQueries > 0 ? cacheHits / totalQueries : 0,
      activeConnections: undefined, // Would need connection pool metrics
    };
  }

  private checkCustomAlerts(metrics: DashboardMetrics): void {
    if (!this.config.enableAlerts) return;

    this.customAlerts.forEach((alert) => {
      const value = this.getMetricValue(metrics, alert.metric);
      if (value === undefined) return;

      let triggered = false;
      switch (alert.condition) {
        case "above":
          triggered = value > alert.threshold;
          break;
        case "below":
          triggered = value < alert.threshold;
          break;
        case "equals":
          triggered = value === alert.threshold;
          break;
      }

      if (triggered) {
        this.broadcastUpdate("alert", {
          type: "custom",
          alert: {
            ...alert,
            value,
            timestamp: Date.now(),
          },
        });
      }
    });
  }

  private getMetricValue(
    metrics: DashboardMetrics,
    path: string,
  ): number | undefined {
    const parts = path.split(".");
    let value: any = metrics;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return typeof value === "number" ? value : undefined;
  }

  private addToHistory(dataPoint: HistoricalDataPoint): void {
    this.history.push(dataPoint);

    // Clean old history
    const cutoff = Date.now() - this.config.historyWindow;
    this.history = this.history.filter((point) => point.timestamp >= cutoff);
  }

  private broadcastUpdate(type: RealtimeUpdate["type"], data: any): void {
    const update: RealtimeUpdate = {
      type,
      data,
      timestamp: Date.now(),
    };

    // Broadcast to all subscribers of this type
    const subscribers = this.subscribers.get(type) || new Set();
    subscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error("Error broadcasting update:", error);
      }
    });

    // Broadcast to 'all' subscribers
    const allSubscribers = this.subscribers.get("all") || new Set();
    allSubscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error("Error broadcasting update to all:", error);
      }
    });
  }

  // Public API

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): DashboardMetrics | undefined {
    return this.lastMetrics;
  }

  /**
   * Get historical metrics
   */
  getHistory(since?: number): HistoricalDataPoint[] {
    if (since) {
      return this.history.filter((point) => point.timestamp >= since);
    }
    return [...this.history];
  }

  /**
   * Get performance summary
   */
  async getSummary(): Promise<{
    current: DashboardMetrics | undefined;
    trends: {
      responseTime: "improving" | "stable" | "degrading";
      errorRate: "improving" | "stable" | "degrading";
      cacheHitRate: "improving" | "stable" | "degrading";
    };
    health: {
      score: number;
      status: "healthy" | "warning" | "critical";
      issues: string[];
    };
  }> {
    const current = this.lastMetrics;

    // Calculate trends
    const trends = this.calculateTrends();

    // Calculate health score
    const health = await this.calculateHealthScore();

    return { current, trends, health };
  }

  private calculateTrends(): {
    responseTime: "improving" | "stable" | "degrading";
    errorRate: "improving" | "stable" | "degrading";
    cacheHitRate: "improving" | "stable" | "degrading";
  } {
    if (this.history.length < 2) {
      return {
        responseTime: "stable",
        errorRate: "stable",
        cacheHitRate: "stable",
      };
    }

    // Get recent history (last 30 minutes)
    const recentHistory = this.history.slice(-360); // 360 * 5s = 30 minutes
    if (recentHistory.length < 2) {
      return {
        responseTime: "stable",
        errorRate: "stable",
        cacheHitRate: "stable",
      };
    }

    // Calculate average for first half and second half
    const midPoint = Math.floor(recentHistory.length / 2);
    const firstHalf = recentHistory.slice(0, midPoint);
    const secondHalf = recentHistory.slice(midPoint);

    const firstAvg = {
      responseTime: this.average(
        firstHalf.map((p) => p.metrics.performance.avgResponseTime),
      ),
      errorRate: this.average(
        firstHalf.map((p) => p.metrics.performance.errorRate),
      ),
      cacheHitRate: this.average(firstHalf.map((p) => p.metrics.cache.hitRate)),
    };

    const secondAvg = {
      responseTime: this.average(
        secondHalf.map((p) => p.metrics.performance.avgResponseTime),
      ),
      errorRate: this.average(
        secondHalf.map((p) => p.metrics.performance.errorRate),
      ),
      cacheHitRate: this.average(
        secondHalf.map((p) => p.metrics.cache.hitRate),
      ),
    };

    return {
      responseTime: this.getTrend(
        firstAvg.responseTime,
        secondAvg.responseTime,
        true,
      ),
      errorRate: this.getTrend(firstAvg.errorRate, secondAvg.errorRate, true),
      cacheHitRate: this.getTrend(
        firstAvg.cacheHitRate,
        secondAvg.cacheHitRate,
        false,
      ),
    };
  }

  private getTrend(
    first: number,
    second: number,
    lowerIsBetter: boolean,
  ): "improving" | "stable" | "degrading" {
    const threshold = 0.1; // 10% change threshold
    const change = (second - first) / first;

    if (Math.abs(change) < threshold) {
      return "stable";
    }

    if (lowerIsBetter) {
      return change < 0 ? "improving" : "degrading";
    } else {
      return change > 0 ? "improving" : "degrading";
    }
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private async calculateHealthScore(): Promise<{
    score: number;
    status: "healthy" | "warning" | "critical";
    issues: string[];
  }> {
    const issues: string[] = [];
    let score = 100;

    if (!this.lastMetrics) {
      return { score: 0, status: "critical", issues: ["No metrics available"] };
    }

    // Check response time
    if (this.lastMetrics.performance.avgResponseTime > 2000) {
      score -= 20;
      issues.push("High average response time");
    } else if (this.lastMetrics.performance.avgResponseTime > 1000) {
      score -= 10;
      issues.push("Elevated response time");
    }

    // Check error rate
    if (this.lastMetrics.performance.errorRate > 0.05) {
      score -= 30;
      issues.push("High error rate");
    } else if (this.lastMetrics.performance.errorRate > 0.01) {
      score -= 15;
      issues.push("Elevated error rate");
    }

    // Check cache hit rate
    if (this.lastMetrics.cache.hitRate < 0.5) {
      score -= 20;
      issues.push("Low cache hit rate");
    } else if (this.lastMetrics.cache.hitRate < 0.7) {
      score -= 10;
      issues.push("Suboptimal cache hit rate");
    }

    // Check budget compliance
    if (this.lastMetrics.budget.compliance < 50) {
      score -= 30;
      issues.push("Poor budget compliance");
    } else if (this.lastMetrics.budget.compliance < 80) {
      score -= 15;
      issues.push("Budget compliance issues");
    }

    // Check critical violations
    if (this.lastMetrics.budget.criticalViolations > 0) {
      score -= 20;
      issues.push(
        `${this.lastMetrics.budget.criticalViolations} critical budget violations`,
      );
    }

    // Determine status
    let status: "healthy" | "warning" | "critical";
    if (score >= 80) {
      status = "healthy";
    } else if (score >= 50) {
      status = "warning";
    } else {
      status = "critical";
    }

    return { score: Math.max(0, score), status, issues };
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(
    type: "metric" | "alert" | "violation" | "status" | "all",
    callback: (update: RealtimeUpdate) => void,
  ): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }

    this.subscribers.get(type)!.add(callback);

    return () => {
      const subs = this.subscribers.get(type);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Add custom alert
   */
  addCustomAlert(alert: AlertConfig): void {
    this.customAlerts.push(alert);
  }

  /**
   * Remove custom alert
   */
  removeCustomAlert(metric: string): void {
    this.customAlerts = this.customAlerts.filter((a) => a.metric !== metric);
  }

  /**
   * Get all alerts
   */
  getAlerts(): {
    performance: PerformanceAlert[];
    budget: BudgetViolation[];
    custom: AlertConfig[];
  } {
    return {
      performance: performanceMonitor.getAlerts(),
      budget: performanceBudget.getViolations(),
      custom: this.customAlerts,
    };
  }

  /**
   * Export metrics data
   */
  exportData(format: "json" | "csv" = "json"): string {
    const data = {
      current: this.lastMetrics,
      history: this.history,
      alerts: this.getAlerts(),
      timestamp: Date.now(),
    };

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // CSV export
    const csvRows: string[] = [];
    csvRows.push("Timestamp,Metric,Value");

    this.history.forEach((point) => {
      const flatMetrics = this.flattenMetrics(point.metrics);
      Object.entries(flatMetrics).forEach(([key, value]) => {
        csvRows.push(`${point.timestamp},${key},${value}`);
      });
    });

    return csvRows.join("\n");
  }

  private flattenMetrics(
    metrics: DashboardMetrics,
    prefix = "",
  ): Record<string, number> {
    const flat: Record<string, number> = {};

    Object.entries(metrics).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "number") {
        flat[fullKey] = value;
      } else if (typeof value === "object" && value !== null) {
        Object.assign(flat, this.flattenMetrics(value as any, fullKey));
      }
    });

    return flat;
  }

  /**
   * Reset dashboard
   */
  reset(): void {
    this.history = [];
    this.lastMetrics = undefined;
    this.customAlerts = [];
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }
}

// Global instance
export const performanceDashboard = PerformanceDashboard.getInstance();

// Helper function for quick performance check
export async function getPerformanceStatus(): Promise<{
  healthy: boolean;
  score: number;
  issues: string[];
  metrics?: DashboardMetrics;
}> {
  const summary = await performanceDashboard.getSummary();

  return {
    healthy: summary.health.status === "healthy",
    score: summary.health.score,
    issues: summary.health.issues,
    metrics: summary.current,
  };
}

export default performanceDashboard;

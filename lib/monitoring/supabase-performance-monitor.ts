/**
 * Comprehensive Supabase Performance Monitoring System
 *
 * Real-time performance tracking, alerting, and optimization recommendations
 * for EstimatePro's Supabase infrastructure
 */

import { getCacheMetrics } from "@/lib/supabase/client-factory";
import { getQueryPerformanceMetrics } from "@/lib/services/optimized-query-service";
import { supabaseErrorHandler } from "@/lib/error-handling/supabase-error-handler";
import { Database } from "@/types/supabase";

// Performance thresholds
interface PerformanceThresholds {
  queryTime: {
    good: number;
    warning: number;
    critical: number;
  };
  cacheHitRate: {
    good: number;
    warning: number;
    critical: number;
  };
  connectionPool: {
    utilizationWarning: number;
    utilizationCritical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

// Performance metrics structure
interface PerformanceMetrics {
  timestamp: Date;
  database: {
    queryPerformance: {
      averageQueryTime: number;
      slowQueries: number;
      totalQueries: number;
      queriesPerSecond: number;
    };
    connectionPool: {
      activeConnections: number;
      maxConnections: number;
      utilizationPercentage: number;
      waitingQueries: number;
    };
    indexes: {
      unusedIndexes: string[];
      missingIndexes: string[];
      indexHitRatio: number;
    };
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
    compressionRatio: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    errorsByCategory: Record<string, number>;
  };
  application: {
    responseTime: number;
    throughput: number;
    activeUsers: number;
    memoryUsage: number;
  };
}

// Performance alerts
interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical";
  category: "performance" | "availability" | "capacity" | "errors";
  title: string;
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
  resolved: boolean;
}

// Monitoring configuration
interface MonitoringConfig {
  enableRealTimeTracking: boolean;
  metricsCollectionInterval: number; // milliseconds
  alertingEnabled: boolean;
  retentionPeriod: number; // days
  thresholds: PerformanceThresholds;
  enableAutoOptimization: boolean;
}

/**
 * Comprehensive performance monitoring system for Supabase operations
 */
export class SupabasePerformanceMonitor {
  private static instance: SupabasePerformanceMonitor | null = null;
  private config: MonitoringConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private metricsCollectionTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;

  private constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableRealTimeTracking: true,
      metricsCollectionInterval: 30000, // 30 seconds
      alertingEnabled: true,
      retentionPeriod: 7, // 7 days
      enableAutoOptimization: false,
      thresholds: {
        queryTime: {
          good: 100, // < 100ms
          warning: 500, // 100-500ms
          critical: 2000, // > 2000ms
        },
        cacheHitRate: {
          good: 80, // > 80%
          warning: 60, // 60-80%
          critical: 40, // < 40%
        },
        connectionPool: {
          utilizationWarning: 70, // 70%
          utilizationCritical: 90, // 90%
        },
        errorRate: {
          warning: 1, // 1%
          critical: 5, // 5%
        },
      },
      ...config,
    };

    this.initializeMonitoring();
  }

  static getInstance(
    config?: Partial<MonitoringConfig>,
  ): SupabasePerformanceMonitor {
    if (!SupabasePerformanceMonitor.instance) {
      SupabasePerformanceMonitor.instance = new SupabasePerformanceMonitor(
        config,
      );
    }
    return SupabasePerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if (this.config.enableRealTimeTracking) {
      this.startMetricsCollection();
    }

    // Initialize Web Performance Observer if available
    if (typeof PerformanceObserver !== "undefined") {
      this.initializePerformanceObserver();
    }
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsCollectionTimer = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.processMetrics(metrics);
      } catch (error) {
        console.error("Failed to collect performance metrics:", error);
      }
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Initialize browser performance observer
   */
  private initializePerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            this.trackPageLoadPerformance(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === "resource") {
            this.trackResourcePerformance(entry as PerformanceResourceTiming);
          }
        });
      });

      this.performanceObserver.observe({
        entryTypes: ["navigation", "resource", "measure", "mark"],
      });
    } catch (error) {
      console.warn("Performance Observer not supported:", error);
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();

    // Get cache metrics
    const cacheMetrics = getCacheMetrics();

    // Get query performance metrics
    const queryMetrics = getQueryPerformanceMetrics();

    // Get error statistics
    const errorStats = supabaseErrorHandler.getErrorStatistics();

    // Calculate derived metrics
    const totalRequests = queryMetrics.totalQueries;
    const errorRate =
      totalRequests > 0 ? (errorStats.totalErrors / totalRequests) * 100 : 0;

    return {
      timestamp,
      database: {
        queryPerformance: {
          averageQueryTime: queryMetrics.averageExecutionTime,
          slowQueries: queryMetrics.slowQueries.length,
          totalQueries: queryMetrics.totalQueries,
          queriesPerSecond: this.calculateQueriesPerSecond(
            queryMetrics.totalQueries,
          ),
        },
        connectionPool: {
          activeConnections: this.getActiveConnectionsCount(),
          maxConnections: this.getMaxConnectionsLimit(),
          utilizationPercentage: this.calculatePoolUtilization(),
          waitingQueries: this.getWaitingQueriesCount(),
        },
        indexes: {
          unusedIndexes: [], // Would be populated from database analysis
          missingIndexes: [], // Would be populated from query analysis
          indexHitRatio: 95, // Placeholder - would come from database stats
        },
      },
      cache: {
        hitRate: cacheMetrics.hitRate,
        missRate: 100 - cacheMetrics.hitRate,
        evictionRate: this.calculateEvictionRate(cacheMetrics),
        memoryUsage: cacheMetrics.memoryUsage,
        compressionRatio: this.calculateCompressionRatio(cacheMetrics),
      },
      errors: {
        totalErrors: errorStats.totalErrors,
        errorRate,
        criticalErrors: errorStats.errorsBySeverity.critical || 0,
        errorsByCategory: errorStats.errorsByCategory as Record<string, number>,
      },
      application: {
        responseTime: this.getAverageResponseTime(),
        throughput: this.calculateThroughput(),
        activeUsers: this.getActiveUsersCount(),
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  /**
   * Process metrics and trigger alerts if needed
   */
  private processMetrics(metrics: PerformanceMetrics): void {
    // Store metrics
    this.storeMetrics(metrics);

    // Check for performance issues and generate alerts
    this.analyzePerformance(metrics);

    // Auto-optimization if enabled
    if (this.config.enableAutoOptimization) {
      this.performAutoOptimization(metrics);
    }
  }

  /**
   * Store metrics with retention management
   */
  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Enforce retention policy
    const retentionCutoff = new Date();
    retentionCutoff.setDate(
      retentionCutoff.getDate() - this.config.retentionPeriod,
    );

    this.metricsHistory = this.metricsHistory.filter(
      (m) => m.timestamp > retentionCutoff,
    );
  }

  /**
   * Analyze performance and generate alerts
   */
  private analyzePerformance(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check query performance
    if (
      metrics.database.queryPerformance.averageQueryTime >
      this.config.thresholds.queryTime.critical
    ) {
      alerts.push(
        this.createAlert(
          "critical",
          "performance",
          "Critical Query Performance",
          `Average query time (${metrics.database.queryPerformance.averageQueryTime}ms) exceeds critical threshold`,
          {
            averageQueryTime:
              metrics.database.queryPerformance.averageQueryTime,
          },
          [
            "Review slow queries and add missing indexes",
            "Consider query optimization",
            "Check connection pool settings",
          ],
        ),
      );
    }

    // Check cache performance
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate.critical) {
      alerts.push(
        this.createAlert(
          "critical",
          "performance",
          "Critical Cache Hit Rate",
          `Cache hit rate (${metrics.cache.hitRate}%) is below critical threshold`,
          { cacheHitRate: metrics.cache.hitRate },
          [
            "Review cache configuration and TTL settings",
            "Consider increasing cache size",
            "Analyze cache invalidation patterns",
          ],
        ),
      );
    }

    // Check connection pool utilization
    if (
      metrics.database.connectionPool.utilizationPercentage >
      this.config.thresholds.connectionPool.utilizationCritical
    ) {
      alerts.push(
        this.createAlert(
          "critical",
          "capacity",
          "Critical Connection Pool Utilization",
          `Connection pool utilization (${metrics.database.connectionPool.utilizationPercentage}%) is critically high`,
          {
            poolUtilization:
              metrics.database.connectionPool.utilizationPercentage,
          },
          [
            "Increase connection pool size",
            "Review long-running queries",
            "Consider connection cleanup",
          ],
        ),
      );
    }

    // Check error rate
    if (metrics.errors.errorRate > this.config.thresholds.errorRate.critical) {
      alerts.push(
        this.createAlert(
          "critical",
          "errors",
          "Critical Error Rate",
          `Error rate (${metrics.errors.errorRate}%) exceeds critical threshold`,
          { errorRate: metrics.errors.errorRate },
          [
            "Review recent error logs",
            "Check system dependencies",
            "Implement circuit breakers",
          ],
        ),
      );
    }

    // Process alerts
    alerts.forEach((alert) => this.processAlert(alert));
  }

  /**
   * Create performance alert
   */
  private createAlert(
    severity: "info" | "warning" | "critical",
    category: "performance" | "availability" | "capacity" | "errors",
    title: string,
    description: string,
    metrics: Record<string, number>,
    recommendations: string[],
  ): PerformanceAlert {
    return {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      category,
      title,
      description,
      metrics,
      recommendations,
      resolved: false,
    };
  }

  /**
   * Process and handle alerts
   */
  private processAlert(alert: PerformanceAlert): void {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (a) => a.title === alert.title && !a.resolved,
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.timestamp = alert.timestamp;
      existingAlert.metrics = alert.metrics;
    } else {
      // Add new alert
      this.activeAlerts.set(alert.id, alert);
    }

    // Log alert
    this.logAlert(alert);

    // Trigger notifications if enabled
    if (this.config.alertingEnabled) {
      this.triggerAlertNotification(alert);
    }
  }

  /**
   * Perform automatic optimizations
   */
  private performAutoOptimization(metrics: PerformanceMetrics): void {
    // Auto-optimization suggestions (would be implemented based on specific needs)
    const optimizations: string[] = [];

    // Cache optimization
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate.warning) {
      optimizations.push("Increasing cache TTL for frequently accessed data");
    }

    // Query optimization suggestions
    if (metrics.database.queryPerformance.slowQueries > 5) {
      optimizations.push("Recommending index analysis for slow queries");
    }

    if (optimizations.length > 0) {
      console.log("Auto-optimization suggestions:", optimizations);
    }
  }

  /**
   * Track page load performance
   */
  private trackPageLoadPerformance(entry: PerformanceNavigationTiming): void {
    const metrics = {
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnection: entry.connectEnd - entry.connectStart,
      requestTime: entry.responseStart - entry.requestStart,
      responseTime: entry.responseEnd - entry.responseStart,
      domProcessing:
        entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      totalTime: entry.loadEventEnd - entry.navigationStart,
    };

    console.log("Page Load Performance:", metrics);
  }

  /**
   * Track resource performance
   */
  private trackResourcePerformance(entry: PerformanceResourceTiming): void {
    // Track only Supabase-related resources
    if (entry.name.includes("supabase")) {
      const resourceMetrics = {
        name: entry.name,
        duration: entry.duration,
        responseTime: entry.responseEnd - entry.responseStart,
        size: entry.transferSize || 0,
      };

      console.log("Supabase Resource Performance:", resourceMetrics);
    }
  }

  /**
   * Get current performance summary
   */
  getCurrentPerformanceSummary(): {
    status: "healthy" | "warning" | "critical";
    metrics: PerformanceMetrics | null;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const latestMetrics =
      this.metricsHistory[this.metricsHistory.length - 1] || null;
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(
      (a) => !a.resolved,
    );

    // Determine overall status
    let status: "healthy" | "warning" | "critical" = "healthy";
    if (activeAlerts.some((a) => a.severity === "critical")) {
      status = "critical";
    } else if (activeAlerts.some((a) => a.severity === "warning")) {
      status = "warning";
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      latestMetrics,
      activeAlerts,
    );

    return {
      status,
      metrics: latestMetrics,
      alerts: activeAlerts,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics | null,
    alerts: PerformanceAlert[],
  ): string[] {
    const recommendations: string[] = [];

    if (!metrics) {
      return ["Enable performance monitoring to get recommendations"];
    }

    // Query performance recommendations
    if (
      metrics.database.queryPerformance.averageQueryTime >
      this.config.thresholds.queryTime.warning
    ) {
      recommendations.push("Consider adding database indexes for slow queries");
    }

    // Cache recommendations
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate.warning) {
      recommendations.push("Optimize cache configuration to improve hit rate");
    }

    // Connection pool recommendations
    if (
      metrics.database.connectionPool.utilizationPercentage >
      this.config.thresholds.connectionPool.utilizationWarning
    ) {
      recommendations.push("Consider increasing connection pool size");
    }

    // Error rate recommendations
    if (metrics.errors.errorRate > this.config.thresholds.errorRate.warning) {
      recommendations.push("Review and address recurring errors");
    }

    // Add alert-specific recommendations
    alerts.forEach((alert) => {
      recommendations.push(...alert.recommendations);
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours: number = 24): {
    queryTime: Array<{ timestamp: Date; value: number }>;
    cacheHitRate: Array<{ timestamp: Date; value: number }>;
    errorRate: Array<{ timestamp: Date; value: number }>;
  } {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const recentMetrics = this.metricsHistory.filter(
      (m) => m.timestamp > cutoffTime,
    );

    return {
      queryTime: recentMetrics.map((m) => ({
        timestamp: m.timestamp,
        value: m.database.queryPerformance.averageQueryTime,
      })),
      cacheHitRate: recentMetrics.map((m) => ({
        timestamp: m.timestamp,
        value: m.cache.hitRate,
      })),
      errorRate: recentMetrics.map((m) => ({
        timestamp: m.timestamp,
        value: m.errors.errorRate,
      })),
    };
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.metricsCollectionTimer) {
      clearInterval(this.metricsCollectionTimer);
      this.metricsCollectionTimer = undefined;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
  }

  // Private helper methods
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logAlert(alert: PerformanceAlert): void {
    const logMethod =
      alert.severity === "critical"
        ? console.error
        : alert.severity === "warning"
          ? console.warn
          : console.info;

    logMethod(`[Performance Alert] ${alert.title}: ${alert.description}`, {
      severity: alert.severity,
      category: alert.category,
      metrics: alert.metrics,
    });
  }

  private triggerAlertNotification(alert: PerformanceAlert): void {
    // In production, integrate with notification services
    console.log(`Alert notification triggered: ${alert.title}`);
  }

  // Placeholder methods for metrics that would come from actual monitoring
  private calculateQueriesPerSecond(totalQueries: number): number {
    // Would calculate based on time window
    return totalQueries / 60; // Simplified
  }

  private getActiveConnectionsCount(): number {
    // Would come from connection pool monitoring
    return 5;
  }

  private getMaxConnectionsLimit(): number {
    // Would come from configuration
    return 20;
  }

  private calculatePoolUtilization(): number {
    return (
      (this.getActiveConnectionsCount() / this.getMaxConnectionsLimit()) * 100
    );
  }

  private getWaitingQueriesCount(): number {
    // Would come from connection pool monitoring
    return 0;
  }

  private calculateEvictionRate(cacheMetrics: any): number {
    return cacheMetrics.evictions || 0;
  }

  private calculateCompressionRatio(cacheMetrics: any): number {
    return cacheMetrics.compressions || 0;
  }

  private getAverageResponseTime(): number {
    // Would come from application monitoring
    return 150;
  }

  private calculateThroughput(): number {
    // Would calculate requests per second
    return 50;
  }

  private getActiveUsersCount(): number {
    // Would come from session tracking
    return 10;
  }

  private getMemoryUsage(): number {
    // Would come from runtime monitoring
    if (typeof performance !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// Export singleton instance and convenience functions
export const supabasePerformanceMonitor =
  SupabasePerformanceMonitor.getInstance();

/**
 * Initialize performance monitoring with optional configuration
 */
export function initializePerformanceMonitoring(
  config?: Partial<MonitoringConfig>,
): SupabasePerformanceMonitor {
  return SupabasePerformanceMonitor.getInstance(config);
}

/**
 * Get current performance status
 */
export function getPerformanceStatus() {
  return supabasePerformanceMonitor.getCurrentPerformanceSummary();
}

/**
 * Get performance trends
 */
export function getPerformanceTrends(hours?: number) {
  return supabasePerformanceMonitor.getPerformanceTrends(hours);
}

/**
 * Stop performance monitoring
 */
export function stopPerformanceMonitoring() {
  supabasePerformanceMonitor.stopMonitoring();
}

export default SupabasePerformanceMonitor;

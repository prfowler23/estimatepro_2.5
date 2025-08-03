import { AIResponseCache } from "../ai-response-cache";

export interface PerformanceMetrics {
  requestId: string;
  timestamp: number;
  duration: number;
  model: string;
  mode: string;
  toolsUsed: string[];
  tokensUsed?: number;
  tokensPerSecond?: number;
  cacheHit: boolean;
  streamingEnabled: boolean;
  error?: string;
  statusCode?: number;
}

export interface AggregatedMetrics {
  totalRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  averageTokensPerRequest: number;
  averageTokensPerSecond: number;
  requestsByModel: Record<string, number>;
  requestsByMode: Record<string, number>;
  toolUsageCount: Record<string, number>;
  hourlyDistribution: Record<string, number>;
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsSize = 10000; // Keep last 10k metrics in memory
  private cache: AIResponseCache;

  private constructor() {
    this.cache = AIResponseCache.getInstance();

    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  static getInstance(): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor();
    }
    return AIPerformanceMonitor.instance;
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Maintain size limit with memory pressure checks
    if (this.metrics.length > this.maxMetricsSize) {
      // More aggressive cleanup when at max capacity
      const keepCount = Math.floor(this.maxMetricsSize * 0.8); // Keep 80% when cleaning
      this.metrics = this.metrics.slice(-keepCount);

      // Log memory pressure event
      console.warn(
        `AI Performance Monitor: Memory pressure cleanup, reduced to ${keepCount} metrics`,
      );
    }

    // Log slow requests
    if (metric.duration > 5000) {
      console.warn(`Slow AI request detected: ${metric.duration}ms`, {
        requestId: metric.requestId,
        model: metric.model,
        mode: metric.mode,
        toolsUsed: metric.toolsUsed,
      });
    }

    // Log errors
    if (metric.error) {
      console.error(`AI request error:`, {
        requestId: metric.requestId,
        error: metric.error,
        statusCode: metric.statusCode,
      });
    }
  }

  getMetrics(timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    if (!timeRange) {
      return this.metrics;
    }

    return this.metrics.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
    );
  }

  getAggregatedMetrics(timeRange?: {
    start: number;
    end: number;
  }): AggregatedMetrics {
    const relevantMetrics = this.getMetrics(timeRange);

    if (relevantMetrics.length === 0) {
      return this.getEmptyAggregatedMetrics();
    }

    // Calculate response times
    const responseTimes = relevantMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const successfulRequests = relevantMetrics.filter((m) => !m.error);
    const failedRequests = relevantMetrics.filter((m) => m.error);

    // Calculate percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const medianIndex = Math.floor(responseTimes.length * 0.5);

    // Aggregate by model, mode, and tools
    const requestsByModel: Record<string, number> = {};
    const requestsByMode: Record<string, number> = {};
    const toolUsageCount: Record<string, number> = {};
    const hourlyDistribution: Record<string, number> = {};

    relevantMetrics.forEach((metric) => {
      // Count by model
      requestsByModel[metric.model] = (requestsByModel[metric.model] || 0) + 1;

      // Count by mode
      requestsByMode[metric.mode] = (requestsByMode[metric.mode] || 0) + 1;

      // Count tool usage
      metric.toolsUsed.forEach((tool) => {
        toolUsageCount[tool] = (toolUsageCount[tool] || 0) + 1;
      });

      // Hourly distribution
      const hour = new Date(metric.timestamp).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Calculate cache hit rate
    const cacheHits = relevantMetrics.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / relevantMetrics.length) * 100;

    // Calculate token metrics
    const metricsWithTokens = relevantMetrics.filter((m) => m.tokensUsed);
    const totalTokens = metricsWithTokens.reduce(
      (sum, m) => sum + (m.tokensUsed || 0),
      0,
    );
    const averageTokensPerRequest =
      metricsWithTokens.length > 0 ? totalTokens / metricsWithTokens.length : 0;

    const metricsWithTPS = relevantMetrics.filter((m) => m.tokensPerSecond);
    const averageTokensPerSecond =
      metricsWithTPS.length > 0
        ? metricsWithTPS.reduce((sum, m) => sum + (m.tokensPerSecond || 0), 0) /
          metricsWithTPS.length
        : 0;

    return {
      totalRequests: relevantMetrics.length,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: responseTimes[medianIndex] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      errorRate: (failedRequests.length / relevantMetrics.length) * 100,
      cacheHitRate,
      averageTokensPerRequest,
      averageTokensPerSecond,
      requestsByModel,
      requestsByMode,
      toolUsageCount,
      hourlyDistribution,
    };
  }

  getHealthStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
  } {
    const recentMetrics = this.getMetrics({
      start: Date.now() - 5 * 60 * 1000, // Last 5 minutes
      end: Date.now(),
    });

    const issues: string[] = [];
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (recentMetrics.length === 0) {
      return { status: "healthy", issues: [] };
    }

    const aggregated = this.getAggregatedMetrics({
      start: Date.now() - 5 * 60 * 1000,
      end: Date.now(),
    });

    // Check error rate
    if (aggregated.errorRate > 10) {
      issues.push(`High error rate: ${aggregated.errorRate.toFixed(1)}%`);
      status = "unhealthy";
    } else if (aggregated.errorRate > 5) {
      issues.push(`Elevated error rate: ${aggregated.errorRate.toFixed(1)}%`);
      status = "degraded";
    }

    // Check response times
    if (aggregated.p95ResponseTime > 10000) {
      issues.push(`Slow response times: p95 = ${aggregated.p95ResponseTime}ms`);
      status = status === "healthy" ? "degraded" : status;
    }

    // Check cache performance
    if (aggregated.cacheHitRate < 20 && recentMetrics.length > 10) {
      issues.push(`Low cache hit rate: ${aggregated.cacheHitRate.toFixed(1)}%`);
      status = status === "healthy" ? "degraded" : status;
    }

    return { status, issues };
  }

  exportMetrics(): string {
    const aggregated = this.getAggregatedMetrics();
    const health = this.getHealthStatus();

    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        health,
        aggregated,
        recentMetrics: this.metrics.slice(-100), // Last 100 metrics
      },
      null,
      2,
    );
  }

  private cleanupOldMetrics(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter((m) => m.timestamp > oneDayAgo);
  }

  getMemoryUsage(): {
    currentMetrics: number;
    maxMetrics: number;
    memoryPressure: number;
    status: "healthy" | "warning" | "critical";
  } {
    const current = this.metrics.length;
    const max = this.maxMetricsSize;
    const pressure = (current / max) * 100;

    let status: "healthy" | "warning" | "critical" = "healthy";
    if (pressure > 90) status = "critical";
    else if (pressure > 75) status = "warning";

    return {
      currentMetrics: current,
      maxMetrics: max,
      memoryPressure: pressure,
      status,
    };
  }

  private getEmptyAggregatedMetrics(): AggregatedMetrics {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      averageTokensPerRequest: 0,
      averageTokensPerSecond: 0,
      requestsByModel: {},
      requestsByMode: {},
      toolUsageCount: {},
      hourlyDistribution: {},
    };
  }
}

// Helper function to create a performance tracker
export function createPerformanceTracker(
  requestId: string,
  model: string,
  mode: string,
  streamingEnabled: boolean,
): {
  start: () => void;
  end: (options?: {
    toolsUsed?: string[];
    tokensUsed?: number;
    cacheHit?: boolean;
    error?: string;
    statusCode?: number;
  }) => void;
} {
  const monitor = AIPerformanceMonitor.getInstance();
  let startTime: number;

  return {
    start: () => {
      startTime = Date.now();
    },
    end: (options = {}) => {
      const duration = Date.now() - startTime;
      const tokensPerSecond =
        options.tokensUsed && duration > 0
          ? (options.tokensUsed / duration) * 1000
          : undefined;

      monitor.recordMetric({
        requestId,
        timestamp: Date.now(),
        duration,
        model,
        mode,
        toolsUsed: options.toolsUsed || [],
        tokensUsed: options.tokensUsed,
        tokensPerSecond,
        cacheHit: options.cacheHit || false,
        streamingEnabled,
        error: options.error,
        statusCode: options.statusCode,
      });
    },
  };
}

// Export singleton instance
export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance();

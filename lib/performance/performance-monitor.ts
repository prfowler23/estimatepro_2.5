// Performance Monitoring System
// Comprehensive performance tracking, metrics collection, and optimization

// Performance API polyfill with proper typing
interface PerformanceAPI {
  now(): number;
  mark(name: string): void;
  measure(name: string, startMark?: string, endMark?: string): void;
  getEntriesByName(name: string): any[];
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}

// Use built-in performance if available, otherwise fall back to polyfill
const perfApi: PerformanceAPI = (() => {
  if (typeof performance !== "undefined" && performance.now) {
    return performance as PerformanceAPI;
  }
  // Polyfill for environments without Performance API
  const marks = new Map<string, number>();
  const measures = new Map<
    string,
    { start: number; end: number; duration: number }
  >();

  return {
    now: () => Date.now(),
    mark: (name: string) => {
      marks.set(name, Date.now());
    },
    measure: (name: string, startMark?: string, endMark?: string) => {
      const start = startMark ? marks.get(startMark) || Date.now() : Date.now();
      const end = endMark ? marks.get(endMark) || Date.now() : Date.now();
      measures.set(name, { start, end, duration: end - start });
    },
    getEntriesByName: (name: string) => {
      const measure = measures.get(name);
      return measure ? [measure] : [];
    },
    clearMarks: (name?: string) => {
      if (name) marks.delete(name);
      else marks.clear();
    },
    clearMeasures: (name?: string) => {
      if (name) measures.delete(name);
      else measures.clear();
    },
  };
})();

// Safe memory usage function that works in both Node.js and browser
const getMemoryUsage = ():
  | NodeJS.MemoryUsage
  | {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
      arrayBuffers: number;
    } => {
  if (typeof process !== "undefined" && process.memoryUsage) {
    return process.memoryUsage();
  }

  // Browser fallback using performance.memory if available
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      rss: memory.totalJSHeapSize || 0,
      heapUsed: memory.usedJSHeapSize || 0,
      heapTotal: memory.totalJSHeapSize || 0,
      external: 0,
      arrayBuffers: 0,
    };
  }

  // Default fallback values
  return {
    rss: 0,
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0,
  };
};

// Safe CPU usage function that works in both Node.js and browser
const getCpuUsage = (): number => {
  if (typeof process !== "undefined" && process.cpuUsage) {
    const usage = process.cpuUsage();
    return usage.system / 1000000; // Convert to milliseconds
  }

  // Browser fallback - return 0 as CPU usage is not available
  return 0;
};

// Performance metrics
export interface PerformanceMetrics {
  requestCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  memoryUsage:
    | NodeJS.MemoryUsage
    | {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
      };
  cpuUsage: number;
  timestamp: number;
}

// Performance entry
export interface PerformanceEntry {
  name: string;
  type: "api" | "database" | "cache" | "ai" | "calculation" | "component";
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
  userId?: string;
  success: boolean;
  error?: string;
}

// Performance threshold
export interface PerformanceThreshold {
  type: string;
  warning: number;
  critical: number;
  enabled: boolean;
}

// Performance alert
export interface PerformanceAlert {
  id: string;
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

// Performance configuration
export interface PerformanceConfig {
  enabled: boolean;
  maxEntries: number;
  metricsInterval: number;
  alertThresholds: PerformanceThreshold[];
  enableReporting: boolean;
  enableRealtime: boolean;
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: process.env.PERFORMANCE_MONITORING !== "false",
  maxEntries: parseInt(process.env.PERFORMANCE_MAX_ENTRIES || "10000"),
  metricsInterval: parseInt(
    process.env.PERFORMANCE_METRICS_INTERVAL || "60000",
  ),
  alertThresholds: [
    { type: "api", warning: 1000, critical: 5000, enabled: true },
    { type: "database", warning: 500, critical: 2000, enabled: true },
    { type: "cache", warning: 100, critical: 500, enabled: true },
    { type: "ai", warning: 10000, critical: 30000, enabled: true },
    { type: "calculation", warning: 200, critical: 1000, enabled: true },
  ],
  enableReporting: process.env.PERFORMANCE_REPORTING === "true",
  enableRealtime: process.env.PERFORMANCE_REALTIME === "true",
};

// Performance Monitor
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceConfig;
  private entries: PerformanceEntry[] = [];
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private timers: Map<string, number> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private subscribers: Set<(alert: PerformanceAlert) => void> = new Set();

  private constructor(config: PerformanceConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.metrics = this.initializeMetrics();

    if (this.config.enabled) {
      this.startMetricsCollection();
      this.setupCleanupHandlers();
    }
  }

  static getInstance(config?: PerformanceConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errorRate: 0,
      memoryUsage: getMemoryUsage(),
      cpuUsage: 0,
      timestamp: Date.now(),
    };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsInterval);
  }

  private updateMetrics(): void {
    const now = Date.now();
    const recentEntries = this.entries.filter(
      (entry) => now - entry.timestamp < this.config.metricsInterval,
    );

    if (recentEntries.length > 0) {
      const totalDuration = recentEntries.reduce(
        (sum, entry) => sum + entry.duration,
        0,
      );
      const errorCount = recentEntries.filter((entry) => !entry.success).length;

      this.metrics = {
        requestCount: recentEntries.length,
        avgResponseTime: totalDuration / recentEntries.length,
        minResponseTime: Math.min(...recentEntries.map((e) => e.duration)),
        maxResponseTime: Math.max(...recentEntries.map((e) => e.duration)),
        errorRate: errorCount / recentEntries.length,
        memoryUsage: getMemoryUsage(),
        cpuUsage: getCpuUsage(),
        timestamp: now,
      };
    }

    // Check for alerts
    this.checkAlerts();
  }

  private checkAlerts(): void {
    for (const threshold of this.config.alertThresholds) {
      if (!threshold.enabled) continue;

      const relevantEntries = this.entries.filter(
        (entry) => entry.type === threshold.type,
      );
      if (relevantEntries.length === 0) continue;

      const avgDuration =
        relevantEntries.reduce((sum, entry) => sum + entry.duration, 0) /
        relevantEntries.length;

      if (avgDuration > threshold.critical) {
        this.createAlert(
          "critical",
          threshold.type,
          avgDuration,
          threshold.critical,
        );
      } else if (avgDuration > threshold.warning) {
        this.createAlert(
          "warning",
          threshold.type,
          avgDuration,
          threshold.warning,
        );
      }
    }
  }

  private createAlert(
    type: "warning" | "critical",
    metric: string,
    value: number,
    threshold: number,
  ): void {
    const alert: PerformanceAlert = {
      id: `${metric}-${type}-${Date.now()}`,
      type,
      message: `${metric} performance ${type}: ${value.toFixed(2)}ms exceeds ${threshold}ms threshold`,
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Notify subscribers
    this.subscribers.forEach((callback) => callback(alert));

    // Log to console
    console.warn(`Performance Alert: ${alert.message}`);
  }

  // Start performance timing
  startTimer(name: string): void {
    if (!this.config.enabled) return;
    this.timers.set(name, perfApi.now());
    perfApi.mark(`${name}-start`);
  }

  // End performance timing and record entry
  endTimer(
    name: string,
    type: PerformanceEntry["type"],
    success: boolean = true,
    error?: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): number {
    if (!this.config.enabled) return 0;

    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Performance timer ${name} not found`);
      return 0;
    }

    const duration = perfApi.now() - startTime;
    perfApi.mark(`${name}-end`);
    perfApi.measure(name, `${name}-start`, `${name}-end`);
    this.timers.delete(name);

    const entry: PerformanceEntry = {
      name,
      type,
      duration,
      timestamp: Date.now(),
      success,
      error,
      userId,
      metadata,
    };

    this.addEntry(entry);
    return duration;
  }

  // Record performance entry directly
  recordEntry(entry: PerformanceEntry): void {
    if (!this.config.enabled) return;
    this.addEntry(entry);
  }

  // Measure and record a function execution
  async measure<T>(
    name: string,
    type: PerformanceEntry["type"],
    fn: () => Promise<T>,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<T> {
    if (!this.config.enabled) {
      return await fn();
    }

    this.startTimer(name);

    try {
      const result = await fn();
      this.endTimer(name, type, true, undefined, userId, metadata);
      return result;
    } catch (error) {
      this.endTimer(
        name,
        type,
        false,
        (error as Error).message,
        userId,
        metadata,
      );
      throw error;
    }
  }

  // Measure synchronous function
  measureSync<T>(
    name: string,
    type: PerformanceEntry["type"],
    fn: () => T,
    userId?: string,
    metadata?: Record<string, any>,
  ): T {
    if (!this.config.enabled) {
      return fn();
    }

    this.startTimer(name);

    try {
      const result = fn();
      this.endTimer(name, type, true, undefined, userId, metadata);
      return result;
    } catch (error) {
      this.endTimer(
        name,
        type,
        false,
        (error as Error).message,
        userId,
        metadata,
      );
      throw error;
    }
  }

  private addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);

    // Keep only recent entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance entries
  getEntries(filter?: {
    type?: PerformanceEntry["type"];
    userId?: string;
    since?: number;
    limit?: number;
  }): PerformanceEntry[] {
    let entries = [...this.entries];

    if (filter?.type) {
      entries = entries.filter((entry) => entry.type === filter.type);
    }

    if (filter?.userId) {
      entries = entries.filter((entry) => entry.userId === filter.userId);
    }

    if (filter?.since) {
      entries = entries.filter((entry) => entry.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      entries = entries.slice(-filter.limit);
    }

    return entries;
  }

  // Get performance alerts
  getAlerts(resolved: boolean = false): PerformanceAlert[] {
    return this.alerts.filter((alert) => alert.resolved === resolved);
  }

  // Resolve alert
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // Subscribe to performance alerts
  subscribe(callback: (alert: PerformanceAlert) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Get performance report
  getReport(timeRange: { start: number; end: number }): {
    summary: PerformanceMetrics;
    entries: PerformanceEntry[];
    alerts: PerformanceAlert[];
    breakdown: Record<
      string,
      {
        count: number;
        avgDuration: number;
        errorRate: number;
      }
    >;
  } {
    const entries = this.entries.filter(
      (entry) =>
        entry.timestamp >= timeRange.start && entry.timestamp <= timeRange.end,
    );

    const alerts = this.alerts.filter(
      (alert) =>
        alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end,
    );

    const breakdown: Record<string, any> = {};
    for (const entry of entries) {
      if (!breakdown[entry.type]) {
        breakdown[entry.type] = {
          count: 0,
          totalDuration: 0,
          errorCount: 0,
        };
      }

      breakdown[entry.type].count++;
      breakdown[entry.type].totalDuration += entry.duration;
      if (!entry.success) {
        breakdown[entry.type].errorCount++;
      }
    }

    // Calculate averages
    for (const [type, stats] of Object.entries(breakdown)) {
      stats.avgDuration = stats.totalDuration / stats.count;
      stats.errorRate = stats.errorCount / stats.count;
      delete stats.totalDuration;
      delete stats.errorCount;
    }

    return {
      summary: this.metrics,
      entries,
      alerts,
      breakdown,
    };
  }

  // Additional methods required by monitoring API
  getAverageResponseTime(): number {
    return this.metrics.avgResponseTime;
  }

  getErrorRate(): number {
    return this.metrics.errorRate;
  }

  getThroughput(): number {
    // Requests per second based on recent activity
    const now = Date.now();
    const recentEntries = this.entries.filter(
      (entry) => now - entry.timestamp < 60000, // Last minute
    );
    return recentEntries.length / 60; // per second
  }

  getRecentLogs(limit: number = 100): PerformanceEntry[] {
    return this.entries.slice(-limit);
  }

  getTotalRequests(): number {
    return this.entries.length;
  }

  getTotalErrors(): number {
    return this.entries.filter((entry) => !entry.success).length;
  }

  logUserAction(
    action: string,
    userId: string,
    metadata?: Record<string, any>,
  ): void {
    this.recordEntry({
      name: `user-action-${action}`,
      type: "component",
      duration: 0,
      timestamp: Date.now(),
      success: true,
      userId,
      metadata: { action, ...metadata },
    });
  }

  logError(
    error: string,
    context?: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): void {
    this.recordEntry({
      name: `error-${context || "unknown"}`,
      type: "api",
      duration: 0,
      timestamp: Date.now(),
      success: false,
      error,
      userId,
      metadata,
    });
  }

  // Clear performance data
  clear(): void {
    this.entries = [];
    this.alerts = [];
    this.timers.clear();
    perfApi.clearMarks();
    perfApi.clearMeasures();
    this.metrics = this.initializeMetrics();
  }

  // Stop monitoring
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    this.clear();
  }

  // Cleanup on process exit
  private setupCleanupHandlers(): void {
    if (typeof process !== "undefined") {
      const cleanup = () => {
        this.stop();
        // Save any pending metrics
        if (this.config.enableReporting) {
          this.flushMetrics();
        }
      };

      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
      process.on("uncaughtException", (error) => {
        console.error("Uncaught exception in performance monitor:", error);
        cleanup();
      });
    }
  }

  private flushMetrics(): void {
    // Implement metric flushing logic here
    const report = this.getReport({
      start: Date.now() - this.config.metricsInterval,
      end: Date.now(),
    });
    // Could send to external monitoring service
    if (this.config.enableReporting) {
      console.log("Performance metrics flushed:", report.summary);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance decorator for methods
export function measurePerformance(
  type: PerformanceEntry["type"],
  name?: string,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(methodName, type, () =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}

// Performance hooks for React components
export const usePerformance = (componentName: string) => {
  const startRender = () => {
    performanceMonitor.startTimer(`${componentName}-render`);
  };

  const endRender = () => {
    performanceMonitor.endTimer(`${componentName}-render`, "component");
  };

  const measureAsync = async <T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T> => {
    return performanceMonitor.measure(
      `${componentName}-${name}`,
      "component",
      fn,
    );
  };

  return { startRender, endRender, measureAsync };
};

// API performance middleware
export const performanceMiddleware = (
  request: Request,
  response: any, // Use any to avoid Response type issues
  next: () => void,
) => {
  const startTime = perfApi.now();
  const url = new URL(request.url || "").pathname;

  performanceMonitor.startTimer(`api-${url}`);

  // Use a different approach for response completion tracking
  const originalEnd = response.end;
  response.end = function (chunk: any, encoding: any) {
    const duration = perfApi.now() - startTime;
    const success = response.statusCode < 400;

    performanceMonitor.recordEntry({
      name: `api-${url}`,
      type: "api",
      duration,
      timestamp: Date.now(),
      success,
      error: success ? undefined : `HTTP ${response.statusCode}`,
      metadata: {
        method: request.method,
        status: response.statusCode,
        url,
      },
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Export all types for better module integration
export type {
  PerformanceMetrics,
  PerformanceEntry,
  PerformanceThreshold,
  PerformanceAlert,
  PerformanceConfig,
};

export default performanceMonitor;

// Export aliases for backward compatibility
export { performanceMonitor as performanceApiMonitor };

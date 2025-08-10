/**
 * Performance Monitoring Utilities for EstimatePro UI Components
 *
 * This module provides lightweight performance monitoring capabilities
 * for tracking component render times, interaction metrics, and resource usage.
 */

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: "render" | "interaction" | "network" | "memory";
  component?: string;
  context?: Record<string, any>;
}

// Performance threshold configuration
export interface PerformanceThresholds {
  renderTime: number; // ms
  interactionTime: number; // ms
  networkTime: number; // ms
  memoryUsage: number; // MB
}

// Default performance thresholds
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  renderTime: 16, // 60fps budget
  interactionTime: 100, // Google Core Web Vitals
  networkTime: 2000, // 2 second network timeout
  memoryUsage: 50, // 50MB memory warning threshold
};

// Global performance state
interface PerformanceState {
  metrics: PerformanceMetric[];
  thresholds: PerformanceThresholds;
  enabled: boolean;
  maxMetrics: number;
}

const performanceState: PerformanceState = {
  metrics: [],
  thresholds: DEFAULT_THRESHOLDS,
  enabled: process.env.NODE_ENV === "development",
  maxMetrics: 1000, // Keep last 1000 metrics
};

/**
 * Records a performance metric
 */
export function recordMetric(
  name: string,
  value: number,
  category: PerformanceMetric["category"],
  options: {
    component?: string;
    context?: Record<string, any>;
  } = {},
): void {
  if (!performanceState.enabled) return;

  const metric: PerformanceMetric = {
    name,
    value,
    timestamp: performance.now(),
    category,
    component: options.component,
    context: options.context,
  };

  performanceState.metrics.push(metric);

  // Keep only recent metrics to prevent memory leaks
  if (performanceState.metrics.length > performanceState.maxMetrics) {
    performanceState.metrics = performanceState.metrics.slice(
      -performanceState.maxMetrics,
    );
  }

  // Check thresholds and warn if exceeded
  checkThreshold(metric);
}

/**
 * Checks if metric exceeds threshold and logs warning
 */
function checkThreshold(metric: PerformanceMetric): void {
  let threshold: number;

  switch (metric.category) {
    case "render":
      threshold = performanceState.thresholds.renderTime;
      break;
    case "interaction":
      threshold = performanceState.thresholds.interactionTime;
      break;
    case "network":
      threshold = performanceState.thresholds.networkTime;
      break;
    case "memory":
      threshold = performanceState.thresholds.memoryUsage;
      break;
    default:
      return;
  }

  if (metric.value > threshold) {
    console.warn(
      `Performance threshold exceeded: ${metric.name} (${metric.value}ms > ${threshold}ms)`,
      { metric, component: metric.component },
    );
  }
}

/**
 * Measures the execution time of a function
 */
export function measureTime<T>(
  name: string,
  fn: () => T,
  options: {
    category?: PerformanceMetric["category"];
    component?: string;
    context?: Record<string, any>;
  } = {},
): T {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  recordMetric(name, duration, options.category || "render", {
    component: options.component,
    context: options.context,
  });

  return result;
}

/**
 * Measures the execution time of an async function
 */
export async function measureTimeAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    category?: PerformanceMetric["category"];
    component?: string;
    context?: Record<string, any>;
  } = {},
): Promise<T> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  recordMetric(name, duration, options.category || "render", {
    component: options.component,
    context: options.context,
  });

  return result;
}

/**
 * React hook for measuring component render times
 */
export function usePerformanceMetrics(componentName: string) {
  const startTime = React.useRef<number>(0);

  // Measure initial render
  React.useEffect(() => {
    startTime.current = performance.now();
  }, []);

  // Measure render completion
  React.useLayoutEffect(() => {
    if (startTime.current > 0) {
      const renderTime = performance.now() - startTime.current;
      recordMetric(`${componentName} render`, renderTime, "render", {
        component: componentName,
      });
      startTime.current = 0;
    }
  });

  // Helper functions for the component
  const recordInteraction = React.useCallback(
    (interactionName: string, duration?: number) => {
      const actualDuration =
        duration ||
        performance.now() - (startTime.current || performance.now());
      recordMetric(
        `${componentName} ${interactionName}`,
        actualDuration,
        "interaction",
        {
          component: componentName,
        },
      );
    },
    [componentName],
  );

  const startInteraction = React.useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endInteraction = React.useCallback(
    (interactionName: string) => {
      if (startTime.current > 0) {
        const duration = performance.now() - startTime.current;
        recordInteraction(interactionName, duration);
        startTime.current = 0;
      }
    },
    [recordInteraction],
  );

  return {
    recordInteraction,
    startInteraction,
    endInteraction,
  };
}

/**
 * Gets performance metrics for analysis
 */
export function getMetrics(filter?: {
  category?: PerformanceMetric["category"];
  component?: string;
  since?: number; // timestamp
  limit?: number;
}): PerformanceMetric[] {
  let metrics = [...performanceState.metrics];

  if (filter) {
    if (filter.category) {
      metrics = metrics.filter((m) => m.category === filter.category);
    }
    if (filter.component) {
      metrics = metrics.filter((m) => m.component === filter.component);
    }
    if (filter.since) {
      metrics = metrics.filter((m) => m.timestamp >= filter.since);
    }
    if (filter.limit) {
      metrics = metrics.slice(-filter.limit);
    }
  }

  return metrics.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Gets performance statistics
 */
export function getPerformanceStats(filter?: {
  category?: PerformanceMetric["category"];
  component?: string;
  since?: number;
}): {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
} {
  const metrics = getMetrics(filter);
  const values = metrics.map((m) => m.value).sort((a, b) => a - b);

  if (values.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const median = values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];
  const p95 = values[Math.floor(values.length * 0.95)];
  const p99 = values[Math.floor(values.length * 0.99)];

  return {
    count: values.length,
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    p99: Math.round(p99 * 100) / 100,
  };
}

/**
 * Clears performance metrics
 */
export function clearMetrics(): void {
  performanceState.metrics = [];
}

/**
 * Updates performance thresholds
 */
export function updateThresholds(
  newThresholds: Partial<PerformanceThresholds>,
): void {
  performanceState.thresholds = {
    ...performanceState.thresholds,
    ...newThresholds,
  };
}

/**
 * Enables or disables performance monitoring
 */
export function setPerformanceMonitoring(enabled: boolean): void {
  performanceState.enabled = enabled;
}

/**
 * Memory usage monitoring
 */
export function recordMemoryUsage(component?: string): void {
  if (!performanceState.enabled || typeof window === "undefined") return;

  // @ts-ignore - performance.memory is a Chrome-specific API
  const memoryInfo = (performance as any).memory;

  if (memoryInfo) {
    const usedJSMemory = memoryInfo.usedJSMemory / (1024 * 1024); // Convert to MB
    recordMetric("memory usage", usedJSMemory, "memory", {
      component,
      context: {
        totalJSMemory: memoryInfo.totalJSMemory / (1024 * 1024),
        jsMemoryLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
      },
    });
  }
}

/**
 * Network performance monitoring
 */
export function recordNetworkMetric(
  name: string,
  startTime: number,
  endTime?: number,
  context?: Record<string, any>,
): void {
  const actualEndTime = endTime || performance.now();
  const duration = actualEndTime - startTime;

  recordMetric(name, duration, "network", { context });
}

/**
 * Integration with React DevTools Profiler
 */
export function createProfilerCallback(componentName: string) {
  return (
    id: string,
    phase: "mount" | "update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>,
  ) => {
    recordMetric(`${componentName} ${phase}`, actualDuration, "render", {
      component: componentName,
      context: {
        phase,
        baseDuration,
        startTime,
        commitTime,
        interactionCount: interactions.size,
      },
    });
  };
}

/**
 * Performance monitoring for event handlers
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  component?: string,
): T {
  return ((...args: any[]) => {
    return measureTime(name, () => fn(...args), {
      category: "interaction",
      component,
    });
  }) as T;
}

/**
 * Performance budget monitoring
 */
export interface PerformanceBudget {
  renderBudget: number; // ms per component render
  interactionBudget: number; // ms per user interaction
  networkBudget: number; // ms per network request
  memoryBudget: number; // MB maximum memory usage
}

export const DEFAULT_BUDGET: PerformanceBudget = {
  renderBudget: 16,
  interactionBudget: 100,
  networkBudget: 2000,
  memoryBudget: 100,
};

/**
 * Checks if performance is within budget
 */
export function checkPerformanceBudget(
  budget: Partial<PerformanceBudget> = DEFAULT_BUDGET,
): {
  withinBudget: boolean;
  violations: Array<{
    metric: string;
    actual: number;
    budget: number;
    severity: "warning" | "error";
  }>;
} {
  const stats = {
    render: getPerformanceStats({ category: "render" }),
    interaction: getPerformanceStats({ category: "interaction" }),
    network: getPerformanceStats({ category: "network" }),
    memory: getPerformanceStats({ category: "memory" }),
  };

  const violations = [];
  const fullBudget = { ...DEFAULT_BUDGET, ...budget };

  // Check render budget (average should be within budget)
  if (stats.render.average > fullBudget.renderBudget) {
    violations.push({
      metric: "Average Render Time",
      actual: stats.render.average,
      budget: fullBudget.renderBudget,
      severity:
        stats.render.average > fullBudget.renderBudget * 2
          ? ("error" as const)
          : ("warning" as const),
    });
  }

  // Check interaction budget (p95 should be within budget)
  if (stats.interaction.p95 > fullBudget.interactionBudget) {
    violations.push({
      metric: "P95 Interaction Time",
      actual: stats.interaction.p95,
      budget: fullBudget.interactionBudget,
      severity:
        stats.interaction.p95 > fullBudget.interactionBudget * 2
          ? ("error" as const)
          : ("warning" as const),
    });
  }

  // Check network budget (p95 should be within budget)
  if (stats.network.p95 > fullBudget.networkBudget) {
    violations.push({
      metric: "P95 Network Time",
      actual: stats.network.p95,
      budget: fullBudget.networkBudget,
      severity:
        stats.network.p95 > fullBudget.networkBudget * 1.5
          ? ("error" as const)
          : ("warning" as const),
    });
  }

  // Check memory budget (current usage should be within budget)
  if (stats.memory.max > fullBudget.memoryBudget) {
    violations.push({
      metric: "Maximum Memory Usage",
      actual: stats.memory.max,
      budget: fullBudget.memoryBudget,
      severity:
        stats.memory.max > fullBudget.memoryBudget * 1.5
          ? ("error" as const)
          : ("warning" as const),
    });
  }

  return {
    withinBudget: violations.length === 0,
    violations,
  };
}

// Automatically record memory usage every 30 seconds in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  setInterval(() => {
    recordMemoryUsage("global");
  }, 30000);
}

// Add React import for the hook
import React from "react";

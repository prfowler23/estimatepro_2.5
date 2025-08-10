/**
 * Performance optimization utilities for the Help System
 * Provides debouncing, throttling, caching, and monitoring capabilities
 */

import { getHelpConfig } from "./help-config";
import type { PerformanceMetrics } from "./help-types";

// Performance monitoring class
export class HelpPerformanceMonitor {
  private static instance: HelpPerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  private config = getHelpConfig();

  static getInstance(): HelpPerformanceMonitor {
    if (!HelpPerformanceMonitor.instance) {
      HelpPerformanceMonitor.instance = new HelpPerformanceMonitor();
    }
    return HelpPerformanceMonitor.instance;
  }

  startTiming(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  endTiming(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.metrics.set(operation, duration);
    this.startTimes.delete(operation);

    // Log slow operations in development
    if (this.config.development.enableDebugMode && duration > 100) {
      console.warn(
        `Slow help operation: ${operation} took ${duration.toFixed(2)}ms`,
      );
    }

    return duration;
  }

  getMetrics(): PerformanceMetrics {
    return {
      componentRenderTime: this.metrics.get("component_render") || 0,
      helpLoadTime: this.metrics.get("help_load") || 0,
      tutorialStepTime: this.metrics.get("tutorial_step") || 0,
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: this.metrics.get("cache_hit_rate") || 0,
      apiResponseTime: this.metrics.get("api_response") || 0,
      errorRate: this.metrics.get("error_rate") || 0,
    };
  }

  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.totalJSHeapSize;
    }
    return 0;
  }

  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Debouncing utility with configuration support
export function createDebouncer<T extends (...args: any[]) => any>(
  func: T,
  wait?: number,
): (...args: Parameters<T>) => void {
  const config = getHelpConfig();
  const delay = wait || config.performance.debounceActivity;

  let timeoutId: NodeJS.Timeout | undefined;
  let lastArgs: Parameters<T>;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(null, lastArgs);
      timeoutId = undefined;
    }, delay);
  };
}

// Throttling utility with configuration support
export function createThrottler<T extends (...args: any[]) => any>(
  func: T,
  limit?: number,
): (...args: Parameters<T>) => void {
  const config = getHelpConfig();
  const throttleLimit =
    limit || Math.max(config.performance.debounceActivity / 2, 50);

  let inThrottle = false;
  let lastArgs: Parameters<T>;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (!inThrottle) {
      func.apply(null, lastArgs);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, throttleLimit);
    }
  };
}

// Intelligent caching with TTL and size limits
export class HelpCache<T> {
  private cache = new Map<
    string,
    { data: T; timestamp: number; hits: number }
  >();
  private config = getHelpConfig();
  private maxSize = 100;
  private ttl = this.config.content.cacheTimeout;

  set(key: string, value: T): void {
    // Cleanup expired entries
    this.cleanup();

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;

    // Update cache hit rate metric
    const monitor = HelpPerformanceMonitor.getInstance();
    const totalEntries = this.cache.size;
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, e) => sum + e.hits,
      0,
    );
    monitor.getMetrics().cacheHitRate = totalHits / Math.max(totalEntries, 1);

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number; oldestEntry: number } {
    const now = Date.now();
    let oldestTimestamp = now;
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hitRate: totalHits / Math.max(this.cache.size, 1),
      oldestEntry: now - oldestTimestamp,
    };
  }
}

// Batch processing for multiple operations
export class BatchProcessor<T> {
  private queue: T[] = [];
  private config = getHelpConfig();
  private batchSize = this.config.performance.batchSize;
  private processor: (batch: T[]) => Promise<void>;
  private timeoutId: NodeJS.Timeout | undefined;

  constructor(processor: (batch: T[]) => Promise<void>) {
    this.processor = processor;
  }

  add(item: T): void {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timeoutId) return;

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, 1000); // Flush after 1 second if batch not full
  }

  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.processor(batch);
    } catch (error) {
      console.error("Batch processing error:", error);
    }
  }
}

// Resource cleanup utilities
export class ResourceManager {
  private resources: Set<() => void> = new Set();
  private timers: Set<NodeJS.Timeout> = new Set();
  private observers: Set<
    MutationObserver | ResizeObserver | IntersectionObserver
  > = new Set();

  addCleanup(cleanup: () => void): void {
    this.resources.add(cleanup);
  }

  addTimer(timer: NodeJS.Timeout): void {
    this.timers.add(timer);
  }

  addObserver(
    observer: MutationObserver | ResizeObserver | IntersectionObserver,
  ): void {
    this.observers.add(observer);
  }

  cleanup(): void {
    // Clear all timers
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Disconnect all observers
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers.clear();

    // Execute custom cleanup functions
    for (const cleanup of this.resources) {
      try {
        cleanup();
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
    }
    this.resources.clear();
  }
}

// Intersection Observer utility for visibility detection
export function createVisibilityObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit,
): IntersectionObserver {
  const observer = new IntersectionObserver(callback, {
    rootMargin: "10px",
    threshold: 0.1,
    ...options,
  });

  return observer;
}

// Resize observer utility with debouncing
export function createResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  debounceMs = 100,
): ResizeObserver {
  const config = getHelpConfig();
  const delay = config.performance.debounceResize || debounceMs;

  const debouncedCallback = createDebouncer(callback, delay);

  return new ResizeObserver(debouncedCallback);
}

// Memory usage monitoring
export function monitorMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if (typeof performance === "undefined" || !("memory" in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
  };
}

// Request animation frame utility with fallback
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number },
): number {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return window.setTimeout(callback, 0) as any;
  }
}

// Device capability detection
export function getDeviceCapabilities(): {
  memoryGB: number | null;
  cores: number | null;
  connection: string | null;
  isLowEnd: boolean;
} {
  let memoryGB: number | null = null;
  let cores: number | null = null;
  let connection: string | null = null;

  if (typeof navigator !== "undefined") {
    // Memory
    if ("deviceMemory" in navigator) {
      memoryGB = (navigator as any).deviceMemory;
    }

    // CPU cores
    cores = navigator.hardwareConcurrency || null;

    // Network connection
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      connection = conn?.effectiveType || null;
    }
  }

  const isLowEnd =
    (memoryGB !== null && memoryGB < 4) ||
    (cores !== null && cores < 4) ||
    connection === "slow-2g" ||
    connection === "2g";

  return {
    memoryGB,
    cores,
    connection,
    isLowEnd,
  };
}

// Global performance monitor instance
export const helpPerformanceMonitor = HelpPerformanceMonitor.getInstance();

// Global cache instances
export const helpContentCache = new HelpCache<any>();
export const tutorialCache = new HelpCache<any>();

const helpPerformanceExports = {
  HelpPerformanceMonitor,
  createDebouncer,
  createThrottler,
  HelpCache,
  BatchProcessor,
  ResourceManager,
  createVisibilityObserver,
  createResizeObserver,
  monitorMemoryUsage,
  requestIdleCallback,
  getDeviceCapabilities,
  helpPerformanceMonitor,
  helpContentCache,
  tutorialCache,
};

export default helpPerformanceExports;

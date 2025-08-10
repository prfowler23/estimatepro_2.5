// Advanced Memory & Resource Manager
// Delivers optimal memory usage and leak-free operation at enterprise scale

import { createLogger } from "@/lib/services/core/logger";
import { performanceDashboard } from "@/lib/monitoring/performance-dashboard-service";

const logger = createLogger("MemoryManager");

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usage: number; // percentage
  trend: "increasing" | "decreasing" | "stable";
  leaksDetected: number;
}

interface ResourcePool<T> {
  available: T[];
  inUse: T[];
  maxSize: number;
  factory: () => T;
  cleanup: (resource: T) => void;
}

interface MemoryLeak {
  id: string;
  type: "event-listener" | "timer" | "closure" | "dom" | "cache";
  description: string;
  size: number;
  timestamp: number;
  stack?: string;
}

interface GCStats {
  totalGCs: number;
  forcedGCs: number;
  averageGCTime: number;
  memoryFreed: number;
  lastGCTime: number;
}

export class MemoryManager {
  private pools: Map<string, ResourcePool<any>> = new Map();
  private timers = new Set<NodeJS.Timeout>();
  private intervals = new Set<NodeJS.Timeout>();
  private eventListeners = new Map<
    EventTarget,
    Set<{
      type: string;
      listener: EventListener;
      options?: AddEventListenerOptions;
    }>
  >();
  private observers = new Set<
    MutationObserver | ResizeObserver | IntersectionObserver
  >();
  private weakRefs = new Set<WeakRef<any>>();
  private memoryMetrics: MemoryMetrics = {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    usage: 0,
    trend: "stable",
    leaksDetected: 0,
  };
  private gcStats: GCStats = {
    totalGCs: 0,
    forcedGCs: 0,
    averageGCTime: 0,
    memoryFreed: 0,
    lastGCTime: 0,
  };
  private leaks: MemoryLeak[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private previousMemoryUsage: number[] = [];

  constructor() {
    this.startMemoryMonitoring();
    this.initializeResourcePools();
    this.setupLeakDetection();
  }

  /**
   * Create managed resource pool for object reuse
   */
  createResourcePool<T>(
    name: string,
    factory: () => T,
    cleanup: (resource: T) => void,
    maxSize: number = 50,
  ): void {
    const pool: ResourcePool<T> = {
      available: [],
      inUse: [],
      maxSize,
      factory,
      cleanup,
    };

    // Pre-populate pool with initial resources
    for (let i = 0; i < Math.min(5, maxSize); i++) {
      pool.available.push(factory());
    }

    this.pools.set(name, pool);

    logger.info(`Resource pool created: ${name}`, {
      initialSize: pool.available.length,
      maxSize,
    });
  }

  /**
   * Acquire resource from pool
   */
  acquireResource<T>(poolName: string): T | null {
    const pool = this.pools.get(poolName) as ResourcePool<T>;
    if (!pool) {
      logger.error(`Resource pool not found: ${poolName}`);
      return null;
    }

    let resource: T;

    if (pool.available.length > 0) {
      resource = pool.available.pop()!;
    } else if (pool.inUse.length < pool.maxSize) {
      resource = pool.factory();
    } else {
      logger.warn(`Resource pool exhausted: ${poolName}`);
      return null;
    }

    pool.inUse.push(resource);
    return resource;
  }

  /**
   * Release resource back to pool
   */
  releaseResource<T>(poolName: string, resource: T): void {
    const pool = this.pools.get(poolName) as ResourcePool<T>;
    if (!pool) {
      logger.error(`Resource pool not found: ${poolName}`);
      return;
    }

    const index = pool.inUse.indexOf(resource);
    if (index === -1) {
      logger.warn(`Resource not found in pool: ${poolName}`);
      return;
    }

    pool.inUse.splice(index, 1);

    // Clean and return to available pool
    pool.cleanup(resource);
    if (pool.available.length < pool.maxSize / 2) {
      pool.available.push(resource);
    }
    // If pool is full, let resource be garbage collected
  }

  /**
   * Managed setTimeout that tracks timers
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);

    this.timers.add(timer);
    return timer;
  }

  /**
   * Managed setInterval that tracks intervals
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Clear managed timer
   */
  clearTimeout(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  /**
   * Clear managed interval
   */
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Managed addEventListener with automatic cleanup tracking
   */
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options);

    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Set());
    }

    this.eventListeners.get(target)!.add({ type, listener, options });
  }

  /**
   * Managed removeEventListener
   */
  removeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.removeEventListener(type, listener, options);

    const listeners = this.eventListeners.get(target);
    if (listeners) {
      for (const l of listeners) {
        if (l.type === type && l.listener === listener) {
          listeners.delete(l);
          break;
        }
      }

      if (listeners.size === 0) {
        this.eventListeners.delete(target);
      }
    }
  }

  /**
   * Managed observer registration
   */
  registerObserver(
    observer: MutationObserver | ResizeObserver | IntersectionObserver,
  ): void {
    this.observers.add(observer);
  }

  /**
   * Create managed WeakRef
   */
  createWeakRef<T extends object>(target: T): WeakRef<T> {
    const ref = new WeakRef(target);
    this.weakRefs.add(ref);
    return ref;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof window !== "undefined" && (window as any).gc) {
      const startTime = performance.now();
      const beforeMemory = this.getCurrentMemoryUsage();

      try {
        (window as any).gc();

        const afterMemory = this.getCurrentMemoryUsage();
        const gcTime = performance.now() - startTime;
        const memoryFreed = beforeMemory - afterMemory;

        this.gcStats.totalGCs++;
        this.gcStats.forcedGCs++;
        this.gcStats.averageGCTime = (this.gcStats.averageGCTime + gcTime) / 2;
        this.gcStats.memoryFreed += memoryFreed;
        this.gcStats.lastGCTime = Date.now();

        logger.info("Forced garbage collection", {
          gcTime: Math.round(gcTime),
          memoryFreed: Math.round(memoryFreed / 1024 / 1024), // MB
          newUsage: Math.round(afterMemory / 1024 / 1024), // MB
        });

        return true;
      } catch (error) {
        logger.error("Failed to force garbage collection:", error);
        return false;
      }
    }

    return false;
  }

  /**
   * Clean up all managed resources
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Clear all intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    // Remove all event listeners
    for (const [target, listeners] of this.eventListeners) {
      for (const { type, listener, options } of listeners) {
        try {
          target.removeEventListener(type, listener, options);
        } catch (error) {
          logger.warn("Failed to remove event listener:", error);
        }
      }
    }
    this.eventListeners.clear();

    // Disconnect all observers
    for (const observer of this.observers) {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn("Failed to disconnect observer:", error);
      }
    }
    this.observers.clear();

    // Clean up resource pools
    for (const [name, pool] of this.pools) {
      [...pool.available, ...pool.inUse].forEach((resource) => {
        try {
          pool.cleanup(resource);
        } catch (error) {
          logger.warn(`Failed to cleanup resource from pool ${name}:`, error);
        }
      });
    }
    this.pools.clear();

    // Clear weak references
    this.weakRefs.clear();

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Force final garbage collection
    this.forceGarbageCollection();

    logger.info("Memory manager cleanup completed", {
      timersCleared: this.timers.size,
      intervalsCleared: this.intervals.size,
      listenersRemoved: this.eventListeners.size,
      observersDisconnected: this.observers.size,
      poolsCleared: this.pools.size,
    });
  }

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics & {
    pools: Record<
      string,
      {
        available: number;
        inUse: number;
        maxSize: number;
      }
    >;
    trackedResources: {
      timers: number;
      intervals: number;
      listeners: number;
      observers: number;
      weakRefs: number;
    };
    gcStats: GCStats;
    leaks: MemoryLeak[];
  } {
    // Update current metrics
    this.updateMemoryMetrics();

    // Pool statistics
    const pools: Record<string, any> = {};
    for (const [name, pool] of this.pools) {
      pools[name] = {
        available: pool.available.length,
        inUse: pool.inUse.length,
        maxSize: pool.maxSize,
      };
    }

    // Clean up dead weak references
    const aliveWeakRefs = new Set<WeakRef<any>>();
    for (const ref of this.weakRefs) {
      if (ref.deref() !== undefined) {
        aliveWeakRefs.add(ref);
      }
    }
    this.weakRefs = aliveWeakRefs;

    return {
      ...this.memoryMetrics,
      pools,
      trackedResources: {
        timers: this.timers.size,
        intervals: this.intervals.size,
        listeners: Array.from(this.eventListeners.values()).reduce(
          (sum, set) => sum + set.size,
          0,
        ),
        observers: this.observers.size,
        weakRefs: this.weakRefs.size,
      },
      gcStats: { ...this.gcStats },
      leaks: [...this.leaks],
    };
  }

  /**
   * Analyze memory usage and provide recommendations
   */
  analyzeMemoryUsage(): {
    status: "healthy" | "warning" | "critical";
    recommendations: string[];
    optimizations: Array<{
      type: string;
      description: string;
      impact: "high" | "medium" | "low";
      action: () => void;
    }>;
  } {
    const metrics = this.getMemoryMetrics();
    const recommendations: string[] = [];
    const optimizations: any[] = [];

    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check memory usage
    if (metrics.usage > 85) {
      status = "critical";
      recommendations.push(
        "Memory usage is critically high. Consider releasing unused resources.",
      );

      optimizations.push({
        type: "force-gc",
        description: "Force garbage collection to free up memory",
        impact: "high" as const,
        action: () => this.forceGarbageCollection(),
      });
    } else if (metrics.usage > 70) {
      status = "warning";
      recommendations.push(
        "Memory usage is elevated. Monitor for potential leaks.",
      );
    }

    // Check for memory leaks
    if (metrics.leaksDetected > 0) {
      status = status === "critical" ? "critical" : "warning";
      recommendations.push(
        `${metrics.leaksDetected} potential memory leaks detected.`,
      );

      optimizations.push({
        type: "cleanup-leaks",
        description: "Clean up detected memory leaks",
        impact: "high" as const,
        action: () => this.cleanupDetectedLeaks(),
      });
    }

    // Check resource pools
    let overutilizedPools = 0;
    for (const [name, pool] of Object.entries(metrics.pools)) {
      if (pool.inUse / pool.maxSize > 0.9) {
        overutilizedPools++;
        recommendations.push(`Resource pool '${name}' is near capacity.`);

        optimizations.push({
          type: "expand-pool",
          description: `Expand ${name} resource pool capacity`,
          impact: "medium" as const,
          action: () => this.expandResourcePool(name),
        });
      }
    }

    // Check for excessive tracked resources
    if (metrics.trackedResources.timers > 100) {
      recommendations.push(
        "High number of active timers detected. Review timer usage.",
      );
    }

    if (metrics.trackedResources.listeners > 500) {
      recommendations.push(
        "High number of event listeners detected. Check for proper cleanup.",
      );
    }

    return {
      status,
      recommendations,
      optimizations,
    };
  }

  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryMetrics();
      this.detectMemoryLeaks();
      this.recordMemoryMetrics();
    }, 5000); // Check every 5 seconds
  }

  private updateMemoryMetrics(): void {
    if (typeof window !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;

      this.memoryMetrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        trend: this.calculateMemoryTrend(memory.usedJSHeapSize),
        leaksDetected: this.leaks.length,
      };

      // Track memory usage history
      this.previousMemoryUsage.push(memory.usedJSHeapSize);
      if (this.previousMemoryUsage.length > 20) {
        this.previousMemoryUsage.shift();
      }
    }
  }

  private calculateMemoryTrend(
    currentUsage: number,
  ): "increasing" | "decreasing" | "stable" {
    if (this.previousMemoryUsage.length < 3) return "stable";

    const recentAverage =
      this.previousMemoryUsage.slice(-3).reduce((a, b) => a + b) / 3;
    const olderAverage =
      this.previousMemoryUsage.slice(-6, -3).reduce((a, b) => a + b) / 3;

    const changePercent = ((recentAverage - olderAverage) / olderAverage) * 100;

    if (changePercent > 5) return "increasing";
    if (changePercent < -5) return "decreasing";
    return "stable";
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private initializeResourcePools(): void {
    // Initialize common resource pools

    // HTTP Request pool (for fetch operations)
    this.createResourcePool(
      "http-requests",
      () => ({ controller: new AbortController(), used: false }),
      (resource: any) => {
        if (!resource.controller.signal.aborted) {
          resource.controller.abort();
        }
        resource.used = false;
      },
      20,
    );

    // DOM element pool for temporary elements
    this.createResourcePool(
      "temp-elements",
      () => document.createElement("div"),
      (element: HTMLElement) => {
        element.innerHTML = "";
        element.className = "";
        element.removeAttribute("style");
      },
      30,
    );
  }

  private setupLeakDetection(): void {
    // Set up periodic leak detection
    this.setInterval(() => {
      this.detectMemoryLeaks();
    }, 30000); // Check every 30 seconds
  }

  private detectMemoryLeaks(): void {
    // Simple heuristic-based leak detection
    if (
      this.memoryMetrics.trend === "increasing" &&
      this.memoryMetrics.usage > 60
    ) {
      // Check for potential timer leaks
      if (this.timers.size > 50) {
        this.leaks.push({
          id: `timer-leak-${Date.now()}`,
          type: "timer",
          description: `Excessive timers detected: ${this.timers.size}`,
          size: this.timers.size * 1024, // Estimated
          timestamp: Date.now(),
        });
      }

      // Check for listener leaks
      const totalListeners = Array.from(this.eventListeners.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      );

      if (totalListeners > 200) {
        this.leaks.push({
          id: `listener-leak-${Date.now()}`,
          type: "event-listener",
          description: `Excessive event listeners detected: ${totalListeners}`,
          size: totalListeners * 512, // Estimated
          timestamp: Date.now(),
        });
      }
    }

    // Clean up old leak reports (keep last 10)
    if (this.leaks.length > 10) {
      this.leaks = this.leaks.slice(-10);
    }
  }

  private cleanupDetectedLeaks(): void {
    const beforeCleanup = this.getCurrentMemoryUsage();

    // Aggressive cleanup for detected leaks
    for (const leak of this.leaks) {
      switch (leak.type) {
        case "timer":
          // Clear oldest timers if too many
          if (this.timers.size > 20) {
            const timersToRemove = Array.from(this.timers).slice(
              0,
              this.timers.size - 20,
            );
            timersToRemove.forEach((timer) => {
              clearTimeout(timer);
              this.timers.delete(timer);
            });
          }
          break;

        case "event-listener":
          // Remove listeners from dead elements
          for (const [target, listeners] of this.eventListeners) {
            if ((target as any).isConnected === false) {
              for (const { type, listener, options } of listeners) {
                target.removeEventListener(type, listener, options);
              }
              this.eventListeners.delete(target);
            }
          }
          break;
      }
    }

    // Clear leak reports
    this.leaks = [];

    // Force garbage collection
    this.forceGarbageCollection();

    const afterCleanup = this.getCurrentMemoryUsage();
    const memoryFreed = beforeCleanup - afterCleanup;

    logger.info("Memory leak cleanup completed", {
      memoryFreed: Math.round(memoryFreed / 1024 / 1024), // MB
      timersActive: this.timers.size,
      listenersActive: Array.from(this.eventListeners.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      ),
    });
  }

  private expandResourcePool(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      const newMaxSize = Math.min(pool.maxSize * 1.5, 200);
      pool.maxSize = newMaxSize;

      logger.info(`Expanded resource pool: ${poolName}`, {
        newMaxSize,
        currentUsage: pool.inUse.length,
        available: pool.available.length,
      });
    }
  }

  private recordMemoryMetrics(): void {
    performanceDashboard.recordMetric({
      name: "memory_usage",
      value: this.memoryMetrics.usage,
      unit: "%",
      timestamp: Date.now(),
      tags: { type: "memory" },
      threshold: { warning: 70, critical: 85 },
    });

    performanceDashboard.recordMetric({
      name: "memory_used_mb",
      value: this.memoryMetrics.usedJSHeapSize / 1024 / 1024,
      unit: "mb",
      timestamp: Date.now(),
      tags: { type: "memory" },
    });

    performanceDashboard.recordMetric({
      name: "memory_leaks_detected",
      value: this.leaks.length,
      unit: "count",
      timestamp: Date.now(),
      tags: { type: "memory" },
      threshold: { warning: 1, critical: 3 },
    });
  }
}

// Singleton instance for global use
export const memoryManager = new MemoryManager();

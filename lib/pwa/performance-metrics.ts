// PWA Performance Metrics and Monitoring
// Comprehensive performance tracking for PWA operations

import { perfApi } from "../performance/performance-monitor";

// Performance metric types
export interface PWAMetrics {
  cacheMetrics: CacheMetrics;
  syncMetrics: SyncMetrics;
  networkMetrics: NetworkMetrics;
  storageMetrics: StorageMetrics;
  serviceWorkerMetrics: ServiceWorkerMetrics;
  timestamp: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  hitRate: number;
  avgCacheTime: number;
  cacheSize: number;
  evictions: number;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingActions: number;
  avgSyncTime: number;
  lastSyncTime: Date | null;
  retryCount: number;
}

export interface NetworkMetrics {
  onlineTime: number;
  offlineTime: number;
  networkChanges: number;
  avgLatency: number;
  bandwidthEstimate: number;
  connectionType: string;
  failedRequests: number;
}

export interface StorageMetrics {
  localStorage: number;
  sessionStorage: number;
  indexedDB: number;
  cacheStorage: number;
  totalUsed: number;
  quota: number;
  percentUsed: number;
}

export interface ServiceWorkerMetrics {
  installTime: number;
  activateTime: number;
  fetchCount: number;
  avgFetchTime: number;
  errorCount: number;
  cacheUpdateCount: number;
  messageCount: number;
}

// Performance monitoring class
export class PWAPerformanceMonitor {
  private static instance: PWAPerformanceMonitor;
  private metrics: PWAMetrics;
  private metricsHistory: PWAMetrics[] = [];
  private maxHistorySize = 100;
  private onlineStartTime: number = Date.now();
  private offlineStartTime: number = 0;
  private fetchTimings: number[] = [];
  private syncTimings: number[] = [];
  private cacheTimings: number[] = [];

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
  }

  static getInstance(): PWAPerformanceMonitor {
    if (!PWAPerformanceMonitor.instance) {
      PWAPerformanceMonitor.instance = new PWAPerformanceMonitor();
    }
    return PWAPerformanceMonitor.instance;
  }

  private initializeMetrics(): PWAMetrics {
    return {
      cacheMetrics: {
        hits: 0,
        misses: 0,
        writes: 0,
        deletes: 0,
        hitRate: 0,
        avgCacheTime: 0,
        cacheSize: 0,
        evictions: 0,
      },
      syncMetrics: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        pendingActions: 0,
        avgSyncTime: 0,
        lastSyncTime: null,
        retryCount: 0,
      },
      networkMetrics: {
        onlineTime: 0,
        offlineTime: 0,
        networkChanges: 0,
        avgLatency: 0,
        bandwidthEstimate: 0,
        connectionType: "unknown",
        failedRequests: 0,
      },
      storageMetrics: {
        localStorage: 0,
        sessionStorage: 0,
        indexedDB: 0,
        cacheStorage: 0,
        totalUsed: 0,
        quota: 0,
        percentUsed: 0,
      },
      serviceWorkerMetrics: {
        installTime: 0,
        activateTime: 0,
        fetchCount: 0,
        avgFetchTime: 0,
        errorCount: 0,
        cacheUpdateCount: 0,
        messageCount: 0,
      },
      timestamp: Date.now(),
    };
  }

  private startMonitoring(): void {
    // Monitor network changes
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));

      // Monitor connection quality
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        connection.addEventListener("change", () =>
          this.updateConnectionMetrics(),
        );
      }
    }

    // Periodic metrics collection
    setInterval(() => {
      this.collectStorageMetrics();
      this.calculateAverages();
      this.saveMetricsSnapshot();
    }, 60000); // Every minute
  }

  private handleNetworkChange(isOnline: boolean): void {
    this.metrics.networkMetrics.networkChanges++;

    if (isOnline) {
      if (this.offlineStartTime > 0) {
        this.metrics.networkMetrics.offlineTime +=
          Date.now() - this.offlineStartTime;
        this.offlineStartTime = 0;
      }
      this.onlineStartTime = Date.now();
    } else {
      if (this.onlineStartTime > 0) {
        this.metrics.networkMetrics.onlineTime +=
          Date.now() - this.onlineStartTime;
        this.onlineStartTime = 0;
      }
      this.offlineStartTime = Date.now();
    }
  }

  private updateConnectionMetrics(): void {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.networkMetrics.connectionType =
        connection.effectiveType || "unknown";
      this.metrics.networkMetrics.bandwidthEstimate = connection.downlink || 0;
      this.metrics.networkMetrics.avgLatency = connection.rtt || 0;
    }
  }

  private async collectStorageMetrics(): Promise<void> {
    try {
      // Estimate storage usage
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        this.metrics.storageMetrics.totalUsed = estimate.usage || 0;
        this.metrics.storageMetrics.quota = estimate.quota || 0;
        this.metrics.storageMetrics.percentUsed =
          (this.metrics.storageMetrics.totalUsed /
            this.metrics.storageMetrics.quota) *
          100;
      }

      // Cache storage size
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        let totalCacheSize = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          for (const request of keys) {
            const response = await cache.match(request);
            if (response && response.headers.get("content-length")) {
              totalCacheSize += parseInt(
                response.headers.get("content-length")!,
                10,
              );
            }
          }
        }

        this.metrics.storageMetrics.cacheStorage = totalCacheSize;
        this.metrics.cacheMetrics.cacheSize = totalCacheSize;
      }

      // Local storage size (approximate)
      if (typeof localStorage !== "undefined") {
        let localStorageSize = 0;
        for (const key in localStorage) {
          localStorageSize += localStorage[key].length + key.length;
        }
        this.metrics.storageMetrics.localStorage = localStorageSize * 2; // UTF-16
      }

      // Session storage size (approximate)
      if (typeof sessionStorage !== "undefined") {
        let sessionStorageSize = 0;
        for (const key in sessionStorage) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
        this.metrics.storageMetrics.sessionStorage = sessionStorageSize * 2; // UTF-16
      }
    } catch (error) {
      console.error("Failed to collect storage metrics:", error);
    }
  }

  private calculateAverages(): void {
    // Cache hit rate
    const totalCacheOps =
      this.metrics.cacheMetrics.hits + this.metrics.cacheMetrics.misses;
    if (totalCacheOps > 0) {
      this.metrics.cacheMetrics.hitRate =
        (this.metrics.cacheMetrics.hits / totalCacheOps) * 100;
    }

    // Average cache time
    if (this.cacheTimings.length > 0) {
      this.metrics.cacheMetrics.avgCacheTime =
        this.cacheTimings.reduce((a, b) => a + b, 0) / this.cacheTimings.length;
    }

    // Average sync time
    if (this.syncTimings.length > 0) {
      this.metrics.syncMetrics.avgSyncTime =
        this.syncTimings.reduce((a, b) => a + b, 0) / this.syncTimings.length;
    }

    // Average fetch time
    if (this.fetchTimings.length > 0) {
      this.metrics.serviceWorkerMetrics.avgFetchTime =
        this.fetchTimings.reduce((a, b) => a + b, 0) / this.fetchTimings.length;
    }

    // Trim timing arrays to prevent memory bloat
    if (this.cacheTimings.length > 100)
      this.cacheTimings = this.cacheTimings.slice(-100);
    if (this.syncTimings.length > 100)
      this.syncTimings = this.syncTimings.slice(-100);
    if (this.fetchTimings.length > 100)
      this.fetchTimings = this.fetchTimings.slice(-100);
  }

  private saveMetricsSnapshot(): void {
    const snapshot = {
      ...this.metrics,
      timestamp: Date.now(),
    };

    this.metricsHistory.push(snapshot);

    // Limit history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    // Persist to localStorage for analysis
    try {
      localStorage.setItem("pwa-metrics-latest", JSON.stringify(snapshot));
      localStorage.setItem(
        "pwa-metrics-history",
        JSON.stringify(this.metricsHistory),
      );
    } catch (error) {
      console.warn("Failed to persist metrics:", error);
    }
  }

  // Public methods for tracking metrics
  recordCacheHit(duration: number): void {
    this.metrics.cacheMetrics.hits++;
    this.cacheTimings.push(duration);
  }

  recordCacheMiss(duration: number): void {
    this.metrics.cacheMetrics.misses++;
    this.cacheTimings.push(duration);
  }

  recordCacheWrite(): void {
    this.metrics.cacheMetrics.writes++;
  }

  recordCacheDelete(): void {
    this.metrics.cacheMetrics.deletes++;
  }

  recordCacheEviction(): void {
    this.metrics.cacheMetrics.evictions++;
  }

  recordSyncStart(): void {
    this.metrics.syncMetrics.totalSyncs++;
    perfApi.mark("sync-start");
  }

  recordSyncComplete(success: boolean): void {
    perfApi.mark("sync-end");
    perfApi.measure("sync-duration", "sync-start", "sync-end");

    const measures = perfApi.getEntriesByName("sync-duration");
    if (measures.length > 0) {
      const duration = measures[measures.length - 1].duration || 0;
      this.syncTimings.push(duration);
    }

    if (success) {
      this.metrics.syncMetrics.successfulSyncs++;
    } else {
      this.metrics.syncMetrics.failedSyncs++;
    }

    this.metrics.syncMetrics.lastSyncTime = new Date();
    perfApi.clearMarks("sync-start");
    perfApi.clearMarks("sync-end");
    perfApi.clearMeasures("sync-duration");
  }

  recordSyncRetry(): void {
    this.metrics.syncMetrics.retryCount++;
  }

  updatePendingActions(count: number): void {
    this.metrics.syncMetrics.pendingActions = count;
  }

  recordFetch(duration: number): void {
    this.metrics.serviceWorkerMetrics.fetchCount++;
    this.fetchTimings.push(duration);
  }

  recordServiceWorkerError(): void {
    this.metrics.serviceWorkerMetrics.errorCount++;
  }

  recordServiceWorkerMessage(): void {
    this.metrics.serviceWorkerMetrics.messageCount++;
  }

  recordCacheUpdate(): void {
    this.metrics.serviceWorkerMetrics.cacheUpdateCount++;
  }

  recordNetworkError(): void {
    this.metrics.networkMetrics.failedRequests++;
  }

  setServiceWorkerInstallTime(time: number): void {
    this.metrics.serviceWorkerMetrics.installTime = time;
  }

  setServiceWorkerActivateTime(time: number): void {
    this.metrics.serviceWorkerMetrics.activateTime = time;
  }

  // Get current metrics
  getMetrics(): PWAMetrics {
    return { ...this.metrics };
  }

  // Get metrics history
  getMetricsHistory(): PWAMetrics[] {
    return [...this.metricsHistory];
  }

  // Get performance summary
  getPerformanceSummary(): {
    cacheEfficiency: number;
    syncReliability: number;
    networkAvailability: number;
    storageUtilization: number;
    overallHealth: number;
  } {
    const cacheEfficiency = this.metrics.cacheMetrics.hitRate;

    const totalSyncs = this.metrics.syncMetrics.totalSyncs || 1;
    const syncReliability =
      (this.metrics.syncMetrics.successfulSyncs / totalSyncs) * 100;

    const totalTime =
      this.metrics.networkMetrics.onlineTime +
        this.metrics.networkMetrics.offlineTime || 1;
    const networkAvailability =
      (this.metrics.networkMetrics.onlineTime / totalTime) * 100;

    const storageUtilization = this.metrics.storageMetrics.percentUsed;

    const overallHealth =
      cacheEfficiency * 0.25 +
      syncReliability * 0.25 +
      networkAvailability * 0.25 +
      (100 - Math.min(storageUtilization, 100)) * 0.25;

    return {
      cacheEfficiency,
      syncReliability,
      networkAvailability,
      storageUtilization,
      overallHealth,
    };
  }

  // Export metrics for analysis
  async exportMetrics(): Promise<string> {
    const data = {
      current: this.metrics,
      history: this.metricsHistory,
      summary: this.getPerformanceSummary(),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.metricsHistory = [];
    this.fetchTimings = [];
    this.syncTimings = [];
    this.cacheTimings = [];
  }
}

// Global instance
export const pwaPerformanceMonitor = PWAPerformanceMonitor.getInstance();

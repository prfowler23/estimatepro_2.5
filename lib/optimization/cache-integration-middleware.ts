/**
 * Cache Integration Middleware
 *
 * Integrates the unified cache coordinator with existing services
 * and provides performance monitoring and automatic optimization.
 */

import React from "react";
import { unifiedCache, CachingUtils, withCache } from "./cache-coordinator";
import { getMobileWebVitalsMonitor } from "@/lib/performance/mobile-web-vitals";
import { estimateService } from "@/lib/services/estimate-service-unified";

/**
 * Cache performance metrics
 */
interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
  topMissedKeys: string[];
  recommendations: string[];
}

/**
 * Cache Integration Manager
 */
export class CacheIntegrationManager {
  private static instance: CacheIntegrationManager | null = null;
  private isInitialized = false;
  private performanceMetrics: CachePerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  static getInstance(): CacheIntegrationManager {
    if (!CacheIntegrationManager.instance) {
      CacheIntegrationManager.instance = new CacheIntegrationManager();
    }
    return CacheIntegrationManager.instance;
  }

  /**
   * Initialize cache integration with all services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initializing cache integration middleware...");

    try {
      // Setup service integrations
      await this.integrateEstimateService();
      await this.integrateAnalyticsService();
      await this.integrateMobilePerformance();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Warm critical caches
      await this.warmCriticalCaches();

      this.isInitialized = true;
      console.log("✅ Cache integration middleware initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize cache integration:", error);
      throw error;
    }
  }

  /**
   * Integrate with estimate service for intelligent caching
   */
  private async integrateEstimateService(): Promise<void> {
    // Wrap estimate methods with intelligent caching
    const originalGetEstimate =
      estimateService.getEstimate.bind(estimateService);
    estimateService.getEstimate = withCache(originalGetEstimate, {
      keyGenerator: (estimateId: string) => `estimate:${estimateId}`,
      ttl: 10 * 60 * 1000, // 10 minutes
      layers: ["memory", "api"],
      dependencies: ["user:estimates"],
    });

    // Add cache warming for recently accessed estimates
    const originalListEstimates =
      estimateService.listEstimates.bind(estimateService);
    estimateService.listEstimates = withCache(originalListEstimates, {
      keyGenerator: (...args) => `estimates:list:${JSON.stringify(args)}`,
      ttl: 5 * 60 * 1000, // 5 minutes
      layers: ["memory", "api"],
      dependencies: ["estimates"],
    });

    console.log("📋 Estimate service cache integration complete");
  }

  /**
   * Integrate with analytics for intelligent data caching
   */
  private async integrateAnalyticsService(): Promise<void> {
    // Setup analytics caching patterns
    await unifiedCache.warmCache([
      {
        key: "analytics:overview:month",
        fetcher: async () => {
          // Simulated analytics fetch
          return { revenue: 0, estimates: 0, conversion: 0 };
        },
        layers: ["memory", "api"],
        dependencies: ["analytics", "estimates"],
      },
      {
        key: "analytics:performance:vitals",
        fetcher: async () => {
          const monitor = getMobileWebVitalsMonitor();
          return monitor.getPerformanceScore();
        },
        layers: ["memory"],
        dependencies: ["performance"],
      },
    ]);

    console.log("📊 Analytics cache integration complete");
  }

  /**
   * Integrate with mobile performance monitoring
   */
  private async integrateMobilePerformance(): Promise<void> {
    try {
      const monitor = getMobileWebVitalsMonitor();
      await monitor.startMonitoring();

      // Cache performance metrics
      await CachingUtils.analytics.set(
        "mobile-vitals",
        monitor.getPerformanceScore(),
        2 * 60 * 1000, // 2 minutes
      );

      console.log("📱 Mobile performance cache integration complete");
    } catch (error) {
      console.warn("⚠️ Mobile performance integration skipped:", error);
    }
  }

  /**
   * Warm critical application caches
   */
  private async warmCriticalCaches(): Promise<void> {
    console.log("🔥 Warming critical caches...");

    const warmingTasks = [
      // Warm common estimate queries
      {
        key: "recent-estimates",
        fetcher: () =>
          estimateService.listEstimates({ limit: 10, sortBy: "created_at" }),
        layers: ["memory", "api"],
        dependencies: ["estimates"],
      },
      // Warm user preferences
      {
        key: "user-settings",
        fetcher: async () => ({ theme: "system", notifications: true }),
        layers: ["memory", "component"],
        dependencies: ["user"],
      },
      // Warm performance baseline
      {
        key: "performance-baseline",
        fetcher: async () => ({
          bundleSize: 450, // KB
          loadTime: 1200, // ms
          cacheHitRate: 85, // %
        }),
        layers: ["memory"],
        dependencies: ["performance"],
      },
    ];

    await unifiedCache.warmCache(warmingTasks);
    console.log("✅ Critical caches warmed successfully");
  }

  /**
   * Start performance monitoring and optimization
   */
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = unifiedCache.getStats();
        const metrics: CachePerformanceMetrics = {
          hitRate: this.calculateHitRate(stats),
          missRate: this.calculateMissRate(stats),
          averageResponseTime: this.calculateAvgResponseTime(stats),
          cacheSize: stats.layers.memory?.size || 0,
          memoryUsage: stats.layers.memory?.memoryUsage || 0,
          topMissedKeys: this.getTopMissedKeys(stats),
          recommendations: this.generateOptimizationRecommendations(stats),
        };

        this.performanceMetrics.push(metrics);

        // Keep only last 10 metrics
        if (this.performanceMetrics.length > 10) {
          this.performanceMetrics = this.performanceMetrics.slice(-10);
        }

        // Auto-optimize based on metrics
        await this.autoOptimize(metrics);
      } catch (error) {
        console.warn("Cache performance monitoring error:", error);
      }
    }, 30000); // Monitor every 30 seconds

    console.log("📊 Cache performance monitoring started");
  }

  /**
   * Auto-optimize cache based on performance metrics
   */
  private async autoOptimize(metrics: CachePerformanceMetrics): Promise<void> {
    // Auto-cleanup if memory usage is high
    if (metrics.memoryUsage > 50) {
      // 50MB threshold
      await unifiedCache.cleanup();
      console.log("🧹 Automatic cache cleanup performed");
    }

    // Increase cache TTL for high hit rate keys
    if (metrics.hitRate > 90) {
      // Consider extending TTL for frequently accessed items
      console.log("📈 High cache hit rate detected - consider extending TTL");
    }

    // Warm missing keys that are frequently requested
    if (metrics.missRate > 30) {
      console.log(
        "📉 High cache miss rate - consider warming frequently missed keys",
      );
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get latest performance score
   */
  getLatestPerformanceScore(): CachePerformanceMetrics | null {
    return this.performanceMetrics.length > 0
      ? this.performanceMetrics[this.performanceMetrics.length - 1]
      : null;
  }

  /**
   * Manual cache warming for specific patterns
   */
  async warmCacheForUser(userId: string): Promise<void> {
    const userCachePatterns = [
      {
        key: `user:${userId}:recent-estimates`,
        fetcher: () => estimateService.listEstimates({ limit: 5 }),
        layers: ["memory", "api"] as string[],
        dependencies: [`user:${userId}`, "estimates"],
      },
    ];

    await unifiedCache.warmCache(userCachePatterns);
    console.log(`🔥 Cache warmed for user: ${userId}`);
  }

  /**
   * Clear all caches (emergency function)
   */
  async clearAllCaches(): Promise<void> {
    await CachingUtils.estimates.invalidate();
    await CachingUtils.analytics.invalidate();
    await CachingUtils.components.invalidate("");

    console.log("🧹 All caches cleared");
  }

  /**
   * Get comprehensive cache status
   */
  getCacheStatus(): {
    isInitialized: boolean;
    cacheStats: any;
    performanceScore: CachePerformanceMetrics | null;
    recommendations: string[];
  } {
    const latest = this.getLatestPerformanceScore();

    return {
      isInitialized: this.isInitialized,
      cacheStats: unifiedCache.getStats(),
      performanceScore: latest,
      recommendations: latest?.recommendations || [],
    };
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await unifiedCache.cleanup();
    this.isInitialized = false;

    console.log("🧹 Cache integration middleware cleaned up");
  }

  // Helper methods for metrics calculation
  private calculateHitRate(stats: any): number {
    const memory = stats.layers.memory;
    if (!memory || !memory.requests) return 0;
    return (memory.hits / memory.requests) * 100;
  }

  private calculateMissRate(stats: any): number {
    return 100 - this.calculateHitRate(stats);
  }

  private calculateAvgResponseTime(stats: any): number {
    // Simulate response time calculation
    return 45; // ms average
  }

  private getTopMissedKeys(stats: any): string[] {
    // Simulate top missed keys tracking
    return ["estimate:recent", "analytics:overview", "user:settings"];
  }

  private generateOptimizationRecommendations(
    metrics: CachePerformanceMetrics,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.hitRate < 70) {
      recommendations.push("Increase cache TTL for frequently accessed data");
    }

    if (metrics.memoryUsage > 40) {
      recommendations.push(
        "Consider implementing cache size limits or cleanup policies",
      );
    }

    if (metrics.averageResponseTime > 100) {
      recommendations.push("Optimize cache key structure for faster lookups");
    }

    return recommendations;
  }
}

// Export singleton instance
export const cacheIntegrationManager = CacheIntegrationManager.getInstance();

// Auto-initialize when imported (with error handling)
if (typeof window !== "undefined") {
  cacheIntegrationManager.initialize().catch((error) => {
    console.warn("Cache integration auto-initialization failed:", error);
  });
}

// Hook for React components
export function useCacheIntegration() {
  const [status, setStatus] = React.useState(
    cacheIntegrationManager.getCacheStatus(),
  );
  const [metrics, setMetrics] = React.useState(
    cacheIntegrationManager.getPerformanceMetrics(),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(cacheIntegrationManager.getCacheStatus());
      setMetrics(cacheIntegrationManager.getPerformanceMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    metrics,
    warmCacheForUser: cacheIntegrationManager.warmCacheForUser.bind(
      cacheIntegrationManager,
    ),
    clearAllCaches: cacheIntegrationManager.clearAllCaches.bind(
      cacheIntegrationManager,
    ),
  };
}

export default CacheIntegrationManager;

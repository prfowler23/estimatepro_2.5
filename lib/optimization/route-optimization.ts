/**
 * Route Optimization Utilities
 *
 * Provides utilities for optimizing route loading performance including
 * prefetching, preloading, and intelligent route prediction.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ===========================================
// Route Priority Configuration
// ===========================================

export const ROUTE_PRIORITIES = {
  critical: [
    "/dashboard",
    "/estimates",
    "/calculator",
    "/estimates/new/guided",
  ],
  high: ["/ai-assistant", "/estimates/new", "/settings", "/analytics"],
  medium: [
    "/ai-analytics",
    "/performance",
    "/audit",
    "/estimates/templates",
    "/3d-demo",
  ],
  low: [
    "/drone-demo",
    "/ai-assistant/enhanced",
    "/ai-assistant/tools",
    "/ai-assistant/integrated",
    "/settings/users",
    "/onboarding",
    "/offline",
  ],
} as const;

export type RoutePriority = keyof typeof ROUTE_PRIORITIES;

// ===========================================
// Route Prediction Logic
// ===========================================

interface RouteUsageStats {
  path: string;
  visits: number;
  lastVisit: Date;
  averageStayTime: number;
  commonNextRoutes: string[];
}

class RoutePredictor {
  private usageStats: Map<string, RouteUsageStats> = new Map();
  private currentPath: string | null = null;
  private visitStartTime: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadUsageStats();
    }
  }

  private loadUsageStats(): void {
    try {
      const stored = localStorage.getItem("route-usage-stats");
      if (stored) {
        const data = JSON.parse(stored);
        this.usageStats = new Map(
          Object.entries(data).map(([path, stats]: [string, any]) => [
            path,
            {
              ...stats,
              lastVisit: new Date(stats.lastVisit),
            },
          ]),
        );
      }
    } catch (error) {
      console.warn("Failed to load route usage stats:", error);
    }
  }

  private saveUsageStats(): void {
    try {
      const data = Object.fromEntries(
        Array.from(this.usageStats.entries()).map(([path, stats]) => [
          path,
          {
            ...stats,
            lastVisit: stats.lastVisit.toISOString(),
          },
        ]),
      );
      localStorage.setItem("route-usage-stats", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save route usage stats:", error);
    }
  }

  trackVisit(path: string): void {
    // Record previous visit duration
    if (this.currentPath && this.visitStartTime) {
      const stayTime = Date.now() - this.visitStartTime;
      const currentStats = this.usageStats.get(this.currentPath);

      if (currentStats) {
        // Update average stay time
        const totalTime =
          currentStats.averageStayTime * currentStats.visits + stayTime;
        currentStats.averageStayTime = totalTime / (currentStats.visits + 1);

        // Track common next route
        if (!currentStats.commonNextRoutes.includes(path)) {
          currentStats.commonNextRoutes.push(path);
        }
      }
    }

    // Track new visit
    const stats = this.usageStats.get(path) || {
      path,
      visits: 0,
      lastVisit: new Date(),
      averageStayTime: 0,
      commonNextRoutes: [],
    };

    stats.visits++;
    stats.lastVisit = new Date();
    this.usageStats.set(path, stats);

    this.currentPath = path;
    this.visitStartTime = Date.now();
    this.saveUsageStats();
  }

  getPredictedNextRoutes(currentPath: string, limit: number = 3): string[] {
    const stats = this.usageStats.get(currentPath);
    if (!stats) return [];

    // Sort by frequency and recency
    return stats.commonNextRoutes
      .map((route) => ({
        route,
        score: this.calculateRouteScore(route),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.route);
  }

  private calculateRouteScore(path: string): number {
    const stats = this.usageStats.get(path);
    if (!stats) return 0;

    const recencyWeight = 0.4;
    const frequencyWeight = 0.6;

    // Recency score (higher for recent visits)
    const daysSinceVisit =
      (Date.now() - stats.lastVisit.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceVisit / 30); // Decay over 30 days

    // Frequency score (logarithmic to prevent single high-usage routes from dominating)
    const frequencyScore = Math.log(stats.visits + 1) / Math.log(100); // Normalize to 0-1

    return recencyWeight * recencyScore + frequencyWeight * frequencyScore;
  }

  getTopRoutes(limit: number = 5): string[] {
    return Array.from(this.usageStats.values())
      .sort(
        (a, b) =>
          this.calculateRouteScore(b.path) - this.calculateRouteScore(a.path),
      )
      .slice(0, limit)
      .map((stats) => stats.path);
  }
}

const routePredictor = new RoutePredictor();

// ===========================================
// Route Prefetching Hook
// ===========================================

interface UsePrefetchRoutesOptions {
  enabled?: boolean;
  predictiveEnabled?: boolean;
  maxPrefetch?: number;
}

export function usePrefetchRoutes(options: UsePrefetchRoutesOptions = {}) {
  const { enabled = true, predictiveEnabled = true, maxPrefetch = 5 } = options;

  const router = useRouter();
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<string>>(
    new Set(),
  );

  const prefetchRoute = useCallback(
    (path: string) => {
      if (!enabled || prefetchedRoutes.has(path)) return;

      if (router.prefetch) {
        router.prefetch(path);
        setPrefetchedRoutes((prev) => new Set([...prev, path]));
      }
    },
    [enabled, router, prefetchedRoutes],
  );

  const prefetchCriticalRoutes = useCallback(() => {
    ROUTE_PRIORITIES.critical.forEach((path) => prefetchRoute(path));
  }, [prefetchRoute]);

  const prefetchPredictedRoutes = useCallback(
    (currentPath: string) => {
      if (!predictiveEnabled) return;

      const predicted = routePredictor.getPredictedNextRoutes(
        currentPath,
        maxPrefetch,
      );
      predicted.forEach((path) => prefetchRoute(path));
    },
    [predictiveEnabled, maxPrefetch, prefetchRoute],
  );

  const prefetchHighPriorityRoutes = useCallback(() => {
    ROUTE_PRIORITIES.high.forEach((path) => prefetchRoute(path));
  }, [prefetchRoute]);

  const trackPageVisit = useCallback((path: string) => {
    routePredictor.trackVisit(path);
  }, []);

  return {
    prefetchRoute,
    prefetchCriticalRoutes,
    prefetchPredictedRoutes,
    prefetchHighPriorityRoutes,
    trackPageVisit,
    prefetchedRoutes,
  };
}

// ===========================================
// Route Performance Hook
// ===========================================

interface RoutePerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactiveTime: number;
  cacheHit: boolean;
}

export function useRoutePerformance() {
  const [metrics, setMetrics] = useState<Map<string, RoutePerformanceMetrics>>(
    new Map(),
  );

  const trackRouteLoad = useCallback((path: string, startTime: number) => {
    const loadTime = Date.now() - startTime;

    // Use requestIdleCallback to measure render time
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        const renderTime = Date.now() - startTime - loadTime;

        setMetrics(
          (prev) =>
            new Map(
              prev.set(path, {
                loadTime,
                renderTime,
                interactiveTime: renderTime, // Simplified - could use more sophisticated measurement
                cacheHit: loadTime < 100, // Heuristic for cache hits
              }),
            ),
        );
      });
    }
  }, []);

  const getRouteMetrics = useCallback(
    (path: string): RoutePerformanceMetrics | null => {
      return metrics.get(path) || null;
    },
    [metrics],
  );

  const getAverageLoadTime = useCallback((): number => {
    if (metrics.size === 0) return 0;

    const total = Array.from(metrics.values()).reduce(
      (sum, metric) => sum + metric.loadTime,
      0,
    );

    return total / metrics.size;
  }, [metrics]);

  return {
    trackRouteLoad,
    getRouteMetrics,
    getAverageLoadTime,
    allMetrics: metrics,
  };
}

// ===========================================
// Smart Navigation Hook
// ===========================================

interface UseSmartNavigationOptions {
  enablePrefetch?: boolean;
  enablePrediction?: boolean;
  enableMetrics?: boolean;
  preloadTimeout?: number;
}

export function useSmartNavigation(options: UseSmartNavigationOptions = {}) {
  const {
    enablePrefetch = true,
    enablePrediction = true,
    enableMetrics = true,
    preloadTimeout = 2000,
  } = options;

  const router = useRouter();
  const { prefetchPredictedRoutes, trackPageVisit } = usePrefetchRoutes({
    enabled: enablePrefetch,
    predictiveEnabled: enablePrediction,
  });
  const { trackRouteLoad } = useRoutePerformance();

  const [currentPath, setCurrentPath] = useState<string>("");

  // Track path changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      setCurrentPath(path);
      trackPageVisit(path);

      // Prefetch predicted routes after a delay
      const timeoutId = setTimeout(() => {
        prefetchPredictedRoutes(path);
      }, preloadTimeout);

      return () => clearTimeout(timeoutId);
    }
  }, [trackPageVisit, prefetchPredictedRoutes, preloadTimeout]);

  const navigateWithTracking = useCallback(
    (path: string) => {
      const startTime = Date.now();

      router.push(path);

      if (enableMetrics) {
        // Track the navigation performance
        setTimeout(() => {
          trackRouteLoad(path, startTime);
        }, 100);
      }
    },
    [router, trackRouteLoad, enableMetrics],
  );

  return {
    navigate: navigateWithTracking,
    currentPath,
    router,
  };
}

// ===========================================
// Route Loading State Hook
// ===========================================

export function useRouteLoadingState() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      setIsNavigating(true);
      setLoadingRoute(url);
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
      setLoadingRoute(null);
    };

    const handleRouteChangeError = () => {
      setIsNavigating(false);
      setLoadingRoute(null);
    };

    // Listen for navigation events if available
    if (typeof window !== "undefined") {
      // This is a simplified approach - Next.js App Router doesn't expose these events directly
      // In a real implementation, you might use a different approach or context
      window.addEventListener("beforeunload", handleRouteChangeStart);

      return () => {
        window.removeEventListener("beforeunload", handleRouteChangeStart);
      };
    }
  }, []);

  return {
    isNavigating,
    loadingRoute,
  };
}

// ===========================================
// Export utilities
// ===========================================

export { routePredictor };
export type { RouteUsageStats, RoutePerformanceMetrics };

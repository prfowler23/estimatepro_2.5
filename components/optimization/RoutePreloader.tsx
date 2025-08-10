"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getNetworkConnection,
  isSlowConnection,
  getConnectionQuality,
} from "@/lib/types/network";
import {
  ROUTE_PRELOAD_CONFIG,
  PRELOAD_SETTINGS,
  getRoutesToPreload as getConfiguredRoutesToPreload,
  shouldPreloadRoute,
  type RoutePreloadConfig,
} from "@/lib/config/route-preloader-config";

// Track preloaded routes to avoid duplicates
const preloadedRoutes = new Set<string>();

// Performance metrics tracking
interface PreloadMetrics {
  route: string;
  duration: number;
  success: boolean;
  timestamp: number;
  connectionQuality?: number;
}

/**
 * Preload resources for likely next routes based on current route
 */
export function RoutePreloader() {
  const pathname = usePathname();
  const metricsRef = useRef<PreloadMetrics[]>([]);
  const preloadTimeoutRef = useRef<number>();

  /**
   * Log preload metrics for analytics
   */
  const logMetrics = useCallback((metrics: PreloadMetrics) => {
    metricsRef.current.push(metrics);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[RoutePreloader] ${metrics.success ? "✅" : "❌"} ${metrics.route} - ${metrics.duration}ms`,
      );
    }

    // Send metrics to analytics service if configured
    if (
      PRELOAD_SETTINGS.metrics.enabled &&
      Math.random() <= PRELOAD_SETTINGS.metrics.sampleRate
    ) {
      // Fire and forget analytics call
      fetch(PRELOAD_SETTINGS.metrics.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      }).catch(() => {
        // Silent failure for analytics
      });
    }
  }, []);

  /**
   * Preload a single route with error handling and retry logic
   */
  const preloadRoute = useCallback(
    async (route: string, retryCount = 0): Promise<void> => {
      // Skip if already preloaded
      if (preloadedRoutes.has(route)) {
        return;
      }

      const config = ROUTE_PRELOAD_CONFIG[route];
      if (!config) return;

      const startTime = performance.now();
      const maxRetries =
        config.maxRetries ?? PRELOAD_SETTINGS.retryDelays.length;

      try {
        // Get all imports for this route
        const imports = config.imports();

        // Use Promise.allSettled to handle partial failures
        const results = await Promise.allSettled(imports);

        // Check for failures
        const failures = results.filter((r) => r.status === "rejected");

        if (failures.length > 0 && retryCount < maxRetries) {
          // Retry failed imports after delay
          console.warn(
            `[RoutePreloader] Retrying ${failures.length} failed imports for ${route}`,
          );
          const delay = PRELOAD_SETTINGS.retryDelays[retryCount] ?? 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return preloadRoute(route, retryCount + 1);
        }

        // Mark as preloaded even with partial success
        preloadedRoutes.add(route);

        const duration = performance.now() - startTime;
        logMetrics({
          route,
          duration,
          success: failures.length === 0,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`[RoutePreloader] Failed to preload ${route}:`, error);

        const duration = performance.now() - startTime;
        logMetrics({
          route,
          duration,
          success: false,
          timestamp: Date.now(),
        });

        // Retry if under max retries
        if (retryCount < maxRetries) {
          const delay = PRELOAD_SETTINGS.retryDelays[retryCount] ?? 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return preloadRoute(route, retryCount + 1);
        }
      }
    },
    [logMetrics],
  );

  /**
   * Determine which routes to preload based on current location
   */
  const getRoutesToPreload = useCallback((currentPath: string): string[] => {
    const connectionQuality = getConnectionQuality();

    // Use configuration-based route selection
    const configuredRoutes = getConfiguredRoutesToPreload(
      currentPath,
      connectionQuality,
    );

    if (configuredRoutes.length > 0) {
      return configuredRoutes;
    }

    // Fallback to basic logic if no configured routes
    const routes: string[] = [];

    if (currentPath === "/") {
      routes.push("/dashboard", "/estimates/new/guided");
    } else if (currentPath === "/dashboard") {
      routes.push("/estimates/new/guided", "/calculator");
    } else if (currentPath.startsWith("/estimates")) {
      routes.push("/calculator", "/3d-demo");
    } else if (currentPath === "/calculator") {
      routes.push("/estimates/new/guided", "/dashboard");
    }

    // Filter routes by connection quality
    return routes.filter((route) => {
      const connection = getNetworkConnection();
      return shouldPreloadRoute(
        route,
        connection?.effectiveType,
        connectionQuality,
      );
    });
  }, []);

  /**
   * Execute preloading with parallel loading for better performance
   */
  const executePreloading = useCallback(async () => {
    // Check for slow connection
    if (isSlowConnection()) {
      console.log("[RoutePreloader] Skipping preload on slow connection");
      return;
    }

    const routesToPreload = getRoutesToPreload(pathname);

    if (routesToPreload.length === 0) {
      return;
    }

    // Group routes by priority
    const highPriority = routesToPreload.filter(
      (r) => ROUTE_PRELOAD_CONFIG[r]?.priority === "high",
    );
    const mediumPriority = routesToPreload.filter(
      (r) => ROUTE_PRELOAD_CONFIG[r]?.priority === "medium",
    );
    const lowPriority = routesToPreload.filter(
      (r) => ROUTE_PRELOAD_CONFIG[r]?.priority === "low",
    );

    // Load high priority routes in parallel
    if (highPriority.length > 0) {
      await Promise.allSettled(
        highPriority.map((route) => preloadRoute(route)),
      );
    }

    // Load medium priority routes in parallel
    if (mediumPriority.length > 0) {
      await Promise.allSettled(
        mediumPriority.map((route) => preloadRoute(route)),
      );
    }

    // Load low priority routes in parallel (only if connection is good)
    const connection = getNetworkConnection();
    if (
      lowPriority.length > 0 &&
      connection?.effectiveType === "4g" &&
      !connection.saveData
    ) {
      await Promise.allSettled(lowPriority.map((route) => preloadRoute(route)));
    }
  }, [pathname, getRoutesToPreload, preloadRoute]);

  useEffect(() => {
    // Clear any existing timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Use requestIdleCallback for non-blocking preloading
    if ("requestIdleCallback" in window) {
      const idleCallbackId = requestIdleCallback(
        () => {
          executePreloading();
        },
        { timeout: PRELOAD_SETTINGS.idleTimeout },
      );

      return () => {
        if ("cancelIdleCallback" in window) {
          cancelIdleCallback(idleCallbackId);
        }
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = window.setTimeout(() => {
        executePreloading();
      }, 1000);
      preloadTimeoutRef.current = timeoutId;

      return () => {
        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current);
        }
      };
    }
  }, [pathname, executePreloading]);

  // Listen for connection changes
  useEffect(() => {
    const connection = getNetworkConnection();
    if (!connection) return;

    const handleConnectionChange = () => {
      // Clear preloaded routes if connection degrades
      if (isSlowConnection()) {
        preloadedRoutes.clear();
      }
    };

    connection.addEventListener("change", handleConnectionChange);
    return () => {
      connection.removeEventListener("change", handleConnectionChange);
    };
  }, []);

  return null;
}

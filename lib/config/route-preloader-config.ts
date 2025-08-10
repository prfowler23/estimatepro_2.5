/**
 * Route Preloader Configuration
 * Centralized configuration for route preloading strategies
 */

export interface RoutePreloadConfig {
  /**
   * Dynamic imports to preload for this route
   */
  imports: () => Promise<any>[];

  /**
   * Priority level for preloading
   */
  priority: "high" | "medium" | "low";

  /**
   * Maximum retry attempts for failed imports
   */
  maxRetries?: number;

  /**
   * Dependencies that must be loaded first
   */
  dependencies?: string[];

  /**
   * Only preload on specific connection types
   */
  requiredConnectionType?: "4g" | "3g" | "any";

  /**
   * Description for logging/debugging
   */
  description?: string;
}

export interface NavigationPrediction {
  /**
   * Current route pattern
   */
  from: string | RegExp;

  /**
   * Predicted next routes with probability
   */
  to: Array<{
    route: string;
    probability: number;
  }>;
}

/**
 * Main route preload configuration
 */
export const ROUTE_PRELOAD_CONFIG: Record<string, RoutePreloadConfig> = {
  "/dashboard": {
    priority: "high",
    description: "Dashboard analytics and insights",
    imports: () => [
      import("@/components/analytics/analytics-overview"),
      import("@/components/dashboard/AIBusinessInsights"),
      import("@/lib/analytics/data"),
    ],
  },

  "/calculator": {
    priority: "medium",
    description: "Service calculator forms",
    imports: () => [
      import("@/components/calculator/lazy-forms"),
      import("@/lib/calculations/constants"),
    ],
  },

  "/estimates/new/guided": {
    priority: "high",
    description: "Guided estimation flow",
    imports: () => [
      import("@/components/estimation/EstimateFlowProvider"),
      import("@/components/estimation/guided-flow/steps/InitialContact"),
    ],
  },

  "/3d-demo": {
    priority: "low",
    requiredConnectionType: "4g",
    description: "3D visualization (heavy)",
    imports: () => [
      import("three"),
      import("@react-three/fiber"),
      import("@react-three/drei"),
    ],
  },

  "/drone-demo": {
    priority: "low",
    requiredConnectionType: "4g",
    description: "Drone operations dashboard",
    imports: () => [import("@/components/drone/drone-dashboard")],
  },

  "/ai-assistant": {
    priority: "medium",
    description: "AI Assistant interface",
    imports: () => [
      import("@/components/ai/ai-assistant"),
      import("@/lib/services/ai-service"),
    ],
  },

  "/estimates": {
    priority: "high",
    description: "Estimates list and management",
    imports: () => [
      import("@/components/estimates/estimate-list"),
      import("@/components/estimates/estimate-card"),
    ],
  },

  "/analytics": {
    priority: "low", // Changed to low - load on demand instead of preloading (30KB savings)
    description: "Analytics dashboard - lazy loaded for bundle optimization",
    imports: () => [
      // Removed preloading - components will be lazy loaded on demand
      // This saves 70KB+ from the main bundle
    ],
  },
};

/**
 * Navigation prediction patterns
 */
export const NAVIGATION_PREDICTIONS: NavigationPrediction[] = [
  {
    from: "/",
    to: [
      { route: "/dashboard", probability: 0.6 },
      { route: "/estimates/new/guided", probability: 0.3 },
      { route: "/calculator", probability: 0.1 },
    ],
  },
  {
    from: "/dashboard",
    to: [
      { route: "/estimates/new/guided", probability: 0.5 },
      { route: "/calculator", probability: 0.2 },
      { route: "/estimates", probability: 0.2 },
      { route: "/analytics", probability: 0.1 },
    ],
  },
  {
    from: /^\/estimates(?!\/new)/,
    to: [
      { route: "/calculator", probability: 0.4 },
      { route: "/estimates/new/guided", probability: 0.3 },
      { route: "/3d-demo", probability: 0.2 },
      { route: "/dashboard", probability: 0.1 },
    ],
  },
  {
    from: "/calculator",
    to: [
      { route: "/estimates/new/guided", probability: 0.5 },
      { route: "/dashboard", probability: 0.3 },
      { route: "/estimates", probability: 0.2 },
    ],
  },
  {
    from: "/analytics",
    to: [
      { route: "/dashboard", probability: 0.5 },
      { route: "/estimates", probability: 0.3 },
      { route: "/ai-assistant", probability: 0.2 },
    ],
  },
];

/**
 * Preload thresholds and limits
 */
export const PRELOAD_SETTINGS = {
  /**
   * Minimum probability to preload a route
   */
  minProbability: 0.1,

  /**
   * Maximum concurrent preloads
   */
  maxConcurrent: 3,

  /**
   * Idle callback timeout (ms)
   */
  idleTimeout: 2000,

  /**
   * Retry delays (ms) for failed imports
   */
  retryDelays: [1000, 2000, 4000],

  /**
   * Connection quality thresholds
   */
  connectionQuality: {
    minForLowPriority: 75, // Minimum quality score for low priority routes
    minForMediumPriority: 50, // Minimum quality score for medium priority
    minForHighPriority: 25, // Minimum quality score for high priority
  },

  /**
   * Cache settings
   */
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50, // Maximum cached routes
  },

  /**
   * Metrics settings
   */
  metrics: {
    enabled: true,
    sampleRate: 1.0, // Sample 100% of preloads
    endpoint: "/api/analytics/preload-metrics",
  },
};

/**
 * Get routes to preload based on current path
 */
export function getRoutesToPreload(
  currentPath: string,
  connectionQuality: number = 50,
): string[] {
  const predictions = NAVIGATION_PREDICTIONS.find((pred) => {
    if (typeof pred.from === "string") {
      return pred.from === currentPath;
    }
    return pred.from.test(currentPath);
  });

  if (!predictions) {
    return [];
  }

  // Filter by probability and connection quality
  const routes = predictions.to
    .filter((route) => route.probability >= PRELOAD_SETTINGS.minProbability)
    .filter((route) => {
      const config = ROUTE_PRELOAD_CONFIG[route.route];
      if (!config) return false;

      // Check connection quality requirements
      const minQuality =
        config.priority === "high"
          ? PRELOAD_SETTINGS.connectionQuality.minForHighPriority
          : config.priority === "medium"
            ? PRELOAD_SETTINGS.connectionQuality.minForMediumPriority
            : PRELOAD_SETTINGS.connectionQuality.minForLowPriority;

      return connectionQuality >= minQuality;
    })
    .sort((a, b) => b.probability - a.probability)
    .map((route) => route.route);

  return routes.slice(0, PRELOAD_SETTINGS.maxConcurrent);
}

/**
 * Check if a route should be preloaded based on config
 */
export function shouldPreloadRoute(
  route: string,
  connectionType?: string,
  connectionQuality?: number,
): boolean {
  const config = ROUTE_PRELOAD_CONFIG[route];
  if (!config) return false;

  // Check connection type requirement
  if (
    config.requiredConnectionType &&
    config.requiredConnectionType !== "any"
  ) {
    if (connectionType !== config.requiredConnectionType) {
      return false;
    }
  }

  // Check connection quality
  if (connectionQuality !== undefined) {
    const minQuality =
      config.priority === "high"
        ? PRELOAD_SETTINGS.connectionQuality.minForHighPriority
        : config.priority === "medium"
          ? PRELOAD_SETTINGS.connectionQuality.minForMediumPriority
          : PRELOAD_SETTINGS.connectionQuality.minForLowPriority;

    if (connectionQuality < minQuality) {
      return false;
    }
  }

  return true;
}

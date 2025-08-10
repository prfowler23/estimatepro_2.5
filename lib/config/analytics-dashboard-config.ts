/**
 * Analytics Dashboard Configuration
 * Defines different modes and features for the unified analytics dashboard
 */

export type DashboardMode = "basic" | "enhanced" | "consolidated";

export interface DashboardFeatures {
  // Core features
  standardAnalytics: boolean;
  charts: boolean;
  filters: boolean;
  export: boolean;
  autoRefresh: boolean;

  // Enhanced features
  aiPredictions: boolean;
  insights: boolean;
  recommendations: boolean;
  performanceScores: boolean;
  dataQuality: boolean;
  financialAnalysis: boolean;
  trends: boolean;

  // Consolidated features
  realTimeMetrics: boolean;
  webSocketConnection: boolean;
  anomalyDetection: boolean;
  userStats: boolean;
  benchmarking: boolean;
}

export interface DashboardConfig {
  mode: DashboardMode;
  name: string;
  description: string;
  features: DashboardFeatures;
  refreshInterval: number;
  maxDataPoints: number;
  cacheTimeout: number;
}

// Configuration presets for different dashboard modes
const dashboardConfigs: Record<DashboardMode, DashboardConfig> = {
  basic: {
    mode: "basic",
    name: "Analytics Dashboard",
    description: "Standard analytics and performance metrics",
    features: {
      // Core features
      standardAnalytics: true,
      charts: true,
      filters: true,
      export: true,
      autoRefresh: false,

      // Enhanced features (disabled)
      aiPredictions: false,
      insights: false,
      recommendations: false,
      performanceScores: false,
      dataQuality: false,
      financialAnalysis: false,
      trends: false,

      // Consolidated features (disabled)
      realTimeMetrics: false,
      webSocketConnection: false,
      anomalyDetection: false,
      userStats: true,
      benchmarking: true,
    },
    refreshInterval: 300000, // 5 minutes
    maxDataPoints: 100,
    cacheTimeout: 60000, // 1 minute
  },

  enhanced: {
    mode: "enhanced",
    name: "Enhanced Analytics Dashboard",
    description: "AI-powered business intelligence and performance insights",
    features: {
      // Core features
      standardAnalytics: true,
      charts: true,
      filters: true,
      export: true,
      autoRefresh: true,

      // Enhanced features (enabled)
      aiPredictions: true,
      insights: true,
      recommendations: true,
      performanceScores: true,
      dataQuality: true,
      financialAnalysis: true,
      trends: true,

      // Consolidated features (disabled)
      realTimeMetrics: false,
      webSocketConnection: false,
      anomalyDetection: false,
      userStats: true,
      benchmarking: true,
    },
    refreshInterval: 300000, // 5 minutes
    maxDataPoints: 200,
    cacheTimeout: 120000, // 2 minutes
  },

  consolidated: {
    mode: "consolidated",
    name: "Real-Time Analytics Dashboard",
    description:
      "Live metrics with WebSocket connections and anomaly detection",
    features: {
      // Core features
      standardAnalytics: true,
      charts: true,
      filters: true,
      export: true,
      autoRefresh: true,

      // Enhanced features (enabled)
      aiPredictions: true,
      insights: true,
      recommendations: true,
      performanceScores: true,
      dataQuality: true,
      financialAnalysis: true,
      trends: true,

      // Consolidated features (enabled)
      realTimeMetrics: true,
      webSocketConnection: true,
      anomalyDetection: true,
      userStats: true,
      benchmarking: true,
    },
    refreshInterval: 60000, // 1 minute (more frequent for real-time)
    maxDataPoints: 500,
    cacheTimeout: 30000, // 30 seconds (shorter for real-time)
  },
};

/**
 * Get dashboard configuration for a specific mode
 */
export function getDashboardConfig(mode: DashboardMode): DashboardConfig {
  return dashboardConfigs[mode];
}

/**
 * Check if a feature is enabled for a given mode
 */
export function isFeatureEnabled(
  mode: DashboardMode,
  feature: keyof DashboardFeatures,
): boolean {
  return dashboardConfigs[mode].features[feature];
}

/**
 * Get all available dashboard modes
 */
export function getAvailableModes(): DashboardMode[] {
  return Object.keys(dashboardConfigs) as DashboardMode[];
}

/**
 * Create a custom dashboard configuration
 */
export function createCustomConfig(
  baseMode: DashboardMode,
  overrides: Partial<DashboardConfig>,
): DashboardConfig {
  const baseConfig = getDashboardConfig(baseMode);

  return {
    ...baseConfig,
    ...overrides,
    features: {
      ...baseConfig.features,
      ...(overrides.features || {}),
    },
  };
}

/**
 * Validate dashboard configuration
 */
export function validateConfig(config: DashboardConfig): boolean {
  // Check for conflicting features
  if (config.features.webSocketConnection && !config.features.realTimeMetrics) {
    console.warn("WebSocket connection enabled without real-time metrics");
    return false;
  }

  if (
    config.features.anomalyDetection &&
    !config.features.webSocketConnection
  ) {
    console.warn("Anomaly detection requires WebSocket connection");
    return false;
  }

  if (config.features.aiPredictions && !config.features.insights) {
    console.warn("AI predictions should be paired with insights");
  }

  // Validate refresh interval
  if (config.refreshInterval < 10000) {
    console.warn("Refresh interval too short, may impact performance");
    return false;
  }

  // Validate cache timeout
  if (config.cacheTimeout > config.refreshInterval) {
    console.warn("Cache timeout should not exceed refresh interval");
    return false;
  }

  return true;
}

/**
 * Get recommended configuration based on user requirements
 */
export function getRecommendedConfig(requirements: {
  needsRealTime?: boolean;
  needsAI?: boolean;
  teamSize?: number;
  dataVolume?: "low" | "medium" | "high";
}): DashboardMode {
  const {
    needsRealTime,
    needsAI,
    teamSize = 1,
    dataVolume = "medium",
  } = requirements;

  // If real-time is needed, use consolidated
  if (needsRealTime) {
    return "consolidated";
  }

  // If AI is needed or team is large, use enhanced
  if (needsAI || teamSize > 10) {
    return "enhanced";
  }

  // For high data volume without specific needs, use enhanced for better caching
  if (dataVolume === "high") {
    return "enhanced";
  }

  // Default to basic for simple needs
  return "basic";
}

/**
 * Export feature flags for conditional rendering
 */
export const FEATURE_FLAGS = {
  ENABLE_AI: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
  ENABLE_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true",
  ENABLE_EXPORT: process.env.NEXT_PUBLIC_ENABLE_EXPORT !== "false",
  ENABLE_FILTERS: process.env.NEXT_PUBLIC_ENABLE_FILTERS !== "false",
} as const;

/**
 * Default export for easy importing
 */
const AnalyticsDashboardConfig = {
  getDashboardConfig,
  isFeatureEnabled,
  getAvailableModes,
  createCustomConfig,
  validateConfig,
  getRecommendedConfig,
  FEATURE_FLAGS,
};

export default AnalyticsDashboardConfig;

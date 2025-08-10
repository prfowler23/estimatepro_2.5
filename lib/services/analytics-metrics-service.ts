// MIGRATED: Analytics Metrics Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All metrics functionality has been moved to analytics-service-unified.ts

export {
  AnalyticsMetricsService,
  type AIMetrics,
  calculateAIMetrics,
  calculateTimeRangeMetrics,
  calculateTrends,
} from "./analytics-service-backup";

// Legacy default export for compatibility
export {
  UnifiedAnalyticsService,
  UnifiedAnalyticsService as default,
} from "./analytics-service-unified";

// Legacy default metrics for backward compatibility
export const defaultMetrics = {
  aiSavedHours: 0,
  photoAccuracy: 0,
  avgEstimateTime: 0,
  automationRate: 0,
};

// MIGRATED: Analytics API Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All API functionality has been moved to analytics-service-unified.ts

export {
  unifiedAnalyticsService as AnalyticsAPIService,
  UnifiedAnalyticsService,
  type APIResponse,
  type APIError,
  type RequestConfig,
  getEnhancedAnalytics,
  getRealTimeMetrics,
  exportAnalytics,
  cancelAllRequests,
  clearAPICache,
  getAnalyticsAPIService,
} from "./analytics-service-backup";

// Legacy default export for compatibility
export { UnifiedAnalyticsService as default } from "./analytics-service-unified";

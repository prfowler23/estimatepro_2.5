// MIGRATED: Analytics Personalization Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All personalization functionality has been moved to analytics-service-unified.ts

export {
  unifiedAnalyticsService as AnalyticsPersonalizationService,
  UnifiedAnalyticsService,
  getUserPreferences,
  updateUserPreferences,
} from "./analytics-service-backup";

// Legacy default export for compatibility
export { UnifiedAnalyticsService as default } from "./analytics-service-unified";

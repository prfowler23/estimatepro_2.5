// MIGRATED: Analytics WebSocket Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All WebSocket functionality has been moved to analytics-service-unified.ts

export {
  unifiedAnalyticsService as AnalyticsWebSocketService,
  UnifiedAnalyticsService,
  subscribe,
  unsubscribe,
} from "./analytics-service-backup";

// Legacy default export for compatibility
export { UnifiedAnalyticsService as default } from "./analytics-service-unified";

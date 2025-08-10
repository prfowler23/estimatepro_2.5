// MIGRATED: Analytics Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All analytics functionality has been moved to analytics-service-unified.ts

export {
  AnalyticsService,
  getUnifiedAnalyticsService,
  startWorkflowTracking,
  updateWorkflowStep,
  recordAIInteraction,
  completeWorkflow,
  getWorkflowAnalytics,
  getUserWorkflowStats,
} from "./analytics-service-backup";

// Legacy default export for compatibility
export {
  UnifiedAnalyticsService,
  UnifiedAnalyticsService as default,
} from "./analytics-service-unified";

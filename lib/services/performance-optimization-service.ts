// MIGRATED: Performance Optimization Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All performance optimization functionality has been moved to monitoring-service-unified.ts

export {
  unifiedMonitoringService as PerformanceOptimizationService,
  UnifiedMonitoringService,
  type OptimizationMetric,
  recordMetric,
  setBaseline,
  compareToBaseline,
  getOptimizationMetrics,
  clearMetrics,
  generateReport,
  measureTime,
  startAggregation,
  stopAggregation,
  getSessionMetrics,
  getUserMetrics,
  clearSessionMetrics,
  clearUserMetrics,
  getUnifiedReport,
  performanceOptimizationService,
  getPerformanceOptimizationService,
} from "./monitoring-service-backup";

// Legacy default export for compatibility
export { UnifiedMonitoringService as default } from "./monitoring-service-unified";

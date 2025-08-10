// MIGRATED: Enhanced Performance Monitoring Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All performance monitoring functionality has been moved to monitoring-service-unified.ts

export {
  unifiedMonitoringService as EnhancedPerformanceMonitoringService,
  UnifiedMonitoringService,
  type PerformanceMetric,
  type QueryPerformance,
  type CacheStats,
  type PerformanceAlert,
  type DashboardStats,
  type ConnectionStats,
  logPerformanceMetric,
  getPerformanceStats,
  getSlowQueries,
  getCacheStats,
  getConnectionStats,
  getUserStatisticsFast,
  getUserEstimatesOptimized,
  detectPerformanceAnomalies,
  getPerformanceAlerts,
  createPerformanceAlert,
  resolvePerformanceAlert,
  refreshDashboardStats,
  cleanupPerformanceData,
  analyzeTableBloat,
  monitorOperation,
  getPerformanceInsights,
  performanceMonitoringService,
  getPerformanceMonitoringService,
  MonitorPerformance,
} from "./monitoring-service-backup";

// Legacy default export for compatibility
export { UnifiedMonitoringService as default } from "./monitoring-service-unified";

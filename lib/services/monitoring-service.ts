// MIGRATED: Monitoring Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All monitoring functionality has been moved to monitoring-service-unified.ts

export {
  unifiedMonitoringService as MonitoringService,
  UnifiedMonitoringService,
  type SystemMetrics,
  type HealthCheck,
  type MonitoringMetricsResponse,
  type Alert,
  type MonitoringConfig,
  getMetrics,
  submitMetric,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getConfig,
  updateConfig,
  exportMetrics,
  cancelRequests,
  monitoringService,
  getMonitoringService,
} from "./monitoring-service-backup";

// Legacy default export for compatibility
export { UnifiedMonitoringService as default } from "./monitoring-service-unified";

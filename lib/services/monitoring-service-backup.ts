// BACKUP - Legacy monitoring service exports for migration
// This file provides backward compatibility during the consolidation phase
// Once all imports are updated, this file can be removed

export {
  unifiedMonitoringService as MonitoringService,
  unifiedMonitoringService as EnhancedPerformanceMonitoringService,
  unifiedMonitoringService as PerformanceOptimizationService,
  UnifiedMonitoringService,
  getUnifiedMonitoringService,
  type SystemMetrics,
  type HealthCheck,
  type MonitoringMetricsResponse,
  type Alert,
  type MonitoringConfig,
  type PerformanceMetric,
  type QueryPerformance,
  type CacheStats,
  type PerformanceAlert,
  type DashboardStats,
  type ConnectionStats,
  type OptimizationMetric,
  MonitorPerformance,
} from "./monitoring-service-unified";

// Legacy method exports for compatibility
import {
  unifiedMonitoringService,
  UnifiedMonitoringService,
} from "./monitoring-service-unified";

// ==============================================================================
// MONITORING SERVICE LEGACY METHODS
// ==============================================================================

// System monitoring methods
export const getMetrics = (options?: { hours?: number; include?: string[] }) =>
  unifiedMonitoringService.getMetrics(options);

export const submitMetric = (type: string, data: any) =>
  unifiedMonitoringService.submitMetric(type, data);

export const getAlerts = (options?: {
  severity?: "all" | "critical" | "warning" | "info";
  resolved?: boolean;
  limit?: number;
}) => unifiedMonitoringService.getAlerts(options);

export const acknowledgeAlert = (alertId: string, userId?: string) =>
  unifiedMonitoringService.acknowledgeAlert(alertId, userId);

export const resolveAlert = (alertId: string, resolution?: string) =>
  unifiedMonitoringService.resolveAlert(alertId, resolution);

export const getConfig = () => unifiedMonitoringService.getConfig();

export const updateConfig = (config: any) =>
  unifiedMonitoringService.updateConfig(config);

export const exportMetrics = (format: "json" | "csv", options?: any) =>
  unifiedMonitoringService.exportMetrics(format, options);

export const cancelRequests = () => unifiedMonitoringService.cancelRequests();

// ==============================================================================
// ENHANCED PERFORMANCE MONITORING SERVICE LEGACY METHODS
// ==============================================================================

// Performance monitoring methods
export const logPerformanceMetric = (
  operationName: string,
  operationType: any,
  durationMs: number,
  success?: boolean,
  errorMessage?: string,
  metadata?: Record<string, any>,
) =>
  unifiedMonitoringService.logPerformanceMetric(
    operationName,
    operationType,
    durationMs,
    success,
    errorMessage,
    metadata,
  );

export const getPerformanceStats = (startTime?: string, endTime?: string) =>
  unifiedMonitoringService.getPerformanceStats(startTime, endTime);

export const getSlowQueries = (thresholdMs?: number, limit?: number) =>
  unifiedMonitoringService.getSlowQueries(thresholdMs, limit);

export const getCacheStats = () => unifiedMonitoringService.getCacheStats();

export const getConnectionStats = () =>
  unifiedMonitoringService.getConnectionStats();

export const getUserStatisticsFast = (userId: string) =>
  unifiedMonitoringService.getUserStatisticsFast(userId);

export const getUserEstimatesOptimized = (
  userId: string,
  status?: string,
  limit?: number,
  offset?: number,
) =>
  unifiedMonitoringService.getUserEstimatesOptimized(
    userId,
    status,
    limit,
    offset,
  );

export const detectPerformanceAnomalies = (
  checkPeriodMinutes?: number,
  thresholdMultiplier?: number,
) =>
  unifiedMonitoringService.detectPerformanceAnomalies(
    checkPeriodMinutes,
    thresholdMultiplier,
  );

export const getPerformanceAlerts = (resolved?: boolean, limit?: number) =>
  unifiedMonitoringService.getPerformanceAlerts(resolved, limit);

export const createPerformanceAlert = (
  alertType: "warning" | "critical",
  metricName: string,
  thresholdValue: number,
  actualValue: number,
  message: string,
) =>
  unifiedMonitoringService.createPerformanceAlert(
    alertType,
    metricName,
    thresholdValue,
    actualValue,
    message,
  );

export const resolvePerformanceAlert = (alertId: string) =>
  unifiedMonitoringService.resolvePerformanceAlert(alertId);

export const refreshDashboardStats = () =>
  unifiedMonitoringService.refreshDashboardStats();

export const cleanupPerformanceData = (retentionDays?: number) =>
  unifiedMonitoringService.cleanupPerformanceData(retentionDays);

export const analyzeTableBloat = () =>
  unifiedMonitoringService.analyzeTableBloat();

export const monitorOperation = <T>(
  operationName: string,
  operationType: any,
  operation: () => Promise<T>,
  metadata?: Record<string, any>,
) =>
  unifiedMonitoringService.monitorOperation(
    operationName,
    operationType,
    operation,
    metadata,
  );

export const getPerformanceInsights = () =>
  unifiedMonitoringService.getPerformanceInsights();

// ==============================================================================
// PERFORMANCE OPTIMIZATION SERVICE LEGACY METHODS
// ==============================================================================

// Static method exports
export const recordMetric = (
  name: string,
  value: number,
  context?: Record<string, any>,
  userId?: string,
  sessionId?: string,
) =>
  unifiedMonitoringService.recordOptimizationMetric(
    name,
    value,
    context,
    userId,
    sessionId,
  );

export const setBaseline = (metrics: Record<string, number>) =>
  unifiedMonitoringService.setBaseline(metrics);

export const compareToBaseline = (metricName: string, currentValue: number) =>
  unifiedMonitoringService.compareToBaseline(metricName, currentValue);

export const getOptimizationMetrics = () =>
  unifiedMonitoringService.getOptimizationMetrics();

export const clearMetrics = () =>
  unifiedMonitoringService.clearOptimizationMetrics();

export const generateReport = () =>
  unifiedMonitoringService.generateOptimizationReport();

export const measureTime = <T>(
  fn: () => T | Promise<T>,
  metricName: string,
  userId?: string,
  sessionId?: string,
) => unifiedMonitoringService.measureTime(fn, metricName, userId, sessionId);

export const startAggregation = (period?: number) =>
  unifiedMonitoringService.startOptimizationAggregation(period);

export const stopAggregation = () =>
  unifiedMonitoringService.stopOptimizationAggregation();

export const getSessionMetrics = (sessionId: string) =>
  unifiedMonitoringService.getSessionOptimizationMetrics(sessionId);

export const getUserMetrics = (userId: string) =>
  unifiedMonitoringService.getUserOptimizationMetrics(userId);

export const clearSessionMetrics = (sessionId?: string) =>
  unifiedMonitoringService.clearSessionOptimizationMetrics(sessionId);

export const clearUserMetrics = (userId?: string) =>
  unifiedMonitoringService.clearUserOptimizationMetrics(userId);

export const getUnifiedReport = () =>
  unifiedMonitoringService.getUnifiedReport();

// ==============================================================================
// LEGACY CLASS ALIASES AND INSTANCES
// ==============================================================================

// Legacy class instances for compatibility
export class MonitoringService {
  static getInstance() {
    return unifiedMonitoringService;
  }

  // Instance methods that delegate to unified service
  getMetrics = getMetrics;
  submitMetric = submitMetric;
  getAlerts = getAlerts;
  acknowledgeAlert = acknowledgeAlert;
  resolveAlert = resolveAlert;
  getConfig = getConfig;
  updateConfig = updateConfig;
  exportMetrics = exportMetrics;
  cancelRequests = cancelRequests;
}

export class EnhancedPerformanceMonitoringService {
  constructor() {
    return unifiedMonitoringService as any;
  }
}

export class PerformanceOptimizationService {
  // Static methods
  static recordMetric = recordMetric;
  static setBaseline = setBaseline;
  static compareToBaseline = compareToBaseline;
  static getMetrics = getOptimizationMetrics;
  static clearMetrics = clearMetrics;
  static generateReport = generateReport;
  static measureTime = measureTime;
  static startAggregation = startAggregation;
  static stopAggregation = stopAggregation;
  static getSessionMetrics = getSessionMetrics;
  static getUserMetrics = getUserMetrics;
  static clearSessionMetrics = clearSessionMetrics;
  static clearUserMetrics = clearUserMetrics;
  static getUnifiedReport = getUnifiedReport;
}

// ==============================================================================
// DEFAULT EXPORTS FOR COMPATIBILITY
// ==============================================================================

// Default export that matches original service patterns
export default unifiedMonitoringService;

// Legacy singleton pattern exports
export const monitoringService = unifiedMonitoringService;
export const performanceMonitoringService = unifiedMonitoringService;
export const performanceOptimizationService = unifiedMonitoringService;

// Factory functions for creating instances (legacy compatibility)
export function getMonitoringService() {
  return unifiedMonitoringService;
}

export function getPerformanceMonitoringService() {
  return unifiedMonitoringService;
}

export function getPerformanceOptimizationService() {
  return unifiedMonitoringService;
}

export function createMonitoringService(config?: any) {
  return unifiedMonitoringService;
}

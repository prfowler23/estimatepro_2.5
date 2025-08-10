// BACKUP - Legacy analytics service exports for migration
// This file provides backward compatibility during the consolidation phase
// Once all imports are updated, this file can be removed

export {
  unifiedAnalyticsService as AnalyticsService,
  unifiedAnalyticsService as AnalyticsMetricsService,
  unifiedAnalyticsService as AnalyticsAPIService,
  unifiedAnalyticsService as AnalyticsWebSocketService,
  unifiedAnalyticsService as AnalyticsPersonalizationService,
  UnifiedAnalyticsService,
  getUnifiedAnalyticsService,
  type AIMetrics,
  type APIResponse,
  type APIError,
  type RequestConfig,
} from "./analytics-service-unified";

// Legacy method exports for compatibility
import { unifiedAnalyticsService } from "./analytics-service-unified";

// ==============================================================================
// ANALYTICS SERVICE LEGACY METHODS
// ==============================================================================

// Workflow Analytics Methods
export const startWorkflowTracking = (
  estimateId: string,
  userId: string,
  userName: string,
  userRole: string,
  templateUsed?: string,
) =>
  unifiedAnalyticsService.startWorkflowTracking(
    estimateId,
    userId,
    userName,
    userRole,
    templateUsed,
  );

export const updateWorkflowStep = (
  workflowId: string,
  stepId: string,
  stepName: string,
  stepData: any,
) =>
  unifiedAnalyticsService.updateWorkflowStep(
    workflowId,
    stepId,
    stepName,
    stepData,
  );

export const recordAIInteraction = (workflowId: string, interaction: any) =>
  unifiedAnalyticsService.recordAIInteraction(workflowId, interaction);

export const completeWorkflow = (workflowId: string, completionData: any) =>
  unifiedAnalyticsService.completeWorkflow(workflowId, completionData);

export const getWorkflowAnalytics = (filters: any = {}) =>
  unifiedAnalyticsService.getWorkflowAnalytics(filters);

export const getUserWorkflowStats = (userId: string) =>
  unifiedAnalyticsService.getUserWorkflowStats(userId);

// ==============================================================================
// ANALYTICS METRICS SERVICE LEGACY METHODS
// ==============================================================================

// Static method exports
import { UnifiedAnalyticsService } from "./analytics-service-unified";

export const calculateAIMetrics = (data: any) =>
  UnifiedAnalyticsService.calculateAIMetrics(data);

export const calculateTimeRangeMetrics = (data: any, timeRange: any) =>
  UnifiedAnalyticsService.calculateTimeRangeMetrics(data, timeRange);

export const calculateTrends = (currentData: any, previousData: any) =>
  UnifiedAnalyticsService.calculateTrends(currentData, previousData);

// ==============================================================================
// ANALYTICS API SERVICE LEGACY METHODS
// ==============================================================================

// API client methods
export const getEnhancedAnalytics = (config?: any) =>
  unifiedAnalyticsService.getEnhancedAnalytics(config);

export const getRealTimeMetrics = (metrics: string[], config?: any) =>
  unifiedAnalyticsService.getRealTimeMetrics(metrics, config);

export const exportAnalytics = (format: any, data: any, config?: any) =>
  unifiedAnalyticsService.exportAnalytics(format, data, config);

export const cancelAllRequests = () =>
  unifiedAnalyticsService.cancelAllRequests();

export const clearAPICache = () => unifiedAnalyticsService.clearAPICache();

// ==============================================================================
// ANALYTICS WEBSOCKET SERVICE LEGACY METHODS
// ==============================================================================

// WebSocket methods
export const subscribe = (
  metrics: string[],
  callback: (data: any) => void,
  filters?: Record<string, any>,
) => unifiedAnalyticsService.subscribe(metrics, callback, filters);

export const unsubscribe = (subscriptionId: string) =>
  unifiedAnalyticsService.unsubscribe(subscriptionId);

// ==============================================================================
// ANALYTICS PERSONALIZATION SERVICE LEGACY METHODS
// ==============================================================================

// Personalization methods
export const getUserPreferences = (userId: string) =>
  unifiedAnalyticsService.getUserPreferences(userId);

export const updateUserPreferences = (userId: string, preferences: any) =>
  unifiedAnalyticsService.updateUserPreferences(userId, preferences);

// ==============================================================================
// LEGACY CLASS ALIASES AND INSTANCES
// ==============================================================================

// Legacy class instances for compatibility
export class LegacyAnalyticsService {
  static getInstance() {
    return unifiedAnalyticsService;
  }
}

export class LegacyAnalyticsMetricsService {
  static calculateAIMetrics = calculateAIMetrics;
  static calculateTimeRangeMetrics = calculateTimeRangeMetrics;
  static calculateTrends = calculateTrends;
}

export class LegacyAnalyticsAPIService {
  constructor() {
    return unifiedAnalyticsService as any;
  }
}

export class LegacyAnalyticsWebSocketService {
  constructor() {
    return unifiedAnalyticsService as any;
  }
}

export class LegacyAnalyticsPersonalizationService {
  constructor() {
    return unifiedAnalyticsService as any;
  }
}

// ==============================================================================
// DEFAULT EXPORTS FOR COMPATIBILITY
// ==============================================================================

// Default export that matches original service patterns
export default unifiedAnalyticsService;

// Legacy singleton pattern exports
export const analyticsService = unifiedAnalyticsService;
export const analyticsMetricsService = unifiedAnalyticsService;
export const analyticsAPIService = unifiedAnalyticsService;
export const analyticsWebSocketService = unifiedAnalyticsService;
export const analyticsPersonalizationService = unifiedAnalyticsService;

// Factory function for creating instances (legacy compatibility)
export function getAnalyticsAPIService() {
  return unifiedAnalyticsService;
}

export function createAnalyticsService(config?: any) {
  return unifiedAnalyticsService;
}

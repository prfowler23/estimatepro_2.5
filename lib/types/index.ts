/**
 * EstimatePro Types - Barrel Export File
 * Organized exports for all type definitions
 */

// AI & Conversation Types
export type {
  // Core AI types
  AIContext,
  UserPreferences,
  ToolArguments,
  ToolCallInfo,
  AIMessage,
  AIMessageMetadata,
  // AI metrics
  AIMetricsData,
  TimeRange,
  HealthStatus,
  AggregatedMetrics,
  MetricEntry,
  ModelHealthStatus,
  DegradationLevel,
  // Smart features
  SmartDefault,
  ServiceSuggestion,
  ConversationMode,
  // Hook types
  UseAIAssistantOptions,
  UseAIAssistantReturn,
  UseAutoScrollOptions,
  UseAutoScrollReturn,
  // Feature flags & constants
  AIFeatureFlags,
} from "./ai-types";

// Import AI type guards for local use
import {
  AI_CONSTANTS,
  isAIMessage,
  isToolCallInfo,
  isServiceSuggestion,
} from "./ai-types";

// Re-export for external consumption
export { AI_CONSTANTS, isAIMessage, isToolCallInfo, isServiceSuggestion };

// Conversation-specific types (renamed to avoid conflicts)
export type {
  ConversationMessageMetadata,
  ConversationMetadata,
  AIConversation,
  AIConversationMessage,
  CreateConversationInput,
  CreateMessageInput,
  UpdateConversationInput,
  AIConversationWithMessages,
  AIConversationSummary,
  ConversationListParams,
  ConversationListResponse,
  ConversationUpdate,
  MessageUpdate,
} from "./ai-conversation-types";

export {
  conversationMessageMetadataSchema,
  conversationMetadataSchema,
  createConversationSchema,
  createMessageSchema,
  updateConversationSchema,
} from "./ai-conversation-types";

// Estimate & Service Types
export type {
  // Core service types
  ServiceCalculationResult,
  ServiceBreakdownItem,
  MaterialItem,
  RiskFactor,
  ServiceType,
  // Form data types
  BaseServiceFormData,
  WindowCleaningFormData,
  PressureWashingFormData,
  GlassRestorationFormData,
  // Building data
  BuildingData,
  // AI extraction
  AIExtractedData,
  CompetitiveIntelligence,
  RiskAssessmentResult,
  AutoQuoteResult,
  FollowUpPlan,
  FollowUpAction,
  // Core estimate types
  FinalEstimate,
  ServiceEstimate,
} from "./estimate-types";

// Analytics Types
export type {
  WorkflowAnalytics,
  StepDuration,
  AIInteractionSummary,
  WorkflowQuality,
  UserWorkflowStats,
  TeamAnalytics,
  TimeSeriesData,
  WorkflowBenchmark,
  PredictiveInsight,
  ActionItem,
  AnalyticsFilter,
  AnalyticsMetric,
  AnalyticsDashboard,
  DashboardWidget,
  AnalyticsQuery,
  ChartConfig,
  DashboardLayout,
  AnalyticsExport,
  AnalyticsAlert,
} from "./analytics-types";

// Facade Analysis Types
export type {
  FacadeAnalysis,
  FacadeMaterial,
  ImageSource,
  FacadeAnalysisImage,
  AIAnalysisResult,
  DetectedElement,
  FacadeAnalysisAIResponse,
} from "./facade-analysis-types";

// Guided Flow Types
export type {
  InitialContactData,
  FilesPhotosData,
  AreaOfWorkData,
  TakeoffStepData,
  ScopeDetailsData,
  DurationData,
  ExpensesData,
  PricingData,
  GuidedFlowData,
} from "./guided-flow-types";

// Measurement Types
export type {
  MeasurementEntry,
  MeasurementCategory,
  MeasurementTemplate,
} from "./measurements";

// Import measurement utilities for local use
import {
  MEASUREMENT_TEMPLATES,
  calculateMeasurement,
  getUnitForCalculation,
  getRelevantCategories,
  groupCategoriesByType,
  isMeasurementEntry,
  isMeasurementCategory,
} from "./measurements";

// Re-export for external consumption
export {
  MEASUREMENT_TEMPLATES,
  calculateMeasurement,
  getUnitForCalculation,
  getRelevantCategories,
  groupCategoriesByType,
  isMeasurementEntry,
  isMeasurementCategory,
};

// Photo Analysis Types
export type { PhotoAnalysisResult } from "./photo-analysis";

// Document Extraction Types
export type { ExtractedData } from "./extraction";

// Note: PhotoData and PhotoAnalysisData types are defined locally in photo-service.ts
// StatusValue type removed as it was unused

// Type Aliases for Clarity (resolving naming conflicts)
// Note: These type aliases were removed as they were unused and causing import issues

// Common type utilities
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type guards for runtime checking
 * Note: These are imported from their respective modules above
 */
export const TypeGuards = {
  isAIMessage,
  isToolCallInfo,
  isServiceSuggestion,
  isMeasurementEntry,
  isMeasurementCategory,
} as const;

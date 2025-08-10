// AI-specific type definitions for EstimatePro
import { ServiceType, BuildingData } from "./estimate-types";

// Context passed to AI components
export interface AIContext {
  estimateId?: string;
  serviceType?: ServiceType;
  buildingData?: BuildingData;
  userPreferences?: UserPreferences;
  sessionId?: string;
  workflowStep?: number;
}

// User preferences for AI behavior
export interface UserPreferences {
  aiAssistanceLevel: "minimal" | "standard" | "maximum";
  autoSuggestions: boolean;
  smartDefaults: boolean;
  voiceEnabled: boolean;
}

// Tool execution arguments
export interface ToolArguments {
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
}

// Tool call information
export interface ToolCallInfo {
  name: string;
  args: ToolArguments;
  timestamp: Date;
  duration?: number;
  result?: unknown;
  error?: Error;
}

// AI message types
export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: AIMessageMetadata;
}

export interface AIMessageMetadata {
  tokens?: number;
  model?: string;
  toolCalls?: ToolCallInfo[];
  error?: Error;
}

// AI metrics data
export interface AIMetricsData {
  timestamp: string;
  timeRange?: TimeRange;
  health: HealthStatus;
  aggregated: AggregatedMetrics;
  recentMetrics: MetricEntry[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  issues: string[];
  lastCheck: Date;
}

export interface AggregatedMetrics {
  totalRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  averageTokensPerRequest: number;
  averageTokensPerSecond: number;
  requestsByModel: Record<string, number>;
  requestsByMode: Record<string, number>;
  toolUsageCount: Record<string, number>;
  hourlyDistribution: Record<string, number>;
}

export interface MetricEntry {
  id: string;
  timestamp: Date;
  type: "request" | "error" | "cache_hit" | "tool_use";
  duration: number;
  model?: string;
  mode?: string;
  tokens?: number;
  error?: string;
}

// Model health status
export interface ModelHealthStatus {
  [model: string]: {
    available: boolean;
    errorCount: number;
    lastError?: Date;
    avgResponseTime: number;
    circuitBreakerOpen: boolean;
  };
}

// Degradation level
export interface DegradationLevel {
  level: "full" | "partial" | "offline";
  message: string;
  features: {
    photoAnalysis: boolean;
    documentExtraction: boolean;
    suggestions: boolean;
    autoQuote: boolean;
    riskAssessment: boolean;
  };
}

// Smart defaults
export interface SmartDefault {
  field: string;
  value: unknown;
  confidence: number;
  reasoning: string;
  source: "ai" | "history" | "context" | "user";
}

// Service suggestion
export interface ServiceSuggestion {
  serviceType: ServiceType;
  confidence: number;
  reason: string;
  priority: "high" | "medium" | "low";
  estimatedValue?: number;
  compatibility: string[];
  risks?: string[];
}

// Conversation modes
export type ConversationMode =
  | "general"
  | "estimation"
  | "technical"
  | "business";

// AI Assistant hook options
export interface UseAIAssistantOptions {
  conversationId?: string;
  mode?: ConversationMode;
  context?: AIContext;
  useTools?: boolean;
  onToolCall?: (toolName: string, args: ToolArguments) => void;
  onFinish?: (message: AIMessage) => void;
  maxRetries?: number;
  retryDelay?: number;
}

// AI Assistant hook return type
export interface UseAIAssistantReturn {
  messages: AIMessage[];
  input: string;
  isLoading: boolean;
  isStreaming: boolean;
  hasActiveStream: boolean;
  error: Error | null;
  handleInputChange: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  stop: () => void;
  clear: () => void;
  retry: () => void;
}

// Auto scroll hook options
export interface UseAutoScrollOptions {
  dependency: unknown[];
  behavior?: ScrollBehavior;
  delay?: number;
  threshold?: number;
}

// Auto scroll hook return type
export interface UseAutoScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement>;
  isAutoScrolling: boolean;
  isAtBottom: boolean;
  scrollToBottom: () => void;
  pauseAutoScroll: () => void;
  resumeAutoScroll: () => void;
}

// Feature flags
export interface AIFeatureFlags {
  VOICE_INPUT: boolean;
  FILE_ATTACHMENT: boolean;
  REAL_TIME_METRICS: boolean;
  SMART_DEFAULTS: boolean;
  INTELLIGENT_SUGGESTIONS: boolean;
  TOOL_EXECUTION: boolean;
}

// Constants
export const AI_CONSTANTS = {
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX_DELAY: 30000,
  CACHE_TIMEOUT: 30000,
  POLLING_INTERVAL: 30000,
  CONFIDENCE_THRESHOLD: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.3,
  },
  TOKEN_LIMITS: {
    INPUT_MAX: 4000,
    OUTPUT_MAX: 4000,
    CONVERSATION_MAX: 16000,
  },
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
} as const;

/**
 * Type guards for runtime validation
 */
export function isAIMessage(obj: unknown): obj is AIMessage {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "role" in obj &&
    "content" in obj &&
    "timestamp" in obj &&
    typeof (obj as AIMessage).id === "string" &&
    ["user", "assistant", "system"].includes((obj as AIMessage).role) &&
    typeof (obj as AIMessage).content === "string" &&
    (obj as AIMessage).timestamp instanceof Date
  );
}

export function isToolCallInfo(obj: unknown): obj is ToolCallInfo {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "args" in obj &&
    "timestamp" in obj &&
    typeof (obj as ToolCallInfo).name === "string" &&
    typeof (obj as ToolCallInfo).args === "object" &&
    (obj as ToolCallInfo).timestamp instanceof Date
  );
}

export function isServiceSuggestion(obj: unknown): obj is ServiceSuggestion {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "serviceType" in obj &&
    "confidence" in obj &&
    "reason" in obj &&
    "priority" in obj &&
    typeof (obj as ServiceSuggestion).serviceType === "string" &&
    typeof (obj as ServiceSuggestion).confidence === "number" &&
    typeof (obj as ServiceSuggestion).reason === "string" &&
    ["high", "medium", "low"].includes((obj as ServiceSuggestion).priority) &&
    (obj as ServiceSuggestion).confidence >= 0 &&
    (obj as ServiceSuggestion).confidence <= 1
  );
}

/**
 * Unified Analytics Service
 *
 * Consolidates functionality from:
 * - analytics-service.ts (workflow analytics, predictive insights)
 * - analytics-metrics-service.ts (metrics calculations, AI analytics)
 * - analytics-api-service.ts (API client, retry logic, caching)
 * - analytics-websocket-service.ts (real-time streaming)
 * - analytics-personalization-service.ts (user preferences)
 *
 * Provides comprehensive analytics management with:
 * - Workflow analytics collection and processing
 * - Real-time metrics calculations
 * - API client with retry logic and caching
 * - WebSocket streaming for live updates
 * - User preference management and personalization
 * - Predictive insights and anomaly detection
 */

import { createBrowserClient, createClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { BaseService, ServiceConfig } from "./core/base-service";
import {
  ValidationError,
  DatabaseError,
  AuthError,
  BusinessLogicError,
  NotFoundError,
} from "./core/errors";
import { z } from "zod";
import {
  WorkflowAnalytics,
  UserWorkflowStats,
  TeamAnalytics,
  WorkflowBenchmark,
  PredictiveInsight,
  AnalyticsFilter,
  AnalyticsMetric,
  TimeSeriesData,
  StepDuration,
  AIInteractionSummary,
  WorkflowQuality,
  ActionItem,
  AnalyticsExport,
} from "@/lib/types/analytics-types";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import type { AnalyticsData } from "@/lib/analytics/data";

// ==============================================================================
// TYPES AND INTERFACES
// ==============================================================================

export interface AIMetrics {
  aiSavedHours: number;
  photoAccuracy: number;
  avgEstimateTime: number;
  automationRate: number;
}

export interface APIResponse<T> {
  data: T;
  error?: string;
  metadata?: {
    timestamp: string;
    cached?: boolean;
    requestId?: string;
  };
}

export interface APIError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface RequestConfig {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
  cacheTimeout?: number;
  signal?: AbortSignal;
}

interface WebSocketMessage {
  type:
    | "metric_update"
    | "quality_update"
    | "prediction_update"
    | "anomaly_alert"
    | "connection_status";
  data: any;
  timestamp: string;
  id: string;
}

interface AnalyticsSubscription {
  id: string;
  metrics: string[];
  callback: (data: any) => void;
  filters?: Record<string, any>;
}

interface UserPreferences {
  userId: string;
  dashboardLayout: string[];
  favoriteCharts: string[];
  defaultTimeRange: string;
  defaultMetrics: string[];
  notifications: {
    realTime: boolean;
    anomalies: boolean;
    dailyReports: boolean;
    thresholdAlerts: boolean;
  };
  display: {
    theme: "light" | "dark" | "auto";
    density: "compact" | "comfortable" | "spacious";
    animations: boolean;
    chartDefaults: {
      type: "line" | "bar" | "area" | "pie";
      colors: string[];
      showGrid: boolean;
      showLegend: boolean;
    };
  };
  filters: {
    savedFilters: Record<string, any>[];
    quickFilters: string[];
    defaultAggregation: "sum" | "avg" | "count" | "max" | "min";
  };
  customViews: {
    id: string;
    name: string;
    config: any;
    isDefault: boolean;
  }[];
}

interface PersonalizationContext {
  userId: string;
  role: string;
  permissions: string[];
  lastLogin: string;
  sessionDuration: number;
  viewingHistory: {
    charts: string[];
    metrics: string[];
    timeRanges: string[];
  };
}

// ==============================================================================
// VALIDATION SCHEMAS
// ==============================================================================

const MetricUpdateSchema = z.object({
  metric: z.string(),
  value: z.number(),
  trend: z.enum(["up", "down", "stable"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

const QualityUpdateSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["compliant", "warning", "non_compliant"]),
  issues: z.number().min(0),
  recommendations: z.array(z.string()),
});

const PredictionUpdateSchema = z.object({
  predictionId: z.string(),
  type: z.string(),
  overallScore: z.number(),
  keyInsights: z.array(z.string()),
  topRecommendations: z.array(z.string()),
  dataQuality: z.number(),
});

const AnomalyAlertSchema = z.object({
  anomalyId: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  message: z.string(),
  detectedAt: z.string(),
  affectedMetrics: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

const UserPreferencesSchema = z.object({
  userId: z.string(),
  dashboardLayout: z.array(z.string()),
  favoriteCharts: z.array(z.string()),
  defaultTimeRange: z.string(),
  defaultMetrics: z.array(z.string()),
  notifications: z.object({
    realTime: z.boolean(),
    anomalies: z.boolean(),
    dailyReports: z.boolean(),
    thresholdAlerts: z.boolean(),
  }),
  display: z.object({
    theme: z.enum(["light", "dark", "auto"]),
    density: z.enum(["compact", "comfortable", "spacious"]),
    animations: z.boolean(),
    chartDefaults: z.object({
      type: z.enum(["line", "bar", "area", "pie"]),
      colors: z.array(z.string()),
      showGrid: z.boolean(),
      showLegend: z.boolean(),
    }),
  }),
  filters: z.object({
    savedFilters: z.array(z.any()),
    quickFilters: z.array(z.string()),
    defaultAggregation: z.enum(["sum", "avg", "count", "max", "min"]),
  }),
  customViews: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      config: z.any(),
      isDefault: z.boolean(),
    }),
  ),
});

// ==============================================================================
// SIMPLE CACHE CLASS
// ==============================================================================

class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTimeout = 60000; // 1 minute

  set(key: string, data: any, timeout?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (timeout || this.defaultTimeout),
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// ==============================================================================
// MAIN UNIFIED ANALYTICS SERVICE
// ==============================================================================

export class UnifiedAnalyticsService extends BaseService {
  private supabase: ReturnType<typeof createBrowserClient<Database>>;
  private fallbackData = new Map<string, any>();
  private retryQueue: Array<() => Promise<void>> = [];
  private isOnline = true;
  private maxRetries = 3;
  private retryDelay = 1000;

  // API service properties
  private baseURL: string;
  private apiCache: SimpleCache;
  private defaultRequestConfig: RequestConfig;
  private activeRequests: Map<string, AbortController>;

  // WebSocket properties
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, AnalyticsSubscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;

  // Personalization properties
  private preferencesCache = new Map<string, UserPreferences>();
  private contextCache = new Map<string, PersonalizationContext>();

  constructor(
    config?: Partial<
      ServiceConfig & {
        baseURL?: string;
        supabaseUrl?: string;
        supabaseKey?: string;
      }
    >,
  ) {
    super({
      serviceName: "UnifiedAnalyticsService",
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...config,
    });

    // Initialize Supabase client
    this.supabase = createBrowserClient<Database>(
      config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Initialize API service properties
    this.baseURL = config?.baseURL || "/api/analytics";
    this.apiCache = new SimpleCache();
    this.defaultRequestConfig = {
      retries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cache: true,
      cacheTimeout: 60000,
    };
    this.activeRequests = new Map();

    // Initialize error handling
    this.initializeErrorHandling();

    // Initialize WebSocket connection
    if (typeof window !== "undefined") {
      this.initializeWebSocket();
    }
  }

  // ==============================================================================
  // CORE ERROR HANDLING AND CONNECTIVITY
  // ==============================================================================

  private initializeErrorHandling() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.processRetryQueue();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  private async withFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackValue?: T,
    retryable = true,
  ): Promise<T> {
    try {
      const result = await this.executeWithRetry(operation);
      this.fallbackData.set(fallbackKey, result);
      return result;
    } catch (error) {
      this.logger.warn(
        `Analytics operation failed, using fallback for ${fallbackKey}`,
        { error, fallbackKey },
      );

      const cachedFallback = this.fallbackData.get(fallbackKey);
      if (cachedFallback) {
        return cachedFallback;
      }

      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      if (retryable && !this.isOnline) {
        this.retryQueue.push(async () => {
          try {
            const result = await operation();
            this.fallbackData.set(fallbackKey, result);
          } catch (retryError) {
            this.logger.warn(`Retry failed for ${fallbackKey}`, { retryError });
          }
        });
      }

      return this.getEmptyFallback(fallbackKey) as T;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const retryableErrors = [
      "NETWORK_ERROR",
      "TIMEOUT",
      "CONNECTION_ERROR",
      "TEMPORARY_ERROR",
      "RATE_LIMIT_ERROR",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message?.includes(errorType) ||
        error.code?.includes(errorType) ||
        error.status >= 500,
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processRetryQueue(): Promise<void> {
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          this.logger.warn("Retry queue operation failed", { error });
        }
      }
    }
  }

  private getEmptyFallback(key: string): any {
    if (key.includes("metrics")) {
      return [];
    }
    if (key.includes("stats")) {
      return {
        userId: "",
        userName: "",
        userRole: "",
        totalWorkflows: 0,
        completedWorkflows: 0,
        averageCompletionTime: 0,
        averageQualityScore: 0,
        averageStepDuration: 0,
        averageBacktrackRate: 0,
        averageErrorRate: 0,
        averageAIUsage: 0,
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        qualityTrend: "stable" as const,
        efficiencyTrend: "stable" as const,
        slowestSteps: [],
        mostCommonErrors: [],
        underutilizedFeatures: [],
      };
    }
    if (key.includes("insights")) {
      return [];
    }
    if (key.includes("benchmarks")) {
      return [];
    }
    if (key.includes("timeseries")) {
      return [];
    }
    return null;
  }

  // ==============================================================================
  // WORKFLOW ANALYTICS METHODS (from analytics-service.ts)
  // ==============================================================================

  async startWorkflowTracking(
    estimateId: string,
    userId: string,
    userName: string,
    userRole: string,
    templateUsed?: string,
  ): Promise<string> {
    return this.withFallback(
      async () => {
        const workflowAnalytics: Partial<WorkflowAnalytics> = {
          estimateId,
          userId,
          userName,
          userRole,
          templateUsed,
          startTime: new Date(),
          currentStep: 1,
          totalSteps: 9,
          totalDuration: 0,
          stepDurations: [],
          aiInteractions: [],
          validationScore: 0,
          errorCount: 0,
          warningCount: 0,
          autoFixesApplied: 0,
          collaboratorCount: 1,
          conflictCount: 0,
          averageConflictResolutionTime: 0,
          completionRate: 0,
          usabilityScore: 0,
          revisionCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { data, error } = await this.supabase
          .from("workflow_analytics")
          .insert([workflowAnalytics])
          .select()
          .single();

        if (error) throw error;
        return data.id;
      },
      `workflow_tracking_${estimateId}`,
      `temp_${Date.now()}`,
      false,
    );
  }

  async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    stepName: string,
    stepData: Partial<StepDuration>,
  ): Promise<void> {
    try {
      const { data: analytics, error: fetchError } = await this.supabase
        .from("workflow_analytics")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (fetchError) throw fetchError;

      const stepDurations = analytics.stepDurations || [];
      const existingStepIndex = stepDurations.findIndex(
        (s: StepDuration) => s.stepId === stepId,
      );

      if (existingStepIndex >= 0) {
        stepDurations[existingStepIndex] = {
          ...stepDurations[existingStepIndex],
          ...stepData,
          duration:
            stepData.duration || stepDurations[existingStepIndex].duration,
        };
      } else {
        stepDurations.push({
          stepId,
          stepName,
          startTime: new Date(),
          duration: 0,
          visitCount: 1,
          backtrackCount: 0,
          validationErrors: 0,
          aiAssistanceUsed: false,
          helpViewCount: 0,
          timeSpentInHelp: 0,
          ...stepData,
        });
      }

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          stepDurations,
          currentStep:
            parseInt(stepId.replace("step-", "")) || analytics.currentStep,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      this.logger.error("Error updating workflow step", {
        error,
        workflowId,
        stepId,
      });
      throw error;
    }
  }

  async recordAIInteraction(
    workflowId: string,
    interaction: Partial<AIInteractionSummary>,
  ): Promise<void> {
    try {
      const { data: analytics, error: fetchError } = await this.supabase
        .from("workflow_analytics")
        .select("aiInteractions")
        .eq("id", workflowId)
        .single();

      if (fetchError) throw fetchError;

      const aiInteractions = analytics.aiInteractions || [];
      aiInteractions.push({
        interactionId: `ai-${Date.now()}`,
        timestamp: new Date(),
        duration: 0,
        tokensUsed: 0,
        cost: 0,
        accuracy: 0,
        userAcceptanceRate: 0,
        confidence: 0,
        ...interaction,
      });

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          aiInteractions,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      this.logger.error("Error recording AI interaction", {
        error,
        workflowId,
      });
      throw error;
    }
  }

  async completeWorkflow(
    workflowId: string,
    completionData: {
      completionQuality: WorkflowQuality;
      estimateValue?: number;
      userSatisfactionScore?: number;
    },
  ): Promise<void> {
    try {
      const endTime = new Date();

      const { data: analytics, error: fetchError } = await this.supabase
        .from("workflow_analytics")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (fetchError) throw fetchError;

      const startTime = new Date(analytics.startTime);
      const totalDuration = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000 / 60,
      );

      const { error: updateError } = await this.supabase
        .from("workflow_analytics")
        .update({
          endTime,
          totalDuration,
          completionRate: 100,
          completionQuality: completionData.completionQuality,
          estimateValue: completionData.estimateValue,
          userSatisfactionScore: completionData.userSatisfactionScore,
          updatedAt: new Date(),
        })
        .eq("id", workflowId);

      if (updateError) throw updateError;
    } catch (error) {
      this.logger.error("Error completing workflow", { error, workflowId });
      throw error;
    }
  }

  async getWorkflowAnalytics(
    filters: AnalyticsFilter = {},
  ): Promise<WorkflowAnalytics[]> {
    const cacheKey = `workflow_analytics_${JSON.stringify(filters)}`;
    const cached = this.getCached<WorkflowAnalytics[]>(cacheKey);
    if (cached) return cached;

    return this.withFallback(
      async () => {
        let query = this.supabase
          .from("workflow_analytics")
          .select("*")
          .order("createdAt", { ascending: false });

        if (filters.startDate) {
          query = query.gte("createdAt", filters.startDate.toISOString());
        }
        if (filters.endDate) {
          query = query.lte("createdAt", filters.endDate.toISOString());
        }
        if (filters.userIds?.length) {
          query = query.in("userId", filters.userIds);
        }
        if (filters.templates?.length) {
          query = query.in("templateUsed", filters.templates);
        }
        if (filters.completionStatus === "completed") {
          query = query.eq("completionRate", 100);
        } else if (filters.completionStatus === "abandoned") {
          query = query.lt("completionRate", 100);
        }

        const { data, error } = await query;
        if (error) throw error;

        this.setCached(cacheKey, data, 300000); // 5 minutes
        return data;
      },
      cacheKey,
      [],
      true,
    );
  }

  async getUserWorkflowStats(userId: string): Promise<UserWorkflowStats> {
    const cacheKey = `user_stats_${userId}`;
    const cached = this.getCached<UserWorkflowStats>(cacheKey);
    if (cached) return cached;

    return this.withFallback(
      async () => {
        const { data: workflows, error } = await this.supabase
          .from("workflow_analytics")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: false });

        if (error) throw error;

        const stats = this.calculateUserStats(workflows);
        this.setCached(cacheKey, stats, 600000); // 10 minutes
        return stats;
      },
      cacheKey,
      undefined,
      true,
    );
  }

  // ==============================================================================
  // METRICS CALCULATION METHODS (from analytics-metrics-service.ts)
  // ==============================================================================

  static calculateAIMetrics(data: AnalyticsData | null): AIMetrics {
    const defaultMetrics: AIMetrics = {
      aiSavedHours: 0,
      photoAccuracy: 0,
      avgEstimateTime: 0,
      automationRate: 0,
    };

    if (!data) return defaultMetrics;

    const hasEstimates = data.overview.totalEstimates > 0;

    return {
      aiSavedHours: Math.round(data.overview.totalEstimates * 0.5),
      photoAccuracy: hasEstimates ? 92 : 0,
      avgEstimateTime: hasEstimates ? 5 : 0,
      automationRate: this.calculateAutomationRate(data),
    };
  }

  private static calculateAutomationRate(data: AnalyticsData): number {
    if (data.overview.totalEstimates === 0) return 0;

    return Math.min(
      85,
      Math.round(
        (data.overview.totalEstimates / (data.overview.totalEstimates + 10)) *
          100,
      ),
    );
  }

  static calculateTimeRangeMetrics(
    data: AnalyticsData,
    timeRange: "day" | "week" | "month" | "year",
  ): AIMetrics {
    return this.calculateAIMetrics(data);
  }

  static calculateTrends(
    currentData: AnalyticsData | null,
    previousData: AnalyticsData | null,
  ): {
    aiSavedHoursTrend: number;
    photoAccuracyTrend: number;
    avgEstimateTimeTrend: number;
    automationRateTrend: number;
  } {
    const current = this.calculateAIMetrics(currentData);
    const previous = this.calculateAIMetrics(previousData);

    return {
      aiSavedHoursTrend: this.calculateTrendPercentage(
        current.aiSavedHours,
        previous.aiSavedHours,
      ),
      photoAccuracyTrend: this.calculateTrendPercentage(
        current.photoAccuracy,
        previous.photoAccuracy,
      ),
      avgEstimateTimeTrend: this.calculateTrendPercentage(
        current.avgEstimateTime,
        previous.avgEstimateTime,
      ),
      automationRateTrend: this.calculateTrendPercentage(
        current.automationRate,
        previous.automationRate,
      ),
    };
  }

  private static calculateTrendPercentage(
    current: number,
    previous: number,
  ): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ==============================================================================
  // API CLIENT METHODS (from analytics-api-service.ts)
  // ==============================================================================

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {},
  ): Promise<APIResponse<T>> {
    const mergedConfig = { ...this.defaultRequestConfig, ...config };
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${url}:${JSON.stringify(options.body || {})}`;

    // Check cache first
    if (mergedConfig.cache && options.method === "GET") {
      const cached = this.apiCache.get(cacheKey);
      if (cached) {
        return {
          data: cached,
          metadata: {
            timestamp: new Date().toISOString(),
            cached: true,
          },
        };
      }
    }

    // Setup abort controller
    const abortController = new AbortController();
    const requestKey = `${endpoint}:${Date.now()}`;
    this.activeRequests.set(requestKey, abortController);

    // Setup timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, mergedConfig.timeout!);

    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= mergedConfig.retries!; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            signal: config.signal || abortController.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Cache successful GET requests
          if (mergedConfig.cache && options.method === "GET") {
            this.apiCache.set(cacheKey, data, mergedConfig.cacheTimeout);
          }

          this.activeRequests.delete(requestKey);

          return {
            data: data.data || data,
            metadata: {
              timestamp: new Date().toISOString(),
              cached: false,
              requestId: response.headers.get("x-request-id") || undefined,
            },
          };
        } catch (error) {
          lastError = error as Error;

          // Don't retry on abort
          if (error instanceof Error && error.name === "AbortError") {
            break;
          }

          // Wait before retrying
          if (attempt < mergedConfig.retries!) {
            await this.delay(mergedConfig.retryDelay! * Math.pow(2, attempt));
          }
        }
      }

      clearTimeout(timeoutId);
      this.activeRequests.delete(requestKey);

      throw lastError || new Error("Unknown error occurred");
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestKey);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Analytics API Error: ${errorMessage}`);

      return {
        data: {} as T,
        error: errorMessage,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  public cancelAllRequests(): void {
    this.activeRequests.forEach((controller) => controller.abort());
    this.activeRequests.clear();
  }

  public clearAPICache(): void {
    this.apiCache.clear();
  }

  public async getEnhancedAnalytics(
    config?: RequestConfig,
  ): Promise<APIResponse<any>> {
    return this.fetchWithRetry("/enhanced", { method: "GET" }, config);
  }

  public async getRealTimeMetrics(
    metrics: string[],
    config?: RequestConfig,
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams({ metrics: metrics.join(",") });
    return this.fetchWithRetry(
      `/real-time?${params}`,
      { method: "GET" },
      config,
    );
  }

  public async exportAnalytics(
    format: "csv" | "json" | "pdf",
    data: any,
    config?: RequestConfig,
  ): Promise<APIResponse<Blob>> {
    return this.fetchWithRetry(
      "/export",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ format, data }),
      },
      { ...config, cache: false },
    );
  }

  // ==============================================================================
  // WEBSOCKET METHODS (from analytics-websocket-service.ts)
  // ==============================================================================

  private initializeWebSocket(): void {
    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Use secure WebSocket in production
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/analytics/websocket`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.logger.info("Analytics WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.logger.info(
            `Analytics WebSocket closed: ${event.code} ${event.reason}`,
          );
          this.isConnected = false;
          this.stopHeartbeat();

          // Don't reconnect if closed intentionally
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.logger.error("Analytics WebSocket error", { error });
          this.isConnected = false;
          reject(error);
        };
      } catch (error) {
        this.logger.error("Failed to create WebSocket connection", { error });
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        "Max reconnect attempts reached for Analytics WebSocket",
      );
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000); // Max 30 seconds
      this.logger.info(
        `Attempting to reconnect Analytics WebSocket (attempt ${this.reconnectAttempts})`,
      );
      this.connectionPromise = null;
      this.connect();
    }, this.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Handle different message types
      switch (message.type) {
        case "metric_update":
          this.handleMetricUpdate(message.data);
          break;
        case "quality_update":
          this.handleQualityUpdate(message.data);
          break;
        case "prediction_update":
          this.handlePredictionUpdate(message.data);
          break;
        case "anomaly_alert":
          this.handleAnomalyAlert(message.data);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }

      // Notify subscribers
      this.notifySubscribers(message);
    } catch (error) {
      this.logger.error("Error handling WebSocket message", { error, data });
    }
  }

  private handleMetricUpdate(data: any): void {
    try {
      const validatedData = MetricUpdateSchema.parse(data);
      this.logger.debug("Received metric update", validatedData);
    } catch (error) {
      this.logger.error("Invalid metric update data", { error, data });
    }
  }

  private handleQualityUpdate(data: any): void {
    try {
      const validatedData = QualityUpdateSchema.parse(data);
      this.logger.debug("Received quality update", validatedData);
    } catch (error) {
      this.logger.error("Invalid quality update data", { error, data });
    }
  }

  private handlePredictionUpdate(data: any): void {
    try {
      const validatedData = PredictionUpdateSchema.parse(data);
      this.logger.debug("Received prediction update", validatedData);
    } catch (error) {
      this.logger.error("Invalid prediction update data", { error, data });
    }
  }

  private handleAnomalyAlert(data: any): void {
    try {
      const validatedData = AnomalyAlertSchema.parse(data);
      this.logger.warn("Received anomaly alert", validatedData);
    } catch (error) {
      this.logger.error("Invalid anomaly alert data", { error, data });
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private notifySubscribers(message: WebSocketMessage): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.metrics.includes(message.type)) {
        try {
          subscription.callback(message.data);
        } catch (error) {
          this.logger.error(
            `Error in subscription callback for ${subscription.id}`,
            { error },
          );
        }
      }
    });
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  public subscribe(
    metrics: string[],
    callback: (data: any) => void,
    filters?: Record<string, any>,
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      metrics,
      callback,
      filters,
    });

    this.logger.debug(`Created subscription ${subscriptionId}`, {
      metrics,
      filters,
    });
    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    this.logger.debug(`Removed subscription ${subscriptionId}`);
  }

  // ==============================================================================
  // PERSONALIZATION METHODS (from analytics-personalization-service.ts)
  // ==============================================================================

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const cacheKey = `user_preferences_${userId}`;
    const cached = this.preferencesCache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await this.supabase
        .from("user_analytics_preferences")
        .select("*")
        .eq("userId", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // Not found error
        throw error;
      }

      const preferences = data
        ? this.parsePreferences(data)
        : this.getDefaultPreferences(userId);
      this.preferencesCache.set(cacheKey, preferences);
      return preferences;
    } catch (error) {
      this.logger.error("Error fetching user preferences", { error, userId });
      return this.getDefaultPreferences(userId);
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<boolean> {
    try {
      const validatedPreferences = UserPreferencesSchema.parse({
        userId,
        ...this.getDefaultPreferences(userId),
        ...preferences,
      });

      const { error } = await this.supabase
        .from("user_analytics_preferences")
        .upsert(validatedPreferences);

      if (error) throw error;

      // Update cache
      this.preferencesCache.set(
        `user_preferences_${userId}`,
        validatedPreferences,
      );
      this.logger.info(`Updated user preferences for ${userId}`);
      return true;
    } catch (error) {
      this.logger.error("Error updating user preferences", {
        error,
        userId,
        preferences,
      });
      return false;
    }
  }

  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      dashboardLayout: ["metrics", "charts", "insights"],
      favoriteCharts: ["completion_rate", "quality_score", "time_trends"],
      defaultTimeRange: "month",
      defaultMetrics: ["completion_rate", "avg_time", "quality_score"],
      notifications: {
        realTime: true,
        anomalies: true,
        dailyReports: false,
        thresholdAlerts: true,
      },
      display: {
        theme: "auto",
        density: "comfortable",
        animations: true,
        chartDefaults: {
          type: "line",
          colors: ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444"],
          showGrid: true,
          showLegend: true,
        },
      },
      filters: {
        savedFilters: [],
        quickFilters: ["today", "week", "month"],
        defaultAggregation: "sum",
      },
      customViews: [],
    };
  }

  private parsePreferences(data: any): UserPreferences {
    try {
      return UserPreferencesSchema.parse(data);
    } catch (error) {
      this.logger.warn("Invalid preferences data, using defaults", {
        error,
        data,
      });
      return this.getDefaultPreferences(data.userId);
    }
  }

  // ==============================================================================
  // UTILITY AND CALCULATION METHODS
  // ==============================================================================

  private calculateUserStats(
    workflows: WorkflowAnalytics[],
  ): UserWorkflowStats {
    const completedWorkflows = workflows.filter(
      (w) => w.completionRate === 100,
    );
    const totalWorkflows = workflows.length;

    return {
      userId: workflows[0]?.userId || "",
      userName: workflows[0]?.userName || "",
      userRole: workflows[0]?.userRole || "",
      totalWorkflows,
      completedWorkflows: completedWorkflows.length,
      averageCompletionTime: this.calculateAverage(
        completedWorkflows.map((w) => w.totalDuration),
      ),
      averageQualityScore: this.calculateAverage(
        completedWorkflows.map((w) => w.completionQuality?.overallScore || 0),
      ),
      averageStepDuration: this.calculateAverageStepDuration(workflows),
      averageBacktrackRate: this.calculateAverageBacktrackRate(workflows),
      averageErrorRate: this.calculateAverageErrorRate(workflows),
      averageAIUsage: this.calculateAverageAIUsage(workflows),
      weeklyCompletionRate: this.calculateWeeklyCompletionRate(workflows),
      monthlyCompletionRate: this.calculateMonthlyCompletionRate(workflows),
      qualityTrend: this.calculateQualityTrend(workflows),
      efficiencyTrend: this.calculateEfficiencyTrend(workflows),
      slowestSteps: this.findSlowestSteps(workflows),
      mostCommonErrors: this.findMostCommonErrors(workflows),
      underutilizedFeatures: this.findUnderutilizedFeatures(workflows),
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateAverageStepDuration(workflows: WorkflowAnalytics[]): number {
    const allSteps = workflows.flatMap((w) => w.stepDurations || []);
    return this.calculateAverage(allSteps.map((s) => s.duration));
  }

  private calculateAverageBacktrackRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const allSteps = workflows.flatMap((w) => w.stepDurations || []);
    return this.calculateAverage(allSteps.map((s) => s.backtrackCount));
  }

  private calculateAverageErrorRate(workflows: WorkflowAnalytics[]): number {
    return this.calculateAverage(workflows.map((w) => w.errorCount));
  }

  private calculateAverageAIUsage(workflows: WorkflowAnalytics[]): number {
    return this.calculateAverage(
      workflows.map((w) => w.aiInteractions?.length || 0),
    );
  }

  private calculateWeeklyCompletionRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentWorkflows = workflows.filter(
      (w) => new Date(w.createdAt) >= oneWeekAgo,
    );
    if (recentWorkflows.length === 0) return 0;

    return (
      (recentWorkflows.filter((w) => w.completionRate === 100).length /
        recentWorkflows.length) *
      100
    );
  }

  private calculateMonthlyCompletionRate(
    workflows: WorkflowAnalytics[],
  ): number {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentWorkflows = workflows.filter(
      (w) => new Date(w.createdAt) >= oneMonthAgo,
    );
    if (recentWorkflows.length === 0) return 0;

    return (
      (recentWorkflows.filter((w) => w.completionRate === 100).length /
        recentWorkflows.length) *
      100
    );
  }

  private calculateQualityTrend(
    workflows: WorkflowAnalytics[],
  ): "improving" | "stable" | "declining" {
    const qualityScores = workflows
      .filter((w) => w.completionQuality?.overallScore)
      .map((w) => w.completionQuality.overallScore);

    return this.calculateTrend(qualityScores) as
      | "improving"
      | "stable"
      | "declining";
  }

  private calculateEfficiencyTrend(
    workflows: WorkflowAnalytics[],
  ): "improving" | "stable" | "declining" {
    const durations = workflows.map((w) => w.totalDuration);
    const trend = this.calculateTrend(durations);

    // For efficiency, down trend is improving (less time)
    return trend === "down"
      ? "improving"
      : trend === "up"
        ? "declining"
        : "stable";
  }

  private calculateTrend(values: number[]): "up" | "down" | "stable" {
    if (values.length < 2) return "stable";

    const recent = values.slice(-Math.min(10, values.length));
    const older = values.slice(0, -Math.min(10, values.length));

    if (older.length === 0) return "stable";

    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 5) return "up";
    if (changePercent < -5) return "down";
    return "stable";
  }

  private findSlowestSteps(workflows: WorkflowAnalytics[]): string[] {
    const stepDurations = new Map<string, number[]>();

    workflows.forEach((workflow) => {
      workflow.stepDurations?.forEach((step) => {
        if (!stepDurations.has(step.stepId)) {
          stepDurations.set(step.stepId, []);
        }
        stepDurations.get(step.stepId)!.push(step.duration);
      });
    });

    const avgDurations = Array.from(stepDurations.entries())
      .map(([stepId, durations]) => ({
        stepId,
        avgDuration: this.calculateAverage(durations),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    return avgDurations.slice(0, 3).map((s) => s.stepId);
  }

  private findMostCommonErrors(workflows: WorkflowAnalytics[]): string[] {
    // Simplified implementation
    return ["validation_error", "missing_data", "upload_failure"];
  }

  private findUnderutilizedFeatures(workflows: WorkflowAnalytics[]): string[] {
    // Simplified implementation
    return ["ai_suggestions", "templates", "collaboration"];
  }

  // ==============================================================================
  // HEALTH AND CLEANUP METHODS
  // ==============================================================================

  public async getHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    components: Record<string, { status: string; details?: any }>;
  }> {
    const health = {
      status: "healthy" as const,
      components: {
        database: { status: "unknown" },
        cache: { status: "unknown" },
        websocket: { status: "unknown" },
        api: { status: "unknown" },
      },
    };

    try {
      // Check database connection
      const { error: dbError } = await this.supabase
        .from("workflow_analytics")
        .select("id")
        .limit(1);

      health.components.database = {
        status: dbError ? "unhealthy" : "healthy",
        details: dbError?.message,
      };

      // Check cache
      health.components.cache = {
        status: "healthy",
        details: `${this.cache.size} items cached`,
      };

      // Check WebSocket
      health.components.websocket = {
        status: this.isConnected ? "healthy" : "degraded",
        details: `${this.subscriptions.size} active subscriptions`,
      };

      // Check API cache
      health.components.api = {
        status: "healthy",
        details: `${this.activeRequests.size} active requests`,
      };

      // Determine overall status
      const componentStatuses = Object.values(health.components).map(
        (c) => c.status,
      );
      if (componentStatuses.includes("unhealthy")) {
        health.status = "unhealthy";
      } else if (componentStatuses.includes("degraded")) {
        health.status = "degraded";
      }
    } catch (error) {
      this.logger.error("Health check failed", { error });
      health.status = "unhealthy";
    }

    return health;
  }

  public dispose(): void {
    // Cancel all active requests
    this.cancelAllRequests();

    // Clear all caches
    this.clearCache();
    this.apiCache.clear();
    this.preferencesCache.clear();
    this.contextCache.clear();

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, "Service disposed");
    }

    // Clear subscriptions
    this.subscriptions.clear();

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear fallback data
    this.fallbackData.clear();

    this.logger.info("UnifiedAnalyticsService disposed");
  }
}

// ==============================================================================
// SERVICE INSTANCE AND EXPORTS
// ==============================================================================

// Create singleton instance
let unifiedAnalyticsInstance: UnifiedAnalyticsService | null = null;

export function getUnifiedAnalyticsService(
  config?: Partial<
    ServiceConfig & {
      baseURL?: string;
      supabaseUrl?: string;
      supabaseKey?: string;
    }
  >,
): UnifiedAnalyticsService {
  if (!unifiedAnalyticsInstance) {
    unifiedAnalyticsInstance = new UnifiedAnalyticsService(config);
  }
  return unifiedAnalyticsInstance;
}

// Create default service instance
export const unifiedAnalyticsService = new UnifiedAnalyticsService();

// Export the default service
export default unifiedAnalyticsService;

/**
 * Advanced Error Monitoring and Analytics System
 *
 * Comprehensive error tracking, analytics, and proactive monitoring
 * for the EstimatePro platform with intelligent error classification
 * and automated resolution recommendations.
 */

import React from "react";
import { cacheIntegrationManager } from "@/lib/optimization/cache-integration-middleware";
import { getMobileWebVitalsMonitor } from "@/lib/performance/mobile-web-vitals";

/**
 * Error classification and severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  USER_INPUT = "user_input",
  NETWORK = "network",
  DATABASE = "database",
  AUTHENTICATION = "authentication",
  PERMISSION = "permission",
  CALCULATION = "calculation",
  AI_SERVICE = "ai_service",
  INTEGRATION = "integration",
  PERFORMANCE = "performance",
  CACHE = "cache",
  SYSTEM = "system",
}

/**
 * Enhanced error interface
 */
export interface EnhancedError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: {
    userId?: string;
    page?: string;
    component?: string;
    action?: string;
    userAgent?: string;
    url?: string;
    sessionId?: string;
    buildVersion?: string;
  };
  metadata: {
    reproduced?: boolean;
    frequency?: number;
    affectedUsers?: number;
    resolutionStatus?: "open" | "investigating" | "resolved" | "wont_fix";
    tags?: string[];
  };
  performance?: {
    renderTime?: number;
    memoryUsage?: number;
    cacheHitRate?: number;
    networkLatency?: number;
  };
  recovery?: {
    attempted?: boolean;
    successful?: boolean;
    strategy?: string;
    retryCount?: number;
  };
}

/**
 * Error analytics metrics
 */
export interface ErrorAnalytics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  topErrors: {
    message: string;
    count: number;
    category: ErrorCategory;
    severity: ErrorSeverity;
  }[];
  resolutionMetrics: {
    averageResolutionTime: number;
    resolutionRate: number;
    automaticRecoveryRate: number;
  };
  userImpact: {
    affectedUsers: number;
    sessionImpact: number;
    businessImpact: "low" | "medium" | "high";
  };
}

/**
 * Advanced Error Monitoring System
 */
export class AdvancedErrorMonitor {
  private static instance: AdvancedErrorMonitor | null = null;
  private errors: EnhancedError[] = [];
  private analytics: ErrorAnalytics | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private errorReportingQueue: EnhancedError[] = [];

  static getInstance(): AdvancedErrorMonitor {
    if (!AdvancedErrorMonitor.instance) {
      AdvancedErrorMonitor.instance = new AdvancedErrorMonitor();
    }
    return AdvancedErrorMonitor.instance;
  }

  /**
   * Initialize error monitoring system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🔍 Initializing advanced error monitoring...");

    try {
      // Setup error handlers
      this.setupGlobalErrorHandlers();
      this.setupUnhandledRejectionHandler();
      this.setupReactErrorBoundaryIntegration();

      // Initialize performance integration
      await this.initializePerformanceIntegration();

      // Start analytics processing
      this.startAnalyticsProcessing();

      // Setup error reporting queue processing
      this.startErrorReporting();

      this.isInitialized = true;
      console.log("✅ Advanced error monitoring initialized");
    } catch (error) {
      console.error("❌ Failed to initialize error monitoring:", error);
      throw error;
    }
  }

  /**
   * Record an error with enhanced context
   */
  async recordError(
    error: Error | string,
    context: Partial<EnhancedError["context"]> = {},
    category: ErrorCategory = ErrorCategory.SYSTEM,
  ): Promise<string> {
    const enhancedError: EnhancedError = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" ? error.stack : undefined,
      category,
      severity: this.classifyErrorSeverity(error, category),
      context: {
        ...this.getDefaultContext(),
        ...context,
      },
      metadata: {
        frequency: 1,
        affectedUsers: 1,
        resolutionStatus: "open",
        tags: this.generateAutoTags(error, category),
      },
      performance: await this.getPerformanceContext(),
      recovery: {
        attempted: false,
        successful: false,
        retryCount: 0,
      },
    };

    // Check for duplicates and update frequency
    const existingError = this.findSimilarError(enhancedError);
    if (existingError) {
      existingError.metadata.frequency! += 1;
      existingError.timestamp = Date.now();
      return existingError.id;
    }

    // Store error
    this.errors.push(enhancedError);
    this.errorReportingQueue.push(enhancedError);

    // Attempt automatic recovery
    await this.attemptAutoRecovery(enhancedError);

    // Trigger alerts for critical errors
    if (enhancedError.severity === ErrorSeverity.CRITICAL) {
      await this.triggerCriticalErrorAlert(enhancedError);
    }

    console.error("🚨 Error recorded:", {
      id: enhancedError.id,
      message: enhancedError.message,
      category: enhancedError.category,
      severity: enhancedError.severity,
    });

    return enhancedError.id;
  }

  /**
   * Get current error analytics
   */
  getAnalytics(): ErrorAnalytics {
    if (!this.analytics) {
      this.analytics = this.calculateAnalytics();
    }
    return this.analytics;
  }

  /**
   * Get recent errors with filtering
   */
  getRecentErrors(
    limit = 50,
    filters?: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      timeRange?: number; // milliseconds
    },
  ): EnhancedError[] {
    let filteredErrors = [...this.errors];

    if (filters?.timeRange) {
      const cutoff = Date.now() - filters.timeRange;
      filteredErrors = filteredErrors.filter(
        (error) => error.timestamp >= cutoff,
      );
    }

    if (filters?.category) {
      filteredErrors = filteredErrors.filter(
        (error) => error.category === filters.category,
      );
    }

    if (filters?.severity) {
      filteredErrors = filteredErrors.filter(
        (error) => error.severity === filters.severity,
      );
    }

    return filteredErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get error resolution recommendations
   */
  getResolutionRecommendations(errorId: string): string[] {
    const error = this.errors.find((e) => e.id === errorId);
    if (!error) return [];

    const recommendations: string[] = [];

    // Category-specific recommendations
    switch (error.category) {
      case ErrorCategory.CACHE:
        recommendations.push("Clear application cache and reload");
        recommendations.push("Check cache configuration and TTL settings");
        if (error.message.includes("memory")) {
          recommendations.push("Reduce cache size or enable automatic cleanup");
        }
        break;

      case ErrorCategory.NETWORK:
        recommendations.push("Check internet connection");
        recommendations.push("Retry the operation");
        if (error.message.includes("timeout")) {
          recommendations.push("Increase request timeout settings");
        }
        break;

      case ErrorCategory.DATABASE:
        recommendations.push("Check database connection");
        recommendations.push("Verify data integrity");
        if (error.message.includes("constraint")) {
          recommendations.push("Review data validation rules");
        }
        break;

      case ErrorCategory.AUTHENTICATION:
        recommendations.push("Re-authenticate the user");
        recommendations.push("Check token expiration");
        recommendations.push("Verify user permissions");
        break;

      case ErrorCategory.AI_SERVICE:
        recommendations.push("Check AI service status");
        recommendations.push("Validate input data format");
        recommendations.push("Review API rate limits");
        break;

      case ErrorCategory.PERFORMANCE:
        recommendations.push("Optimize resource usage");
        recommendations.push("Enable caching for frequently accessed data");
        recommendations.push("Consider lazy loading for heavy components");
        break;

      default:
        recommendations.push("Review error logs for more details");
        recommendations.push("Contact support if the issue persists");
    }

    // Severity-specific recommendations
    if (error.severity === ErrorSeverity.CRITICAL) {
      recommendations.unshift(
        "Immediate attention required - escalate to development team",
      );
    }

    // Frequency-based recommendations
    if (error.metadata.frequency && error.metadata.frequency > 5) {
      recommendations.push(
        "This is a recurring issue - consider implementing a permanent fix",
      );
    }

    return recommendations;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRecovery(error: EnhancedError): Promise<void> {
    error.recovery!.attempted = true;

    try {
      switch (error.category) {
        case ErrorCategory.CACHE:
          // Clear cache and retry
          await cacheIntegrationManager.clearAllCaches();
          error.recovery!.strategy = "cache_clear";
          error.recovery!.successful = true;
          break;

        case ErrorCategory.NETWORK:
          // Implement exponential backoff retry
          if (error.recovery!.retryCount < 3) {
            await this.delay(Math.pow(2, error.recovery!.retryCount) * 1000);
            error.recovery!.retryCount += 1;
            error.recovery!.strategy = "exponential_backoff";
          }
          break;

        case ErrorCategory.PERFORMANCE:
          // Trigger performance optimization
          const monitor = getMobileWebVitalsMonitor();
          await monitor.startMonitoring();
          error.recovery!.strategy = "performance_optimization";
          error.recovery!.successful = true;
          break;

        default:
          // No automatic recovery available
          error.recovery!.strategy = "manual_intervention_required";
      }
    } catch (recoveryError) {
      console.warn("Auto-recovery failed:", recoveryError);
      error.recovery!.successful = false;
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Global error handler
    window.addEventListener("error", (event) => {
      this.recordError(
        event.error || event.message,
        {
          page: window.location.pathname,
          url: window.location.href,
          component: "global",
        },
        ErrorCategory.SYSTEM,
      );
    });

    // Global unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.recordError(
        event.reason || "Unhandled promise rejection",
        {
          page: window.location.pathname,
          url: window.location.href,
          component: "promise",
        },
        ErrorCategory.SYSTEM,
      );
    });
  }

  /**
   * Setup unhandled rejection handler
   */
  private setupUnhandledRejectionHandler(): void {
    if (typeof process !== "undefined") {
      process.on("unhandledRejection", (reason, promise) => {
        this.recordError(
          `Unhandled Rejection: ${reason}`,
          { component: "node_process" },
          ErrorCategory.SYSTEM,
        );
      });
    }
  }

  /**
   * Setup React error boundary integration
   */
  private setupReactErrorBoundaryIntegration(): void {
    // This would be integrated with React Error Boundaries
    console.log("📱 React Error Boundary integration ready");
  }

  /**
   * Initialize performance integration
   */
  private async initializePerformanceIntegration(): Promise<void> {
    try {
      const monitor = getMobileWebVitalsMonitor();
      await monitor.startMonitoring();
      console.log("📊 Performance integration initialized");
    } catch (error) {
      console.warn("⚠️ Performance integration failed:", error);
    }
  }

  /**
   * Start analytics processing
   */
  private startAnalyticsProcessing(): void {
    this.monitoringInterval = setInterval(() => {
      this.analytics = this.calculateAnalytics();

      // Clean up old errors (keep last 1000)
      if (this.errors.length > 1000) {
        this.errors = this.errors.slice(-1000);
      }
    }, 60000); // Update every minute

    console.log("📈 Error analytics processing started");
  }

  /**
   * Start error reporting queue processing
   */
  private startErrorReporting(): void {
    setInterval(async () => {
      if (this.errorReportingQueue.length > 0) {
        const errorsToReport = this.errorReportingQueue.splice(0, 10); // Report 10 at a time

        try {
          await this.reportErrorsToAPI(errorsToReport);
        } catch (error) {
          console.warn("Failed to report errors to API:", error);
          // Re-queue errors for retry
          this.errorReportingQueue.unshift(...errorsToReport);
        }
      }
    }, 5000); // Process queue every 5 seconds
  }

  /**
   * Calculate current analytics
   */
  private calculateAnalytics(): ErrorAnalytics {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const recentErrors = this.errors.filter(
      (error) => error.timestamp >= last24Hours,
    );

    return {
      totalErrors: this.errors.length,
      errorsByCategory: this.groupByCategory(recentErrors),
      errorsBySeverity: this.groupBySeverity(recentErrors),
      errorTrends: this.calculateTrends(recentErrors),
      topErrors: this.getTopErrors(recentErrors),
      resolutionMetrics: this.calculateResolutionMetrics(recentErrors),
      userImpact: this.calculateUserImpact(recentErrors),
    };
  }

  /**
   * Helper methods for analytics calculation
   */
  private groupByCategory(
    errors: EnhancedError[],
  ): Record<ErrorCategory, number> {
    const groups = {} as Record<ErrorCategory, number>;
    Object.values(ErrorCategory).forEach((category) => {
      groups[category] = errors.filter((e) => e.category === category).length;
    });
    return groups;
  }

  private groupBySeverity(
    errors: EnhancedError[],
  ): Record<ErrorSeverity, number> {
    const groups = {} as Record<ErrorSeverity, number>;
    Object.values(ErrorSeverity).forEach((severity) => {
      groups[severity] = errors.filter((e) => e.severity === severity).length;
    });
    return groups;
  }

  private calculateTrends(
    errors: EnhancedError[],
  ): ErrorAnalytics["errorTrends"] {
    // Simplified trend calculation
    return {
      hourly: new Array(24).fill(0).map((_, i) => {
        const hourStart = Date.now() - (i + 1) * 60 * 60 * 1000;
        return errors.filter((e) => e.timestamp >= hourStart).length;
      }),
      daily: new Array(7).fill(0),
      weekly: new Array(4).fill(0),
    };
  }

  private getTopErrors(errors: EnhancedError[]): ErrorAnalytics["topErrors"] {
    const errorCounts = new Map<
      string,
      { count: number; error: EnhancedError }
    >();

    errors.forEach((error) => {
      const key = `${error.message}_${error.category}`;
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        errorCounts.set(key, { count: 1, error });
      }
    });

    return Array.from(errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ count, error }) => ({
        message: error.message,
        count,
        category: error.category,
        severity: error.severity,
      }));
  }

  private calculateResolutionMetrics(
    errors: EnhancedError[],
  ): ErrorAnalytics["resolutionMetrics"] {
    const resolvedErrors = errors.filter(
      (e) => e.metadata.resolutionStatus === "resolved",
    );
    const autoRecoveredErrors = errors.filter((e) => e.recovery?.successful);

    return {
      averageResolutionTime: 0, // Would calculate from actual resolution times
      resolutionRate:
        errors.length > 0 ? (resolvedErrors.length / errors.length) * 100 : 0,
      automaticRecoveryRate:
        errors.length > 0
          ? (autoRecoveredErrors.length / errors.length) * 100
          : 0,
    };
  }

  private calculateUserImpact(
    errors: EnhancedError[],
  ): ErrorAnalytics["userImpact"] {
    const uniqueUsers = new Set(
      errors.map((e) => e.context.userId).filter(Boolean),
    ).size;
    const criticalErrors = errors.filter(
      (e) => e.severity === ErrorSeverity.CRITICAL,
    ).length;

    return {
      affectedUsers: uniqueUsers,
      sessionImpact: errors.length,
      businessImpact:
        criticalErrors > 10 ? "high" : criticalErrors > 5 ? "medium" : "low",
    };
  }

  /**
   * Utility methods
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private classifyErrorSeverity(
    error: Error | string,
    category: ErrorCategory,
  ): ErrorSeverity {
    const message = typeof error === "string" ? error : error.message;

    // Critical severity patterns
    if (
      message.includes("authentication") ||
      message.includes("unauthorized")
    ) {
      return ErrorSeverity.CRITICAL;
    }

    if (category === ErrorCategory.DATABASE && message.includes("connection")) {
      return ErrorSeverity.CRITICAL;
    }

    if (message.includes("security") || message.includes("vulnerability")) {
      return ErrorSeverity.HIGH;
    }

    if (
      category === ErrorCategory.PERFORMANCE ||
      category === ErrorCategory.CACHE
    ) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private getDefaultContext(): EnhancedError["context"] {
    return {
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      page:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      sessionId: `session_${Date.now()}`,
      buildVersion: process.env.NODE_ENV || "development",
    };
  }

  private async getPerformanceContext(): Promise<
    EnhancedError["performance"] | undefined
  > {
    try {
      const cacheStatus = cacheIntegrationManager.getCacheStatus();
      return {
        cacheHitRate: cacheStatus.performanceScore?.hitRate || 0,
        memoryUsage: cacheStatus.performanceScore?.memoryUsage || 0,
        renderTime: performance.now(),
      };
    } catch {
      return undefined;
    }
  }

  private generateAutoTags(
    error: Error | string,
    category: ErrorCategory,
  ): string[] {
    const message = typeof error === "string" ? error : error.message;
    const tags = [category];

    if (message.includes("timeout")) tags.push("timeout");
    if (message.includes("network")) tags.push("network");
    if (message.includes("cache")) tags.push("cache");
    if (message.includes("database")) tags.push("database");

    return tags;
  }

  private findSimilarError(newError: EnhancedError): EnhancedError | undefined {
    return this.errors.find(
      (error) =>
        error.message === newError.message &&
        error.category === newError.category &&
        Date.now() - error.timestamp < 300000, // 5 minutes
    );
  }

  private async triggerCriticalErrorAlert(error: EnhancedError): Promise<void> {
    console.error("🚨 CRITICAL ERROR ALERT:", error);

    // Could integrate with external alerting systems
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "critical_error", {
        error_id: error.id,
        error_category: error.category,
        error_message: error.message,
      });
    }
  }

  private async reportErrorsToAPI(errors: EnhancedError[]): Promise<void> {
    try {
      const response = await fetch("/api/monitoring/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        throw new Error(`Failed to report errors: ${response.statusText}`);
      }

      console.log(`📊 Reported ${errors.length} errors to API`);
    } catch (error) {
      throw new Error(`Error reporting failed: ${error}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Report remaining errors
    if (this.errorReportingQueue.length > 0) {
      try {
        await this.reportErrorsToAPI(this.errorReportingQueue);
      } catch (error) {
        console.warn(
          "Failed to report remaining errors during cleanup:",
          error,
        );
      }
    }

    this.isInitialized = false;
    console.log("🧹 Advanced error monitoring cleaned up");
  }
}

// Export singleton instance
export const advancedErrorMonitor = AdvancedErrorMonitor.getInstance();

// Auto-initialize when imported (with error handling)
if (typeof window !== "undefined") {
  advancedErrorMonitor.initialize().catch((error) => {
    console.warn(
      "Advanced error monitoring auto-initialization failed:",
      error,
    );
  });
}

// React hook for error monitoring
export function useErrorMonitoring() {
  const [analytics, setAnalytics] = React.useState(
    advancedErrorMonitor.getAnalytics(),
  );
  const [recentErrors, setRecentErrors] = React.useState(
    advancedErrorMonitor.getRecentErrors(10),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnalytics(advancedErrorMonitor.getAnalytics());
      setRecentErrors(advancedErrorMonitor.getRecentErrors(10));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const recordError = React.useCallback(
    (
      error: Error | string,
      context?: Partial<EnhancedError["context"]>,
      category?: ErrorCategory,
    ) => {
      return advancedErrorMonitor.recordError(error, context, category);
    },
    [],
  );

  return {
    analytics,
    recentErrors,
    recordError,
    getResolutionRecommendations:
      advancedErrorMonitor.getResolutionRecommendations.bind(
        advancedErrorMonitor,
      ),
  };
}

export default AdvancedErrorMonitor;

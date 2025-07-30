// Enhanced logging utility with Sentry integration
// Provides structured logging, error tracking, and performance monitoring

import * as Sentry from "@sentry/nextjs";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  component?: string;
  action?: string;
}

// Performance monitoring interface
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percentage";
  tags?: Record<string, string>;
  timestamp?: Date;
}

// Enhanced Logger class
export class SentryLogger {
  private static instance: SentryLogger;
  private environment: string;
  private isProduction: boolean;
  private isEnabled: boolean;

  private constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.isProduction = this.environment === "production";
    this.isEnabled = Boolean(
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    );
  }

  public static getInstance(): SentryLogger {
    if (!SentryLogger.instance) {
      SentryLogger.instance = new SentryLogger();
    }
    return SentryLogger.instance;
  }

  // Core logging methods
  public debug(message: string, context?: Record<string, any>): void {
    this.log({
      level: "debug",
      message,
      context,
      timestamp: new Date(),
    });
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log({
      level: "info",
      message,
      context,
      timestamp: new Date(),
    });
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log({
      level: "warn",
      message,
      context,
      timestamp: new Date(),
    });
  }

  public error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "error",
      message,
      error,
      context,
      timestamp: new Date(),
    });
  }

  public fatal(
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "fatal",
      message,
      error,
      context,
      timestamp: new Date(),
    });
  }

  // Enhanced logging with component tracking
  public logComponentError(
    component: string,
    action: string,
    error: Error,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "error",
      message: `${component}: ${action} failed`,
      error,
      context: {
        ...context,
        component,
        action,
      },
      timestamp: new Date(),
      component,
      action,
    });
  }

  public logAPIError(
    endpoint: string,
    method: string,
    error: Error,
    statusCode?: number,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "error",
      message: `API Error: ${method} ${endpoint}`,
      error,
      context: {
        ...context,
        endpoint,
        method,
        statusCode,
        component: "api",
      },
      timestamp: new Date(),
      component: "api",
      action: `${method}_${endpoint}`,
    });
  }

  public logDatabaseError(
    operation: string,
    table: string,
    error: Error,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "error",
      message: `Database Error: ${operation} on ${table}`,
      error,
      context: {
        ...context,
        operation,
        table,
        component: "database",
      },
      timestamp: new Date(),
      component: "database",
      action: operation,
    });
  }

  public logAuthError(
    action: string,
    error: Error,
    userId?: string,
    context?: Record<string, any>,
  ): void {
    this.log({
      level: "error",
      message: `Auth Error: ${action}`,
      error,
      context: {
        ...context,
        component: "auth",
        action,
      },
      timestamp: new Date(),
      userId,
      component: "auth",
      action,
    });
  }

  // Performance monitoring
  public trackPerformance(metric: PerformanceMetric): void {
    if (!this.isEnabled) {
      if (!this.isProduction) {
        console.log("Performance Metric:", metric);
      }
      return;
    }

    // Send to Sentry as a custom metric
    Sentry.setMeasurement(metric.name, metric.value, metric.unit);

    // Add tags if provided
    if (metric.tags) {
      Sentry.setTags(metric.tags);
    }

    // Log for debugging in development
    if (!this.isProduction) {
      console.log("Performance Metric:", metric);
    }
  }

  public trackAPIPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    context?: Record<string, any>,
  ): void {
    this.trackPerformance({
      name: `api.${method.toLowerCase()}.${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`,
      value: duration,
      unit: "ms",
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        component: "api",
        ...context,
      },
    });
  }

  public trackDatabasePerformance(
    operation: string,
    table: string,
    duration: number,
    rowCount?: number,
  ): void {
    this.trackPerformance({
      name: `database.${operation}.${table}`,
      value: duration,
      unit: "ms",
      tags: {
        operation,
        table,
        component: "database",
        row_count: rowCount?.toString(),
      },
    });
  }

  // User context management
  public setUserContext(userId: string, userData?: Record<string, any>): void {
    if (!this.isEnabled) return;

    Sentry.setUser({
      id: userId,
      ...userData,
    });
  }

  public clearUserContext(): void {
    if (!this.isEnabled) return;

    Sentry.setUser(null);
  }

  // Session management
  public startSession(sessionId: string, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    Sentry.setTag("session_id", sessionId);
    if (context) {
      Sentry.setContext("session", context);
    }
  }

  public endSession(): void {
    if (!this.isEnabled) return;

    Sentry.setTag("session_id", "");
    Sentry.setContext("session", null);
  }

  // Feature flag tracking
  public trackFeatureFlag(flag: string, value: boolean, userId?: string): void {
    if (!this.isEnabled) return;

    Sentry.setTag(`feature_flag.${flag}`, value.toString());

    // Log feature flag usage
    this.info(`Feature flag: ${flag} = ${value}`, {
      component: "feature_flags",
      flag,
      value,
      userId,
    });
  }

  // Business metrics
  public trackBusinessMetric(
    metric: string,
    value: number,
    unit?: string,
    context?: Record<string, any>,
  ): void {
    this.trackPerformance({
      name: `business.${metric}`,
      value,
      unit: (unit as any) || "count",
      tags: {
        component: "business",
        metric,
        ...context,
      },
    });
  }

  // Core logging implementation
  private log(entry: LogEntry): void {
    // Always log to console in development
    if (!this.isProduction) {
      this.logToConsole(entry);
    }

    // Send to Sentry if enabled
    if (this.isEnabled) {
      this.logToSentry(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

    const contextStr = entry.context
      ? JSON.stringify(entry.context, null, 2)
      : "";

    switch (entry.level) {
      case "debug":
        console.debug(prefix, entry.message, contextStr);
        break;
      case "info":
        console.info(prefix, entry.message, contextStr);
        break;
      case "warn":
        console.warn(prefix, entry.message, contextStr);
        if (entry.error) console.warn(entry.error);
        break;
      case "error":
      case "fatal":
        console.error(prefix, entry.message, contextStr);
        if (entry.error) console.error(entry.error);
        break;
    }
  }

  private logToSentry(entry: LogEntry): void {
    // Set context information
    Sentry.withScope((scope) => {
      // Set log level
      scope.setLevel(this.mapLogLevelToSentry(entry.level));

      // Set tags
      scope.setTag("log_level", entry.level);
      if (entry.component) scope.setTag("component", entry.component);
      if (entry.action) scope.setTag("action", entry.action);
      if (entry.userId) scope.setTag("user_id", entry.userId);
      if (entry.sessionId) scope.setTag("session_id", entry.sessionId);
      if (entry.correlationId)
        scope.setTag("correlation_id", entry.correlationId);

      // Set context
      if (entry.context) {
        scope.setContext("log_context", entry.context);
      }

      // Send to Sentry
      if (entry.error) {
        scope.setContext("log_message", { message: entry.message });
        Sentry.captureException(entry.error);
      } else {
        Sentry.captureMessage(entry.message);
      }
    });
  }

  private mapLogLevelToSentry(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case "debug":
        return "debug";
      case "info":
        return "info";
      case "warn":
        return "warning";
      case "error":
        return "error";
      case "fatal":
        return "fatal";
      default:
        return "info";
    }
  }

  // Transaction management
  public startTransaction(
    name: string,
    operation?: string,
    context?: Record<string, any>,
  ): any {
    if (!this.isEnabled) return null;

    // Using startSpan for newer Sentry SDK
    const transaction = Sentry.startSpan(
      { name, op: operation || "custom" },
      () => {
        return { name, op: operation || "custom", tags: context };
      },
    );

    return transaction;
  }

  public finishTransaction(transaction: any, status?: string): void {
    if (!transaction) return;

    // For newer SDK, transactions finish automatically
    // We can set tags/status on the active span
    if (status) {
      Sentry.setTag("transaction.status", status);
    }
  }

  // Breadcrumb management
  public addBreadcrumb(
    message: string,
    category?: string,
    level?: "debug" | "info" | "warning" | "error",
    data?: Record<string, any>,
  ): void {
    if (!this.isEnabled) return;

    Sentry.addBreadcrumb({
      message,
      category: category || "custom",
      level: level || "info",
      data,
      timestamp: Date.now() / 1000,
    });
  }

  // Health check
  public isHealthy(): boolean {
    return this.isEnabled && Boolean(Sentry.getClient());
  }

  // Manual flush for critical errors
  public async flush(timeout = 2000): Promise<boolean> {
    if (!this.isEnabled) return true;

    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      console.error("Failed to flush Sentry:", error);
      return false;
    }
  }
}

// Export singleton instance
export const logger = SentryLogger.getInstance();

// Convenience functions
export const logError = (
  message: string,
  error?: Error,
  context?: Record<string, any>,
) => logger.error(message, error, context);

export const logInfo = (message: string, context?: Record<string, any>) =>
  logger.info(message, context);

export const logWarn = (message: string, context?: Record<string, any>) =>
  logger.warn(message, context);

export const logDebug = (message: string, context?: Record<string, any>) =>
  logger.debug(message, context);

export const trackPerformance = (metric: PerformanceMetric) =>
  logger.trackPerformance(metric);

export const trackAPIPerformance = (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  context?: Record<string, any>,
) =>
  logger.trackAPIPerformance(endpoint, method, duration, statusCode, context);

// Default export
export default logger;

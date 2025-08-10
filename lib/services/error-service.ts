/**
 * Centralized Error Service
 * Handles all error logging, monitoring, and reporting across the application
 */

import { config } from "@/lib/config";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";
export type ErrorCategory =
  | "network"
  | "validation"
  | "business"
  | "system"
  | "user";

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ErrorLog {
  message: string;
  error: Error | unknown;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: ErrorContext;
  timestamp: Date;
}

class ErrorService {
  private static instance: ErrorService;
  private errorQueue: ErrorLog[] = [];
  private isProduction = process.env.NODE_ENV === "production";
  private isDebug = config.debug || process.env.NEXT_PUBLIC_DEBUG === "true";

  private constructor() {
    // Initialize error reporting services (e.g., Sentry) if available
    this.initializeErrorReporting();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Initialize third-party error reporting services
   */
  private initializeErrorReporting(): void {
    if (this.isProduction && typeof window !== "undefined") {
      // Initialize Sentry or other monitoring service
      // This would be configured with SENTRY_DSN from environment
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // Sentry initialization would go here
      }
    }
  }

  /**
   * Log an error with appropriate handling based on environment
   */
  logError(
    error: Error | unknown,
    severity: ErrorSeverity = "medium",
    category: ErrorCategory = "system",
    context?: ErrorContext,
  ): void {
    const errorLog: ErrorLog = {
      message: error instanceof Error ? error.message : String(error),
      error,
      severity,
      category,
      context,
      timestamp: new Date(),
    };

    // Add to queue for batch processing
    this.errorQueue.push(errorLog);

    // Handle based on environment
    if (this.isProduction) {
      this.handleProductionError(errorLog);
    } else {
      this.handleDevelopmentError(errorLog);
    }

    // Process critical errors immediately
    if (severity === "critical") {
      this.processCriticalError(errorLog);
    }
  }

  /**
   * Handle errors in production environment
   */
  private handleProductionError(errorLog: ErrorLog): void {
    // Send to monitoring service
    this.sendToMonitoring(errorLog);

    // Log to server if critical
    if (errorLog.severity === "critical" || errorLog.severity === "high") {
      this.sendToServer(errorLog);
    }
  }

  /**
   * Handle errors in development environment
   */
  private handleDevelopmentError(errorLog: ErrorLog): void {
    const { message, error, severity, category, context } = errorLog;

    // Create formatted output for console
    const prefix = `[${severity.toUpperCase()}] [${category}]`;
    const contextStr = context
      ? `\nContext: ${JSON.stringify(context, null, 2)}`
      : "";

    // Use appropriate console method based on severity
    switch (severity) {
      case "critical":
      case "high":
        console.error(`${prefix} ${message}${contextStr}`, error);
        break;
      case "medium":
        console.warn(`${prefix} ${message}${contextStr}`, error);
        break;
      case "low":
        if (this.isDebug) {
          console.log(`${prefix} ${message}${contextStr}`, error);
        }
        break;
    }
  }

  /**
   * Process critical errors that need immediate attention
   */
  private processCriticalError(errorLog: ErrorLog): void {
    // Could trigger UI notifications, emergency logging, etc.
    if (typeof window !== "undefined") {
      // Dispatch custom event for UI error handling
      window.dispatchEvent(
        new CustomEvent("criticalError", {
          detail: {
            message: errorLog.message,
            context: errorLog.context,
          },
        }),
      );
    }
  }

  /**
   * Send error to monitoring service (e.g., Sentry)
   */
  private sendToMonitoring(errorLog: ErrorLog): void {
    // Implementation would depend on monitoring service
    // Example: Sentry.captureException(errorLog.error, { ... })

    // Placeholder for monitoring integration
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(errorLog.error, {
        level: this.mapSeverityToSentryLevel(errorLog.severity),
        tags: {
          category: errorLog.category,
          component: errorLog.context?.component,
        },
        extra: errorLog.context?.metadata,
      });
    }
  }

  /**
   * Send error to backend server for logging
   */
  private async sendToServer(errorLog: ErrorLog): Promise<void> {
    try {
      await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: errorLog.message,
          severity: errorLog.severity,
          category: errorLog.category,
          context: errorLog.context,
          timestamp: errorLog.timestamp.toISOString(),
          stackTrace:
            errorLog.error instanceof Error ? errorLog.error.stack : undefined,
        }),
      });
    } catch (err) {
      // Silently fail to avoid infinite error loops
      if (!this.isProduction) {
        console.error("Failed to send error to server:", err);
      }
    }
  }

  /**
   * Map internal severity to Sentry severity levels
   */
  private mapSeverityToSentryLevel(severity: ErrorSeverity): string {
    const mapping: Record<ErrorSeverity, string> = {
      critical: "fatal",
      high: "error",
      medium: "warning",
      low: "info",
    };
    return mapping[severity];
  }

  /**
   * Convenience methods for different error types
   */

  logNetworkError(error: Error | unknown, context?: ErrorContext): void {
    this.logError(error, "high", "network", context);
  }

  logValidationError(error: Error | unknown, context?: ErrorContext): void {
    this.logError(error, "low", "validation", context);
  }

  logBusinessError(error: Error | unknown, context?: ErrorContext): void {
    this.logError(error, "medium", "business", context);
  }

  logSystemError(error: Error | unknown, context?: ErrorContext): void {
    this.logError(error, "high", "system", context);
  }

  logUserError(error: Error | unknown, context?: ErrorContext): void {
    this.logError(error, "low", "user", context);
  }

  /**
   * Process queued errors (for batch sending)
   */
  async processErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // Batch send to server or monitoring service
    if (this.isProduction) {
      try {
        await fetch("/api/errors/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(errors),
        });
      } catch (err) {
        // Re-queue errors if sending fails
        this.errorQueue.unshift(...errors);
      }
    }
  }

  /**
   * Clear error queue (useful for testing)
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get current error queue size
   */
  getQueueSize(): number {
    return this.errorQueue.length;
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Export convenience functions
export const logError = (
  error: Error | unknown,
  severity?: ErrorSeverity,
  category?: ErrorCategory,
  context?: ErrorContext,
) => errorService.logError(error, severity, category, context);

export const logNetworkError = (
  error: Error | unknown,
  context?: ErrorContext,
) => errorService.logNetworkError(error, context);

export const logValidationError = (
  error: Error | unknown,
  context?: ErrorContext,
) => errorService.logValidationError(error, context);

export const logBusinessError = (
  error: Error | unknown,
  context?: ErrorContext,
) => errorService.logBusinessError(error, context);

export const logSystemError = (
  error: Error | unknown,
  context?: ErrorContext,
) => errorService.logSystemError(error, context);

export const logUserError = (error: Error | unknown, context?: ErrorContext) =>
  errorService.logUserError(error, context);

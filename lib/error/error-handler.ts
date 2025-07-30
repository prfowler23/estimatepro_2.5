import {
  EstimateProError,
  EstimateProErrorClass,
  ErrorType,
  ErrorSeverity,
  classifyError,
} from "./error-types";

// Error reporting service interface
interface ErrorReporter {
  report(error: EstimateProError): Promise<void>;
}

// Console reporter for development
class ConsoleErrorReporter implements ErrorReporter {
  async report(error: EstimateProError): Promise<void> {
    console.group(`🚨 EstimatePro Error [${error.severity.toUpperCase()}]`);
    console.error("Error ID:", error.id);
    console.error("Type:", error.type);
    console.error("Message:", error.message);

    if (error.details) {
      console.error("Details:", error.details);
    }

    if (error.context) {
      console.error("Context:", error.context);
    }

    if (error.originalError) {
      console.error("Original Error:", error.originalError);
    }

    console.groupEnd();
  }
}

// Sentry reporter for production
class SentryErrorReporter implements ErrorReporter {
  async report(error: EstimateProError): Promise<void> {
    try {
      // Dynamic import to avoid issues in environments without Sentry
      const Sentry = await import("@sentry/nextjs");

      Sentry.captureException(error.originalError || new Error(error.message), {
        tags: {
          errorType: error.type,
          severity: error.severity,
          errorId: error.id,
        },
        extra: {
          context: error.context,
          details: error.details,
          isRetryable: error.isRetryable,
        },
        fingerprint: [error.type, error.message],
        level: this.mapSeverityToSentryLevel(error.severity),
      });

      // Also log using our enhanced logger
      const { logger } = await import("@/lib/monitoring/sentry-logger");
      logger.error(`EstimatePro Error: ${error.message}`, error.originalError, {
        errorId: error.id,
        type: error.type,
        severity: error.severity,
        details: error.details,
        context: error.context,
      });
    } catch (reportingError) {
      console.error("Failed to report error to Sentry:", reportingError);
    }
  }

  private mapSeverityToSentryLevel(
    severity: ErrorSeverity,
  ): "fatal" | "error" | "warning" | "info" {
    switch (severity) {
      case "critical":
        return "fatal";
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "error";
    }
  }
}

// Analytics reporter for usage analytics
class AnalyticsErrorReporter implements ErrorReporter {
  async report(error: EstimateProError): Promise<void> {
    try {
      // Report error metrics to analytics service
      const analyticsEvent = {
        event: "error_occurred",
        properties: {
          error_id: error.id,
          error_type: error.type,
          error_severity: error.severity,
          component: error.context?.component,
          user_id: error.context?.userId,
          estimate_id: error.context?.estimateId,
          is_retryable: error.isRetryable,
          timestamp: error.context?.timestamp,
        },
      };

      // In production, send to your analytics service
      console.log("Would report to analytics:", analyticsEvent);
    } catch (reportingError) {
      console.error("Failed to report error to analytics:", reportingError);
    }
  }
}

// Database reporter for persistent error logging
class DatabaseErrorReporter implements ErrorReporter {
  async report(error: EstimateProError): Promise<void> {
    try {
      // Store error in database for analysis
      const errorRecord = {
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        details: error.details,
        context: error.context,
        created_at: new Date().toISOString(),
      };

      // In production, save to your database
      console.log("Would save to database:", errorRecord);
    } catch (reportingError) {
      console.error("Failed to save error to database:", reportingError);
    }
  }
}

// Main error handler class
export class ErrorHandler {
  private reporters: ErrorReporter[] = [];
  private errorCounts = new Map<string, number>();
  private readonly maxRetryCount = 3;
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxErrorsPerWindow = 10;
  private recentErrors: { timestamp: number; type: string }[] = [];

  constructor() {
    this.setupReporters();
    this.setupGlobalErrorHandlers();
  }

  private setupReporters(): void {
    // Always add console reporter
    this.reporters.push(new ConsoleErrorReporter());

    // Add other reporters based on environment
    if (process.env.NODE_ENV === "production") {
      this.reporters.push(new SentryErrorReporter());
      this.reporters.push(new AnalyticsErrorReporter());
      this.reporters.push(new DatabaseErrorReporter());
    } else {
      // In development, also add analytics for testing
      this.reporters.push(new AnalyticsErrorReporter());
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        const error = classifyError(event.reason);
        this.handleError(error, {
          component: "global",
          action: "unhandled_rejection",
        });
        event.preventDefault();
      });

      // Handle global errors
      window.addEventListener("error", (event) => {
        const error = classifyError(event.error);
        this.handleError(error, {
          component: "global",
          action: "global_error",
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });
    }
  }

  public async handleError(
    error: Error | EstimateProError | unknown,
    context?: Partial<EstimateProError["context"]>,
  ): Promise<EstimateProError> {
    // Classify and enhance the error
    const estimateProError = this.enhanceError(error, context);

    // Check rate limiting
    if (this.isRateLimited(estimateProError)) {
      console.warn("Error reporting rate limited:", estimateProError.type);
      return estimateProError;
    }

    // Report to all configured reporters
    await this.reportError(estimateProError);

    // Track error for rate limiting
    this.trackError(estimateProError);

    return estimateProError;
  }

  private enhanceError(
    error: Error | EstimateProError | unknown,
    context?: Partial<EstimateProError["context"]>,
  ): EstimateProError {
    let estimateProError: EstimateProError;

    if (error instanceof EstimateProErrorClass) {
      estimateProError = error.toSerializable();
    } else {
      estimateProError = classifyError(error).toSerializable();
    }

    // Enhance with additional context
    if (context) {
      estimateProError.context = {
        ...estimateProError.context,
        ...context,
      };
    }

    return estimateProError;
  }

  private isRateLimited(error: EstimateProError): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;

    // Clean old errors
    this.recentErrors = this.recentErrors.filter(
      (e) => e.timestamp > windowStart,
    );

    // Check if we're over the limit
    return this.recentErrors.length >= this.maxErrorsPerWindow;
  }

  private trackError(error: EstimateProError): void {
    const now = Date.now();
    this.recentErrors.push({
      timestamp: now,
      type: error.type,
    });

    // Update error counts
    const countKey = `${error.type}:${error.message}`;
    const currentCount = this.errorCounts.get(countKey) || 0;
    this.errorCounts.set(countKey, currentCount + 1);
  }

  private async reportError(error: EstimateProError): Promise<void> {
    const reportPromises = this.reporters.map(async (reporter) => {
      try {
        await reporter.report(error);
      } catch (reportingError) {
        console.error("Error reporter failed:", reportingError);
      }
    });

    await Promise.allSettled(reportPromises);
  }

  public getErrorCount(type?: ErrorType): number {
    if (!type) {
      return Array.from(this.errorCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      );
    }

    let total = 0;
    for (const [key, count] of this.errorCounts.entries()) {
      if (key.startsWith(`${type}:`)) {
        total += count;
      }
    }
    return total;
  }

  public clearErrorCounts(): void {
    this.errorCounts.clear();
    this.recentErrors = [];
  }

  // Method to handle API errors specifically
  public async handleAPIError(
    response: Response,
    context?: Partial<EstimateProError["context"]>,
  ): Promise<EstimateProError> {
    let errorType = ErrorType.API_ERROR;
    let message = `API request failed with status ${response.status}`;
    let severity = ErrorSeverity.MEDIUM;

    // Classify based on status code
    if (response.status === 401) {
      errorType = ErrorType.AUTH_ERROR;
      message = "Authentication required";
      severity = ErrorSeverity.HIGH;
    } else if (response.status === 403) {
      errorType = ErrorType.PERMISSION_ERROR;
      message = "Permission denied";
      severity = ErrorSeverity.HIGH;
    } else if (response.status === 404) {
      message = "Resource not found";
      severity = ErrorSeverity.LOW;
    } else if (response.status >= 500) {
      errorType = ErrorType.INTERNAL_ERROR;
      message = "Server error occurred";
      severity = ErrorSeverity.HIGH;
    } else if (response.status === 429) {
      errorType = ErrorType.AI_RATE_LIMIT;
      message = "Rate limit exceeded";
      severity = ErrorSeverity.MEDIUM;
    }

    const error = new EstimateProErrorClass({
      type: errorType,
      severity,
      message,
      code: response.status.toString(),
      context: {
        ...context,
        metadata: {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
        },
      },
      isRetryable: response.status >= 500 || response.status === 429,
    });

    return await this.handleError(error, context);
  }

  // Method to handle validation errors from forms
  public async handleValidationErrors(
    errors: Record<string, string[]>,
    context?: Partial<EstimateProError["context"]>,
  ): Promise<EstimateProError[]> {
    const errorPromises = Object.entries(errors).map(
      async ([field, messages]) => {
        const error = new EstimateProErrorClass({
          type: ErrorType.VALIDATION_ERROR,
          severity: ErrorSeverity.LOW,
          message: messages.join(", "),
          details: `Field: ${field}`,
          context,
          isRetryable: false,
        });

        return await this.handleError(error, context);
      },
    );

    return Promise.all(errorPromises);
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Convenience function for handling errors
export function handleError(
  error: Error | EstimateProError | unknown,
  context?: Partial<EstimateProError["context"]>,
): Promise<EstimateProError> {
  return errorHandler.handleError(error, context);
}

// Convenience function for API errors
export function handleAPIError(
  response: Response,
  context?: Partial<EstimateProError["context"]>,
): Promise<EstimateProError> {
  return errorHandler.handleAPIError(response, context);
}

// Hook for React components
export function useErrorHandler() {
  return {
    handleError: (
      error: Error | unknown,
      context?: Partial<EstimateProError["context"]>,
    ) => errorHandler.handleError(error, context),
    handleAPIError: (
      response: Response,
      context?: Partial<EstimateProError["context"]>,
    ) => errorHandler.handleAPIError(response, context),
    handleValidationErrors: (
      errors: Record<string, string[]>,
      context?: Partial<EstimateProError["context"]>,
    ) => errorHandler.handleValidationErrors(errors, context),
  };
}

/**
 * Comprehensive Supabase Error Handling System
 *
 * Structured error handling with automatic classification, recovery strategies,
 * and integration with monitoring systems for EstimatePro
 */

import { PostgrestError } from "@supabase/supabase-js";
import {
  DatabaseError,
  TransactionError,
} from "@/lib/utils/database-transactions";

// Error categories for systematic handling
export enum ErrorCategory {
  CONNECTION = "connection",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",
  RATE_LIMIT = "rate_limit",
  SYSTEM = "system",
  NETWORK = "network",
  TIMEOUT = "timeout",
  CACHE = "cache",
  UNKNOWN = "unknown",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Recovery strategies
export enum RecoveryStrategy {
  RETRY = "retry",
  FALLBACK = "fallback",
  USER_INTERVENTION = "user_intervention",
  SYSTEM_RESTART = "system_restart",
  NO_RECOVERY = "no_recovery",
}

// Enhanced error structure
export interface StructuredError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  technicalDetails: {
    originalError: Error;
    stackTrace?: string;
    context: Record<string, any>;
    operation?: string;
    table?: string;
    query?: string;
  };
  recovery: {
    strategy: RecoveryStrategy;
    suggestions: string[];
    retryable: boolean;
    maxRetries?: number;
  };
  monitoring: {
    shouldAlert: boolean;
    alertLevel: "info" | "warn" | "error" | "critical";
    metrics?: Record<string, number>;
  };
}

// Error handler configuration
interface ErrorHandlerConfig {
  enableAutoRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableMonitoring: boolean;
  enableUserFriendlyMessages: boolean;
  enableStackTraceCapture: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Comprehensive error handler for Supabase operations
 */
export class SupabaseErrorHandler {
  private static instance: SupabaseErrorHandler | null = null;
  private config: ErrorHandlerConfig;
  private errorHistory: Map<string, StructuredError[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  // PostgreSQL error code mappings
  private readonly PG_ERROR_CODES: Record<string, ErrorCategory> = {
    "08000": ErrorCategory.CONNECTION, // connection_exception
    "08003": ErrorCategory.CONNECTION, // connection_does_not_exist
    "08006": ErrorCategory.CONNECTION, // connection_failure
    "28000": ErrorCategory.AUTHENTICATION, // invalid_authorization_specification
    "28P01": ErrorCategory.AUTHENTICATION, // invalid_password
    "42501": ErrorCategory.AUTHORIZATION, // insufficient_privilege
    "23505": ErrorCategory.CONFLICT, // unique_violation
    "23503": ErrorCategory.VALIDATION, // foreign_key_violation
    "23502": ErrorCategory.VALIDATION, // not_null_violation
    "23514": ErrorCategory.VALIDATION, // check_violation
    "42P01": ErrorCategory.NOT_FOUND, // undefined_table
    "42703": ErrorCategory.NOT_FOUND, // undefined_column
    "57014": ErrorCategory.TIMEOUT, // query_canceled
    "53300": ErrorCategory.RATE_LIMIT, // too_many_connections
  };

  // User-friendly error messages
  private readonly USER_MESSAGES: Record<ErrorCategory, string> = {
    [ErrorCategory.CONNECTION]:
      "We're having trouble connecting to our servers. Please try again in a moment.",
    [ErrorCategory.AUTHENTICATION]: "Please sign in again to continue.",
    [ErrorCategory.AUTHORIZATION]:
      "You don't have permission to perform this action.",
    [ErrorCategory.VALIDATION]:
      "Please check the information you've entered and try again.",
    [ErrorCategory.NOT_FOUND]: "The requested information could not be found.",
    [ErrorCategory.CONFLICT]:
      "This information conflicts with existing data. Please review and try again.",
    [ErrorCategory.RATE_LIMIT]:
      "Too many requests. Please wait a moment before trying again.",
    [ErrorCategory.SYSTEM]:
      "A system error occurred. Our team has been notified.",
    [ErrorCategory.NETWORK]:
      "Network connection issues. Please check your internet connection.",
    [ErrorCategory.TIMEOUT]: "The operation took too long. Please try again.",
    [ErrorCategory.CACHE]: "Cache error occurred. Data will be refreshed.",
    [ErrorCategory.UNKNOWN]:
      "An unexpected error occurred. Please try again or contact support.",
  };

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableAutoRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      enableMonitoring: true,
      enableUserFriendlyMessages: true,
      enableStackTraceCapture: process.env.NODE_ENV === "development",
      logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
      ...config,
    };
  }

  static getInstance(
    config?: Partial<ErrorHandlerConfig>,
  ): SupabaseErrorHandler {
    if (!SupabaseErrorHandler.instance) {
      SupabaseErrorHandler.instance = new SupabaseErrorHandler(config);
    }
    return SupabaseErrorHandler.instance;
  }

  /**
   * Main error handling entry point
   */
  async handleError(
    error: Error | PostgrestError | DatabaseError,
    context: {
      operation?: string;
      table?: string;
      userId?: string;
      query?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<StructuredError> {
    const errorId = this.generateErrorId();
    const structuredError = await this.analyzeError(error, context, errorId);

    // Log the error
    this.logError(structuredError);

    // Store in history for pattern analysis
    this.storeErrorHistory(structuredError);

    // Handle monitoring and alerts
    if (this.config.enableMonitoring) {
      await this.handleMonitoring(structuredError);
    }

    // Attempt automatic recovery if applicable
    if (structuredError.recovery.retryable && this.config.enableAutoRetry) {
      await this.attemptAutoRetry(structuredError, context);
    }

    return structuredError;
  }

  /**
   * Analyze and categorize error
   */
  private async analyzeError(
    error: Error | PostgrestError | DatabaseError,
    context: any,
    errorId: string,
  ): Promise<StructuredError> {
    const timestamp = new Date();
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let recovery: StructuredError["recovery"] = {
      strategy: RecoveryStrategy.NO_RECOVERY,
      suggestions: [],
      retryable: false,
    };

    // Analyze PostgreSQL errors
    if (this.isPostgrestError(error)) {
      const pgError = error as PostgrestError;
      category = this.categorizePostgresError(pgError);
      severity = this.determineSeverity(category, pgError);
      recovery = this.determineRecoveryStrategy(category, pgError);
    }

    // Analyze Database Transaction errors
    else if (
      error instanceof DatabaseError ||
      error instanceof TransactionError
    ) {
      category = this.categorizeDatabaseError(error);
      severity = this.determineSeverity(category, error);
      recovery = this.determineRecoveryStrategy(category, error);
    }

    // Analyze general errors
    else {
      const analysisResult = this.analyzeGeneralError(error);
      category = analysisResult.category;
      severity = analysisResult.severity;
      recovery = analysisResult.recovery;
    }

    const userMessage = this.config.enableUserFriendlyMessages
      ? this.generateUserFriendlyMessage(category, error)
      : error.message;

    return {
      id: errorId,
      timestamp,
      category,
      severity,
      message: error.message,
      userMessage,
      technicalDetails: {
        originalError: error,
        stackTrace: this.config.enableStackTraceCapture
          ? error.stack
          : undefined,
        context: context || {},
        operation: context?.operation,
        table: context?.table,
        query: context?.query,
      },
      recovery,
      monitoring: {
        shouldAlert:
          severity === ErrorSeverity.HIGH ||
          severity === ErrorSeverity.CRITICAL,
        alertLevel: this.mapSeverityToAlertLevel(severity),
        metrics: this.extractMetrics(error, context),
      },
    };
  }

  /**
   * Determine error category from PostgreSQL error
   */
  private categorizePostgresError(error: PostgrestError): ErrorCategory {
    if (error.code) {
      return this.PG_ERROR_CODES[error.code] || ErrorCategory.SYSTEM;
    }

    // Analyze error message patterns
    const message = error.message.toLowerCase();

    if (message.includes("connection") || message.includes("network")) {
      return ErrorCategory.CONNECTION;
    }
    if (message.includes("permission") || message.includes("unauthorized")) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes("not found") || message.includes("does not exist")) {
      return ErrorCategory.NOT_FOUND;
    }
    if (message.includes("duplicate") || message.includes("conflict")) {
      return ErrorCategory.CONFLICT;
    }
    if (message.includes("timeout") || message.includes("cancelled")) {
      return ErrorCategory.TIMEOUT;
    }

    return ErrorCategory.SYSTEM;
  }

  /**
   * Categorize database transaction errors
   */
  private categorizeDatabaseError(
    error: DatabaseError | TransactionError,
  ): ErrorCategory {
    if (error instanceof TransactionError) {
      return ErrorCategory.SYSTEM;
    }

    const message = error.message.toLowerCase();

    if (message.includes("validation") || message.includes("required")) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes("not found")) {
      return ErrorCategory.NOT_FOUND;
    }
    if (message.includes("duplicate") || message.includes("exists")) {
      return ErrorCategory.CONFLICT;
    }
    if (message.includes("timeout")) {
      return ErrorCategory.TIMEOUT;
    }

    return ErrorCategory.SYSTEM;
  }

  /**
   * Analyze general JavaScript errors
   */
  private analyzeGeneralError(error: Error): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    recovery: StructuredError["recovery"];
  } {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("abort")
    ) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        recovery: {
          strategy: RecoveryStrategy.RETRY,
          suggestions: ["Check network connection", "Try again in a moment"],
          retryable: true,
          maxRetries: 3,
        },
      };
    }

    // Timeout errors
    if (message.includes("timeout")) {
      return {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.HIGH,
        recovery: {
          strategy: RecoveryStrategy.RETRY,
          suggestions: [
            "Operation timed out",
            "Try again with a simpler request",
          ],
          retryable: true,
          maxRetries: 2,
        },
      };
    }

    // Validation errors
    if (
      message.includes("invalid") ||
      message.includes("required") ||
      message.includes("missing")
    ) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        recovery: {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: [
            "Check the data you entered",
            "Ensure all required fields are filled",
          ],
          retryable: false,
        },
      };
    }

    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      recovery: {
        strategy: RecoveryStrategy.USER_INTERVENTION,
        suggestions: [
          "Try refreshing the page",
          "Contact support if the issue persists",
        ],
        retryable: false,
      },
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    category: ErrorCategory,
    error: Error | PostgrestError | DatabaseError,
  ): ErrorSeverity {
    // Critical errors
    if ([ErrorCategory.SYSTEM, ErrorCategory.CONNECTION].includes(category)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (
      [
        ErrorCategory.AUTHENTICATION,
        ErrorCategory.AUTHORIZATION,
        ErrorCategory.TIMEOUT,
      ].includes(category)
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (
      [
        ErrorCategory.CONFLICT,
        ErrorCategory.RATE_LIMIT,
        ErrorCategory.NETWORK,
      ].includes(category)
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors
    if (
      [
        ErrorCategory.VALIDATION,
        ErrorCategory.NOT_FOUND,
        ErrorCategory.CACHE,
      ].includes(category)
    ) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Determine recovery strategy
   */
  private determineRecoveryStrategy(
    category: ErrorCategory,
    error: Error | PostgrestError | DatabaseError,
  ): StructuredError["recovery"] {
    switch (category) {
      case ErrorCategory.CONNECTION:
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return {
          strategy: RecoveryStrategy.RETRY,
          suggestions: [
            "Check network connection",
            "Wait a moment and try again",
          ],
          retryable: true,
          maxRetries: 3,
        };

      case ErrorCategory.RATE_LIMIT:
        return {
          strategy: RecoveryStrategy.RETRY,
          suggestions: ["Too many requests", "Wait before trying again"],
          retryable: true,
          maxRetries: 2,
        };

      case ErrorCategory.AUTHENTICATION:
        return {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: ["Sign in again", "Check your credentials"],
          retryable: false,
        };

      case ErrorCategory.AUTHORIZATION:
        return {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: [
            "You don't have permission",
            "Contact an administrator",
          ],
          retryable: false,
        };

      case ErrorCategory.VALIDATION:
        return {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: [
            "Check your input",
            "Ensure required fields are completed",
          ],
          retryable: false,
        };

      case ErrorCategory.NOT_FOUND:
        return {
          strategy: RecoveryStrategy.FALLBACK,
          suggestions: [
            "Item not found",
            "Try a different search",
            "Refresh the page",
          ],
          retryable: false,
        };

      case ErrorCategory.CONFLICT:
        return {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: [
            "Data conflicts with existing records",
            "Review and modify your input",
          ],
          retryable: false,
        };

      case ErrorCategory.SYSTEM:
        return {
          strategy: RecoveryStrategy.SYSTEM_RESTART,
          suggestions: [
            "System error occurred",
            "Try refreshing the page",
            "Contact support if issue persists",
          ],
          retryable: true,
          maxRetries: 1,
        };

      default:
        return {
          strategy: RecoveryStrategy.USER_INTERVENTION,
          suggestions: [
            "An unexpected error occurred",
            "Try again or contact support",
          ],
          retryable: false,
        };
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserFriendlyMessage(
    category: ErrorCategory,
    error: Error,
  ): string {
    const baseMessage = this.USER_MESSAGES[category];

    // Add specific context for certain error types
    if (
      category === ErrorCategory.VALIDATION &&
      error instanceof DatabaseError
    ) {
      return `${baseMessage} Please check the ${error.table || "data"} information.`;
    }

    return baseMessage;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRetry(
    structuredError: StructuredError,
    context: any,
  ): Promise<void> {
    if (!structuredError.recovery.retryable) {
      return;
    }

    const errorKey = `${context.operation || "unknown"}_${context.table || "unknown"}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;
    const maxRetries =
      structuredError.recovery.maxRetries || this.config.maxRetryAttempts;

    if (currentAttempts >= maxRetries) {
      console.warn(`Max retry attempts reached for ${errorKey}`);
      return;
    }

    this.retryAttempts.set(errorKey, currentAttempts + 1);

    // Exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, currentAttempts);

    console.log(
      `Attempting retry ${currentAttempts + 1}/${maxRetries} for ${errorKey} in ${delay}ms`,
    );

    // Note: Actual retry logic would be implemented in the calling code
    // This method just tracks retry attempts and calculates delays
  }

  /**
   * Handle monitoring and alerting
   */
  private async handleMonitoring(
    structuredError: StructuredError,
  ): Promise<void> {
    if (!structuredError.monitoring.shouldAlert) {
      return;
    }

    // In production, this would integrate with monitoring services
    console.error(`Alert: ${structuredError.monitoring.alertLevel}`, {
      errorId: structuredError.id,
      category: structuredError.category,
      severity: structuredError.severity,
      message: structuredError.message,
      context: structuredError.technicalDetails.context,
    });

    // TODO: Integrate with monitoring services like Sentry, DataDog, etc.
  }

  /**
   * Store error in history for pattern analysis
   */
  private storeErrorHistory(structuredError: StructuredError): void {
    const key = structuredError.category;
    const errors = this.errorHistory.get(key) || [];
    errors.push(structuredError);

    // Keep only last 100 errors per category
    if (errors.length > 100) {
      errors.shift();
    }

    this.errorHistory.set(key, errors);
  }

  /**
   * Log error based on configuration
   */
  private logError(structuredError: StructuredError): void {
    const logMethod = this.getLogMethod(structuredError.severity);

    logMethod(
      `[${structuredError.id}] ${structuredError.category.toUpperCase()}: ${structuredError.message}`,
      {
        severity: structuredError.severity,
        operation: structuredError.technicalDetails.operation,
        table: structuredError.technicalDetails.table,
        context: structuredError.technicalDetails.context,
      },
    );
  }

  // Utility methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isPostgrestError(error: any): error is PostgrestError {
    return (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "details" in error
    );
  }

  private mapSeverityToAlertLevel(
    severity: ErrorSeverity,
  ): "info" | "warn" | "error" | "critical" {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "info";
      case ErrorSeverity.MEDIUM:
        return "warn";
      case ErrorSeverity.HIGH:
        return "error";
      case ErrorSeverity.CRITICAL:
        return "critical";
      default:
        return "error";
    }
  }

  private getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
        return console.error;
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private extractMetrics(error: Error, context: any): Record<string, number> {
    return {
      timestamp: Date.now(),
      userId: context?.userId ? 1 : 0,
      hasContext: Object.keys(context || {}).length,
      stackDepth: error.stack?.split("\n").length || 0,
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: StructuredError[];
  } {
    const allErrors = Array.from(this.errorHistory.values()).flat();

    const errorsByCategory = Object.values(ErrorCategory).reduce(
      (acc, category) => {
        acc[category] = allErrors.filter((e) => e.category === category).length;
        return acc;
      },
      {} as Record<ErrorCategory, number>,
    );

    const errorsBySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = allErrors.filter((e) => e.severity === severity).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>,
    );

    const recentErrors = allErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalErrors: allErrors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
    };
  }

  /**
   * Clear retry attempts for successful operation
   */
  clearRetryAttempts(operationKey: string): void {
    this.retryAttempts.delete(operationKey);
  }

  /**
   * Get current retry count
   */
  getRetryCount(operationKey: string): number {
    return this.retryAttempts.get(operationKey) || 0;
  }
}

// Export singleton and convenience functions
export const supabaseErrorHandler = SupabaseErrorHandler.getInstance();

/**
 * Convenience function for handling Supabase errors
 */
export async function handleSupabaseError(
  error: Error | PostgrestError | DatabaseError,
  context?: {
    operation?: string;
    table?: string;
    userId?: string;
    query?: string;
    metadata?: Record<string, any>;
  },
): Promise<StructuredError> {
  return supabaseErrorHandler.handleError(error, context);
}

/**
 * Convenience function for wrapping operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: {
    operation?: string;
    table?: string;
    userId?: string;
    metadata?: Record<string, any>;
  },
): Promise<T> {
  try {
    const result = await operation();

    // Clear retry attempts on success
    if (context?.operation && context?.table) {
      const operationKey = `${context.operation}_${context.table}`;
      supabaseErrorHandler.clearRetryAttempts(operationKey);
    }

    return result;
  } catch (error) {
    const structuredError = await handleSupabaseError(error as Error, context);
    throw structuredError;
  }
}

export default SupabaseErrorHandler;

/**
 * Error handling types and interfaces
 * Provides comprehensive type definitions for error boundaries and error handling utilities
 */
import { ReactNode, ErrorInfo } from "react";

// Core error types
export type ErrorType =
  | "network"
  | "database"
  | "auth"
  | "ai"
  | "validation"
  | "component"
  | "unknown";

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

// Error recovery actions
export type ErrorRecoveryAction =
  | "retry"
  | "refresh"
  | "home"
  | "settings"
  | "dismiss"
  | "reload";

// Error context information
export interface ErrorContext {
  userId?: string;
  stepId?: string;
  stepNumber?: number;
  componentName?: string;
  featureName?: string;
  flowData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Extended error information
export interface ExtendedError extends Error {
  type?: ErrorType;
  severity?: ErrorSeverity;
  code?: string;
  context?: ErrorContext;
  recoverable?: boolean;
  retryable?: boolean;
  timestamp?: string;
}

// Error boundary state
export interface ErrorBoundaryState {
  hasError: boolean;
  error: ExtendedError | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  recoveryAttempts: number;
  isRecovering: boolean;
}

// Error boundary props
export interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: ExtendedError, errorInfo: ErrorInfo) => void;
  context?: ErrorContext;
  enableLogging?: boolean;
  maxRetries?: number;
  autoRetry?: boolean;
  showDetails?: boolean;
}

// Error recovery configuration
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors: ErrorType[];
  fallbackComponent?: ReactNode;
}

// Error logging configuration
export interface ErrorLoggingConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  sanitizeData: boolean;
  includeStackTrace: boolean;
  includeUserAgent: boolean;
  includeUrl: boolean;
}

// Error analytics data
export interface ErrorAnalytics {
  errorId: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
  context?: ErrorContext;
}

// Error recovery result
export interface ErrorRecoveryResult {
  success: boolean;
  attempt: number;
  nextRetryIn?: number;
  fallbackUsed: boolean;
  message?: string;
}

// Error boundary factory options
export interface ErrorBoundaryFactoryOptions {
  errorType?: ErrorType;
  context?: ErrorContext;
  recoveryConfig?: Partial<ErrorRecoveryConfig>;
  loggingConfig?: Partial<ErrorLoggingConfig>;
  customFallback?: (error: ExtendedError, retry: () => void) => ReactNode;
}

// Error detection utilities
export interface ErrorDetectionUtils {
  detectErrorType: (error: Error) => ErrorType;
  determineErrorSeverity: (error: Error) => ErrorSeverity;
  isRetryableError: (error: Error) => boolean;
  extractErrorCode: (error: Error) => string | undefined;
  enhanceError: (error: Error, context?: ErrorContext) => ExtendedError;
}

// Error notification configuration
export interface ErrorNotificationConfig {
  enabled: boolean;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
  duration: number;
  showDismiss: boolean;
  showRetry: boolean;
  maxNotifications: number;
}

// Error boundary hook return type
export interface UseErrorBoundaryReturn {
  hasError: boolean;
  error: ExtendedError | null;
  resetError: () => void;
  throwError: (error: Error | ExtendedError) => void;
  retryLastAction: () => void;
  recoveryAttempts: number;
}

// Default configurations
export const DEFAULT_ERROR_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  jitter: true,
  retryableErrors: ["network", "ai", "database"],
};

export const DEFAULT_ERROR_LOGGING_CONFIG: ErrorLoggingConfig = {
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === "production",
  sanitizeData: true,
  includeStackTrace: process.env.NODE_ENV === "development",
  includeUserAgent: true,
  includeUrl: true,
};

export const DEFAULT_ERROR_NOTIFICATION_CONFIG: ErrorNotificationConfig = {
  enabled: true,
  position: "top-right",
  duration: 5000,
  showDismiss: true,
  showRetry: true,
  maxNotifications: 3,
};

// Error type guards
export function isExtendedError(error: unknown): error is ExtendedError {
  return error instanceof Error && "type" in error;
}

export function isRetryableError(error: Error): boolean {
  if (isExtendedError(error)) {
    return error.retryable === true;
  }

  const retryableTypes: ErrorType[] = ["network", "ai", "database"];
  const detectedType = detectErrorType(error);
  return retryableTypes.includes(detectedType);
}

// Utility function to detect error type from error message/stack
export function detectErrorType(error: Error): ErrorType {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || "";

  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorStack.includes("fetch") ||
    errorStack.includes("network")
  ) {
    return "network";
  }

  if (
    errorMessage.includes("database") ||
    errorMessage.includes("supabase") ||
    errorMessage.includes("sql") ||
    errorMessage.includes("table") ||
    errorStack.includes("supabase") ||
    errorStack.includes("database")
  ) {
    return "database";
  }

  if (
    errorMessage.includes("auth") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorStack.includes("auth")
  ) {
    return "auth";
  }

  if (
    errorMessage.includes("ai") ||
    errorMessage.includes("openai") ||
    errorMessage.includes("gpt") ||
    errorStack.includes("ai") ||
    errorStack.includes("openai")
  ) {
    return "ai";
  }

  if (
    errorMessage.includes("validation") ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("schema") ||
    errorMessage.includes("required")
  ) {
    return "validation";
  }

  if (
    errorMessage.includes("component") ||
    errorMessage.includes("render") ||
    errorStack.includes("react")
  ) {
    return "component";
  }

  return "unknown";
}

// Utility function to determine error severity
export function determineErrorSeverity(error: Error): ErrorSeverity {
  const errorMessage = error.message.toLowerCase();

  if (
    errorMessage.includes("critical") ||
    errorMessage.includes("fatal") ||
    errorMessage.includes("crash")
  ) {
    return "critical";
  }

  if (
    errorMessage.includes("error") ||
    errorMessage.includes("failed") ||
    errorMessage.includes("exception")
  ) {
    return "high";
  }

  if (
    errorMessage.includes("warning") ||
    errorMessage.includes("deprecated") ||
    errorMessage.includes("timeout")
  ) {
    return "medium";
  }

  return "low";
}

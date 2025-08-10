/**
 * Unified Error Handling Utilities for EstimatePro UI Components
 *
 * This module provides standardized error handling patterns, logging,
 * and recovery mechanisms across the UI component library.
 */

import React from "react";

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

// Error categories
export type ErrorCategory =
  | "network"
  | "validation"
  | "authentication"
  | "authorization"
  | "server"
  | "client"
  | "unknown";

// Error context interface
export interface ErrorContext {
  /** Unique error identifier */
  id: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category for grouping and handling */
  category: ErrorCategory;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Component where error occurred */
  component?: string;
  /** User action that triggered the error */
  userAction?: string;
  /** Additional context data */
  context?: Record<string, any>;
}

// Enhanced error interface
export interface UIError extends Error {
  /** Error context information */
  context: ErrorContext;
  /** Whether error can be recovered from */
  recoverable: boolean;
  /** Suggested recovery actions */
  recoveryActions?: Array<{
    id: string;
    label: string;
    action: () => void | Promise<void>;
  }>;
}

// Error handler function type
export type ErrorHandler = (error: UIError) => void;

// Global error state
interface ErrorState {
  errors: Map<string, UIError>;
  handlers: Set<ErrorHandler>;
  reportingEnabled: boolean;
}

const errorState: ErrorState = {
  errors: new Map(),
  handlers: new Set(),
  reportingEnabled: process.env.NODE_ENV === "production",
};

/**
 * Creates a standardized UI error with context
 */
export function createUIError(
  message: string,
  options: {
    cause?: Error;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    component?: string;
    userAction?: string;
    recoverable?: boolean;
    context?: Record<string, any>;
    recoveryActions?: Array<{
      id: string;
      label: string;
      action: () => void | Promise<void>;
    }>;
  } = {},
): UIError {
  const {
    cause,
    severity = "medium",
    category = "unknown",
    component,
    userAction,
    recoverable = true,
    context = {},
    recoveryActions = [],
  } = options;

  const errorContext: ErrorContext = {
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    severity,
    category,
    timestamp: Date.now(),
    component,
    userAction,
    context,
  };

  const error = new Error(message, { cause }) as UIError;
  error.context = errorContext;
  error.recoverable = recoverable;
  error.recoveryActions = recoveryActions;

  return error;
}

/**
 * Handles errors in a standardized way
 */
export function handleError(error: UIError | Error): void {
  // Convert regular errors to UI errors
  const uiError =
    error instanceof Error && "context" in error
      ? (error as UIError)
      : createUIError(error.message, {
          cause: error instanceof Error ? error : undefined,
          category: "unknown",
          severity: "medium",
        });

  // Store error for debugging
  errorState.errors.set(uiError.context.id, uiError);

  // Notify handlers
  errorState.handlers.forEach((handler) => {
    try {
      handler(uiError);
    } catch (handlerError) {
      console.error("Error handler failed:", handlerError);
    }
  });

  // Log error based on severity
  logError(uiError);

  // Report error if enabled
  if (errorState.reportingEnabled) {
    reportError(uiError);
  }
}

/**
 * Logs errors with appropriate console method
 */
function logError(error: UIError): void {
  const logData = {
    message: error.message,
    context: error.context,
    stack: error.stack,
    cause: error.cause,
  };

  switch (error.context.severity) {
    case "critical":
      console.error("🚨 Critical Error:", logData);
      break;
    case "high":
      console.error("❌ High Severity Error:", logData);
      break;
    case "medium":
      console.warn("⚠️ Medium Severity Error:", logData);
      break;
    case "low":
      console.info("ℹ️ Low Severity Error:", logData);
      break;
  }
}

/**
 * Reports errors to external service (placeholder implementation)
 */
function reportError(error: UIError): void {
  // In a real implementation, this would send to error tracking service
  // like Sentry, LogRocket, Bugsnag, etc.
  try {
    // Placeholder for error reporting
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost"
    ) {
      // Only report in production environments
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          context: error.context,
          stack: error.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silent fail for error reporting
      });
    }
  } catch (reportingError) {
    console.warn("Failed to report error:", reportingError);
  }
}

/**
 * Registers a global error handler
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorState.handlers.add(handler);

  return () => {
    errorState.handlers.delete(handler);
  };
}

/**
 * Retrieves recent errors for debugging
 */
export function getRecentErrors(limit: number = 10): UIError[] {
  const errors = Array.from(errorState.errors.values());
  return errors
    .sort((a, b) => b.context.timestamp - a.context.timestamp)
    .slice(0, limit);
}

/**
 * Clears error history
 */
export function clearErrorHistory(): void {
  errorState.errors.clear();
}

/**
 * React Error Boundary with enhanced error handling
 */
export interface EnhancedErrorBoundaryProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Component name for error context */
  componentName?: string;
  /** Custom error display component */
  fallback?: React.ComponentType<{ error: UIError; retry: () => void }>;
  /** Callback when error occurs */
  onError?: (error: UIError) => void;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: UIError | null;
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EnhancedErrorBoundaryState {
    const uiError = createUIError(error.message, {
      cause: error,
      category: "client",
      severity: "high",
      component: "ErrorBoundary",
    });

    return { hasError: true, error: uiError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const uiError = createUIError(error.message, {
      cause: error,
      category: "client",
      severity: "high",
      component: this.props.componentName || "ErrorBoundary",
      context: {
        errorInfo,
        props: this.props,
      },
    });

    handleError(uiError);
    this.props.onError?.(uiError);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent error={this.state.error} retry={this.retry} />
        );
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-700 mb-4">{this.state.error.message}</p>
          <button
            onClick={this.retry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const handleComponentError = React.useCallback(
    (error: Error | UIError, context?: Partial<ErrorContext>) => {
      const uiError =
        error instanceof Error && "context" in error
          ? (error as UIError)
          : createUIError(error.message, {
              cause: error instanceof Error ? error : undefined,
              ...context,
            });

      handleError(uiError);
    },
    [],
  );

  return { handleError: handleComponentError };
}

/**
 * Hook for creating recovery actions
 */
export function useErrorRecovery() {
  const createRecoveryAction = React.useCallback(
    (id: string, label: string, action: () => void | Promise<void>) => {
      return { id, label, action };
    },
    [],
  );

  const executeRecovery = React.useCallback(
    async (recoveryAction: {
      id: string;
      label: string;
      action: () => void | Promise<void>;
    }) => {
      try {
        await recoveryAction.action();
      } catch (error) {
        const recoveryError = createUIError("Recovery action failed", {
          cause: error instanceof Error ? error : undefined,
          category: "client",
          severity: "medium",
          context: { recoveryActionId: recoveryAction.id },
        });
        handleError(recoveryError);
      }
    },
    [],
  );

  return { createRecoveryAction, executeRecovery };
}

/**
 * Utility for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    component?: string;
    userAction?: string;
    context?: Record<string, any>;
  } = {},
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const uiError = createUIError(
      error instanceof Error ? error.message : "Operation failed",
      {
        cause: error instanceof Error ? error : undefined,
        category: "client",
        severity: "medium",
        ...options,
      },
    );

    handleError(uiError);
    return null;
  }
}

/**
 * Network-specific error handling
 */
export function createNetworkError(
  message: string,
  status?: number,
  context?: Record<string, any>,
): UIError {
  return createUIError(message, {
    category: "network",
    severity: status && status >= 500 ? "high" : "medium",
    context: { status, ...context },
    recoveryActions: [
      {
        id: "retry",
        label: "Retry",
        action: () => window.location.reload(),
      },
      {
        id: "check-connection",
        label: "Check Connection",
        action: () => {
          if (navigator.onLine) {
            alert("Connection appears to be working. Try refreshing the page.");
          } else {
            alert(
              "You appear to be offline. Please check your internet connection.",
            );
          }
        },
      },
    ],
  });
}

/**
 * Validation-specific error handling
 */
export function createValidationError(
  field: string,
  message: string,
  context?: Record<string, any>,
): UIError {
  return createUIError(`Validation failed for ${field}: ${message}`, {
    category: "validation",
    severity: "low",
    context: { field, ...context },
    recoverable: true,
  });
}

// Global error handling setup
if (typeof window !== "undefined") {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = createUIError("Unhandled promise rejection", {
      cause: event.reason instanceof Error ? event.reason : undefined,
      category: "client",
      severity: "high",
      context: { reason: event.reason },
    });

    handleError(error);
  });

  // Handle global errors
  window.addEventListener("error", (event) => {
    const error = createUIError(event.message, {
      cause: event.error,
      category: "client",
      severity: "high",
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    handleError(error);
  });
}

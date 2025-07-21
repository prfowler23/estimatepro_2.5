"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  ErrorRecoveryEngine,
  ErrorContext,
  ErrorMessage,
} from "@/lib/error/error-recovery-engine";
import { EnhancedErrorDisplay } from "./EnhancedErrorDisplay";
import { Alert } from "@/components/ui/alert";
import { error as logError } from "@/lib/utils/logger";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: any;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolateErrors?: boolean; // If true, errors won't bubble up to parent boundaries
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorMessage: ErrorMessage | null;
  isRecovering: boolean;
  recoveryAttempts: number;
}

/**
 * Enhanced Error Boundary with intelligent error recovery
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorMessage: null,
      isRecovering: false,
      recoveryAttempts: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError("ErrorBoundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      component: "ErrorBoundary",
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Process error through recovery engine
    try {
      const errorContext: ErrorContext = {
        errorType: this.categorizeError(error),
        errorCode: this.generateErrorCode(error),
        originalError: error,
        stepId: this.props.stepId || "unknown",
        stepNumber: this.props.stepNumber || 0,
        userId: this.props.userId || "anonymous",
        flowData: this.props.flowData || {},
        userBehavior: {
          previousErrors: [],
          timeOnStep: 0,
          attemptCount: this.state.recoveryAttempts + 1,
        },
      };

      const errorMessage = await ErrorRecoveryEngine.processError(errorContext);

      this.setState({
        errorInfo,
        errorMessage,
      });

      // Log error to analytics
      this.logErrorToAnalytics(error, errorInfo, errorMessage);
    } catch (processingError) {
      logError("Error processing error through recovery engine", {
        error: processingError,
        component: "ErrorBoundary",
        action: "error_processing",
      });

      // Fallback error message
      this.setState({
        errorInfo,
        errorMessage: {
          id: "fallback-error",
          title: "Application Error",
          message: "The application encountered an unexpected error.",
          severity: "error",
          category: "system_error",
          isRecoverable: true,
          canRetry: true,
          userFriendly: "Something went wrong. Please try refreshing the page.",
          recoveryActions: [
            {
              id: "refresh",
              label: "Refresh Page",
              description: "Reload the page to reset the application",
              type: "user-action",
              priority: 1,
              execute: () => window.location.reload(),
            },
          ],
        },
      });
    }
  }

  /**
   * Categorize error based on error message and stack
   */
  private categorizeError(error: Error): ErrorContext["errorType"] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    if (message.includes("network") || message.includes("fetch")) {
      return "network";
    }

    if (message.includes("auth") || message.includes("unauthorized")) {
      return "authentication";
    }

    if (message.includes("permission") || message.includes("forbidden")) {
      return "permission";
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return "validation";
    }

    if (message.includes("quota") || message.includes("rate limit")) {
      return "quota_exceeded";
    }

    if (message.includes("timeout")) {
      return "timeout";
    }

    if (stack.includes("ai") || stack.includes("openai")) {
      return "ai_service";
    }

    if (stack.includes("upload") || message.includes("file")) {
      return "file_upload";
    }

    if (stack.includes("supabase") || message.includes("database")) {
      return "database";
    }

    return "unknown";
  }

  /**
   * Generate error code for tracking
   */
  private generateErrorCode(error: Error): string {
    const errorType = this.categorizeError(error);
    const timestamp = Date.now().toString(36);
    const hash = this.simpleHash(error.message + (error.stack || ""));

    return `${errorType.toUpperCase()}_${timestamp}_${hash}`;
  }

  /**
   * Simple hash function for error identification
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  /**
   * Log error to analytics system
   */
  private logErrorToAnalytics(
    error: Error,
    errorInfo: ErrorInfo,
    errorMessage: ErrorMessage,
  ) {
    try {
      // Send to analytics service
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "exception", {
          description: error.message,
          fatal: false,
          custom_parameters: {
            error_code: errorMessage.id,
            error_type: errorMessage.category,
            step_id: this.props.stepId,
            step_number: this.props.stepNumber,
            recovery_attempts: this.state.recoveryAttempts,
          },
        });
      }

      // Send to error tracking service (e.g., Sentry)
      if (typeof window !== "undefined" && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            errorBoundary: {
              componentStack: errorInfo.componentStack,
              stepId: this.props.stepId,
              stepNumber: this.props.stepNumber,
              recoveryAttempts: this.state.recoveryAttempts,
            },
          },
          tags: {
            errorCode: errorMessage.id,
            errorCategory: errorMessage.category,
            isRecoverable: errorMessage.isRecoverable,
          },
        });
      }
    } catch (analyticsError) {
      logError("Failed to log error to analytics", {
        error: analyticsError,
        component: "ErrorBoundary",
        action: "analytics_logging",
      });
    }
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery() {
    if (!this.state.errorMessage?.isRecoverable) {
      return;
    }

    this.setState({ isRecovering: true });

    try {
      // Find auto-recovery actions
      const autoActions = this.state.errorMessage.recoveryActions.filter(
        (action) => action.type === "auto",
      );

      // Execute auto-recovery actions in priority order
      for (const action of autoActions) {
        try {
          await action.execute();

          // Small delay between actions
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (actionError) {
          logError(`Auto-recovery action ${action.id} failed`, {
            error: actionError,
            action: action.id,
            component: "ErrorBoundary",
          });
        }
      }

      // Wait a moment then try to recover
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 1000);
    } catch (recoveryError) {
      logError("Recovery attempt failed", {
        error: recoveryError,
        component: "ErrorBoundary",
        action: "recovery_attempt",
      });
      this.setState({ isRecovering: false });
    }
  }

  /**
   * Handle manual retry
   */
  private handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorMessage: null,
      isRecovering: false,
      recoveryAttempts: prevState.recoveryAttempts + 1,
    }));
  };

  /**
   * Handle navigation to safe location
   */
  private handleNavigateHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.errorMessage) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use enhanced error display for recoverable errors
      if (this.state.errorMessage.isRecoverable) {
        return (
          <EnhancedErrorDisplay
            errorMessage={this.state.errorMessage}
            isRecovering={this.state.isRecovering}
            onRetry={this.handleRetry}
            onStartRecovery={() => this.attemptRecovery()}
            recoveryAttempts={this.state.recoveryAttempts}
          />
        );
      }

      // Fallback error display for non-recoverable errors
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {this.state.errorMessage.title}
            </h2>

            <p className="text-gray-600 mb-6">
              {this.state.errorMessage.userFriendly}
            </p>

            <div className="space-y-3">
              <Button onClick={this.handleNavigateHome} className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>

            {/* Technical details for developers */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack &&
                    "\n\nStack Trace:\n" + this.state.error.stack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for using error boundary programmatically
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const throwError = React.useCallback((error: Error | string) => {
    setError(error instanceof Error ? error : new Error(error));
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { throwError, resetError };
}

export default ErrorBoundary;

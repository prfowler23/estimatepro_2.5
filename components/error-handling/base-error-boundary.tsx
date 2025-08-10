"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/utils/logger";
import {
  ErrorType,
  ErrorSeverity,
  ErrorContext,
  ExtendedError,
  ErrorBoundaryState,
  BaseErrorBoundaryProps,
  ErrorRecoveryConfig,
  ErrorLoggingConfig,
  DEFAULT_ERROR_RECOVERY_CONFIG,
  DEFAULT_ERROR_LOGGING_CONFIG,
  detectErrorType,
  determineErrorSeverity,
  isRetryableError,
} from "./types";

/**
 * Base Error Boundary Class
 * Provides common error handling logic that can be extended by specific error boundaries
 */
export abstract class BaseErrorBoundary extends Component<
  BaseErrorBoundaryProps,
  ErrorBoundaryState
> {
  protected recoveryConfig: ErrorRecoveryConfig;
  protected loggingConfig: ErrorLoggingConfig;
  protected retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: BaseErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "unknown",
      recoveryAttempts: 0,
      isRecovering: false,
    };

    this.recoveryConfig = {
      ...DEFAULT_ERROR_RECOVERY_CONFIG,
      maxRetries: props.maxRetries ?? DEFAULT_ERROR_RECOVERY_CONFIG.maxRetries,
    };

    this.loggingConfig = {
      ...DEFAULT_ERROR_LOGGING_CONFIG,
      enableConsole:
        props.enableLogging ?? DEFAULT_ERROR_LOGGING_CONFIG.enableConsole,
    };
  }

  public static getDerivedStateFromError(
    error: Error,
  ): Partial<ErrorBoundaryState> {
    const errorType = detectErrorType(error);
    const extendedError: ExtendedError = {
      ...error,
      type: errorType,
      severity: determineErrorSeverity(error),
      retryable: isRetryableError(error),
      timestamp: new Date().toISOString(),
    };

    return {
      hasError: true,
      error: extendedError,
      errorType,
      isRecovering: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const enhancedError = this.enhanceError(error, errorInfo);

    this.setState({ errorInfo });

    // Log the error
    this.logError(enhancedError, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }

    // Auto-retry if configured
    if (this.props.autoRetry && this.canRetry()) {
      this.scheduleAutoRetry();
    }
  }

  public componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  protected enhanceError(error: Error, errorInfo?: ErrorInfo): ExtendedError {
    const errorType = detectErrorType(error);
    const severity = determineErrorSeverity(error);

    return {
      ...error,
      type: errorType,
      severity,
      retryable: isRetryableError(error),
      timestamp: new Date().toISOString(),
      context: {
        ...this.props.context,
        componentStack: errorInfo?.componentStack,
      },
    };
  }

  protected logError(error: ExtendedError, errorInfo?: ErrorInfo): void {
    const errorDetails = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      stack: this.loggingConfig.includeStackTrace ? error.stack : undefined,
      componentStack: errorInfo?.componentStack,
      context: error.context,
      timestamp: error.timestamp,
      url: this.loggingConfig.includeUrl ? window?.location?.href : undefined,
      userAgent: this.loggingConfig.includeUserAgent
        ? navigator?.userAgent
        : undefined,
      retryable: error.retryable,
      recoveryAttempts: this.state.recoveryAttempts,
    };

    if (this.loggingConfig.enableConsole) {
      logger.error(
        `Error Boundary caught ${error.type} error:`,
        error,
        errorDetails,
      );
    }

    // TODO: Send to remote error tracking service (e.g., Sentry)
    if (
      this.loggingConfig.enableRemote &&
      process.env.NODE_ENV === "production"
    ) {
      this.sendToRemoteLogging(errorDetails);
    }
  }

  protected sendToRemoteLogging(errorDetails: Record<string, unknown>): void {
    // Implementation for remote error logging (Sentry, LogRocket, etc.)
    // This is a placeholder for future implementation
    logger.info("Remote error logging not yet implemented", errorDetails);
  }

  protected canRetry(): boolean {
    const { error } = this.state;
    return (
      error?.retryable === true &&
      this.state.recoveryAttempts < this.recoveryConfig.maxRetries
    );
  }

  protected calculateRetryDelay(attempt: number): number {
    let delay = this.recoveryConfig.retryDelay;

    if (this.recoveryConfig.exponentialBackoff) {
      delay = Math.min(delay * Math.pow(2, attempt), 30000); // Max 30 seconds
    }

    if (this.recoveryConfig.jitter) {
      delay += Math.random() * 1000; // Add up to 1 second jitter
    }

    return delay;
  }

  protected scheduleAutoRetry(): void {
    const delay = this.calculateRetryDelay(this.state.recoveryAttempts);

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  }

  protected handleRetry = async (): Promise<void> => {
    if (!this.canRetry()) {
      logger.warn("Cannot retry: max attempts reached or error not retryable");
      return;
    }

    this.setState({ isRecovering: true });

    try {
      // Wait for retry delay
      const delay = this.calculateRetryDelay(this.state.recoveryAttempts);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));

      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        recoveryAttempts: prevState.recoveryAttempts + 1,
        isRecovering: false,
      }));

      logger.info(
        `Error boundary recovery attempt ${this.state.recoveryAttempts + 1} successful`,
      );
    } catch (recoveryError) {
      logger.error("Error during recovery:", recoveryError);
      this.setState({ isRecovering: false });
    }
  };

  protected handleRefresh = (): void => {
    window.location.reload();
  };

  protected handleGoHome = (): void => {
    window.location.href = "/dashboard";
  };

  protected handleGoSettings = (): void => {
    window.location.href = "/settings";
  };

  protected handleDismiss = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    });
  };

  // Abstract methods that must be implemented by child classes
  protected abstract renderErrorUI(): ReactNode;
  protected abstract getErrorActions(): ReactNode[];

  // Optional methods that can be overridden
  protected getErrorIcon(): ReactNode {
    return null;
  }

  protected getErrorTitle(): string {
    const { error } = this.state;
    return error?.type
      ? `${error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error`
      : "Error";
  }

  protected getErrorDescription(): string {
    const { error } = this.state;
    if (!error) return "An unexpected error occurred.";

    switch (error.type) {
      case "network":
        return "We're having trouble connecting to our servers. Please check your internet connection.";
      case "database":
        return "There was an issue accessing the database. This might be a temporary problem.";
      case "auth":
        return "There was an authentication issue. Please try signing in again.";
      case "ai":
        return "The AI service is currently unavailable. You can continue using other features.";
      case "validation":
        return "The data provided is invalid. Please check your inputs and try again.";
      case "component":
        return "A component failed to render properly. This might be a temporary issue.";
      default:
        return "An unexpected error occurred. Please try refreshing the page or contact support.";
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render error UI implemented by child class
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  ErrorBoundaryComponent: React.ComponentType<BaseErrorBoundaryProps>,
  boundaryProps?: Omit<BaseErrorBoundaryProps, "children">,
) {
  return React.forwardRef<unknown, P>((props, ref) => (
    <ErrorBoundaryComponent {...boundaryProps}>
      <WrappedComponent {...props} ref={ref} />
    </ErrorBoundaryComponent>
  ));
}

/**
 * Hook for throwing errors to nearest error boundary
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const throwError = React.useCallback((error: Error | string) => {
    if (typeof error === "string") {
      setError(new Error(error));
    } else {
      setError(error);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { throwError, clearError };
}

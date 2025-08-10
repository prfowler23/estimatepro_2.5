"use client";

import React, {
  Component,
  ErrorInfo as ReactErrorInfo,
  ReactNode,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, MessageSquare } from "lucide-react";
import { AI_CONSTANTS } from "@/lib/types/ai-types";
import { logger } from "@/lib/utils/logger";
import {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorInfo,
} from "./shared/types";
import { getErrorMessage, isRetryableError } from "./shared/utils";

// Base error boundary class for reuse
export abstract class BaseErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    const convertedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack,
    };

    this.logError(error, convertedErrorInfo);
    this.props.onError?.(error, convertedErrorInfo);
    this.setState({ errorInfo: convertedErrorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    if (
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index],
      )
    ) {
      this.resetErrorBoundary();
    }

    // Reset on props change if requested
    if (this.props.resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  protected logError(error: Error, errorInfo: ErrorInfo) {
    const level = this.props.level || "component";
    logger.error(`[${level}] Error Boundary:`, error, errorInfo);

    if (process.env.NODE_ENV === "production") {
      // Send to error monitoring service
      this.reportToMonitoring(error, errorInfo);
    }
  }

  protected reportToMonitoring(error: Error, errorInfo: ErrorInfo) {
    // TODO: Implement Sentry or other monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      level: this.props.level || "component",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    };

    // Log for now, replace with actual monitoring service
    logger.error("Error Report:", errorReport);
  }

  protected resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  protected handleRetry = () => {
    const maxRetries = this.props.maxRetries || AI_CONSTANTS.MAX_RETRIES;

    if (this.state.retryCount < maxRetries) {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  abstract renderError(): ReactNode;

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return this.renderError();
    }

    return this.props.children;
  }
}

// Specific AI Error Boundary implementation
interface AIErrorBoundaryProps extends Omit<ErrorBoundaryProps, "level"> {
  // AI-specific props can go here
}

export class AIErrorBoundary extends BaseErrorBoundary {
  constructor(props: AIErrorBoundaryProps) {
    super(props);
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  private getSuggestions(): string[] {
    const { error } = this.state;
    if (!error) return [];

    const suggestions: string[] = [];
    const errorMessage = getErrorMessage(error).toLowerCase();

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      suggestions.push("Check your internet connection");
      suggestions.push("Try refreshing the page");
    }

    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      suggestions.push("You've made too many requests. Please wait a moment.");
      suggestions.push("Try again in a few seconds");
    }

    if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      suggestions.push("Your session may have expired");
      suggestions.push("Try logging in again");
    }

    if (errorMessage.includes("timeout")) {
      suggestions.push("The request took too long");
      suggestions.push("Check if the service is responding slowly");
    }

    if (suggestions.length === 0) {
      suggestions.push("Try refreshing the page");
      suggestions.push("Contact support if the problem persists");
    }

    return suggestions;
  }

  renderError(): ReactNode {
    const { error, retryCount } = this.state;
    const maxRetries = this.props.maxRetries || AI_CONSTANTS.MAX_RETRIES;
    const canRetry =
      retryCount < maxRetries && error && isRetryableError(error);
    const suggestions = this.getSuggestions();
    const showDetails = this.props.showDetails !== false;

    return (
      <Card
        className="w-full max-w-2xl mx-auto my-8"
        role="alert"
        aria-live="assertive"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            AI Service Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Something went wrong with the AI service</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {error && <p className="font-medium">{getErrorMessage(error)}</p>}
              {suggestions.length > 0 && (
                <div>
                  <p className="font-medium mt-2">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {error && showDetails && process.env.NODE_ENV === "development" && (
            <Alert>
              <AlertTitle>Error Details (Development Only)</AlertTitle>
              <AlertDescription className="mt-2">
                <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {"\n\nComponent Stack:"}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {canRetry && (
              <Button
                onClick={this.handleRetry}
                variant="default"
                aria-label={`Try again. ${maxRetries - retryCount} attempts remaining`}
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Try Again ({maxRetries - retryCount} left)
              </Button>
            )}
            <Button
              onClick={this.handleReload}
              variant="outline"
              aria-label="Reload the entire page"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Reload Page
            </Button>
            <Button
              onClick={this.handleGoHome}
              variant="outline"
              aria-label="Go back to dashboard"
            >
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Go to Dashboard
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium">If this problem persists:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Error ID: {Math.random().toString(36).substr(2, 9)}</li>
              <li>Time: {new Date().toLocaleString()}</li>
              {error && <li>Type: {error.name || "Unknown"}</li>}
              <li>Retry attempts: {retryCount}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }
}

// Hook for using error boundary in functional components
export function useAIErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = () => setError(null);
  const throwError = (error: Error) => setError(error);

  return { resetError, throwError };
}

// Higher-order component for wrapping AI components
export function withAIErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return (props: P) => (
    <AIErrorBoundary fallback={fallback}>
      <Component {...props} />
    </AIErrorBoundary>
  );
}

// AI Feature Error Boundary Component
// Provides graceful error handling for all AI-powered features
"use client";

import React, { ErrorInfo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";
import { AIErrorRecovery } from "./AIErrorRecovery";
import { useRouter } from "next/navigation";
import { AI_CONSTANTS } from "@/lib/types/ai-types";

interface AIFeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorType: "ai-service" | "network" | "validation" | "unknown";
}

interface AIFeatureErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{
    error: Error;
    reset: () => void;
  }>;
  featureName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class AIFeatureErrorBoundary extends React.Component<
  AIFeatureErrorBoundaryProps,
  AIFeatureErrorBoundaryState
> {
  constructor(props: AIFeatureErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorType: "unknown",
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<AIFeatureErrorBoundaryState> {
    // Determine error type based on error message or properties
    let errorType: AIFeatureErrorBoundaryState["errorType"] = "unknown";

    if (
      error.message.includes("AI service") ||
      error.message.includes("OpenAI")
    ) {
      errorType = "ai-service";
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch")
    ) {
      errorType = "network";
    } else if (
      error.message.includes("validation") ||
      error.message.includes("invalid")
    ) {
      errorType = "validation";
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error("AI Feature Error:", error, errorInfo);

    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleRetry = () => {
    // If we've retried too many times, show a different message
    if (this.state.retryCount >= AI_CONSTANTS.MAX_RETRIES) {
      console.warn("Max retries reached for AI feature");
      return;
    }

    this.handleReset();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback component is provided, use it
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            reset={this.handleReset}
          />
        );
      }

      // Check if we should show AIErrorRecovery for AI-specific errors
      if (
        this.state.errorType === "ai-service" &&
        this.state.retryCount < AI_CONSTANTS.MAX_RETRIES
      ) {
        return (
          <AIErrorRecovery
            error={this.state.error}
            onRetry={this.handleRetry}
            onDismiss={this.handleReset}
          />
        );
      }

      // Default error UI
      return (
        <Card className="p-6 m-4 border-destructive">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {this.props.featureName
                  ? `${this.props.featureName} Error`
                  : "AI Feature Error"}
              </h3>

              <p className="text-sm text-muted-foreground mb-4">
                {this.getErrorMessage()}
              </p>

              {process.env.NODE_ENV === "development" && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    <Bug className="inline h-3 w-3 mr-1" />
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                {this.state.retryCount < AI_CONSTANTS.MAX_RETRIES && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={this.handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/dashboard")}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>

              {this.state.retryCount >= AI_CONSTANTS.MAX_RETRIES && (
                <Alert className="mt-4" variant="destructive">
                  <AlertTitle>Maximum Retries Reached</AlertTitle>
                  <AlertDescription>
                    We've tried multiple times but the issue persists. Please
                    try refreshing the page or contact support if the problem
                    continues.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }

  private getErrorMessage(): string {
    switch (this.state.errorType) {
      case "ai-service":
        return "Our AI service is temporarily unavailable. This might be due to high demand or maintenance. Please try again in a moment.";
      case "network":
        return "We're having trouble connecting to our servers. Please check your internet connection and try again.";
      case "validation":
        return "The AI received invalid data. Please check your inputs and try again.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the issue persists.";
    }
  }
}

// Hook for using error boundary in functional components
export function useAIErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const throwError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { throwError, clearError };
}

// Higher-order component for wrapping components with AI error boundary
export function withAIErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  featureName?: string,
) {
  return function WithAIErrorBoundary(props: P) {
    return (
      <AIFeatureErrorBoundary featureName={featureName}>
        <Component {...props} />
      </AIFeatureErrorBoundary>
    );
  };
}

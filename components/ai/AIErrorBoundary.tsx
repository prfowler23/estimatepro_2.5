"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home, MessageSquare } from "lucide-react";
import { AI_CONSTANTS } from "@/lib/types/ai-types";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class AIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AI Component Error:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error monitoring service (e.g., Sentry)
      console.error("AI Error Boundary caught:", {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, retryCount } = this.state;
      const isRetryable = retryCount < AI_CONSTANTS.MAX_RETRIES;

      return (
        <Card className="w-full max-w-2xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              AI Service Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong with the AI service</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>
                  We encountered an error while processing your request. This
                  could be due to:
                </p>
                <ul className="list-disc list-inside text-sm">
                  <li>Temporary service unavailability</li>
                  <li>Network connectivity issues</li>
                  <li>Invalid input data</li>
                  <li>Rate limiting</li>
                </ul>
              </AlertDescription>
            </Alert>

            {error && process.env.NODE_ENV === "development" && (
              <Alert>
                <AlertTitle>Error Details (Development Only)</AlertTitle>
                <AlertDescription className="mt-2">
                  <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                    {error.toString()}
                  </pre>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {isRetryable && (
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({AI_CONSTANTS.MAX_RETRIES - retryCount} attempts
                  left)
                </Button>
              )}
              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                If this problem persists, please contact support with the
                following:
              </p>
              <ul className="list-disc list-inside mt-1">
                <li>Time of error: {new Date().toLocaleString()}</li>
                <li>Your current activity</li>
                {error && <li>Error message: {error.message}</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
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

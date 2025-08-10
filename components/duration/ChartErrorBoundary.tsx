/**
 * Error boundary component for duration chart components
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("Chart component error:", {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Report to error tracking service if available
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          component: "ChartErrorBoundary",
          location: "duration-components",
        },
      });
    }
  }

  handleReset = () => {
    // Call parent reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallbackTitle = "Chart Display Error" } = this.props;

    if (hasError && error) {
      // Check if this is a chart-specific error
      const isChartError =
        error.message.toLowerCase().includes("chart") ||
        error.message.toLowerCase().includes("recharts") ||
        error.message.toLowerCase().includes("render");

      // Determine error severity
      const isRecoverable = errorCount < 3 && isChartError;

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              {fallbackTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to display chart</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>
                  {isChartError
                    ? "There was an issue rendering the chart visualization."
                    : "An unexpected error occurred while processing the data."}
                </p>
                {process.env.NODE_ENV === "development" && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                      {error.toString()}
                      {error.stack && `\n\nStack:\n${error.stack}`}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              {isRecoverable && (
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>

            {errorCount > 1 && (
              <p className="text-sm text-red-600 mt-3">
                This error has occurred {errorCount} times.
                {errorCount >= 3 &&
                  " Please refresh the page or contact support if the issue persists."}
              </p>
            )}

            {/* Fallback content */}
            <div className="mt-6 p-4 bg-white rounded border">
              <p className="text-sm text-muted-foreground">
                Chart data is available but cannot be visualized at this time.
                The functionality of the application is not affected.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withChartErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string,
) {
  return React.forwardRef<any, P>((props, ref) => (
    <ChartErrorBoundary fallbackTitle={fallbackTitle}>
      <Component {...props} ref={ref} />
    </ChartErrorBoundary>
  ));
}

"use client";

import React, { Component, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logSystemError } from "@/lib/services/error-service";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

/**
 * Error Boundary Component for Drone Dashboard
 * Provides graceful error handling and recovery options
 */
export class DroneErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

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
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error service
    logSystemError(error, {
      component: "DroneErrorBoundary",
      action: "componentDidCatch",
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: "DroneErrorBoundary",
        errorCount: this.state.errorCount + 1,
      },
    });

    // Update state with error details
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset after 3 errors to prevent infinite loops
    if (this.state.errorCount >= 3) {
      this.scheduleReset(10000); // Reset after 10 seconds
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => key !== prevProps.resetKeys![idx],
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any props change if specified
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  handleReset = () => {
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <div
          className={
            isolate
              ? "p-4"
              : "min-h-screen flex items-center justify-center p-4"
          }
        >
          <Card className="max-w-2xl w-full">
            <CardHeader className="bg-error-50 border-b border-error-200">
              <CardTitle className="flex items-center gap-2 text-error-700">
                <AlertTriangle className="w-6 h-6" />
                Drone Dashboard Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription className="mt-2">
                  {error.message ||
                    "An unexpected error occurred in the drone dashboard."}
                </AlertDescription>
              </Alert>

              {/* Error details in development */}
              {process.env.NODE_ENV === "development" && errorInfo && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                </div>
              )}

              {/* Error count warning */}
              {errorCount > 1 && (
                <Alert className="bg-warning-50 border-warning-200">
                  <AlertDescription className="text-warning-700">
                    This error has occurred {errorCount} times. The component
                    will auto-reset if it continues to fail.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Help text */}
              <div className="text-sm text-muted-foreground pt-2 border-t">
                <p>If this problem persists, please try:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Refreshing the page</li>
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Contacting support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withDroneErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <DroneErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </DroneErrorBoundary>
  );

  WrappedComponent.displayName = `withDroneErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

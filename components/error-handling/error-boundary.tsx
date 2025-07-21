"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorHandler } from "@/lib/error/error-handler";
import {
  createComponentError,
  EstimateProError,
} from "@/lib/error/error-types";

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorInfo?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  estimateProError: EstimateProError | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  maxRetries?: number;
  level?: "page" | "component" | "section";
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      estimateProError: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || "",
      errorBoundary: this.constructor.name,
      errorInfo: "Component error boundary",
    };

    // Use the centralized error handler
    const estimateProError = await errorHandler.handleError(error, {
      component: this.constructor.name,
      action: "component_catch",
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({
      errorInfo: enhancedErrorInfo,
      estimateProError,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo);
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState((prevState) => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Add delay before retry to avoid immediate re-error
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        estimateProError: null,
      });
    }, 1000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    const { hasError, error, errorInfo, estimateProError, retryCount } =
      this.state;
    const {
      children,
      fallback,
      showDetails = false,
      maxRetries = 3,
      level = "component",
    } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI based on level
      return (
        <div className="error-boundary">
          {level === "page" ? (
            <PageErrorFallback
              error={error}
              errorInfo={errorInfo}
              estimateProError={estimateProError}
              onRetry={this.handleRetry}
              onReload={this.handleReload}
              onGoHome={this.handleGoHome}
              canRetry={retryCount < maxRetries}
              retryCount={retryCount}
              showDetails={showDetails}
            />
          ) : (
            <ComponentErrorFallback
              error={error}
              errorInfo={errorInfo}
              estimateProError={estimateProError}
              onRetry={this.handleRetry}
              canRetry={retryCount < maxRetries}
              retryCount={retryCount}
              showDetails={showDetails}
            />
          )}
        </div>
      );
    }

    return children;
  }
}

// Page-level error fallback
function PageErrorFallback({
  error,
  errorInfo,
  estimateProError,
  onRetry,
  onReload,
  onGoHome,
  canRetry,
  retryCount,
  showDetails,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  estimateProError: EstimateProError | null;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  canRetry: boolean;
  retryCount: number;
  showDetails: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-lg">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again or contact
            support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {estimateProError?.id && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                Error ID: <code className="text-sm">{estimateProError.id}</code>
                {estimateProError.suggestedAction && (
                  <div className="mt-2 text-sm text-gray-600">
                    {estimateProError.suggestedAction}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {showDetails && error && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again {retryCount > 0 && `(${retryCount}/3)`}
              </Button>
            )}
            <Button onClick={onReload} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
            <Button onClick={onGoHome} variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component-level error fallback
function ComponentErrorFallback({
  error,
  errorInfo,
  estimateProError,
  onRetry,
  canRetry,
  retryCount,
  showDetails,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  estimateProError: EstimateProError | null;
  onRetry: () => void;
  canRetry: boolean;
  retryCount: number;
  showDetails: boolean;
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 m-4">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-red-900">Component Error</h3>
          <p className="text-sm text-red-700">
            This component encountered an error and couldn&apos;t render
            properly.
          </p>
        </div>
      </div>

      {estimateProError?.id && (
        <div className="text-xs text-red-600 mb-3">
          Error ID: <code>{estimateProError.id}</code>
          {estimateProError.suggestedAction && (
            <div className="mt-1 text-sm text-red-700">
              {estimateProError.suggestedAction}
            </div>
          )}
        </div>
      )}

      {showDetails && error && (
        <details className="text-sm mb-3">
          <summary className="cursor-pointer font-medium text-red-700 hover:text-red-900">
            Error Details
          </summary>
          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto border">
            {error.message}
          </pre>
        </details>
      )}

      {canRetry && (
        <Button onClick={onRetry} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-3 w-3" />
          Retry {retryCount > 0 && `(${retryCount}/3)`}
        </Button>
      )}
    </div>
  );
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Re-export the centralized error handler hook
export { useErrorHandler } from "@/lib/error/error-handler";

export default ErrorBoundary;

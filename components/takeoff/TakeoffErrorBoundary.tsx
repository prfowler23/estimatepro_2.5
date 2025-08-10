import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class TakeoffErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error("Takeoff component error:", error, errorInfo);

    // You could also report to error tracking service
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-bg-base border border-border-primary rounded-lg">
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Something went wrong with the measurement table
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The measurement component encountered an error. You can try
                    refreshing or continue with other parts of your estimate.
                  </p>
                </div>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-3 p-3 bg-muted rounded-md text-xs font-mono">
                    <summary className="cursor-pointer font-semibold text-muted-foreground">
                      Error Details (Development Mode)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={this.handleReset}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Page
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Back
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="bg-muted/20 p-4 rounded-md border border-border-primary">
            <h4 className="font-medium text-foreground mb-2">
              What you can do:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Save your current progress in other sections</li>
              <li>• Try refreshing the page to restore functionality</li>
              <li>• Contact support if this issue persists</li>
              <li>• Use manual calculations as a temporary workaround</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withTakeoffErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const WrappedComponent: React.FC<P> = (props) => (
    <TakeoffErrorBoundary fallback={fallback}>
      <Component {...props} />
    </TakeoffErrorBoundary>
  );

  WrappedComponent.displayName = `withTakeoffErrorBoundary(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import DOMPurify from "dompurify";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      message: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Only log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Dashboard Error:", errorData);
    }

    // In production, send to error tracking
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined"
    ) {
      // Send to Sentry if available
      if (window.Sentry?.captureException) {
        window.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private sanitizeErrorMessage = (message: string): string => {
    // Use DOMPurify for proper XSS prevention
    if (typeof window !== "undefined") {
      return DOMPurify.sanitize(message, {
        ALLOWED_TAGS: [],
        KEEP_CONTENT: true,
      });
    }
    // Fallback for SSR
    return message
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <Card className="my-4">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-text-error" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Something went wrong
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {this.sanitizeErrorMessage(
                    this.state.error?.message ||
                      "An unexpected error occurred while loading this component.",
                  )}
                </p>
              </div>
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

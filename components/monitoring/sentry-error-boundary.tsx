// Enhanced Error Boundary with Sentry integration
// Provides comprehensive error handling and user feedback

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  ChevronDown,
  Copy,
  Send,
} from "lucide-react";
import { logger } from "@/lib/monitoring/sentry-logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  isExpanded: boolean;
  feedbackSent: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  allowFeedback?: boolean;
  component?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class SentryErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isExpanded: false,
      feedbackSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry and get event ID
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: this.props.component || "unknown",
        error_boundary: true,
      },
    });

    // Log using our enhanced logger
    logger.logComponentError(
      this.props.component || "ErrorBoundary",
      "render",
      error,
      {
        componentStack: errorInfo.componentStack,
        eventId,
      },
    );

    // Update state
    this.setState({
      errorInfo,
      eventId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Log retry attempt
    logger.info("Error boundary retry attempted", {
      component: this.props.component,
      eventId: this.state.eventId,
    });

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isExpanded: false,
      feedbackSent: false,
    });
  };

  handleReload = () => {
    // Log reload attempt
    logger.info("Error boundary page reload", {
      component: this.props.component,
      eventId: this.state.eventId,
    });

    window.location.reload();
  };

  handleCopyError = async () => {
    const errorText = this.getErrorText();
    try {
      await navigator.clipboard.writeText(errorText);
      logger.info("Error details copied to clipboard");
    } catch (err) {
      logger.warn("Failed to copy error details", { error: err });
    }
  };

  handleSendFeedback = () => {
    if (!this.state.eventId) return;

    // Open Sentry user feedback dialog
    Sentry.showReportDialog({
      eventId: this.state.eventId,
      user: {
        name: "User",
        email: "",
      },
    });

    this.setState({ feedbackSent: true });

    logger.info("User feedback dialog opened", {
      eventId: this.state.eventId,
      component: this.props.component,
    });
  };

  getErrorText = (): string => {
    const { error, errorInfo, eventId } = this.state;
    return `
Error: ${error?.message || "Unknown error"}
Component: ${this.props.component || "Unknown"}
Event ID: ${eventId || "N/A"}
Stack: ${error?.stack || "N/A"}
Component Stack: ${errorInfo?.componentStack || "N/A"}
Timestamp: ${new Date().toISOString()}
    `.trim();
  };

  getErrorSeverity = (): "low" | "medium" | "high" => {
    const { error } = this.state;

    if (!error) return "low";

    // Check for critical errors
    if (
      error.message.includes("ChunkLoadError") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("CHUNK_LOAD_FAILED")
    ) {
      return "medium"; // Usually fixable with reload
    }

    if (
      error.message.includes("Network Error") ||
      error.message.includes("Failed to fetch")
    ) {
      return "medium";
    }

    // Default to high for unknown errors
    return "high";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const isChunkError =
        this.state.error?.message.includes("chunk") ||
        this.state.error?.message.includes("Loading");

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {isChunkError
                      ? "App Update Available"
                      : "Something went wrong"}
                  </CardTitle>
                  <CardDescription>
                    {isChunkError
                      ? "The application has been updated. Please refresh to continue."
                      : "An unexpected error occurred while rendering this component."}
                  </CardDescription>
                </div>
                <Badge
                  variant={severity === "high" ? "destructive" : "secondary"}
                >
                  {severity} priority
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Alert */}
              <Alert variant={isChunkError ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong>{" "}
                  {this.state.error?.message || "Unknown error occurred"}
                  {this.state.eventId && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Error ID: {this.state.eventId}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>

                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>

                {this.props.allowFeedback !== false && this.state.eventId && (
                  <Button
                    onClick={this.handleSendFeedback}
                    variant="outline"
                    disabled={this.state.feedbackSent}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {this.state.feedbackSent ? "Feedback Sent" : "Report Issue"}
                  </Button>
                )}

                <Button
                  onClick={this.handleCopyError}
                  variant="ghost"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Details
                </Button>
              </div>

              {/* Detailed Error Information */}
              {this.props.showDetails !== false && (
                <Collapsible
                  open={this.state.isExpanded}
                  onOpenChange={(isExpanded) => this.setState({ isExpanded })}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Technical Details
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-3">
                    <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
                      <div className="space-y-2">
                        <div>
                          <strong>Component:</strong>{" "}
                          {this.props.component || "Unknown"}
                        </div>

                        {this.state.error?.stack && (
                          <div>
                            <strong>Stack Trace:</strong>
                            <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                              {this.state.error.stack}
                            </pre>
                          </div>
                        )}

                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}

                        <div>
                          <strong>Timestamp:</strong> {new Date().toISOString()}
                        </div>

                        {this.state.eventId && (
                          <div>
                            <strong>Sentry Event ID:</strong>{" "}
                            {this.state.eventId}
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Helpful Information */}
              <div className="text-sm text-muted-foreground">
                {isChunkError ? (
                  <p>
                    This usually happens when the app is updated while you're
                    using it. Refreshing the page will load the latest version.
                  </p>
                ) : (
                  <p>
                    If this problem persists, please contact support with the
                    error ID above. Your progress has been automatically saved.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withSentryErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    showDetails?: boolean;
    allowFeedback?: boolean;
    component?: string;
  },
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const WrappedWithErrorBoundary = (props: P) => (
    <SentryErrorBoundary
      component={options?.component || displayName}
      fallback={options?.fallback}
      showDetails={options?.showDetails}
      allowFeedback={options?.allowFeedback}
    >
      <WrappedComponent {...props} />
    </SentryErrorBoundary>
  );

  WrappedWithErrorBoundary.displayName = `withSentryErrorBoundary(${displayName})`;

  return WrappedWithErrorBoundary;
}

// Hook for manual error reporting
export function useSentryErrorHandler() {
  const reportError = React.useCallback(
    (error: Error, context?: Record<string, any>) => {
      const eventId = Sentry.captureException(error, {
        tags: {
          manual_report: true,
        },
        extra: context,
      });

      logger.error("Manual error report", error, {
        eventId,
        ...context,
      });

      return eventId;
    },
    [],
  );

  const reportMessage = React.useCallback(
    (message: string, level: "info" | "warning" | "error" = "info") => {
      const eventId = Sentry.captureMessage(message, level);

      switch (level) {
        case "info":
          logger.info(message);
          break;
        case "warning":
          logger.warn(message);
          break;
        case "error":
          logger.error(message);
          break;
      }

      return eventId;
    },
    [],
  );

  return {
    reportError,
    reportMessage,
  };
}

export default SentryErrorBoundary;

"use client";

import React, { Component, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, HelpCircle } from "lucide-react";

interface HelpErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface HelpErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class HelpErrorBoundary extends Component<
  HelpErrorBoundaryProps,
  HelpErrorBoundaryState
> {
  constructor(props: HelpErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): HelpErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Help System Error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error in analytics if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "help_system_error", {
        error_message: error.message,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-900">Help System Error</h3>
            </div>

            <div className="text-sm text-red-700">
              <p>The help system encountered an unexpected error.</p>
              <p className="mt-2">
                You can continue using the application normally - the help
                system is optional.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-red-800">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-900 whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {"\n\nStack Trace:\n"}
                      {this.state.error.stack}
                    </>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {"\n\nComponent Stack:"}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={this.handleRetry} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Help System
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Hide this error boundary by refreshing the page
                  window.location.reload();
                }}
                className="text-xs"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Refresh Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default HelpErrorBoundary;

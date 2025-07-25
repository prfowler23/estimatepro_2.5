"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Settings,
  Bug,
  Wifi,
  WifiOff,
  Database,
  Bot,
  Globe,
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: "network" | "database" | "auth" | "ai" | "unknown";
  recoveryAttempts: number;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorType: "unknown",
    recoveryAttempts: 0,
    isRecovering: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type based on error message and stack trace
    let errorType: "network" | "database" | "auth" | "ai" | "unknown" =
      "unknown";

    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || "";

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout") ||
      errorStack.includes("fetch") ||
      errorStack.includes("network")
    ) {
      errorType = "network";
    } else if (
      errorMessage.includes("database") ||
      errorMessage.includes("supabase") ||
      errorMessage.includes("sql") ||
      errorMessage.includes("table") ||
      errorStack.includes("supabase") ||
      errorStack.includes("database")
    ) {
      errorType = "database";
    } else if (
      errorMessage.includes("auth") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden") ||
      errorStack.includes("auth")
    ) {
      errorType = "auth";
    } else if (
      errorMessage.includes("ai") ||
      errorMessage.includes("openai") ||
      errorMessage.includes("gpt") ||
      errorStack.includes("ai") ||
      errorStack.includes("openai")
    ) {
      errorType = "ai";
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({ errorInfo });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details for debugging
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      stepId: this.props.stepId,
      stepNumber: this.props.stepNumber,
      userId: this.props.userId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error("Error Details:", errorDetails);

    // In a real app, you'd send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: errorDetails });
  }

  private handleRetry = async () => {
    this.setState({ isRecovering: true });

    try {
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        recoveryAttempts: prevState.recoveryAttempts + 1,
        isRecovering: false,
      }));
    } catch (error) {
      this.setState({ isRecovering: false });
      console.error("Recovery failed:", error);
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleGoSettings = () => {
    window.location.href = "/settings";
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private getErrorIcon() {
    switch (this.state.errorType) {
      case "network":
        return <WifiOff className="h-8 w-8 text-orange-600" />;
      case "database":
        return <Database className="h-8 w-8 text-red-600" />;
      case "auth":
        return <Globe className="h-8 w-8 text-blue-600" />;
      case "ai":
        return <Bot className="h-8 w-8 text-purple-600" />;
      default:
        return <Bug className="h-8 w-8 text-gray-600" />;
    }
  }

  private getErrorTitle() {
    switch (this.state.errorType) {
      case "network":
        return "Connection Error";
      case "database":
        return "Database Error";
      case "auth":
        return "Authentication Error";
      case "ai":
        return "AI Service Error";
      default:
        return "Something Went Wrong";
    }
  }

  private getErrorDescription() {
    switch (this.state.errorType) {
      case "network":
        return "We're having trouble connecting to our servers. Please check your internet connection and try again.";
      case "database":
        return "There was an issue accessing the database. This might be a temporary problem.";
      case "auth":
        return "There was an authentication issue. Please try signing in again.";
      case "ai":
        return "The AI service is currently unavailable. You can continue using other features.";
      default:
        return "An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.";
    }
  }

  private getRecoveryActions() {
    const actions = [];

    // Always show retry for network and database errors
    if (
      this.state.errorType === "network" ||
      this.state.errorType === "database"
    ) {
      actions.push(
        <Button
          key="retry"
          onClick={this.handleRetry}
          disabled={this.state.isRecovering}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${this.state.isRecovering ? "animate-spin" : ""}`}
          />
          {this.state.isRecovering ? "Retrying..." : "Try Again"}
        </Button>,
      );
    }

    // Show refresh for all error types
    actions.push(
      <Button
        key="refresh"
        variant="outline"
        onClick={this.handleRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh Page
      </Button>,
    );

    // Show home button for auth errors
    if (this.state.errorType === "auth") {
      actions.push(
        <Button
          key="home"
          variant="outline"
          onClick={this.handleGoHome}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Button>,
      );
    }

    // Show settings for configuration issues
    if (this.state.errorType === "database" || this.state.errorType === "ai") {
      actions.push(
        <Button
          key="settings"
          variant="outline"
          onClick={this.handleGoSettings}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>,
      );
    }

    return actions;
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-xl">{this.getErrorTitle()}</CardTitle>
              <CardDescription className="text-center">
                {this.getErrorDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Type Badge */}
              <div className="flex justify-center">
                <Badge variant="outline" className="capitalize">
                  {this.state.errorType} Error
                </Badge>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-mono">
                    {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Recovery Actions */}
              <div className="flex flex-col gap-2">
                {this.getRecoveryActions()}
              </div>

              {/* Recovery Attempts */}
              {this.state.recoveryAttempts > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  Recovery attempts: {this.state.recoveryAttempts}
                </div>
              )}

              {/* Contact Support */}
              <div className="text-center text-sm text-muted-foreground">
                Need help? Contact support with error code:{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {this.state.errorType.toUpperCase()}-{Date.now().toString(36)}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

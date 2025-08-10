"use client";

import React, { ReactNode } from "react";
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
  WifiOff,
  Database,
  Bot,
  Globe,
} from "lucide-react";
import { BaseErrorBoundary } from "./base-error-boundary";
import { BaseErrorBoundaryProps, ErrorContext } from "./types";

interface ErrorBoundaryProps extends BaseErrorBoundaryProps {
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: Record<string, unknown>;
}

export class ErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    // Create context from props
    const context: ErrorContext = {
      userId: props.userId,
      stepId: props.stepId,
      stepNumber: props.stepNumber,
      flowData: props.flowData,
    };

    super({
      ...props,
      context,
    });
  }

  protected getErrorIcon(): ReactNode {
    switch (this.state.errorType) {
      case "network":
        return <WifiOff className="h-8 w-8 text-destructive" />;
      case "database":
        return <Database className="h-8 w-8 text-destructive" />;
      case "auth":
        return <Globe className="h-8 w-8 text-primary" />;
      case "ai":
        return <Bot className="h-8 w-8 text-accent" />;
      default:
        return <Bug className="h-8 w-8 text-muted-foreground" />;
    }
  }

  protected getErrorActions(): ReactNode[] {
    const actions: ReactNode[] = [];

    // Show retry for retryable errors
    if (this.canRetry()) {
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

  protected renderErrorUI(): ReactNode {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
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
            <div className="flex flex-col gap-2">{this.getErrorActions()}</div>

            {/* Recovery Attempts */}
            {this.state.recoveryAttempts > 0 && (
              <div className="text-center text-sm text-text-secondary">
                Recovery attempts: {this.state.recoveryAttempts}
              </div>
            )}

            {/* Max retries reached warning */}
            {this.state.recoveryAttempts >= this.recoveryConfig.maxRetries && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Maximum retry attempts reached. Please refresh the page or
                  contact support.
                </AlertDescription>
              </Alert>
            )}

            {/* Contact Support */}
            <div className="text-center text-sm text-text-secondary">
              Need help? Contact support with error code:{" "}
              <code className="bg-bg-subtle px-1 py-0.5 rounded text-xs">
                {this.state.errorType.toUpperCase()}-{Date.now().toString(36)}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

"use client";

import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BaseErrorBoundary } from "./base-error-boundary";
import { BaseErrorBoundaryProps, ErrorContext } from "./types";

interface GuidedFlowErrorBoundaryProps extends BaseErrorBoundaryProps {
  stepName?: string;
  stepIndex?: number;
  flowName?: string;
}

export class GuidedFlowErrorBoundary extends BaseErrorBoundary {
  private stepName: string;
  private stepIndex?: number;
  private flowName: string;

  constructor(props: GuidedFlowErrorBoundaryProps) {
    super(props);

    this.stepName = props.stepName || "Unknown Step";
    this.stepIndex = props.stepIndex;
    this.flowName = props.flowName || "Unknown Flow";
  }

  protected getErrorIcon(): ReactNode {
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  }

  protected getErrorTitle(): string {
    return "Something went wrong";
  }

  protected getErrorDescription(): string {
    const stepInfo =
      this.stepIndex !== undefined
        ? `step ${this.stepIndex + 1} (${this.stepName})`
        : `the ${this.stepName} step`;

    return `We encountered an error while loading ${stepInfo} of the ${this.flowName}. This might be a temporary issue.`;
  }

  protected getErrorActions(): ReactNode[] {
    const actions: ReactNode[] = [
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
    ];

    // Add refresh option for guided flow errors
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

    return actions;
  }

  protected renderErrorUI(): ReactNode {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            {this.getErrorIcon()}
            {this.getErrorTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">{this.getErrorDescription()}</p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="bg-bg-subtle rounded-md p-4 space-y-2">
              <p className="font-mono text-sm text-destructive">
                {this.state.error.message}
              </p>
              {this.state.error.severity && (
                <p className="text-xs text-text-tertiary">
                  Severity: {this.state.error.severity}
                </p>
              )}
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-text-secondary cursor-pointer">
                    Component Stack
                  </summary>
                  <pre className="text-xs text-text-secondary overflow-auto mt-1">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex gap-3">{this.getErrorActions()}</div>

          {/* Recovery Attempts */}
          {this.state.recoveryAttempts > 0 && (
            <div className="text-sm text-text-secondary">
              Recovery attempts: {this.state.recoveryAttempts}
            </div>
          )}

          {/* Flow Context */}
          {(this.stepIndex !== undefined || this.stepName) && (
            <div className="text-sm text-text-tertiary border-t pt-3">
              <p>Flow: {this.flowName}</p>
              {this.stepIndex !== undefined && (
                <p>
                  Step: {this.stepIndex + 1} of {this.stepName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}

export default GuidedFlowErrorBoundary;

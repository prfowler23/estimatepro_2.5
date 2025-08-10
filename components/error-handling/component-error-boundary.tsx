"use client";

import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BaseErrorBoundary } from "./base-error-boundary";
import { BaseErrorBoundaryProps, ErrorContext } from "./types";

interface ComponentErrorBoundaryProps extends BaseErrorBoundaryProps {
  componentName?: string;
  showDetails?: boolean;
}

export class ComponentErrorBoundary extends BaseErrorBoundary {
  private componentName: string;
  private showDetails: boolean;

  constructor(props: ComponentErrorBoundaryProps) {
    // Create context for component-specific errors
    const context: ErrorContext = {
      ...props.context,
      componentName: props.componentName || "Unknown Component",
    };

    super({
      ...props,
      context,
    });

    this.componentName = props.componentName || "Unknown Component";
    this.showDetails =
      props.showDetails ?? process.env.NODE_ENV === "development";
  }

  protected getErrorIcon(): ReactNode {
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  }

  protected getErrorTitle(): string {
    return this.componentName
      ? `Error in ${this.componentName}`
      : "Component Error";
  }

  protected getErrorDescription(): string {
    return "Something went wrong while rendering this component.";
  }

  protected getErrorActions(): ReactNode[] {
    return [
      <Button
        key="retry"
        onClick={this.handleRetry}
        disabled={this.state.isRecovering}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCw
          className={`h-4 w-4 ${this.state.isRecovering ? "animate-spin" : ""}`}
        />
        {this.state.isRecovering ? "Retrying..." : "Try Again"}
      </Button>,
    ];
  }

  protected renderErrorUI(): ReactNode {
    return (
      <Card className="border-border-destructive bg-bg-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-destructive">
            {this.getErrorIcon()}
            {this.getErrorTitle()}
          </CardTitle>
          <CardDescription>{this.getErrorDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {this.showDetails && this.state.error && (
            <div className="rounded-md bg-bg-subtle p-3">
              <p className="text-sm font-mono text-text-secondary">
                {this.state.error.message}
              </p>
              {this.state.error.severity && (
                <p className="text-xs text-text-tertiary mt-1">
                  Severity: {this.state.error.severity}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">{this.getErrorActions()}</div>
          {this.state.recoveryAttempts > 0 && (
            <div className="text-sm text-text-secondary">
              Recovery attempts: {this.state.recoveryAttempts}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}

// HOC for wrapping components with error boundary
export function withComponentErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  errorBoundaryProps?: Omit<ComponentErrorBoundaryProps, "children">,
) {
  const displayName =
    componentName || WrappedComponent.displayName || WrappedComponent.name;

  const WithErrorBoundary = React.forwardRef<unknown, P>((props, ref) => (
    <ComponentErrorBoundary componentName={displayName} {...errorBoundaryProps}>
      <WrappedComponent {...props} ref={ref} />
    </ComponentErrorBoundary>
  ));

  WithErrorBoundary.displayName = `withComponentErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

// Legacy export for backward compatibility
export const withErrorBoundary = withComponentErrorBoundary;

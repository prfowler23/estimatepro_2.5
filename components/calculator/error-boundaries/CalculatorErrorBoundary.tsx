"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  calculatorType?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  retryCount: number;
}

interface ErrorSuggestion {
  icon: ReactNode;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export class CalculatorErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo: errorInfo.componentStack,
    });

    // Use proper logging service instead of console
    import("@/lib/utils/calculator-logger").then(({ calculatorLogger }) => {
      calculatorLogger.error("Calculator component error", {
        calculatorType: this.props.calculatorType,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      });
    });
  }

  private getErrorSuggestions(): ErrorSuggestion[] {
    const { error, retryCount } = this.state;
    const { calculatorType } = this.props;

    const suggestions: ErrorSuggestion[] = [];

    // Retry suggestion
    if (retryCount < this.maxRetries) {
      suggestions.push({
        icon: <RefreshCw className="h-4 w-4" />,
        title: "Try Again",
        description: "Refresh the calculator and try your calculation again.",
        action: this.handleRetry,
        actionLabel: "Retry Calculation",
      });
    }

    // Calculator-specific suggestions
    if (calculatorType) {
      suggestions.push({
        icon: <Calculator className="h-4 w-4" />,
        title: "Switch Calculator",
        description: `Try using a different calculator type or return to the main calculator page.`,
        action: () => (window.location.href = "/calculator"),
        actionLabel: "Go to Calculator",
      });
    }

    // Data recovery suggestion
    suggestions.push({
      icon: <FileText className="h-4 w-4" />,
      title: "Save Your Work",
      description:
        "Your form data may still be recoverable. Check browser storage or try refreshing.",
      action: () => {
        const saved = localStorage.getItem(`calculator-data-${calculatorType}`);
        if (saved) {
          alert("Found saved data! Refreshing page to recover...");
          window.location.reload();
        } else {
          alert("No saved data found. Please re-enter your information.");
        }
      },
      actionLabel: "Check Saved Data",
    });

    return suggestions;
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  private getErrorMessage(): string {
    const { error } = this.state;
    const { calculatorType } = this.props;

    if (error?.message?.includes("network")) {
      return "Network connection issue. Please check your internet connection and try again.";
    }

    if (error?.message?.includes("validation")) {
      return "Input validation error. Please check your entered values and try again.";
    }

    if (error?.message?.includes("calculation")) {
      return `Calculation error in ${calculatorType || "calculator"}. Please verify your inputs and try again.`;
    }

    return `An unexpected error occurred in the ${calculatorType || "calculator"}. Our team has been notified.`;
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const suggestions = this.getErrorSuggestions();
      const errorMessage = this.getErrorMessage();

      return (
        <Card className="p-6 m-4 border-destructive/20">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Calculator Error
                </h3>
                <p className="text-muted-foreground mt-1">{errorMessage}</p>
              </div>

              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">
                    Suggested Actions:
                  </h4>
                  <div className="grid gap-3">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-muted-foreground">
                            {suggestion.icon}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {suggestion.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.description}
                            </div>
                          </div>
                        </div>
                        {suggestion.action && suggestion.actionLabel && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={suggestion.action}
                          >
                            {suggestion.actionLabel}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {process.env.NODE_ENV === "development" && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {this.state.error?.stack}
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

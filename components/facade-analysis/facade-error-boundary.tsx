/**
 * Enhanced error boundary specifically for facade analysis components
 * Provides better error handling and recovery options
 */

import { Component, ReactNode, ErrorInfo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReportOption?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  copied: boolean;
}

export class FacadeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Facade Analysis Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      copied: false,
    });
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;

    const errorText = `
Facade Analysis Error Report
===========================

Error: ${error?.name}: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

Browser: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      toast({
        title: "Error details copied",
        description: "Error information has been copied to clipboard",
      });

      // Reset copied state after 3 seconds
      setTimeout(() => {
        this.setState({ copied: false });
      }, 3000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy error details to clipboard",
        variant: "destructive",
      });
    }
  };

  handleReportIssue = () => {
    const { error } = this.state;
    const title = encodeURIComponent(`Facade Analysis Error: ${error?.name}`);
    const body = encodeURIComponent(`
**Error Description:**
${error?.message}

**Steps to Reproduce:**
1. [Please describe what you were doing when this error occurred]

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
The facade analysis component crashed with the following error:
\`\`\`
${error?.stack}
\`\`\`

**Environment:**
- Browser: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}
    `);

    const issueUrl = `https://github.com/your-org/estimatepro/issues/new?title=${title}&body=${body}&labels=bug,facade-analysis`;
    window.open(issueUrl, "_blank");
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const { showReportOption = true } = this.props;

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Facade Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                The facade analysis component encountered an unexpected error.
                This might be due to corrupted data, network issues, or a
                temporary glitch.
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === "development" && error && (
              <Alert>
                <AlertTitle>Development Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="text-sm font-mono bg-muted p-2 rounded overflow-auto max-h-32">
                    <strong>{error.name}:</strong> {error.message}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleCopyError}
                variant="outline"
                className="gap-2"
                disabled={this.state.copied}
              >
                {this.state.copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Error Details
                  </>
                )}
              </Button>

              {showReportOption && (
                <Button
                  onClick={this.handleReportIssue}
                  variant="outline"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Report Issue
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Possible solutions:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Refresh the page and try the operation again</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache and cookies</li>
                <li>
                  Try uploading different images or using different analysis
                  parameters
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Wrapper hook for functional components
export function withFacadeErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  return function WrappedComponent(props: T) {
    return (
      <FacadeErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </FacadeErrorBoundary>
    );
  };
}

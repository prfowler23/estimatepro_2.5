"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  error?: Error;
  reset?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Our team has been notified.",
  showHomeButton = true,
}: ErrorBoundaryProps) {
  useEffect(() => {
    if (error) {
      console.error("Error boundary caught:", error);
      // Send to error tracking service
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <details>
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
              </details>
            </div>
          )}

          <div className="flex gap-2">
            {reset && (
              <Button onClick={reset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

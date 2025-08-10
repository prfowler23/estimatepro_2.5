import React, { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw } from "lucide-react";

interface DashboardErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> =
  React.memo(({ error, onRetry }) => {
    const retryButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      // Focus retry button on error
      retryButtonRef.current?.focus();
    }, []);

    return (
      <Card role="alert" aria-live="assertive">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Dashboard Unavailable
            </h3>
            <p className="text-muted-foreground mb-4">
              {error || "Unable to load dashboard data"}
            </p>
            <Button
              ref={retryButtonRef}
              onClick={onRetry}
              aria-label="Retry loading dashboard data"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  });

DashboardErrorState.displayName = "DashboardErrorState";

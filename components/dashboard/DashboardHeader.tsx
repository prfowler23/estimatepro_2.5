import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  lastActivity?: Date | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName = "User",
  lastActivity,
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground">
          Business overview and key metrics
          {lastActivity && (
            <span className="ml-2 text-sm">
              • Last activity: {new Date(lastActivity).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          aria-label="Refresh dashboard data"
          aria-busy={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      )}
    </div>
  );
};

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw } from "lucide-react";

interface DashboardErrorStateProps {
  fetchDashboardData: () => void;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  fetchDashboardData,
}) => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Dashboard Unavailable
          </h3>
          <p className="text-muted-foreground mb-4">
            Unable to load dashboard data
          </p>
          <Button onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

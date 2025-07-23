import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Bot } from "lucide-react";

interface DashboardEmptyStateProps {
  fetchDashboardData: () => void;
  navigateTo: (path: string) => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  fetchDashboardData,
  navigateTo,
}) => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first estimate to start seeing dashboard insights
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigateTo("/estimates/new/guided")}>
              <Bot className="h-4 w-4 mr-2" />
              Create AI Estimate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

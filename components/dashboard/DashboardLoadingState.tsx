import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export const DashboardLoadingState: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium mb-2">Loading Dashboard</h3>
          <p className="text-muted-foreground">
            Fetching your business data...
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

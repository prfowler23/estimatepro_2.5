"use client";

import { FileText, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EstimateStoreState } from "@/lib/stores/estimate-store";

interface EstimateHeaderProps {
  estimate: EstimateStoreState | null;
  isEditing: boolean;
  onEditToggle: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

export function EstimateHeader({
  estimate,
  isEditing,
  onEditToggle,
}: EstimateHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <FileText className="h-8 w-8 text-text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {estimate?.estimate_number || "New Estimate"}
          </h1>
          {estimate?.created_at && (
            <p className="text-text-secondary">
              Created {new Date(estimate.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {estimate?.status && (
          <Badge className={getStatusColor(estimate.status)}>
            {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
          </Badge>
        )}
        {!isEditing && (
          <Button onClick={onEditToggle} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

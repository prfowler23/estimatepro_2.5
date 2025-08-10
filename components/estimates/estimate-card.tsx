"use client";

import { memo } from "react";
import {
  FileText,
  User,
  Building,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EstimateStoreState } from "@/lib/stores/estimate-store";

interface EstimateCardProps {
  estimate: EstimateStoreState;
  onView?: (estimateId: string) => void;
  onEdit?: (estimateId: string) => void;
  onDuplicate?: (estimateId: string) => void;
  onDelete?: (estimateId: string) => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800";
    case "sent":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const EstimateCard = memo(function EstimateCard({
  estimate,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: EstimateCardProps) {
  return (
    <Card
      className={`group hover:shadow-md transition-all duration-200 hover:border-primary/20 ${className || ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                {estimate.estimate_number || "New Estimate"}
              </h3>
              {estimate.created_at && (
                <p className="text-sm text-text-secondary flex items-center mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(estimate.created_at)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(estimate.status)}>
              {estimate.status.charAt(0).toUpperCase() +
                estimate.status.slice(1)}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(estimate.id!)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(estimate.id!)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDuplicate?.(estimate.id!)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(estimate.id!)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Customer & Building Info */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-text-secondary">
            <User className="h-4 w-4 mr-2" />
            <span>{estimate.customer_name}</span>
            {estimate.company_name && (
              <>
                <span className="mx-2">•</span>
                <span>{estimate.company_name}</span>
              </>
            )}
          </div>

          <div className="flex items-center text-sm text-text-secondary">
            <Building className="h-4 w-4 mr-2" />
            <span className="truncate">{estimate.building_name}</span>
            {estimate.building_height_stories && (
              <>
                <span className="mx-2">•</span>
                <span>{estimate.building_height_stories} stories</span>
              </>
            )}
          </div>
        </div>

        {/* Services Count & Total */}
        <div className="flex items-center justify-between pt-3 border-t border-border-primary">
          <div className="text-sm text-text-secondary">
            {estimate.services?.length || 0} services
          </div>

          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(estimate.total_price || 0)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(estimate.id!)}
            className="flex-1 hover:bg-primary/10"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(estimate.id!)}
            className="flex-1 hover:bg-primary/10"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

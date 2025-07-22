import React from "react";
import { cn } from "@/lib/utils";
import {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
  ChartSkeleton,
  TextSkeleton,
} from "./skeleton";

interface SkeletonLoaderProps {
  type: "card" | "table" | "list" | "form" | "chart" | "text";
  className?: string;
  variant?: "default" | "shimmer" | "pulse";
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  className,
  variant = "shimmer",
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return <CardSkeleton variant={variant} showImage showFooter />;
      case "table":
        return <TableSkeleton variant={variant} rows={6} columns={5} />;
      case "list":
        return <ListSkeleton variant={variant} items={8} showAvatar />;
      case "form":
        return <FormSkeleton variant={variant} fields={6} />;
      case "chart":
        return <ChartSkeleton variant={variant} />;
      case "text":
        return <TextSkeleton variant={variant} lines={5} />;
      default:
        return <CardSkeleton variant={variant} showImage showFooter />;
    }
  };

  return <div className={cn("w-full", className)}>{renderSkeleton()}</div>;
};

export default SkeletonLoader;

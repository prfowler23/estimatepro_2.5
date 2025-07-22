import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const skeletonVariants = cva("animate-pulse rounded-md bg-bg-muted", {
  variants: {
    variant: {
      default: "bg-bg-muted",
      shimmer:
        "bg-gradient-to-r from-bg-muted via-bg-subtle to-bg-muted bg-[length:200%_100%] animate-shimmer",
      pulse: "animate-pulse bg-bg-muted",
    },
    size: {
      xs: "h-2",
      sm: "h-3",
      default: "h-4",
      lg: "h-6",
      xl: "h-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Skeleton.displayName = "Skeleton";

// Predefined skeleton layouts for common patterns
export function CardSkeleton({
  showImage = false,
  showFooter = false,
  variant = "default",
}: {
  showImage?: boolean;
  showFooter?: boolean;
  variant?: "default" | "shimmer" | "pulse";
}) {
  return (
    <div className="p-6 space-y-4 border border-border-primary rounded-lg bg-bg-elevated">
      {showImage && (
        <Skeleton variant={variant} className="h-48 w-full rounded-md" />
      )}
      <div className="space-y-2">
        <Skeleton variant={variant} className="h-6 w-3/4" />
        <Skeleton variant={variant} className="h-4 w-full" />
        <Skeleton variant={variant} className="h-4 w-2/3" />
      </div>
      {showFooter && (
        <div className="flex justify-between items-center pt-4 border-t border-border-primary/50">
          <Skeleton variant={variant} className="h-8 w-20 rounded-full" />
          <Skeleton variant={variant} className="h-8 w-16" />
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  variant = "default",
}: {
  rows?: number;
  columns?: number;
  variant?: "default" | "shimmer" | "pulse";
}) {
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant={variant} className="h-6 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant={variant} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({
  items = 6,
  showAvatar = false,
  variant = "default",
}: {
  items?: number;
  showAvatar?: boolean;
  variant?: "default" | "shimmer" | "pulse";
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && (
            <Skeleton variant={variant} className="h-10 w-10 rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton variant={variant} className="h-4 w-3/4" />
            <Skeleton variant={variant} className="h-3 w-1/2" />
          </div>
          <Skeleton variant={variant} className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({
  fields = 5,
  variant = "default",
}: {
  fields?: number;
  variant?: "default" | "shimmer" | "pulse";
}) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant={variant} className="h-4 w-24" />
          <Skeleton variant={variant} className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end space-x-2 pt-4">
        <Skeleton variant={variant} className="h-10 w-20 rounded-md" />
        <Skeleton variant={variant} className="h-10 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function ChartSkeleton({
  variant = "default",
}: {
  variant?: "default" | "shimmer" | "pulse";
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton variant={variant} className="h-6 w-32" />
        <div className="flex space-x-2">
          <Skeleton variant={variant} className="h-8 w-20 rounded-md" />
          <Skeleton variant={variant} className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-end space-x-2 h-32">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton
                key={j}
                variant={variant}
                className="flex-1 rounded-t-md"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TextSkeleton({
  lines = 3,
  variant = "default",
}: {
  lines?: number;
  variant?: "default" | "shimmer" | "pulse";
}) {
  const widths = ["w-full", "w-5/6", "w-4/5", "w-3/4", "w-2/3"];

  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn(
            "h-4",
            i === lines - 1 ? widths[Math.min(2, lines - 1)] : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export { Skeleton };

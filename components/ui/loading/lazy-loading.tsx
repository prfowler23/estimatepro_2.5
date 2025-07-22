import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LazyLoadingProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "skeleton";
  skeletonType?: "card" | "table" | "list" | "form" | "chart" | "text";
}

const LoadingSpinner: React.FC<LazyLoadingProps> = ({
  className = "",
  message = "Loading...",
  size = "md",
  variant = "spinner",
  skeletonType = "card",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (variant === "skeleton") {
    // Dynamic import to avoid circular dependencies
    const SkeletonLoader = React.lazy(() => import("./skeleton-loader"));

    return (
      <React.Suspense
        fallback={
          <div
            className={cn(
              "flex items-center justify-center min-h-[200px]",
              className,
            )}
          >
            <div className="flex flex-col items-center space-y-2">
              <Loader2
                className={cn(
                  "animate-spin text-text-secondary",
                  sizeClasses[size],
                )}
              />
              <p className={cn("text-text-secondary", textSizeClasses[size])}>
                {message}
              </p>
            </div>
          </div>
        }
      >
        <SkeletonLoader type={skeletonType} className={className} />
      </React.Suspense>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[200px]",
        className,
      )}
    >
      <div className="flex flex-col items-center space-y-2">
        <Loader2
          className={cn("animate-spin text-text-secondary", sizeClasses[size])}
        />
        <p className={cn("text-text-secondary", textSizeClasses[size])}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

// Component-specific loading states
export const CalculatorLoading = () => (
  <LoadingSpinner message="Loading calculator..." size="lg" />
);

export const PDFLoading = () => (
  <LoadingSpinner message="Generating PDF..." size="md" />
);

export const ChartLoading = () => (
  <LoadingSpinner message="Loading chart..." size="md" />
);

export const AnalysisLoading = () => (
  <LoadingSpinner message="Analyzing data..." size="md" />
);

export const ImageLoading = () => (
  <LoadingSpinner message="Processing images..." size="md" />
);

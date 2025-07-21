import React from "react";
import { Loader2 } from "lucide-react";

interface LazyLoadingProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner: React.FC<LazyLoadingProps> = ({
  className = "",
  message = "Loading...",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={`flex items-center justify-center min-h-[200px] ${className}`}
    >
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
        <p className="text-sm text-muted-foreground">{message}</p>
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

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Reusable variance indicator component
export const VarianceIndicator = React.memo(function VarianceIndicator({
  value,
  showIcon = true,
  format = "percentage",
}: {
  value: number;
  showIcon?: boolean;
  format?: "percentage" | "currency";
}) {
  const getColor = () => {
    if (value > 15) return "text-red-600";
    if (value > 5) return "text-orange-600";
    if (value < -15) return "text-green-600";
    if (value < -5) return "text-blue-600";
    return "text-gray-900";
  };

  const formatValue = () => {
    if (format === "percentage") {
      return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
    }
    return `${value > 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <div className={`flex items-center gap-1 ${getColor()}`}>
      {showIcon && Math.abs(value) >= 5 && (
        <>
          {value > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
        </>
      )}
      <span className="font-medium">{formatValue()}</span>
    </div>
  );
});

// Reusable margin badge component
export const MarginBadge = React.memo(function MarginBadge({
  margin,
  size = "default",
}: {
  margin: number;
  size?: "default" | "sm" | "lg";
}) {
  const getMarginColor = (): string => {
    if (margin >= 30) return "bg-green-100 text-green-700 border-green-200";
    if (margin >= 20) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return <Badge className={getMarginColor()}>{margin.toFixed(1)}%</Badge>;
});

// Reusable cost summary card
export const CostSummaryCard = React.memo(function CostSummaryCard({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
}) {
  return (
    <div className={`${gradient} rounded-lg p-4`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold">
        {typeof value === "number" ? `$${value.toFixed(2)}` : value}
      </p>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
});

// Reusable percentage bar component
export const PercentageBar = React.memo(function PercentageBar({
  label,
  value,
  color,
  showPercentage = true,
}: {
  label: string;
  value: number;
  color?: string;
  showPercentage?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        {showPercentage && <span className="text-sm">{value.toFixed(1)}%</span>}
      </div>
      <Progress value={value} className={`h-3 ${color}`} />
    </div>
  );
});

// Reusable loading spinner component
export const LoadingSpinner = React.memo(function LoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="p-6 text-center">
      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  );
});

// Reusable rating stars component
export const RatingStars = React.memo(function RatingStars({
  rating,
  maxStars = 5,
  showValue = true,
}: {
  rating: number;
  maxStars?: number;
  showValue?: boolean;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center">
      {[...Array(maxStars)].map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? "text-yellow-400 fill-current"
              : i === fullStars && hasHalfStar
                ? "text-yellow-400 fill-current opacity-50"
                : "text-gray-300"
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {showValue && (
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      )}
    </div>
  );
});

// Reusable empty state component
export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-8">
      <Icon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
});

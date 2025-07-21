"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Info,
  LucideIcon,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendPercentage?: number;
  colorScheme?: "success" | "warning" | "error" | "info";
  description?: string;
  benchmark?: number;
  target?: number;
  chartType?: "line" | "bar" | "pie" | "gauge" | "number";
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend = "stable",
  trendPercentage = 0,
  colorScheme = "info",
  description,
  benchmark,
  target,
  chartType = "number",
  className = "",
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  const getColorScheme = () => {
    switch (colorScheme) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-800",
          icon: "text-green-600",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-800",
          icon: "text-yellow-600",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: "text-red-600",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          icon: "text-blue-600",
        };
    }
  };

  const colors = getColorScheme();

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(unit === "%" ? 1 : 0);
  };

  const calculateProgress = () => {
    if (target) {
      return Math.min((value / target) * 100, 100);
    }
    return 0;
  };

  return (
    <Card className={`p-4 ${colors.bg} ${colors.border} ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${colors.icon}`} />}
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>

          {description && (
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {description}
              </div>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${colors.text}`}>
              {formatValue(value)}
            </span>
            <span className={`text-sm ${colors.text} opacity-75`}>{unit}</span>
          </div>

          {/* Trend Indicator */}
          {trendPercentage !== 0 && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-sm ${getTrendColor()}`}>
                {Math.abs(trendPercentage).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs previous period</span>
            </div>
          )}
        </div>

        {/* Progress Bar (for gauge type or when target is set) */}
        {(chartType === "gauge" || target) && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>{calculateProgress().toFixed(0)}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
            {target && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Current: {formatValue(value)}</span>
                <span>Target: {formatValue(target)}</span>
              </div>
            )}
          </div>
        )}

        {/* Benchmark Comparison */}
        {benchmark && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Benchmark</span>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-gray-400" />
              <span
                className={`${
                  value >= benchmark ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatValue(benchmark)} {unit}
              </span>
            </div>
          </div>
        )}

        {/* Mini Chart for line/bar types */}
        {chartType === "line" && (
          <div className="h-12 bg-white rounded border">
            <div className="h-full flex items-end justify-between px-2">
              {/* Simplified mini chart representation */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 ${colors.bg} rounded-t`}
                  style={{
                    height: `${Math.random() * 100}%`,
                    minHeight: "4px",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {chartType === "bar" && (
          <div className="h-12 bg-white rounded border">
            <div className="h-full flex items-end justify-between px-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 ${colors.bg} rounded-t`}
                  style={{
                    height: `${Math.random() * 100}%`,
                    minHeight: "4px",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {chartType === "pie" && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 relative">
              <div
                className={`absolute inset-0 rounded-full border-4 ${colors.border}`}
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    50 +
                    50 * Math.cos(2 * Math.PI * (value / 100) - Math.PI / 2)
                  }% ${
                    50 +
                    50 * Math.sin(2 * Math.PI * (value / 100) - Math.PI / 2)
                  }%, 50% 50%)`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default MetricCard;

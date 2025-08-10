// Performance Stat Card Component
// Displays individual performance metric with trend indicator

"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PerformanceStatCardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export const PerformanceStatCard: React.FC<PerformanceStatCardProps> = ({
  title,
  value,
  trend,
  icon,
  color,
  subtitle,
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{formatValue(value)}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            <div className={`${color}`}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

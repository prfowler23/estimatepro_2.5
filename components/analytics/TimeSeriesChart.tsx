"use client";

import React from "react";
import { TimeSeriesData } from "@/lib/types/analytics-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  metrics: string[];
  height?: number;
  timeRange?: string;
  className?: string;
}

export function TimeSeriesChart({
  data,
  metrics,
  height = 300,
  timeRange = "30days",
  className = "",
}: TimeSeriesChartProps) {
  // Process data to group by date and include multiple metrics
  const processedData = React.useMemo(() => {
    const grouped = data.reduce(
      (acc, item) => {
        const dateKey = item.date.toLocaleDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            timestamp: item.date.getTime(),
          };
        }
        acc[dateKey][item.metric] = item.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const colors = {
    completion_rate: "#10B981",
    quality_score: "#3B82F6",
    avg_duration: "#F59E0B",
    error_rate: "#EF4444",
    ai_usage: "#8B5CF6",
  };

  const getMetricName = (metric: string) => {
    switch (metric) {
      case "completion_rate":
        return "Completion Rate (%)";
      case "quality_score":
        return "Quality Score";
      case "avg_duration":
        return "Avg Duration (min)";
      case "error_rate":
        return "Error Rate (%)";
      case "ai_usage":
        return "AI Usage (%)";
      default:
        return metric
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  if (!processedData || processedData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-gray-500 ${className}`}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">📈</div>
          <p>No time series data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}:</span>
                        <span className="font-medium">
                          {typeof entry.value === "number"
                            ? entry.value.toFixed(1)
                            : entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          {metrics.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={
                colors[metric as keyof typeof colors] ||
                `hsl(${index * 60}, 70%, 50%)`
              }
              strokeWidth={2}
              name={getMetricName(metric)}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TimeSeriesChart;

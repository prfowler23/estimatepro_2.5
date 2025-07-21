"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TimeSeriesData } from "@/lib/types/analytics-types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface WorkflowChartProps {
  data: TimeSeriesData[];
  type:
    | "completion_status"
    | "step_performance"
    | "seasonal"
    | "line"
    | "bar"
    | "pie"
    | "area";
  height?: number;
  className?: string;
}

export function WorkflowChart({
  data,
  type,
  height = 300,
  className = "",
}: WorkflowChartProps) {
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (type) {
      case "completion_status":
        return processCompletionStatusData(data);
      case "step_performance":
        return processStepPerformanceData(data);
      case "seasonal":
        return processSeasonalData(data);
      default:
        return data.map((d) => ({
          ...d,
          date: d.date.toLocaleDateString(),
          value: Math.round(d.value * 100) / 100,
        }));
    }
  }, [data, type]);

  const colors = {
    primary: "#3B82F6",
    secondary: "#10B981",
    accent: "#F59E0B",
    warning: "#EF4444",
    info: "#8B5CF6",
    success: "#06B6D4",
    muted: "#6B7280",
  };

  const pieColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.warning,
    colors.info,
    colors.success,
  ];

  const renderTooltip = (
    active?: boolean,
    payload?: any[],
    label?: string | number,
  ) => {
    if (active && payload && payload.length && label !== undefined) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{String(label)}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!processedData || processedData.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <p>No data available</p>
          </div>
        </div>
      </Card>
    );
  }

  const renderChart = () => {
    switch (type) {
      case "completion_status":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="1"
                stroke={colors.success}
                fill={colors.success}
                fillOpacity={0.7}
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="inProgress"
                stackId="1"
                stroke={colors.accent}
                fill={colors.accent}
                fillOpacity={0.7}
                name="In Progress"
              />
              <Area
                type="monotone"
                dataKey="abandoned"
                stackId="1"
                stroke={colors.warning}
                fill={colors.warning}
                fillOpacity={0.7}
                name="Abandoned"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "step_performance":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="step" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Legend />
              <Bar
                dataKey="avgDuration"
                fill={colors.primary}
                name="Avg Duration (min)"
              />
              <Bar
                dataKey="errorRate"
                fill={colors.warning}
                name="Error Rate (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "seasonal":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="thisYear"
                stroke={colors.primary}
                strokeWidth={2}
                name="This Year"
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                stroke={colors.muted}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Last Year"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({
                  name,
                  percent,
                }: {
                  name?: string;
                  percent?: number;
                }) =>
                  `${name || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Bar dataKey="value" fill={colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                content={({ active, payload, label }) =>
                  renderTooltip(active, payload, label)
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.primary}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return <div className={className}>{renderChart()}</div>;
}

// Data processing functions
function processCompletionStatusData(data: TimeSeriesData[]) {
  // Group data by date and calculate completion statuses
  const grouped = data.reduce(
    (acc, item) => {
      const date = item.date.toLocaleDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          completed: 0,
          inProgress: 0,
          abandoned: 0,
        };
      }

      // This is a simplified example - in reality, you'd calculate based on actual workflow statuses
      acc[date].completed += Math.floor(item.value * 0.7);
      acc[date].inProgress += Math.floor(item.value * 0.2);
      acc[date].abandoned += Math.floor(item.value * 0.1);

      return acc;
    },
    {} as Record<string, any>,
  );

  return Object.values(grouped);
}

function processStepPerformanceData(data: TimeSeriesData[]) {
  // Generate step performance data
  const steps = [
    "Initial Contact",
    "Scope Details",
    "Files/Photos",
    "Area of Work",
    "Takeoff",
    "Duration",
    "Expenses",
    "Pricing",
    "Summary",
  ];

  return steps.map((step, index) => ({
    step,
    avgDuration: Math.random() * 20 + 5, // Random duration between 5-25 minutes
    errorRate: Math.random() * 15 + 2, // Random error rate between 2-17%
    completionRate: Math.random() * 20 + 80, // Random completion rate between 80-100%
  }));
}

function processSeasonalData(data: TimeSeriesData[]) {
  // Generate seasonal comparison data
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return months.map((month) => ({
    period: month,
    thisYear: Math.random() * 100 + 50,
    lastYear: Math.random() * 100 + 40,
  }));
}

export default WorkflowChart;

// Reusable chart components for AI dashboards
"use client";

import React, { memo, useMemo, useCallback } from "react";
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
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartDataPoint,
  TimeSeriesData,
  CategoryData,
} from "./types";
import { DEFAULT_CHART_COLORS } from "./utils";

// Custom tooltip component
const CustomTooltip = memo(
  ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  },
);

CustomTooltip.displayName = "CustomTooltip";

// Base chart wrapper with loading and error states
interface ChartWrapperProps {
  title?: string;
  loading?: boolean;
  error?: Error | null;
  children: React.ReactNode;
  className?: string;
}

export const ChartWrapper = memo(
  ({ title, loading, error, children, className = "" }: ChartWrapperProps) => {
    if (loading) {
      return (
        <Card className={className}>
          <CardHeader>{title && <CardTitle>{title}</CardTitle>}</CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Loading chart...
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className={className}>
          <CardHeader>{title && <CardTitle>{title}</CardTitle>}</CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-destructive">Failed to load chart data</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
      </Card>
    );
  },
);

ChartWrapper.displayName = "ChartWrapper";

// Time series line chart
interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title?: string;
  dataKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export const TimeSeriesChart = memo(
  ({
    data,
    title,
    dataKey = "value",
    color = DEFAULT_CHART_COLORS[0],
    height = 300,
    showGrid = true,
    showLegend = false,
    className = "",
  }: TimeSeriesChartProps) => {
    const chartData = useMemo(() => data, [data]);

    return (
      <ChartWrapper title={title} className={className}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey="time" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>
    );
  },
);

TimeSeriesChart.displayName = "TimeSeriesChart";

// Category bar chart
interface CategoryBarChartProps {
  data: CategoryData[];
  title?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  showGrid?: boolean;
  className?: string;
}

export const CategoryBarChart = memo(
  ({
    data,
    title,
    color = DEFAULT_CHART_COLORS[0],
    height = 300,
    horizontal = false,
    showGrid = true,
    className = "",
  }: CategoryBarChartProps) => {
    const chartData = useMemo(() => data, [data]);

    return (
      <ChartWrapper title={title} className={className}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout={horizontal ? "horizontal" : "vertical"}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            {horizontal ? (
              <>
                <XAxis type="number" className="text-xs" />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={100}
                  className="text-xs"
                />
              </>
            ) : (
              <>
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>
    );
  },
);

CategoryBarChart.displayName = "CategoryBarChart";

// Distribution pie chart
interface DistributionPieChartProps {
  data: CategoryData[];
  title?: string;
  colors?: string[];
  height?: number;
  showPercentage?: boolean;
  className?: string;
}

export const DistributionPieChart = memo(
  ({
    data,
    title,
    colors = DEFAULT_CHART_COLORS,
    height = 300,
    showPercentage = true,
    className = "",
  }: DistributionPieChartProps) => {
    const chartData = useMemo(() => data, [data]);

    const renderLabel = useCallback(
      (entry: CategoryData) => {
        if (!showPercentage) return entry.category;
        const percentage = entry.percentage || 0;
        return `${entry.category} ${percentage.toFixed(0)}%`;
      },
      [showPercentage],
    );

    return (
      <ChartWrapper title={title} className={className}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartWrapper>
    );
  },
);

DistributionPieChart.displayName = "DistributionPieChart";

// Multi-line chart for comparing multiple metrics
interface MultiLineChartProps {
  data: ChartDataPoint[];
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  title?: string;
  xDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export const MultiLineChart = memo(
  ({
    data,
    lines,
    title,
    xDataKey = "time",
    height = 300,
    showGrid = true,
    showLegend = true,
    className = "",
  }: MultiLineChartProps) => {
    const chartData = useMemo(() => data, [data]);

    return (
      <ChartWrapper title={title} className={className}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey={xDataKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                name={line.name}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>
    );
  },
);

MultiLineChart.displayName = "MultiLineChart";

// Stacked bar chart
interface StackedBarChartProps {
  data: ChartDataPoint[];
  bars: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  title?: string;
  xDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export const StackedBarChart = memo(
  ({
    data,
    bars,
    title,
    xDataKey = "category",
    height = 300,
    showGrid = true,
    showLegend = true,
    className = "",
  }: StackedBarChartProps) => {
    const chartData = useMemo(() => data, [data]);

    return (
      <ChartWrapper title={title} className={className}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            )}
            <XAxis dataKey={xDataKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                stackId="stack"
                fill={bar.color}
                name={bar.name}
                radius={index === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>
    );
  },
);

StackedBarChart.displayName = "StackedBarChart";

// Export all chart components
export const Charts = {
  TimeSeries: TimeSeriesChart,
  CategoryBar: CategoryBarChart,
  DistributionPie: DistributionPieChart,
  MultiLine: MultiLineChart,
  StackedBar: StackedBarChart,
  Wrapper: ChartWrapper,
};

"use client";

import React, { useMemo, lazy, Suspense, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ScatterChart as ScatterChartIcon,
  ZoomIn,
  Download,
  Filter,
  RotateCcw,
  Activity,
  Maximize2,
  Eye,
  EyeOff,
} from "lucide-react";

// Lazy load chart components for better performance
const LineChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.LineChart })),
);
const AreaChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.AreaChart })),
);
const BarChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.BarChart })),
);
const PieChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.PieChart })),
);
const ScatterChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.ScatterChart })),
);

// Chart accessories - loaded together for better bundling
const ChartComponents = lazy(() =>
  import("recharts").then((module) => ({
    default: {
      Line: module.Line,
      Area: module.Area,
      Bar: module.Bar,
      Pie: module.Pie,
      Cell: module.Cell,
      Scatter: module.Scatter,
      XAxis: module.XAxis,
      YAxis: module.YAxis,
      CartesianGrid: module.CartesianGrid,
      Tooltip: module.Tooltip,
      Legend: module.Legend,
      ResponsiveContainer: module.ResponsiveContainer,
    },
  })),
);

interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 300,
  showLegend = false,
}) => (
  <div className="space-y-3">
    {showLegend && (
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    )}
    <div className="relative">
      <Skeleton className={`w-full h-[${height}px]`} />
      {/* Simulate axis lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
      <div className="absolute bottom-0 left-0 top-0 w-px bg-border" />
    </div>
  </div>
);

interface DrillDownData {
  id: string;
  name: string;
  value: number;
  category: string;
  subcategory?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  children?: DrillDownData[];
}

interface DrillDownState {
  level: number;
  path: string[];
  data: DrillDownData[];
  breadcrumbs: { name: string; path: string[] }[];
}

interface InteractiveFilterState {
  dateRange: [string, string];
  categories: string[];
  valueRange: [number, number];
  aggregation: "sum" | "avg" | "count" | "max" | "min";
  groupBy: "day" | "week" | "month" | "quarter";
  showOutliers: boolean;
  smoothing: number;
}

interface OptimizedChartProps {
  type: "line" | "area" | "bar" | "pie" | "scatter";
  data: any[];
  height?: number;
  title?: string;
  config: {
    dataKey?: string;
    xAxisKey?: string;
    yAxisKey?: string;
    colors?: string[];
    showGrid?: boolean;
    showLegend?: boolean;
    strokeWidth?: number;
    fillOpacity?: number;
    interactive?: boolean;
    drillDownLevels?: string[];
  };
  performance?: {
    virtualizeDataPoints?: boolean;
    maxDataPoints?: number;
    animationDuration?: number;
  };
  onDrillDown?: (path: string[], data: any) => void;
  onDataPointClick?: (data: any, index: number) => void;
  enableFilters?: boolean;
  enableExport?: boolean;
  enableFullscreen?: boolean;
}

const OptimizedChart: React.FC<OptimizedChartProps> = ({
  type,
  data,
  height = 300,
  title,
  config,
  performance = {},
  onDrillDown,
  onDataPointClick,
  enableFilters = false,
  enableExport = false,
  enableFullscreen = false,
}) => {
  const [drillDownState, setDrillDownState] = useState<DrillDownState>({
    level: 0,
    path: [],
    data: data.map((item, index) => ({
      id: `item_${index}`,
      name: item.name || item[config.xAxisKey || "name"] || `Item ${index + 1}`,
      value: item[config.dataKey || "value"] || 0,
      category: item.category || "default",
      timestamp: item.timestamp || item.date,
      ...item,
    })),
    breadcrumbs: [{ name: "Overview", path: [] }],
  });

  const [filterState, setFilterState] = useState<InteractiveFilterState>({
    dateRange: ["", ""],
    categories: [],
    valueRange: [0, 100],
    aggregation: "sum",
    groupBy: "day",
    showOutliers: true,
    smoothing: 0,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  // Generate drill-down data (simulation)
  const generateDrillDownData = useCallback(
    (parent: any, level: string): DrillDownData[] => {
      const baseValue =
        parent.value || parent[config.dataKey || "value"] || 100;
      const variations = [0.3, 0.25, 0.2, 0.15, 0.1];

      return Array.from({ length: 5 }, (_, i) => ({
        id: `${level}_${i}`,
        name: `${level.charAt(0).toUpperCase() + level.slice(1)} ${i + 1}`,
        value: Math.floor(
          baseValue * variations[i] * (0.8 + Math.random() * 0.4),
        ),
        category: level,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }));
    },
    [config.dataKey],
  );

  // Handle drill-down navigation
  const handleDrillDown = useCallback(
    (dataPoint: any) => {
      if (!config.interactive || !config.drillDownLevels) return;

      const nextLevel = drillDownState.level + 1;
      if (nextLevel >= config.drillDownLevels.length) return;

      const newPath = [
        ...drillDownState.path,
        dataPoint.name || dataPoint.category,
      ];
      const newBreadcrumbs = [
        ...drillDownState.breadcrumbs,
        { name: dataPoint.name || dataPoint.category, path: newPath },
      ];

      const drillDownData = generateDrillDownData(
        dataPoint,
        config.drillDownLevels[nextLevel],
      );

      setDrillDownState({
        level: nextLevel,
        path: newPath,
        data: drillDownData,
        breadcrumbs: newBreadcrumbs,
      });

      onDrillDown?.(newPath, dataPoint);
    },
    [
      drillDownState,
      config.interactive,
      config.drillDownLevels,
      onDrillDown,
      generateDrillDownData,
    ],
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback(
    (targetPath: string[]) => {
      const targetLevel = targetPath.length;
      const newBreadcrumbs = drillDownState.breadcrumbs.slice(
        0,
        targetLevel + 1,
      );

      let newData = data.map((item, index) => ({
        id: `item_${index}`,
        name:
          item.name || item[config.xAxisKey || "name"] || `Item ${index + 1}`,
        value: item[config.dataKey || "value"] || 0,
        category: item.category || "default",
        timestamp: item.timestamp || item.date,
        ...item,
      }));

      if (targetLevel > 0) {
        newData = generateDrillDownData(
          { name: targetPath[targetPath.length - 1] },
          config.drillDownLevels?.[targetLevel] || "overview",
        );
      }

      setDrillDownState({
        level: targetLevel,
        path: targetPath,
        data: newData,
        breadcrumbs: newBreadcrumbs,
      });
    },
    [
      drillDownState.breadcrumbs,
      data,
      config.drillDownLevels,
      config.xAxisKey,
      config.dataKey,
      generateDrillDownData,
    ],
  );

  // Memoize processed data for performance with filtering
  const processedData = useMemo(() => {
    const { virtualizeDataPoints = false, maxDataPoints = 1000 } = performance;

    let workingData = [...drillDownState.data];

    // Apply filtering
    if (enableFilters) {
      // Apply value range filter
      const values = workingData.map((item) => item.value || 0);
      if (values.length > 0) {
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const [rangeMin, rangeMax] = filterState.valueRange;

        if (rangeMin > 0 || rangeMax < 100) {
          const actualMin = minValue + (maxValue - minValue) * (rangeMin / 100);
          const actualMax = minValue + (maxValue - minValue) * (rangeMax / 100);

          workingData = workingData.filter((item) => {
            const value = item.value || 0;
            return value >= actualMin && value <= actualMax;
          });
        }

        // Apply outlier filtering
        if (!filterState.showOutliers && values.length > 0) {
          const sortedValues = values.sort((a, b) => a - b);
          const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
          const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          workingData = workingData.filter((item) => {
            const value = item.value || 0;
            return value >= lowerBound && value <= upperBound;
          });
        }
      }
    }

    // Virtualize data points if dataset is large
    if (virtualizeDataPoints && workingData.length > maxDataPoints) {
      const step = Math.ceil(workingData.length / maxDataPoints);
      workingData = workingData.filter((_, index) => index % step === 0);
    }

    return workingData;
  }, [drillDownState.data, performance, enableFilters, filterState]);

  // Custom tooltip with drill-down hint
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const canDrillDown =
      config.interactive &&
      config.drillDownLevels &&
      drillDownState.level < config.drillDownLevels.length - 1;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
        {canDrillDown && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <ZoomIn className="h-3 w-3" />
              Click to drill down
            </p>
          </div>
        )}
      </div>
    );
  };

  // Memoize chart configuration
  const chartConfig = useMemo(
    () => ({
      animationDuration: performance.animationDuration ?? 300,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      ...config,
    }),
    [config, performance.animationDuration],
  );

  const renderChart = () => {
    return (
      <Card
        className={`w-full ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {type === "line" && <LineChartIcon className="h-5 w-5" />}
              {type === "area" && <BarChart3 className="h-5 w-5" />}
              {type === "bar" && <BarChart3 className="h-5 w-5" />}
              {type === "pie" && <PieChartIcon className="h-5 w-5" />}
              {type === "scatter" && <ScatterChartIcon className="h-5 w-5" />}
              {title || `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
            </CardTitle>

            <div className="flex items-center gap-2">
              {enableFilters && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 p-4">
                    <DropdownMenuLabel>Chart Filters</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">
                          Aggregation
                        </label>
                        <Select
                          value={filterState.aggregation}
                          onValueChange={(value: any) =>
                            setFilterState((prev) => ({
                              ...prev,
                              aggregation: value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Value Range
                        </label>
                        <Slider
                          value={filterState.valueRange}
                          onValueChange={(value) =>
                            setFilterState((prev) => ({
                              ...prev,
                              valueRange: value as [number, number],
                            }))
                          }
                          min={0}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{filterState.valueRange[0]}%</span>
                          <span>{filterState.valueRange[1]}%</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="outliers"
                          checked={filterState.showOutliers}
                          onCheckedChange={(checked) =>
                            setFilterState((prev) => ({
                              ...prev,
                              showOutliers: checked as boolean,
                            }))
                          }
                        />
                        <label htmlFor="outliers" className="text-sm">
                          Show outliers
                        </label>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {enableExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => console.log("Export PNG")}>
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => console.log("Export SVG")}>
                      Export as SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => console.log("Export Data")}
                    >
                      Export Data (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {enableFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBreadcrumbClick([])}
                disabled={drillDownState.level === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {drillDownState.breadcrumbs.length > 1 && (
            <div className="flex items-center gap-2 mt-2">
              {drillDownState.breadcrumbs.map((breadcrumb, index) => (
                <React.Fragment key={index}>
                  <Button
                    variant={
                      index === drillDownState.breadcrumbs.length - 1
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                    className="h-6 px-2 text-xs"
                  >
                    {breadcrumb.name}
                  </Button>
                  {index < drillDownState.breadcrumbs.length - 1 && (
                    <span className="text-gray-400">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Suspense
            fallback={
              <ChartSkeleton
                height={isFullscreen ? window.innerHeight - 200 : height}
                showLegend={config.showLegend}
              />
            }
          >
            <ChartComponents>
              {({
                Line,
                Area,
                Bar,
                Pie,
                Cell,
                Scatter,
                XAxis,
                YAxis,
                CartesianGrid,
                Tooltip,
                Legend,
                ResponsiveContainer,
              }) => (
                <ResponsiveContainer
                  width="100%"
                  height={isFullscreen ? window.innerHeight - 200 : height}
                >
                  {type === "line" && (
                    <LineChart data={processedData} margin={chartConfig.margin}>
                      {config.showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      )}
                      <XAxis
                        dataKey={config.xAxisKey || "name"}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend />}
                      <Line
                        type="monotone"
                        dataKey={config.dataKey || "value"}
                        stroke={config.colors?.[0] || "#8884d8"}
                        strokeWidth={config.strokeWidth || 2}
                        animationDuration={chartConfig.animationDuration}
                        dot={{
                          fill: config.colors?.[0] || "#8884d8",
                          strokeWidth: 2,
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                          stroke: config.colors?.[0] || "#8884d8",
                          strokeWidth: 2,
                          fill: "#fff",
                        }}
                        onClick={
                          config.interactive ? handleDrillDown : undefined
                        }
                        style={{
                          cursor: config.interactive ? "pointer" : "default",
                        }}
                      />
                    </LineChart>
                  )}

                  {type === "area" && (
                    <AreaChart data={processedData} margin={chartConfig.margin}>
                      {config.showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      )}
                      <XAxis
                        dataKey={config.xAxisKey || "name"}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend />}
                      <Area
                        type="monotone"
                        dataKey={config.dataKey || "value"}
                        stroke={config.colors?.[0] || "#8884d8"}
                        fill={config.colors?.[0] || "#8884d8"}
                        fillOpacity={config.fillOpacity || 0.6}
                        animationDuration={chartConfig.animationDuration}
                        onClick={
                          config.interactive ? handleDrillDown : undefined
                        }
                        style={{
                          cursor: config.interactive ? "pointer" : "default",
                        }}
                      />
                    </AreaChart>
                  )}

                  {type === "bar" && (
                    <BarChart data={processedData} margin={chartConfig.margin}>
                      {config.showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      )}
                      <XAxis
                        dataKey={config.xAxisKey || "name"}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend />}
                      <Bar
                        dataKey={config.dataKey || "value"}
                        fill={config.colors?.[0] || "#8884d8"}
                        animationDuration={chartConfig.animationDuration}
                        radius={[4, 4, 0, 0]}
                        onClick={
                          config.interactive ? handleDrillDown : undefined
                        }
                        style={{
                          cursor: config.interactive ? "pointer" : "default",
                        }}
                      />
                    </BarChart>
                  )}

                  {type === "pie" && (
                    <PieChart margin={chartConfig.margin}>
                      <Pie
                        data={processedData}
                        dataKey={config.dataKey || "value"}
                        nameKey={config.xAxisKey || "name"}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        animationDuration={chartConfig.animationDuration}
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        onClick={
                          config.interactive ? handleDrillDown : undefined
                        }
                        style={{
                          cursor: config.interactive ? "pointer" : "default",
                        }}
                      >
                        {processedData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              config.colors?.[
                                index % (config.colors?.length || 1)
                              ] || "#8884d8"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend />}
                    </PieChart>
                  )}

                  {type === "scatter" && (
                    <ScatterChart
                      data={processedData}
                      margin={chartConfig.margin}
                    >
                      {config.showGrid && (
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      )}
                      <XAxis
                        dataKey={config.xAxisKey || "x"}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        dataKey={config.yAxisKey || "y"}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {config.showLegend && <Legend />}
                      <Scatter
                        name={title || "Data"}
                        data={processedData}
                        fill={config.colors?.[0] || "#8884d8"}
                        animationDuration={chartConfig.animationDuration}
                        onClick={
                          config.interactive ? handleDrillDown : undefined
                        }
                        style={{
                          cursor: config.interactive ? "pointer" : "default",
                        }}
                      />
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              )}
            </ChartComponents>
          </Suspense>

          {/* Chart Statistics */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Data Points:</span>
                <span className="font-medium ml-1">{processedData.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Drill Level:</span>
                <span className="font-medium ml-1">
                  {config.drillDownLevels?.[drillDownState.level] || "Overview"}
                </span>
              </div>
              {processedData.length > 0 && (
                <>
                  <div>
                    <span className="text-gray-500">Average:</span>
                    <span className="font-medium ml-1">
                      {(
                        processedData.reduce(
                          (sum, item) =>
                            sum + (item[config.dataKey || "value"] || 0),
                          0,
                        ) / processedData.length
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>
                    <span className="font-medium ml-1">
                      {processedData
                        .reduce(
                          (sum, item) =>
                            sum + (item[config.dataKey || "value"] || 0),
                          0,
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderChart();
};

interface PerformantAnalyticsChartsProps {
  data: {
    revenue: any[];
    quality: any[];
    performance: any[];
    predictions: any[];
  };
  loading?: boolean;
}

const PerformantAnalyticsCharts: React.FC<PerformantAnalyticsChartsProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <ChartSkeleton height={300} showLegend />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <OptimizedChart
        type="line"
        data={data.revenue}
        height={300}
        title="Revenue Trends"
        config={{
          dataKey: "revenue",
          xAxisKey: "month",
          colors: ["#3b82f6", "#10b981"],
          showGrid: true,
          showLegend: true,
          strokeWidth: 3,
          interactive: true,
          drillDownLevels: ["month", "week", "day", "service"],
        }}
        performance={{
          virtualizeDataPoints: true,
          maxDataPoints: 100,
          animationDuration: 500,
        }}
        enableFilters={true}
        enableExport={true}
        enableFullscreen={true}
        onDrillDown={(path, data) =>
          console.log("Revenue drill down:", path, data)
        }
      />

      <OptimizedChart
        type="area"
        data={data.quality}
        height={300}
        title="Data Quality Score"
        config={{
          dataKey: "score",
          xAxisKey: "date",
          colors: ["#f59e0b"],
          showGrid: true,
          fillOpacity: 0.4,
          interactive: true,
          drillDownLevels: ["metric", "source", "validation"],
        }}
        performance={{
          virtualizeDataPoints: true,
          maxDataPoints: 50,
          animationDuration: 400,
        }}
        enableFilters={true}
        enableExport={true}
        enableFullscreen={true}
        onDrillDown={(path, data) =>
          console.log("Quality drill down:", path, data)
        }
      />

      <OptimizedChart
        type="bar"
        data={data.performance}
        height={300}
        title="Performance Metrics"
        config={{
          dataKey: "value",
          xAxisKey: "metric",
          colors: ["#8b5cf6", "#06b6d4", "#f97316"],
          showGrid: true,
          showLegend: false,
          interactive: true,
          drillDownLevels: ["metric", "endpoint", "time"],
        }}
        performance={{
          animationDuration: 350,
        }}
        enableFilters={true}
        enableExport={true}
        enableFullscreen={true}
        onDrillDown={(path, data) =>
          console.log("Performance drill down:", path, data)
        }
      />

      <OptimizedChart
        type="pie"
        data={data.predictions}
        height={300}
        title="Service Distribution"
        config={{
          dataKey: "value",
          xAxisKey: "service",
          colors: [
            "#ef4444",
            "#f97316",
            "#f59e0b",
            "#eab308",
            "#84cc16",
            "#22c55e",
          ],
          showLegend: true,
          interactive: true,
          drillDownLevels: ["service", "region", "customer"],
        }}
        performance={{
          animationDuration: 600,
        }}
        enableFilters={true}
        enableExport={true}
        enableFullscreen={true}
        onDrillDown={(path, data) =>
          console.log("Service drill down:", path, data)
        }
      />
    </div>
  );
};

export default PerformantAnalyticsCharts;
export { OptimizedChart, ChartSkeleton };

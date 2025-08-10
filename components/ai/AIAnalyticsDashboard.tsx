"use client";

import { memo, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Users,
  Zap,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { useDashboard, useDataFetch } from "./shared/hooks";
import {
  formatTimeSeriesData,
  formatCategoryData,
  formatNumber,
  formatPercentage,
  getHealthStatusColor,
  DEFAULT_CHART_COLORS,
} from "./shared/utils";
import {
  TimeSeriesChart,
  CategoryBarChart,
  DistributionPieChart,
  MultiLineChart,
} from "./shared/chart-components";

interface DashboardMetrics {
  current: {
    activeUsers: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  trends: {
    requestsOverTime: Array<{ time: string; count: number }>;
    tokensOverTime: Array<{ time: string; tokens: number }>;
    errorRateOverTime: Array<{ time: string; rate: number }>;
  };
  health: {
    status: "healthy" | "degraded" | "critical";
    issues: string[];
  };
}

interface AnalyticsSummary {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  uniqueUsers: number;
  modelUsage: Record<string, number>;
  featureUsage: Record<string, number>;
  errorTypes: Record<string, number>;
  peakUsageHours: number[];
}

// Metric card component for reusability
const MetricCard = memo(
  ({
    icon: Icon,
    title,
    value,
    subtitle,
    className = "",
  }: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle?: string;
    className?: string;
  }) => (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  ),
);

MetricCard.displayName = "MetricCard";

const AIAnalyticsDashboardComponent = () => {
  // Use the dashboard hook for better state management
  const dashboard = useDashboard<DashboardMetrics>("/api/ai/analytics", "7d");

  // Fetch summary data with caching
  const { data: summary, refetch: refetchSummary } =
    useDataFetch<AnalyticsSummary>(
      useMemo(() => {
        const days =
          dashboard.timeRange === "24h"
            ? 1
            : dashboard.timeRange === "7d"
              ? 7
              : 30;
        const startDate = subDays(new Date(), days).toISOString();
        const endDate = new Date().toISOString();
        return `/api/ai/analytics?type=summary&startDate=${startDate}&endDate=${endDate}`;
      }, [dashboard.timeRange]),
      {
        cacheKey: `analytics-summary-${dashboard.timeRange}`,
        cacheTTL: 60,
        pollingInterval: dashboard.autoRefresh ? 60000 : undefined,
      },
    );

  const metrics = dashboard.data as DashboardMetrics | null;

  const exportData = useCallback(
    async (format: "json" | "csv") => {
      try {
        const days =
          dashboard.timeRange === "24h"
            ? 1
            : dashboard.timeRange === "7d"
              ? 7
              : 30;
        const startDate = subDays(new Date(), days).toISOString();
        const endDate = new Date().toISOString();

        const response = await fetch(
          `/api/ai/analytics?type=export&format=${format}&startDate=${startDate}&endDate=${endDate}`,
        );

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai-analytics-${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        logger.error("Export failed:", error);
      }
    },
    [dashboard.timeRange],
  );

  // Memoize chart data transformations
  const requestsChartData = useMemo(
    () => metrics?.trends.requestsOverTime || [],
    [metrics],
  );

  const tokensChartData = useMemo(
    () => metrics?.trends.tokensOverTime || [],
    [metrics],
  );

  const modelDistributionData = useMemo(
    () => (summary ? formatCategoryData(summary.modelUsage) : []),
    [summary],
  );

  const featureUsageData = useMemo(
    () =>
      summary
        ? Object.entries(summary.featureUsage).map(([name, value]) => ({
            category: name,
            value,
          }))
        : [],
    [summary],
  );

  if (dashboard.loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Analytics Dashboard</h2>
        <div className="flex items-center gap-4">
          <Select
            value={dashboard.timeRange}
            onValueChange={dashboard.setTimeRange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dashboard.refetch();
              refetchSummary();
            }}
            disabled={dashboard.loading}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 mr-2",
                dashboard.loading && "animate-spin",
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {metrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    metrics.health.status === "healthy" && "bg-green-600",
                    metrics.health.status === "degraded" && "bg-yellow-600",
                    metrics.health.status === "critical" && "bg-red-600",
                  )}
                />
                <span
                  className={cn(
                    "font-medium capitalize",
                    getHealthStatusColor(metrics.health.status),
                  )}
                >
                  {metrics.health.status}
                </span>
              </div>
              {metrics.health.issues.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Issues: {metrics.health.issues.join(", ")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            title="Active Users"
            value={metrics.current.activeUsers}
            subtitle="Last 5 minutes"
          />
          <MetricCard
            icon={Activity}
            title="Requests/min"
            value={metrics.current.requestsPerMinute.toFixed(1)}
            subtitle="Current rate"
          />
          <MetricCard
            icon={Zap}
            title="Avg Response"
            value={`${metrics.current.averageResponseTime.toFixed(0)}ms`}
            subtitle="Last 5 minutes"
          />
          <MetricCard
            icon={AlertCircle}
            title="Error Rate"
            value={`${(metrics.current.errorRate * 100).toFixed(1)}%`}
            subtitle="Last 5 minutes"
          />
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="tokens">Token Usage</TabsTrigger>
          <TabsTrigger value="models">Model Distribution</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {metrics && (
            <TimeSeriesChart
              data={requestsChartData}
              title="Request Volume Over Time"
              dataKey="count"
              height={250}
            />
          )}
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          {metrics && (
            <CategoryBarChart
              data={tokensChartData.map((item) => ({
                category: item.time,
                value: item.tokens,
              }))}
              title="Token Usage Over Time"
              color="#00C49F"
              height={250}
            />
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          {summary && (
            <DistributionPieChart
              data={modelDistributionData}
              title="Model Usage Distribution"
              height={250}
            />
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          {summary && (
            <CategoryBarChart
              data={featureUsageData}
              title="Feature Usage"
              color="#8884d8"
              height={250}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalRequests.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Success Rate: {(summary.successRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg per request:{" "}
                {(summary.totalTokensUsed / summary.totalRequests).toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Peak Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.peakUsageHours.map((h) => `${h}:00`).join(", ")}
              </div>
              <div className="text-sm text-muted-foreground">
                Most active times
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Export with memo for optimal performance
export const AIAnalyticsDashboard = memo(AIAnalyticsDashboardComponent);

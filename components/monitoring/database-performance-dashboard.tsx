/**
 * Database Performance Dashboard Component
 *
 * Features:
 * - Real-time performance metrics visualization
 * - Interactive charts and graphs
 * - Alert management interface
 * - Performance trends analysis
 * - Automated recommendations display
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";

import type {
  DatabaseMetrics,
  PerformanceAlert,
} from "@/lib/services/database-performance-monitor";

// Props interface
interface DatabasePerformanceDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Chart colors
const CHART_COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#6366f1",
  gray: "#6b7280",
};

/**
 * Database Performance Dashboard Component
 */
export function DatabasePerformanceDashboard({
  className = "",
  autoRefresh = true,
  refreshInterval = 30000,
}: DatabasePerformanceDashboardProps) {
  // State management
  const [metrics, setMetrics] = useState<DatabaseMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1h" | "6h" | "24h" | "7d"
  >("1h");
  const [error, setError] = useState<string | null>(null);

  // Load performance data
  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Calculate time range
      const now = new Date();
      const timeRanges = {
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
      };

      const startTime = new Date(now.getTime() - timeRanges[selectedTimeRange]);

      // Mock data loading - in real implementation would fetch from service
      const mockMetrics = generateMockMetrics(startTime, now);
      const mockAlerts = generateMockAlerts(startTime, now);

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setActiveAlerts(mockAlerts.filter((alert) => !alert.resolved));
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load performance data",
      );
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  // Auto-refresh effect
  useEffect(() => {
    loadData();

    if (!autoRefresh) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadData, autoRefresh, refreshInterval]);

  // Chart data processing
  const chartData = useMemo(() => {
    return metrics.map((metric, index) => ({
      time: metric.timestamp.toLocaleTimeString(),
      timestamp: metric.timestamp.getTime(),
      avgResponseTime: metric.queryMetrics.avgResponseTime,
      totalQueries: metric.queryMetrics.totalQueries,
      slowQueries: metric.queryMetrics.slowQueries,
      failedQueries: metric.queryMetrics.failedQueries,
      connectionUtilization: metric.connectionMetrics.utilization * 100,
      cacheHitRate: metric.cacheMetrics.hitRate * 100,
      errorRate:
        metric.queryMetrics.totalQueries > 0
          ? (metric.queryMetrics.failedQueries /
              metric.queryMetrics.totalQueries) *
            100
          : 0,
    }));
  }, [metrics]);

  // Current metrics
  const currentMetrics = metrics[metrics.length - 1];

  // Alert severity distribution
  const alertSeverityData = useMemo(() => {
    if (!alerts.length) return [];

    const severityCounts = alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(severityCounts).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: getSeverityColor(severity as PerformanceAlert["severity"]),
    }));
  }, [alerts]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading performance data...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Performance</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
            <CardDescription>
              Performance issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{alert.title}</strong>
                        <p className="text-sm mt-1">{alert.description}</p>
                      </div>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              {activeAlerts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  And {activeAlerts.length - 5} more alerts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Response Time"
          value={currentMetrics?.queryMetrics.avgResponseTime}
          unit="ms"
          icon={Clock}
          trend={getTrend(metrics, "avgResponseTime")}
          color="blue"
        />
        <MetricCard
          title="Total Queries"
          value={currentMetrics?.queryMetrics.totalQueries}
          icon={Database}
          trend={getTrend(metrics, "totalQueries")}
          color="green"
        />
        <MetricCard
          title="Connection Pool"
          value={currentMetrics?.connectionMetrics.utilization}
          unit="%"
          icon={Activity}
          isPercentage
          trend={getTrend(metrics, "connectionUtilization")}
          color="purple"
        />
        <MetricCard
          title="Cache Hit Rate"
          value={currentMetrics?.cacheMetrics.hitRate}
          unit="%"
          icon={Zap}
          isPercentage
          trend={getTrend(metrics, "cacheHitRate")}
          color="orange"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Response Time</CardTitle>
                <CardDescription>
                  Average response time over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgResponseTime"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      name="Avg Response Time (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Volume</CardTitle>
                <CardDescription>Total and failed queries</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="totalQueries"
                      fill={CHART_COLORS.primary}
                      name="Total Queries"
                    />
                    <Bar
                      dataKey="failedQueries"
                      fill={CHART_COLORS.danger}
                      name="Failed Queries"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error Rate</CardTitle>
              <CardDescription>Query error rate percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="errorRate"
                    stroke={CHART_COLORS.danger}
                    fill={CHART_COLORS.danger}
                    fillOpacity={0.3}
                    name="Error Rate (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Pool Utilization</CardTitle>
              <CardDescription>Database connection usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="connectionUtilization"
                    stroke={CHART_COLORS.info}
                    fill={CHART_COLORS.info}
                    fillOpacity={0.3}
                    name="Utilization (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
              <CardDescription>Cache hit rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cacheHitRate"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    name="Hit Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Distribution</CardTitle>
                <CardDescription>Alerts by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={alertSeverityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {alertSeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest performance alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {alerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value?: number;
  unit?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "stable";
  color?: string;
  isPercentage?: boolean;
}

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color = "gray",
  isPercentage,
}: MetricCardProps) {
  const displayValue =
    value !== undefined
      ? isPercentage
        ? `${(value * 100).toFixed(1)}`
        : value.toLocaleString()
      : "--";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
        ? "text-red-600"
        : "text-gray-400";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {displayValue}
          {unit && ` ${unit}`}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <TrendIcon className={`h-3 w-3 mr-1 ${trendColor}`} />
          {trend === "stable"
            ? "No change"
            : `${trend === "up" ? "Up" : "Down"} from last period`}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions

function getSeverityColor(severity: PerformanceAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return CHART_COLORS.danger;
    case "high":
      return "#f97316"; // orange-500
    case "medium":
      return CHART_COLORS.warning;
    case "low":
      return CHART_COLORS.info;
    default:
      return CHART_COLORS.gray;
  }
}

function getSeverityVariant(
  severity: PerformanceAlert["severity"],
): "default" | "destructive" | "outline" | "secondary" {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "outline";
    default:
      return "secondary";
  }
}

function getTrend(
  metrics: DatabaseMetrics[],
  field: string,
): "up" | "down" | "stable" {
  if (metrics.length < 2) return "stable";

  const current = metrics[metrics.length - 1];
  const previous = metrics[metrics.length - 2];

  let currentValue: number, previousValue: number;

  switch (field) {
    case "avgResponseTime":
      currentValue = current.queryMetrics.avgResponseTime;
      previousValue = previous.queryMetrics.avgResponseTime;
      break;
    case "totalQueries":
      currentValue = current.queryMetrics.totalQueries;
      previousValue = previous.queryMetrics.totalQueries;
      break;
    case "connectionUtilization":
      currentValue = current.connectionMetrics.utilization;
      previousValue = previous.connectionMetrics.utilization;
      break;
    case "cacheHitRate":
      currentValue = current.cacheMetrics.hitRate;
      previousValue = previous.cacheMetrics.hitRate;
      break;
    default:
      return "stable";
  }

  const difference = currentValue - previousValue;
  const threshold = Math.abs(previousValue) * 0.05; // 5% threshold

  if (Math.abs(difference) < threshold) return "stable";
  return difference > 0 ? "up" : "down";
}

// Mock data generators for development
function generateMockMetrics(
  startTime: Date,
  endTime: Date,
): DatabaseMetrics[] {
  const metrics: DatabaseMetrics[] = [];
  const interval = (endTime.getTime() - startTime.getTime()) / 20; // 20 data points

  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(startTime.getTime() + interval * i);
    metrics.push({
      timestamp,
      queryMetrics: {
        totalQueries: Math.floor(Math.random() * 1000) + 500,
        slowQueries: Math.floor(Math.random() * 50),
        failedQueries: Math.floor(Math.random() * 20),
        avgResponseTime: Math.floor(Math.random() * 500) + 100,
        p95ResponseTime: Math.floor(Math.random() * 1000) + 500,
        p99ResponseTime: Math.floor(Math.random() * 2000) + 1000,
        queriesPerSecond: Math.floor(Math.random() * 100) + 50,
      },
      connectionMetrics: {
        totalConnections: 10,
        activeConnections: Math.floor(Math.random() * 8) + 1,
        idleConnections: 10 - (Math.floor(Math.random() * 8) + 1),
        utilization: Math.random() * 0.8 + 0.1,
        avgConnectionTime: Math.floor(Math.random() * 200) + 50,
        failedConnections: Math.floor(Math.random() * 5),
      },
      cacheMetrics: {
        hitRate: Math.random() * 0.3 + 0.7,
        missRate: Math.random() * 0.3 + 0.0,
        totalOperations: Math.floor(Math.random() * 5000) + 1000,
        cacheSize: Math.floor(Math.random() * 100000) + 50000,
        evictions: Math.floor(Math.random() * 10),
      },
      circuitBreakerMetrics: {
        totalBreakers: 3,
        openBreakers: Math.floor(Math.random() * 2),
        halfOpenBreakers: 0,
        avgSuccessRate: Math.random() * 0.2 + 0.8,
        totalCalls: Math.floor(Math.random() * 10000) + 5000,
      },
      schemaValidationMetrics: {
        totalValidations: Math.floor(Math.random() * 100) + 50,
        successfulValidations: Math.floor(Math.random() * 100) + 45,
        avgValidationTime: Math.floor(Math.random() * 50) + 10,
        slowValidations: Math.floor(Math.random() * 5),
      },
    });
  }

  return metrics;
}

function generateMockAlerts(
  startTime: Date,
  endTime: Date,
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];
  const alertTypes: PerformanceAlert["type"][] = [
    "slow_query",
    "high_error_rate",
    "connection_pool_exhausted",
    "circuit_breaker_open",
    "cache_performance",
  ];
  const severities: PerformanceAlert["severity"][] = [
    "low",
    "medium",
    "high",
    "critical",
  ];

  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(
      startTime.getTime() +
        Math.random() * (endTime.getTime() - startTime.getTime()),
    );
    alerts.push({
      id: `alert-${i}`,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      title: `Performance Alert ${i + 1}`,
      description: `Mock alert description for testing purposes`,
      metrics: { value: Math.random() * 100 },
      timestamp,
      resolved: Math.random() > 0.6,
      actions: ["Review logs", "Check configuration", "Monitor trends"],
    });
  }

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export default DatabasePerformanceDashboard;

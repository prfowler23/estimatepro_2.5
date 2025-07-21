// Performance Dashboard Component
// Real-time performance monitoring and analytics visualization

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  Eye,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  // Memory, - Not available in lucide-react
  Cpu,
  HardDrive,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

// Types
interface PerformanceMetrics {
  requestCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  timestamp: number;
}

interface PerformanceEntry {
  name: string;
  type: "api" | "database" | "cache" | "ai" | "calculation" | "component";
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceAlert {
  id: string;
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memory: number;
}

// Performance stat card component
const PerformanceStatCard: React.FC<{
  title: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, trend, icon, color, subtitle }) => {
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

// Alert severity badge component
const AlertSeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const variants = {
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <Badge
      className={
        variants[severity as keyof typeof variants] || variants.warning
      }
    >
      {severity.toUpperCase()}
    </Badge>
  );
};

// Performance type icon component
const PerformanceTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconMap: Record<string, JSX.Element> = {
    api: <Server className="w-4 h-4" />,
    database: <Database className="w-4 h-4" />,
    cache: <Zap className="w-4 h-4" />,
    ai: <Activity className="w-4 h-4" />,
    calculation: <BarChart3 className="w-4 h-4" />,
    component: <Eye className="w-4 h-4" />,
  };

  return iconMap[type] || <Activity className="w-4 h-4" />;
};

export const PerformanceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState("1h");
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [alertsFilter, setAlertsFilter] = useState<
    "all" | "warning" | "critical"
  >("all");

  // Fetch performance metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["performance-metrics", timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/performance/metrics?time_range=${timeRange}`,
      );
      if (!response.ok) throw new Error("Failed to fetch performance metrics");
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch performance entries
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["performance-entries", timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/performance/entries?time_range=${timeRange}&limit=100`,
      );
      if (!response.ok) throw new Error("Failed to fetch performance entries");
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch performance alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["performance-alerts"],
    queryFn: async () => {
      const response = await fetch("/api/performance/alerts");
      if (!response.ok) throw new Error("Failed to fetch performance alerts");
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch cache metrics
  const { data: cacheData, isLoading: cacheLoading } = useQuery({
    queryKey: ["cache-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/performance/cache");
      if (!response.ok) throw new Error("Failed to fetch cache metrics");
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!metricsData || !entriesData) return null;

    const entries: PerformanceEntry[] = entriesData.entries || [];
    const metrics: PerformanceMetrics = metricsData.metrics || {};

    return {
      totalRequests: entries.length,
      avgResponseTime: metrics.avgResponseTime || 0,
      errorRate: metrics.errorRate || 0,
      memoryUsage: metrics.memoryUsage?.rss || 0,
      cpuUsage: metrics.cpuUsage || 0,
      slowestEndpoint:
        entries.sort((a, b) => b.duration - a.duration)[0]?.name || "N/A",
      mostActiveEndpoint: entries.reduce(
        (acc, entry) => {
          acc[entry.name] = (acc[entry.name] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }, [metricsData, entriesData]);

  // Format memory usage
  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Handle alert resolution
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/performance/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });

      if (!response.ok) throw new Error("Failed to resolve alert");

      toast({ title: "Alert resolved successfully" });
    } catch (error) {
      toast({
        title: "Error resolving alert",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Export performance report
  const exportReport = async () => {
    try {
      const response = await fetch(
        `/api/performance/report?time_range=${timeRange}`,
      );
      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Performance report exported successfully" });
    } catch (error) {
      toast({
        title: "Error exporting report",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  if (metricsLoading || entriesLoading || alertsLoading || cacheLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">
            Monitor application performance and optimize bottlenecks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceStatCard
          title="Total Requests"
          value={stats?.totalRequests || 0}
          icon={<Server className="w-5 h-5" />}
          color="text-blue-600"
          trend="up"
        />
        <PerformanceStatCard
          title="Avg Response Time"
          value={formatDuration(stats?.avgResponseTime || 0)}
          icon={<Clock className="w-5 h-5" />}
          color="text-green-600"
          trend="stable"
        />
        <PerformanceStatCard
          title="Error Rate"
          value={`${((stats?.errorRate || 0) * 100).toFixed(1)}%`}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-red-600"
          trend="down"
        />
        <PerformanceStatCard
          title="Memory Usage"
          value={formatMemory(stats?.memoryUsage || 0)}
          icon={<HardDrive className="w-5 h-5" />}
          color="text-purple-600"
          trend="stable"
        />
      </div>

      {/* Cache Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Cache Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hit Rate</span>
                <Badge variant="outline">
                  {((cacheData?.metrics?.hitRate || 0) * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress
                value={(cacheData?.metrics?.hitRate || 0) * 100}
                className="h-2"
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Hits:</span>
                  <span className="font-medium ml-1">
                    {cacheData?.metrics?.hits || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Misses:</span>
                  <span className="font-medium ml-1">
                    {cacheData?.metrics?.misses || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="w-5 h-5 mr-2" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm">
                    {(stats?.cpuUsage || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats?.cpuUsage || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Memory</span>
                  <span className="text-sm">
                    {formatMemory(stats?.memoryUsage || 0)}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    ((stats?.memoryUsage || 0) / (512 * 1024 * 1024)) * 100,
                    100,
                  )}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertsData?.alerts?.filter(
                (alert: PerformanceAlert) => !alert.resolved,
              ).length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No active alerts</p>
                </div>
              ) : (
                alertsData?.alerts
                  ?.filter((alert: PerformanceAlert) => !alert.resolved)
                  .slice(0, 3)
                  .map((alert: PerformanceAlert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-2 bg-red-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">{alert.metric}</p>
                          <p className="text-xs text-gray-600">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      <AlertSeverityBadge severity={alert.type} />
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Performance Entries</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Performance Entries */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entriesData?.entries
                  ?.slice(0, 20)
                  .map((entry: PerformanceEntry, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <PerformanceTypeIcon type={entry.type} />
                        <div>
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{entry.type}</Badge>
                        <span className="text-sm font-medium">
                          {formatDuration(entry.duration)}
                        </span>
                        {entry.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Performance Alerts</span>
                <Select
                  value={alertsFilter}
                  onValueChange={setAlertsFilter as any}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertsData?.alerts
                  ?.filter(
                    (alert: PerformanceAlert) =>
                      alertsFilter === "all" || alert.type === alertsFilter,
                  )
                  .map((alert: PerformanceAlert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertSeverityBadge severity={alert.type} />
                        {alert.resolved ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800"
                          >
                            Resolved
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    entriesData?.entries?.reduce(
                      (
                        acc: Record<string, number>,
                        entry: PerformanceEntry,
                      ) => {
                        acc[entry.type] = (acc[entry.type] || 0) + 1;
                        return acc;
                      },
                      {},
                    ) || {},
                  ).map(([type, count]: [string, number]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <PerformanceTypeIcon type={type} />
                        <span className="font-medium capitalize">{type}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slowest Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entriesData?.entries
                    ?.sort(
                      (a: PerformanceEntry, b: PerformanceEntry) =>
                        b.duration - a.duration,
                    )
                    .slice(0, 10)
                    .map((entry: PerformanceEntry, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <PerformanceTypeIcon type={entry.type} />
                          <span className="font-medium">{entry.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatDuration(entry.duration)}
                        </span>
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
};

export default PerformanceDashboard;

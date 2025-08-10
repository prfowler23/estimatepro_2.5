// Monitoring Dashboard
// Real-time system monitoring and alerting dashboard

"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Database,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Bell,
  Eye,
  Download,
  Filter,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  AlertCircle,
  FileDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

// Import monitoring service and hooks
import {
  unifiedMonitoringService,
  useMonitoringMetrics,
  useMonitoringAlerts,
  type Alert as MonitoringAlert,
  type MonitoringMetricsResponse,
} from "@/lib/services/monitoring-service-unified";
import type {
  SystemMetrics,
  HealthCheck,
} from "@/lib/monitoring/system-monitor";

// Format helpers
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

// Metric card component
const MetricCard = memo<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  status?: "healthy" | "warning" | "critical";
  subtitle?: string;
  loading?: boolean;
}>(({ title, value, icon, trend, status, subtitle, loading }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${getStatusColor(status)}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1">
            <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
              {icon}
            </div>
            {getTrendIcon(trend)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
MetricCard.displayName = "MetricCard";

// Health status component
const HealthStatus = memo<{
  healthChecks: HealthCheck[];
  loading?: boolean;
}>(({ healthChecks, loading }) => {
  const overallStatus = useMemo(() => {
    const criticalCount = healthChecks.filter(
      (check) => check.status === "critical",
    ).length;
    const warningCount = healthChecks.filter(
      (check) => check.status === "warning",
    ).length;

    if (criticalCount > 0) return "critical";
    if (warningCount > 0) return "warning";
    return "healthy";
  }, [healthChecks]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          System Health
          <Badge
            className={`ml-2 ${getStatusColor(overallStatus)}`}
            aria-label={`Overall system status: ${overallStatus}`}
          >
            {overallStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="list" aria-label="Health checks">
          {healthChecks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              role="listitem"
            >
              <div className="flex items-center space-x-3">
                <span aria-label={`${check.name} status: ${check.status}`}>
                  {getStatusIcon(check.status)}
                </span>
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-sm text-gray-600">{check.message}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(check.status)}>
                  {check.status.toUpperCase()}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDuration(Date.now() - check.lastCheck)} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
HealthStatus.displayName = "HealthStatus";

// Alerts component
const AlertsPanel = memo<{
  initialAlerts?: MonitoringAlert[];
  loading?: boolean;
}>(({ initialAlerts = [], loading: initialLoading = false }) => {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">(
    "all",
  );
  const { toast } = useToast();

  const { alerts, loading, error, acknowledgeAlert, resolveAlert } =
    useMonitoringAlerts({
      severity: filter,
      limit: 50,
      refreshInterval: 30000, // Refresh every 30 seconds
    });

  const displayAlerts = alerts.length > 0 ? alerts : initialAlerts;
  const isLoading = loading || initialLoading;

  const handleAcknowledge = useCallback(
    async (alertId: string) => {
      try {
        await acknowledgeAlert(alertId);
        toast({
          title: "Alert acknowledged",
          description: "The alert has been marked as acknowledged.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to acknowledge alert. Please try again.",
          variant: "destructive",
        });
      }
    },
    [acknowledgeAlert, toast],
  );

  const handleResolve = useCallback(
    async (alertId: string) => {
      try {
        await resolveAlert(alertId);
        toast({
          title: "Alert resolved",
          description: "The alert has been marked as resolved.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to resolve alert. Please try again.",
          variant: "destructive",
        });
      }
    },
    [resolveAlert, toast],
  );

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load alerts. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Recent Alerts
            {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          </CardTitle>
          <Select
            value={filter}
            onValueChange={(value: "all" | "critical" | "warning" | "info") =>
              setFilter(value)
            }
          >
            <SelectTrigger
              className="w-32"
              aria-label="Filter alerts by severity"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="list" aria-label="System alerts">
          {isLoading && displayAlerts.length === 0 ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </>
          ) : displayAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts to display</p>
            </div>
          ) : (
            displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                role="listitem"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span aria-label={`Alert severity: ${alert.severity}`}>
                      {getAlertIcon(alert.severity)}
                    </span>
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">{alert.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatDuration(Date.now() - alert.timestamp)} ago
                    </p>
                    {alert.resolved ? (
                      <Badge className="mt-1 bg-green-100 text-green-800">
                        Resolved
                      </Badge>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                          aria-label={`Acknowledge alert: ${alert.message}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ack
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(alert.id)}
                          aria-label={`Resolve alert: ${alert.message}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});
AlertsPanel.displayName = "AlertsPanel";

// Resource usage component
const ResourceUsage = memo<{
  metrics: SystemMetrics;
  loading?: boolean;
}>(({ metrics, loading }) => {
  const getUsageColor = useCallback((percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  }, []);

  const getProgressColor = useCallback((percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Server className="w-5 h-5 mr-2" />
          Resource Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* CPU Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span className="font-medium">CPU</span>
              </div>
              <span
                className={`font-bold ${getUsageColor(metrics.cpu.usage)}`}
                aria-label={`CPU usage: ${metrics.cpu.usage.toFixed(1)} percent`}
              >
                {metrics.cpu.usage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.cpu.usage}
              className="h-2"
              aria-label="CPU usage progress"
            />
            <p className="text-sm text-gray-600 mt-1">
              Load: {metrics.cpu.load.map((l) => l.toFixed(2)).join(", ")}
            </p>
          </div>

          {/* Memory Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MemoryStick className="w-4 h-4" />
                <span className="font-medium">Memory</span>
              </div>
              <span
                className={`font-bold ${getUsageColor(metrics.memory.percentage)}`}
                aria-label={`Memory usage: ${metrics.memory.percentage.toFixed(1)} percent`}
              >
                {metrics.memory.percentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.memory.percentage}
              className="h-2"
              aria-label="Memory usage progress"
            />
            <p className="text-sm text-gray-600 mt-1">
              {formatBytes(metrics.memory.used)} /{" "}
              {formatBytes(metrics.memory.total)}
            </p>
          </div>

          {/* Disk Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4" />
                <span className="font-medium">Disk</span>
              </div>
              <span
                className={`font-bold ${getUsageColor(metrics.disk.percentage)}`}
                aria-label={`Disk usage: ${metrics.disk.percentage.toFixed(1)} percent`}
              >
                {metrics.disk.percentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.disk.percentage}
              className="h-2"
              aria-label="Disk usage progress"
            />
            <p className="text-sm text-gray-600 mt-1">
              {formatBytes(metrics.disk.used)} /{" "}
              {formatBytes(metrics.disk.total)}
            </p>
          </div>

          {/* Network */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span className="font-medium">Network</span>
              </div>
              <span className="font-bold text-blue-600">
                {metrics.network.connectionsActive} active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Bytes In</p>
                <p className="font-medium">
                  {formatBytes(metrics.network.bytesIn)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Bytes Out</p>
                <p className="font-medium">
                  {formatBytes(metrics.network.bytesOut)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
ResourceUsage.displayName = "ResourceUsage";

// Main dashboard component
export const MonitoringDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const { toast } = useToast();

  // Fetch metrics data
  const {
    data: metricsData,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useMonitoringMetrics({
    hours: 24,
    include: ["current", "history", "health", "performance", "stats"],
    refreshInterval: autoRefresh ? refreshInterval : undefined,
  });

  const metrics = metricsData?.current;
  const healthChecks = metricsData?.health?.checks || [];
  const stats = metricsData?.stats;

  const handleRefresh = useCallback(async () => {
    try {
      await refetchMetrics();
      toast({
        title: "Dashboard refreshed",
        description: "All metrics have been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh dashboard. Please try again.",
        variant: "destructive",
      });
    }
  }, [refetchMetrics, toast]);

  const handleExport = useCallback(
    async (format: "json" | "csv") => {
      try {
        const blob = await unifiedMonitoringService.exportMetrics(format, {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(),
        });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `metrics-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export successful",
          description: `Metrics exported as ${format.toUpperCase()} file.`,
        });
      } catch (error) {
        toast({
          title: "Export failed",
          description: "Failed to export metrics. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Error state
  if (metricsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load monitoring data. Please check your connection and
              try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Create default metrics if no data available
  const defaultMetrics: SystemMetrics = {
    timestamp: Date.now(),
    cpu: { usage: 0, load: [0, 0, 0] },
    memory: { used: 0, total: 1, percentage: 0 },
    disk: { used: 0, total: 1, percentage: 0 },
    network: { bytesIn: 0, bytesOut: 0, connectionsActive: 0 },
    application: { uptime: 0, responseTime: 0, errorRate: 0, activeUsers: 0 },
    database: { connections: 0, queryTime: 0, transactionRate: 0 },
  };

  const displayMetrics = metrics || defaultMetrics;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              System Monitoring
            </h1>
            <p className="text-gray-600">
              Real-time system health and performance monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {metricsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={metricsLoading}
              variant="outline"
              size="sm"
              aria-label="Refresh dashboard"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${metricsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Dashboard settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dashboard Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auto-refresh"
                      className="text-sm font-medium"
                    >
                      Auto Refresh
                    </label>
                    <Button
                      id="auto-refresh"
                      variant={autoRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      {autoRefresh ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div>
                    <label
                      htmlFor="refresh-interval"
                      className="text-sm font-medium"
                    >
                      Refresh Interval
                    </label>
                    <Select
                      value={refreshInterval.toString()}
                      onValueChange={(value) =>
                        setRefreshInterval(parseInt(value))
                      }
                    >
                      <SelectTrigger
                        id="refresh-interval"
                        className="w-full mt-2"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10 seconds</SelectItem>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Export Data</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport("json")}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport("csv")}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="System Uptime"
            value={formatDuration(
              stats?.uptime || displayMetrics.application.uptime,
            )}
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            status="healthy"
            loading={metricsLoading}
          />
          <MetricCard
            title="Response Time"
            value={`${displayMetrics.application.responseTime.toFixed(0)}ms`}
            icon={<Activity className="w-6 h-6 text-green-600" />}
            status={
              displayMetrics.application.responseTime > 2000
                ? "critical"
                : displayMetrics.application.responseTime > 1000
                  ? "warning"
                  : "healthy"
            }
            loading={metricsLoading}
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(displayMetrics.application.activeUsers)}
            icon={<Users className="w-6 h-6 text-purple-600" />}
            trend="up"
            loading={metricsLoading}
          />
          <MetricCard
            title="Error Rate"
            value={`${displayMetrics.application.errorRate.toFixed(1)}%`}
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            status={
              displayMetrics.application.errorRate > 5
                ? "critical"
                : displayMetrics.application.errorRate > 2
                  ? "warning"
                  : "healthy"
            }
            loading={metricsLoading}
          />
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <HealthStatus
                  healthChecks={healthChecks}
                  loading={metricsLoading}
                />
              </div>
              <div>
                <ResourceUsage
                  metrics={displayMetrics}
                  loading={metricsLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResourceUsage
                metrics={displayMetrics}
                loading={metricsLoading}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Database Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Active Connections
                        </span>
                        <span className="font-bold">
                          {displayMetrics.database.connections}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Query Time</span>
                        <span className="font-bold">
                          {displayMetrics.database.queryTime.toFixed(1)}ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Transaction Rate
                        </span>
                        <span className="font-bold">
                          {displayMetrics.database.transactionRate.toFixed(0)}
                          /sec
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel loading={metricsLoading} />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <LineChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Performance chart would go here</p>
                      <p className="text-sm">
                        Integration with charting library needed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="w-5 h-5 mr-2" />
                    Alert Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Alert distribution chart would go here</p>
                      <p className="text-sm">
                        Integration with charting library needed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MonitoringDashboard;

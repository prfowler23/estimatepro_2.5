// Monitoring Dashboard
// Real-time system monitoring and alerting dashboard

"use client";

import React, { useState, useEffect, useMemo } from "react";
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

// Mock data interfaces (in production, these would come from API)
interface SystemMetrics {
  timestamp: number;
  cpu: { usage: number; load: number[] };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { bytesIn: number; bytesOut: number; connectionsActive: number };
  application: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  database: { connections: number; queryTime: number; transactionRate: number };
}

interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "critical";
  lastCheck: number;
  message?: string;
  details?: any;
}

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  resolved?: boolean;
  acknowledgedBy?: string;
}

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

// Mock data generator
const generateMockData = (): {
  metrics: SystemMetrics;
  healthChecks: HealthCheck[];
  alerts: Alert[];
} => {
  const now = Date.now();

  return {
    metrics: {
      timestamp: now,
      cpu: {
        usage: Math.random() * 100,
        load: [Math.random(), Math.random(), Math.random()],
      },
      memory: {
        used: Math.random() * 8000000000,
        total: 8000000000,
        percentage: Math.random() * 100,
      },
      disk: {
        used: Math.random() * 1000000000000,
        total: 1000000000000,
        percentage: Math.random() * 100,
      },
      network: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 1000000,
        connectionsActive: Math.floor(Math.random() * 100),
      },
      application: {
        uptime: Math.random() * 86400000 * 7,
        responseTime: Math.random() * 2000,
        errorRate: Math.random() * 10,
        activeUsers: Math.floor(Math.random() * 1000),
      },
      database: {
        connections: Math.floor(Math.random() * 20),
        queryTime: Math.random() * 100,
        transactionRate: Math.random() * 1000,
      },
    },
    healthChecks: [
      {
        name: "Database",
        status: Math.random() > 0.1 ? "healthy" : "warning",
        lastCheck: now - Math.random() * 300000,
        message: "Database connection active",
      },
      {
        name: "API",
        status: Math.random() > 0.05 ? "healthy" : "critical",
        lastCheck: now - Math.random() * 60000,
        message: "API responding normally",
      },
      {
        name: "External Services",
        status: Math.random() > 0.2 ? "healthy" : "warning",
        lastCheck: now - Math.random() * 120000,
        message: "All external services operational",
      },
    ],
    alerts: [
      {
        id: "alert_1",
        type: "cpu-usage",
        severity: "warning",
        message: "CPU usage high: 85.3%",
        timestamp: now - 300000,
      },
      {
        id: "alert_2",
        type: "response-time",
        severity: "critical",
        message: "Response time critical: 3500ms",
        timestamp: now - 600000,
        resolved: true,
      },
    ],
  };
};

// Metric card component
const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  status?: "healthy" | "warning" | "critical";
  subtitle?: string;
}> = ({ title, value, icon, trend, status, subtitle }) => {
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
            <div className="p-2 bg-blue-100 rounded-lg">{icon}</div>
            {getTrendIcon(trend)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Health status component
const HealthStatus: React.FC<{ healthChecks: HealthCheck[] }> = ({
  healthChecks,
}) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          System Health
          <Badge className={`ml-2 ${getStatusColor(overallStatus)}`}>
            {overallStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {healthChecks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(check.status)}
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
};

// Alerts component
const AlertsPanel: React.FC<{ alerts: Alert[] }> = ({ alerts }) => {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">(
    "all",
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filter === "all") return true;
      return alert.severity === filter;
    });
  }, [alerts, filter]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Recent Alerts
          </CardTitle>
          <Select
            value={filter}
            onValueChange={(value: any) => setFilter(value)}
          >
            <SelectTrigger className="w-32">
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
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts to display</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.severity)}
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">{alert.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatDuration(Date.now() - alert.timestamp)} ago
                    </p>
                    {alert.resolved && (
                      <Badge className="mt-1 bg-green-100 text-green-800">
                        Resolved
                      </Badge>
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
};

// Resource usage component
const ResourceUsage: React.FC<{ metrics: SystemMetrics }> = ({ metrics }) => {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

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
              <span className={`font-bold ${getUsageColor(metrics.cpu.usage)}`}>
                {metrics.cpu.usage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.cpu.usage}
              className="h-2"
              style={
                {
                  "--progress-background": getProgressColor(metrics.cpu.usage),
                } as any
              }
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
              >
                {metrics.memory.percentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.memory.percentage}
              className="h-2"
              style={
                {
                  "--progress-background": getProgressColor(
                    metrics.memory.percentage,
                  ),
                } as any
              }
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
              >
                {metrics.disk.percentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={metrics.disk.percentage}
              className="h-2"
              style={
                {
                  "--progress-background": getProgressColor(
                    metrics.disk.percentage,
                  ),
                } as any
              }
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
};

// Main dashboard component
export const MonitoringDashboard: React.FC = () => {
  const [data, setData] = useState(generateMockData());
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setData(generateMockData());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setData(generateMockData());
    setIsLoading(false);
  };

  const { metrics, healthChecks, alerts } = data;

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
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
                    <label className="text-sm font-medium">Auto Refresh</label>
                    <Button
                      variant={autoRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      {autoRefresh ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Refresh Interval (seconds)
                    </label>
                    <Select
                      value={refreshInterval.toString()}
                      onValueChange={(value) =>
                        setRefreshInterval(parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
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
            value={formatDuration(metrics.application.uptime)}
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            status="healthy"
          />
          <MetricCard
            title="Response Time"
            value={`${metrics.application.responseTime.toFixed(0)}ms`}
            icon={<Activity className="w-6 h-6 text-green-600" />}
            status={
              metrics.application.responseTime > 2000
                ? "critical"
                : metrics.application.responseTime > 1000
                  ? "warning"
                  : "healthy"
            }
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(metrics.application.activeUsers)}
            icon={<Users className="w-6 h-6 text-purple-600" />}
            trend="up"
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.application.errorRate.toFixed(1)}%`}
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            status={
              metrics.application.errorRate > 5
                ? "critical"
                : metrics.application.errorRate > 2
                  ? "warning"
                  : "healthy"
            }
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
                <HealthStatus healthChecks={healthChecks} />
              </div>
              <div>
                <ResourceUsage metrics={metrics} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResourceUsage metrics={metrics} />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Database Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Active Connections
                      </span>
                      <span className="font-bold">
                        {metrics.database.connections}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Query Time</span>
                      <span className="font-bold">
                        {metrics.database.queryTime.toFixed(1)}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Transaction Rate
                      </span>
                      <span className="font-bold">
                        {metrics.database.transactionRate.toFixed(0)}/sec
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel alerts={alerts} />
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

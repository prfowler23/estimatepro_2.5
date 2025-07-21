"use client";

import React, { useState, useEffect } from "react";
import { devLog } from "@/lib/utils/logger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { MetricCard } from "./MetricCard";
import { WorkflowChart } from "./WorkflowChart";
import { InsightPanel } from "./InsightPanel";
import { BenchmarkComparison } from "./BenchmarkComparison";
import { UserPerformanceTable } from "./UserPerformanceTable";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { ExportDialog } from "./ExportDialog";
import { AlertsPanel } from "./AlertsPanel";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  AnalyticsMetric,
  AnalyticsFilter,
  PredictiveInsight,
  WorkflowBenchmark,
  UserWorkflowStats,
  TimeSeriesData,
} from "@/lib/types/analytics-types";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Brain,
  Download,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Calendar,
  Filter,
} from "lucide-react";

interface AnalyticsDashboardProps {
  userId?: string;
  teamId?: string;
  className?: string;
}

export function AnalyticsDashboard({
  userId,
  teamId,
  className = "",
}: AnalyticsDashboardProps) {
  const { isMobile } = useMobileDetection();
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<AnalyticsFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
    completionStatus: "all",
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  // Analytics data hooks
  const {
    metrics,
    insights,
    benchmarks,
    userStats,
    timeSeriesData,
    isLoading,
    error,
    lastUpdated,
    refreshData,
  } = useAnalytics(filters, userId, teamId);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Handle filter changes
  const handleFilterChange = (newFilters: AnalyticsFilter) => {
    setFilters(newFilters);
  };

  // Calculate summary statistics
  const summaryStats = {
    totalWorkflows: metrics.find((m) => m.id === "total_workflows")?.value || 0,
    completionRate: metrics.find((m) => m.id === "completion_rate")?.value || 0,
    avgQuality: metrics.find((m) => m.id === "avg_quality_score")?.value || 0,
    avgDuration:
      metrics.find((m) => m.id === "avg_completion_time")?.value || 0,
    activeUsers: metrics.find((m) => m.id === "active_users")?.value || 0,
    totalInsights: insights.length,
  };

  // Filter insights by severity
  const criticalInsights = insights.filter((i) => i.severity === "high");
  const warningInsights = insights.filter((i) => i.severity === "medium");
  const infoInsights = insights.filter((i) => i.severity === "low");

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h4 className="font-medium">Analytics Error</h4>
          <p className="text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Workflow Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Advanced insights and performance metrics for estimation workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last updated indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div
              className={`w-2 h-2 rounded-full ${
                isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
              }`}
            />
            <span>
              {isLoading
                ? "Updating..."
                : lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : "Ready"}
            </span>
          </div>

          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 ${
              autoRefresh ? "bg-green-50 border-green-300" : ""
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
            />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <AnalyticsFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={() =>
              setFilters({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
                completionStatus: "all",
              })
            }
          />
        </Card>
      )}

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Workflows"
          value={summaryStats.totalWorkflows}
          unit=""
          icon={BarChart3}
          trend="stable"
          colorScheme="info"
        />
        <MetricCard
          title="Completion Rate"
          value={summaryStats.completionRate}
          unit="%"
          icon={Target}
          trend="up"
          colorScheme={
            summaryStats.completionRate >= 90
              ? "success"
              : summaryStats.completionRate >= 70
                ? "warning"
                : "error"
          }
        />
        <MetricCard
          title="Avg Quality"
          value={summaryStats.avgQuality}
          unit="pts"
          icon={CheckCircle}
          trend="stable"
          colorScheme={
            summaryStats.avgQuality >= 80
              ? "success"
              : summaryStats.avgQuality >= 60
                ? "warning"
                : "error"
          }
        />
        <MetricCard
          title="Avg Duration"
          value={summaryStats.avgDuration}
          unit="min"
          icon={Clock}
          trend="down"
          colorScheme="success"
        />
        <MetricCard
          title="Active Users"
          value={summaryStats.activeUsers}
          unit=""
          icon={Users}
          trend="up"
          colorScheme="info"
        />
        <MetricCard
          title="AI Insights"
          value={summaryStats.totalInsights}
          unit=""
          icon={Brain}
          trend="stable"
          colorScheme="info"
        />
      </div>

      {/* Critical Insights Alert */}
      {criticalInsights.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div>
            <h4 className="font-medium text-red-800">
              Critical Issues Detected
            </h4>
            <p className="text-sm text-red-700">
              {criticalInsights.length} critical insight
              {criticalInsights.length > 1 ? "s" : ""} requiring immediate
              attention.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("insights")}
              className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
            >
              View Details
            </Button>
          </div>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className={`grid w-full ${isMobile ? "grid-cols-3" : "grid-cols-6"}`}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Workflow Status Chart */}
            <Card className="lg:col-span-2 p-6">
              <h3 className="text-lg font-semibold mb-4">
                Workflow Completion Status
              </h3>
              <WorkflowChart
                data={timeSeriesData}
                type="completion_status"
                height={300}
              />
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Today&apos;s Workflows
                  </span>
                  <span className="font-medium">
                    {
                      timeSeriesData.filter(
                        (d) =>
                          d.date.toDateString() === new Date().toDateString(),
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Weekly Average</span>
                  <span className="font-medium">
                    {Math.round(summaryStats.totalWorkflows / 4)} /week
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quality Trend</span>
                  <Badge
                    variant={
                      summaryStats.avgQuality >= 80 ? "default" : "secondary"
                    }
                  >
                    {summaryStats.avgQuality >= 80 ? "Improving" : "Stable"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Efficiency</span>
                  <Badge variant="default">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12%
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {timeSeriesData.slice(0, 5).map((data, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm">
                      {data.metric.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {data.date.toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="font-medium">{data.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Performance Over Time */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
              <TimeSeriesChart
                data={timeSeriesData}
                metrics={["completion_rate", "quality_score", "avg_duration"]}
                height={300}
              />
            </Card>

            {/* Step Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Step Performance</h3>
              <WorkflowChart
                data={timeSeriesData}
                type="step_performance"
                height={300}
              />
            </Card>
          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.id}
                title={metric.name}
                value={metric.value}
                unit={metric.unit}
                trend={metric.trend}
                trendPercentage={metric.trendPercentage}
                colorScheme={metric.colorScheme}
                description={metric.description}
                benchmark={metric.benchmark}
                target={metric.target}
                chartType={metric.chartType}
              />
            ))}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Insights Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Insights Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="font-medium text-red-600">
                    {criticalInsights.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Warning</span>
                  </div>
                  <span className="font-medium text-yellow-600">
                    {warningInsights.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Info</span>
                  </div>
                  <span className="font-medium text-blue-600">
                    {infoInsights.length}
                  </span>
                </div>
              </div>
            </Card>

            {/* Insights Panel */}
            <Card className="lg:col-span-3 p-6">
              <h3 className="text-lg font-semibold mb-4">
                Predictive Insights
              </h3>
              <InsightPanel
                insights={insights}
                onInsightClick={(insight) => {
                  // Handle insight click - could open details modal
                  devLog("Insight clicked", insight);
                }}
              />
            </Card>
          </div>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <BenchmarkComparison
            benchmarks={benchmarks}
            currentMetrics={metrics}
            onBenchmarkSelect={(benchmark) => {
              // Handle benchmark selection
              devLog("Benchmark selected", benchmark);
            }}
          />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UserPerformanceTable
            userStats={userStats}
            onUserSelect={(userId) => {
              // Handle user selection - could filter data
              devLog("User selected", userId);
            }}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Long-term Trends */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Long-term Trends</h3>
              <TimeSeriesChart
                data={timeSeriesData}
                metrics={["completion_rate", "quality_score"]}
                height={300}
                timeRange="3months"
              />
            </Card>

            {/* Seasonal Patterns */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Seasonal Patterns</h3>
              <WorkflowChart
                data={timeSeriesData}
                type="seasonal"
                height={300}
              />
            </Card>
          </div>

          {/* Trend Analysis */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Trend Analysis</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">+15%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-xs text-gray-500">vs. last month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">-8%</div>
                <div className="text-sm text-gray-600">Avg Duration</div>
                <div className="text-xs text-gray-500">vs. last month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">+12%</div>
                <div className="text-sm text-gray-600">Quality Score</div>
                <div className="text-xs text-gray-500">vs. last month</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        dashboardData={{
          metrics,
          insights,
          benchmarks,
          userStats,
          timeSeriesData,
        }}
        filters={filters}
      />

      {/* Alerts Panel */}
      <AlertsPanel
        insights={criticalInsights}
        onAlertDismiss={(alertId) => {
          // Handle alert dismissal
          devLog("Alert dismissed", alertId);
        }}
      />
    </div>
  );
}

export default AnalyticsDashboard;

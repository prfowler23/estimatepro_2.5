"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Star,
  Zap,
  Shield,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Info,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Settings,
  Eye,
} from "lucide-react";

// Local component imports
import { MetricCard } from "./MetricCard";
import { WorkflowChart } from "./WorkflowChart";
import { InsightPanel } from "./InsightPanel";
import { BenchmarkComparison } from "./BenchmarkComparison";
import { UserPerformanceTable } from "./UserPerformanceTable";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { ExportDialog } from "./ExportDialog";
import { AlertsPanel } from "./AlertsPanel";

// Hook imports
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import {
  useRealTimeMetrics,
  useDataQualityUpdates,
  useAIPredictionUpdates,
  useAnomalyAlerts,
} from "@/hooks/useAnalyticsWebSocket";

// Type imports
import {
  AnalyticsMetric,
  AnalyticsFilter,
  PredictiveInsight,
  WorkflowBenchmark,
  UserWorkflowStats,
  TimeSeriesData,
} from "@/lib/types/analytics-types";

// Configuration import
import {
  getDashboardConfig,
  DashboardMode,
} from "@/lib/config/analytics-dashboard-config";

// Constants
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Enhanced types for unified dashboard
interface UnifiedAnalyticsData {
  business_metrics?: BusinessMetrics;
  financial_analysis?: FinancialAnalysis;
  recommendations?: Recommendation[];
  insights?: Insight[];
  performance_scores?: PerformanceScores;
  data_quality?: DataQuality;
  metadata?: {
    generated_at: string;
    period: {
      start?: string;
      end?: string;
    };
    detail_level: string;
    user_id: string;
  };
}

interface BusinessMetrics {
  totalRevenue: number;
  revenueGrowthRate: number;
  averageDealSize: number;
  winRate: number;
  salesCycleLength: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  profitMargin: number;
  operatingRatio: number;
}

interface FinancialAnalysis {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  revenueByService: ServiceRevenue[];
  revenueByRegion: RegionRevenue[];
}

interface ServiceRevenue {
  service: string;
  revenue: number;
  percentage: number;
}

interface RegionRevenue {
  region: string;
  revenue: number;
  percentage: number;
}

interface Recommendation {
  id: string;
  type: "revenue" | "cost" | "efficiency" | "risk" | "growth" | "quality";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  timeline: string;
  roi: number;
  confidenceLevel: number;
}

interface Insight {
  type: "positive" | "warning" | "opportunity";
  category: string;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number;
  actions: string[];
}

interface PerformanceScores {
  overall: number;
  revenue: number;
  efficiency: number;
  profitability: number;
  growth: number;
}

interface DataQuality {
  completeness: number;
  accuracy: number;
  timeliness: number;
  consistency: number;
  overall: number;
  issues: string[];
}

interface UnifiedAnalyticsDashboardProps {
  mode?: DashboardMode;
  userId?: string;
  teamId?: string;
  className?: string;
  enableWebSocket?: boolean;
  enableAI?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function UnifiedAnalyticsDashboard({
  mode = "basic",
  userId,
  teamId,
  className = "",
  enableWebSocket = false,
  enableAI = false,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: UnifiedAnalyticsDashboardProps) {
  // Get configuration based on mode
  const config = getDashboardConfig(mode);
  const { isMobile } = useMobileDetection();

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("30d");
  const [data, setData] = useState<UnifiedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    completionStatus: "all",
  });

  // Use standard analytics hook (always called for consistency)
  const analyticsHookResult = useAnalytics(filters, userId, teamId);

  const analyticsResult = config.features.standardAnalytics
    ? analyticsHookResult
    : {
        metrics: [],
        insights: [],
        benchmarks: [],
        userStats: [],
        timeSeriesData: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
        refreshData: async () => {},
      };

  const {
    metrics,
    insights,
    benchmarks,
    userStats,
    timeSeriesData,
    isLoading: basicLoading,
    error: basicError,
    lastUpdated: basicLastUpdated,
    refreshData: refreshBasicData,
  } = analyticsResult;

  // WebSocket connections (only for consolidated mode)
  const { metrics: liveMetrics, isConnected: metricsConnected } =
    useRealTimeMetrics(
      enableWebSocket && config.features.realTimeMetrics
        ? ["live_estimates", "revenue_stream", "user_activity"]
        : [],
    );

  const { latestQuality, isConnected: qualityConnected } =
    useDataQualityUpdates(enableWebSocket && config.features.dataQuality);

  const { latestPrediction, isConnected: predictionsConnected } =
    useAIPredictionUpdates(enableWebSocket && config.features.aiPredictions);

  const {
    alerts,
    criticalCount,
    isConnected: alertsConnected,
  } = useAnomalyAlerts(enableWebSocket && config.features.anomalyDetection);

  // Load data based on mode
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode === "enhanced" && enableAI) {
        // Load enhanced AI-powered analytics
        const response = await fetch("/api/analytics/enhanced");
        if (!response.ok) {
          throw new Error("Failed to load enhanced analytics");
        }
        const result = await response.json();
        setData(result.data);
      } else if (mode === "consolidated" && enableWebSocket) {
        // Use WebSocket data for consolidated mode
        const consolidatedData: UnifiedAnalyticsData = {
          business_metrics: {
            totalRevenue:
              liveMetrics?.find((m) => m.metric === "revenue")?.value || 0,
            revenueGrowthRate: 0.15,
            averageDealSize: 5000,
            winRate: 0.65,
            salesCycleLength: 21,
            customerAcquisitionCost: 500,
            customerLifetimeValue: 15000,
            profitMargin: 0.35,
            operatingRatio: 0.75,
          },
          data_quality: latestQuality
            ? {
                completeness: latestQuality.score,
                accuracy: 95,
                timeliness: 98,
                consistency: 92,
                overall: latestQuality.score,
                issues: latestQuality.recommendations || [],
              }
            : undefined,
          performance_scores: {
            overall: 85,
            revenue: 88,
            efficiency: 82,
            profitability: 86,
            growth: 84,
          },
        };
        setData(consolidatedData);
      } else {
        // Basic mode - use standard analytics data
        const basicData: UnifiedAnalyticsData = {
          business_metrics: {
            totalRevenue: metrics[0]?.value || 0,
            revenueGrowthRate: metrics[0]?.change || 0,
            averageDealSize: 5000,
            winRate: 0.65,
            salesCycleLength: 21,
            customerAcquisitionCost: 500,
            customerLifetimeValue: 15000,
            profitMargin: 0.35,
            operatingRatio: 0.75,
          },
        };
        setData(basicData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading analytics:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load analytics",
      );
    } finally {
      setLoading(false);
    }
  }, [mode, enableAI, enableWebSocket, liveMetrics, latestQuality, metrics]);

  // Initial load and refresh logic
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !config.features.autoRefresh) return;

    const interval = setInterval(() => {
      loadAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    autoRefresh,
    refreshInterval,
    loadAnalyticsData,
    config.features.autoRefresh,
  ]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    if (config.features.standardAnalytics) {
      await refreshBasicData();
    }
    setRefreshing(false);
  };

  // Utility functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (
    score: number,
  ): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "high":
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "opportunity":
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Loading state
  if (loading || basicLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium mb-2">Loading {config.name}</h3>
          <p className="text-gray-500">
            {enableAI
              ? "Analyzing your business data with AI..."
              : "Loading analytics data..."}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || basicError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || basicError}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!data && !metrics.length) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Data Available
        </h3>
        <p className="text-gray-500 mb-4">
          Create estimates to start seeing analytics and insights
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
          <p className="text-gray-600">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {config.features.filters && (
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {config.features.export && (
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && config.features.filters && (
        <AnalyticsFilters
          filters={filters}
          onFilterChange={setFilters}
          showAdvanced={mode !== "basic"}
        />
      )}

      {/* WebSocket Connection Status (Consolidated mode only) */}
      {mode === "consolidated" && enableWebSocket && (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant={metricsConnected ? "default" : "secondary"}>
            Metrics: {metricsConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant={qualityConnected ? "default" : "secondary"}>
            Quality: {qualityConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant={predictionsConnected ? "default" : "secondary"}>
            Predictions: {predictionsConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant={alertsConnected ? "default" : "secondary"}>
            Alerts: {alertsConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      )}

      {/* Data Quality Indicator (Enhanced/Consolidated modes) */}
      {config.features.dataQuality && data?.data_quality && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-500">Overall</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.data_quality.overall}
                    className="flex-1"
                  />
                  <span
                    className={`text-sm font-medium ${getScoreColor(data.data_quality.overall)}`}
                  >
                    {data.data_quality.overall}%
                  </span>
                </div>
              </div>
              {["completeness", "accuracy", "timeliness", "consistency"].map(
                (metric) => (
                  <div key={metric}>
                    <p className="text-sm text-gray-500 capitalize">{metric}</p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          data.data_quality![
                            metric as keyof DataQuality
                          ] as number
                        }
                        className="flex-1"
                      />
                      <span className="text-sm font-medium">
                        {data.data_quality![metric as keyof DataQuality]}%
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
            {data.data_quality.issues.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Data Quality Issues:
                </p>
                <ul className="space-y-1">
                  {data.data_quality.issues.map((issue, index) => (
                    <li
                      key={index}
                      className="text-sm text-red-600 flex items-center gap-2"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Scores (Enhanced/Consolidated modes) */}
      {config.features.performanceScores && data?.performance_scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Performance Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {Object.entries(data.performance_scores).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="mb-2">
                    <div
                      className={`text-2xl font-bold ${getScoreColor(value)}`}
                    >
                      {value}
                    </div>
                  </div>
                  <p className="text-sm font-medium capitalize">{key}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {config.features.insights && (
            <TabsTrigger value="insights">Insights</TabsTrigger>
          )}
          {config.features.recommendations && (
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          )}
          {config.features.financialAnalysis && (
            <TabsTrigger value="financial">Financial</TabsTrigger>
          )}
          {config.features.trends && (
            <TabsTrigger value="trends">Trends</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.business_metrics && (
              <>
                <MetricCard
                  title="Total Revenue"
                  value={data.business_metrics.totalRevenue}
                  unit="currency"
                  icon={DollarSign}
                  trend={
                    data.business_metrics.revenueGrowthRate > 0 ? "up" : "down"
                  }
                  trendPercentage={Math.abs(
                    data.business_metrics.revenueGrowthRate,
                  )}
                  colorScheme="success"
                />
                <MetricCard
                  title="Win Rate"
                  value={data.business_metrics.winRate * 100}
                  unit="%"
                  icon={Target}
                  colorScheme="info"
                />
                <MetricCard
                  title="Sales Cycle"
                  value={data.business_metrics.salesCycleLength}
                  unit="days"
                  icon={Clock}
                  colorScheme="warning"
                />
                <MetricCard
                  title="Profit Margin"
                  value={data.business_metrics.profitMargin * 100}
                  unit="%"
                  icon={BarChart3}
                  colorScheme="success"
                />
              </>
            )}
          </div>

          {/* Charts */}
          {config.features.charts && timeSeriesData.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <TimeSeriesChart
                data={timeSeriesData}
                title="Completion Rate Over Time"
                dataKey="value"
                xAxisKey="date"
              />
              {benchmarks.length > 0 && (
                <BenchmarkComparison
                  benchmarks={benchmarks}
                  currentValue={85}
                  title="Performance Benchmarks"
                />
              )}
            </div>
          )}

          {/* User Performance Table */}
          {config.features.userStats && userStats.length > 0 && (
            <UserPerformanceTable
              data={userStats}
              showAdvancedMetrics={mode !== "basic"}
            />
          )}
        </TabsContent>

        {/* Insights Tab */}
        {config.features.insights && (
          <TabsContent value="insights" className="space-y-6">
            {insights.length > 0 ? (
              <div className="grid gap-4">
                {insights.map((insight, index) => (
                  <InsightPanel
                    key={index}
                    insight={insight}
                    onAction={() => console.log("Action clicked:", insight)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Insights Available
                  </h3>
                  <p className="text-gray-500">
                    Continue using the system to generate AI-powered insights
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Recommendations Tab */}
        {config.features.recommendations && data?.recommendations && (
          <TabsContent value="recommendations" className="space-y-6">
            {data.recommendations.length > 0 ? (
              <div className="grid gap-4">
                {data.recommendations.map((recommendation) => (
                  <Card key={recommendation.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(recommendation.priority)}
                          {recommendation.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getScoreVariant(recommendation.roi)}>
                            ROI: {recommendation.roi}%
                          </Badge>
                          <Badge variant="outline">
                            {recommendation.priority} priority
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        {recommendation.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Expected Impact
                          </p>
                          <p className="text-sm text-gray-700">
                            {recommendation.expectedImpact}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Effort Required
                          </p>
                          <Badge
                            variant={
                              recommendation.effort === "high"
                                ? "destructive"
                                : recommendation.effort === "medium"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {recommendation.effort}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Timeline
                          </p>
                          <p className="text-sm text-gray-700">
                            {recommendation.timeline}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Confidence
                          </p>
                          <Progress
                            value={recommendation.confidenceLevel * 100}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm">Implement Recommendation</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Recommendations Available
                  </h3>
                  <p className="text-gray-500">
                    AI-powered recommendations will appear as your business
                    grows
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Financial Tab */}
        {config.features.financialAnalysis && data?.financial_analysis && (
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6">
              {/* MRR/ARR Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Recurring Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(
                        data.financial_analysis.monthlyRecurringRevenue,
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Monthly revenue from approved estimates
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Annual Recurring Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(
                        data.financial_analysis.annualRecurringRevenue,
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Projected annual revenue based on current MRR
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Service */}
              {data.financial_analysis.revenueByService.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.financial_analysis.revenueByService}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ service, revenue }) =>
                            `${service}: ${formatCurrency(revenue)}`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {data.financial_analysis.revenueByService.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {/* Trends Tab */}
        {config.features.trends && (
          <TabsContent value="trends" className="space-y-6">
            {timeSeriesData.length > 0 ? (
              <div className="grid gap-6">
                <WorkflowChart
                  data={timeSeriesData}
                  title="Workflow Performance Trends"
                  showPredictions={enableAI}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Trend Analysis
                  </h3>
                  <p className="text-gray-500">
                    Trend analysis will be available with more data
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Alerts Panel (Consolidated mode) */}
      {mode === "consolidated" && alerts.length > 0 && (
        <AlertsPanel
          alerts={alerts.map((a) => ({
            id: a.anomalyId,
            type:
              a.severity === "critical"
                ? "error"
                : a.severity === "high"
                  ? "warning"
                  : "info",
            message: `${a.totalAnomalies} anomalies detected`,
            timestamp: new Date(a.detectedAt),
            metadata: { criticalCount: a.criticalCount },
          }))}
          title="System Alerts"
          showDismiss={true}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={{
            metrics,
            insights,
            benchmarks,
            userStats,
            timeSeriesData,
          }}
          filename={`analytics-${mode}-${new Date().toISOString()}`}
        />
      )}
    </div>
  );
}

// Default export for backward compatibility
export default UnifiedAnalyticsDashboard;

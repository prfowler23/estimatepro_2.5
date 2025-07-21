"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";

interface EnhancedAnalyticsData {
  business_metrics: BusinessMetrics;
  financial_analysis?: FinancialAnalysis;
  recommendations?: Recommendation[];
  insights?: Insight[];
  performance_scores?: PerformanceScores;
  data_quality?: DataQuality;
  metadata: {
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function EnhancedAnalyticsDashboard() {
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/analytics/enhanced");
      if (!response.ok) {
        throw new Error("Failed to load analytics data");
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error loading enhanced analytics:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load analytics",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

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

  const getScoreVariant = (score: number) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium mb-2">
            Loading Enhanced Analytics
          </h3>
          <p className="text-gray-500">
            Analyzing your business data with AI...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Data Available
        </h3>
        <p className="text-gray-500 mb-4">
          Create estimates to start seeing enhanced analytics and insights
        </p>
        <Button onClick={loadAnalyticsData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Enhanced Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            AI-powered business intelligence and performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Data Quality Indicator */}
      {data.data_quality && (
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
              <div>
                <p className="text-sm text-gray-500">Completeness</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.data_quality.completeness}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {data.data_quality.completeness}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Accuracy</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.data_quality.accuracy}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {data.data_quality.accuracy}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Timeliness</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.data_quality.timeliness}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {data.data_quality.timeliness}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Consistency</p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.data_quality.consistency}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {data.data_quality.consistency}%
                  </span>
                </div>
              </div>
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

      {/* Performance Scores */}
      {data.performance_scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Performance Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                  <div
                    className="absolute inset-0 rounded-full border-8 border-blue-500 border-r-transparent transform -rotate-90"
                    style={{
                      background: `conic-gradient(from 0deg, #3b82f6 ${data.performance_scores.overall * 3.6}deg, transparent 0deg)`,
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-lg font-bold ${getScoreColor(data.performance_scores.overall)}`}
                    >
                      {data.performance_scores.overall}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium">Overall</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(data.performance_scores.revenue)}`}
                  >
                    {data.performance_scores.revenue}
                  </div>
                </div>
                <p className="text-sm font-medium">Revenue</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(data.performance_scores.efficiency)}`}
                  >
                    {data.performance_scores.efficiency}
                  </div>
                </div>
                <p className="text-sm font-medium">Efficiency</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(data.performance_scores.profitability)}`}
                  >
                    {data.performance_scores.profitability}
                  </div>
                </div>
                <p className="text-sm font-medium">Profitability</p>
              </div>
              <div className="text-center">
                <div className="mb-2">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(data.performance_scores.growth)}`}
                  >
                    {data.performance_scores.growth}
                  </div>
                </div>
                <p className="text-sm font-medium">Growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.business_metrics.totalRevenue)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {data.business_metrics.revenueGrowthRate > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  {formatPercentage(
                    Math.abs(data.business_metrics.revenueGrowthRate),
                  )}{" "}
                  from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(data.business_metrics.winRate)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Average deal size:{" "}
                  {formatCurrency(data.business_metrics.averageDealSize)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sales Cycle
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(data.business_metrics.salesCycleLength)} days
                </div>
                <div className="text-xs text-muted-foreground">
                  Customer LTV:{" "}
                  {formatCurrency(data.business_metrics.customerLifetimeValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Profit Margin
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(data.business_metrics.profitMargin)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Operating ratio:{" "}
                  {formatPercentage(data.business_metrics.operatingRatio)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {data.insights && data.insights.length > 0 ? (
            <div className="grid gap-4">
              {data.insights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      {insight.title}
                      <Badge
                        variant={
                          insight.type === "positive"
                            ? "default"
                            : insight.type === "warning"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {insight.type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{insight.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Impact
                        </p>
                        <Badge
                          variant={
                            insight.impact === "high"
                              ? "destructive"
                              : insight.impact === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {insight.impact}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Confidence
                        </p>
                        <Progress
                          value={insight.confidence * 100}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Category
                        </p>
                        <Badge variant="outline">{insight.category}</Badge>
                      </div>
                    </div>
                    {insight.actions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Recommended Actions:
                        </p>
                        <ul className="space-y-1">
                          {insight.actions.map((action, actionIndex) => (
                            <li
                              key={actionIndex}
                              className="text-sm text-gray-600 flex items-center gap-2"
                            >
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
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

        <TabsContent value="recommendations" className="space-y-6">
          {data.recommendations && data.recommendations.length > 0 ? (
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
                  AI-powered recommendations will appear as your business grows
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {data.financial_analysis ? (
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

              {/* Revenue by Region */}
              {data.financial_analysis.revenueByRegion.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Region</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.financial_analysis.revenueByRegion}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Financial Analysis Not Available
                </h3>
                <p className="text-gray-500">
                  Create more estimates to see detailed financial analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Advanced Trend Analysis
              </h3>
              <p className="text-gray-500">
                Advanced trend analysis and forecasting features are being
                developed
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

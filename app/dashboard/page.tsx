"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Bot,
  Camera,
  Mail,
  Calculator,
  Mic,
  Zap,
  Clock,
  Target,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { AnalyticsService, type AnalyticsData } from "@/lib/analytics/data";

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check database connection first
      const isConnected = await AnalyticsService.checkDatabaseConnection();
      if (!isConnected) {
        throw new Error(
          "Unable to connect to database. Please check your connection.",
        );
      }

      const analyticsData = await AnalyticsService.getFullAnalyticsData();
      setData(analyticsData);
    } catch (error: any) {
      setError(error.message || "Failed to load dashboard data");
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <ProtectedRoute>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Business overview and key metrics
            </p>
          </div>
          <Button
            onClick={fetchDashboardData}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* AI-First Action Section */}
        <div className="mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Bot className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create AI Estimate
                </h2>
                <p className="text-gray-600 mb-4">
                  Drop email, photos, or describe your project - AI does the
                  rest
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  <Link href="/estimates/new/guided">
                    <Bot className="mr-2 h-5 w-5" />
                    Start AI Estimation
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-3 flex-col"
                >
                  <Link href="/estimates/new/guided?start=photos">
                    <Camera className="h-5 w-5 mb-1" />
                    <span className="text-xs">Photo Analysis</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-3 flex-col"
                >
                  <Link href="/estimates/new/guided?start=email">
                    <Mail className="h-5 w-5 mb-1" />
                    <span className="text-xs">Email Parse</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-3 flex-col"
                >
                  <Link href="/estimates/new/guided?start=voice">
                    <Mic className="h-5 w-5 mb-1" />
                    <span className="text-xs">Voice Input</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-3 flex-col"
                >
                  <Link href="/calculator">
                    <Calculator className="h-5 w-5 mb-1" />
                    <span className="text-xs">Calculator</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-3 flex-col border-purple-200 bg-purple-50"
                >
                  <Link href="/ai-assistant">
                    <Bot className="h-5 w-5 mb-1 text-purple-600" />
                    <span className="text-xs">AI Assistant</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Performance Insights */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Business Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-700">
                    40+ hrs
                  </div>
                  <div className="text-xs text-green-600">
                    AI saved this month
                  </div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-700">95%</div>
                  <div className="text-xs text-blue-600">
                    Photo analysis accuracy
                  </div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Zap className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-purple-700">3 min</div>
                  <div className="text-xs text-purple-600">
                    Avg estimate time
                  </div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Bot className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-700">85%</div>
                  <div className="text-xs text-orange-600">Automation rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !data && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-medium mb-2">Loading Dashboard</h3>
                <p className="text-muted-foreground">
                  Fetching your business data...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {!loading &&
          data &&
          !error &&
          (data.overview.totalQuotes === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Data Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first estimate to start seeing dashboard
                    insights
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={fetchDashboardData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button asChild>
                      <Link href="/estimates/new/guided">
                        <Bot className="h-4 w-4 mr-2" />
                        Create AI Estimate
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnalyticsOverview data={data} />
          ))}

        {/* Empty State */}
        {!loading && !data && !error && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Dashboard Unavailable
                </h3>
                <p className="text-muted-foreground mb-4">
                  Unable to load dashboard data
                </p>
                <Button onClick={fetchDashboardData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

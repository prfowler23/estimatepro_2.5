"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
} from "lucide-react";

interface UsageData {
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byEndpoint: Record<string, number>;
    byModel: Record<string, { requests: number; tokens: number; cost: number }>;
    dailyUsage: Record<
      string,
      { requests: number; tokens: number; cost: number }
    >;
  };
  quota: {
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
    dailyRemaining: number;
    monthlyRemaining: number;
  };
}

export function AIUsageDisplay() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  const fetchUsage = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case "24h":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const response = await fetch(
        `/api/ai/usage?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      );

      if (!response.ok) throw new Error("Failed to fetch usage data");

      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!usageData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load usage data</AlertDescription>
      </Alert>
    );
  }

  const { usage, quota } = usageData;

  // Calculate percentages
  const dailyPercentage = (quota.dailyUsed / quota.dailyLimit) * 100;
  const monthlyPercentage = (quota.monthlyUsed / quota.monthlyLimit) * 100;

  // Prepare chart data
  const dailyChartData = Object.entries(usage.dailyUsage)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      requests: data.requests,
      tokens: data.tokens,
      cost: data.cost,
    }));

  const endpointData = Object.entries(usage.byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([endpoint, count]) => ({
      endpoint: endpoint.replace("ai.", ""),
      count,
    }));

  return (
    <div className="space-y-6">
      {/* Quota Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {quota.dailyUsed} / {quota.dailyLimit} requests
                </span>
                <span className="text-muted-foreground">
                  {quota.dailyRemaining} remaining
                </span>
              </div>
              <Progress value={dailyPercentage} className="h-2" />
              {dailyPercentage > 80 && (
                <p className="text-xs text-yellow-600">
                  You've used {dailyPercentage.toFixed(0)}% of your daily quota
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {quota.monthlyUsed} / {quota.monthlyLimit} requests
                </span>
                <span className="text-muted-foreground">
                  {quota.monthlyRemaining} remaining
                </span>
              </div>
              <Progress value={monthlyPercentage} className="h-2" />
              {monthlyPercentage > 80 && (
                <p className="text-xs text-yellow-600">
                  You've used {monthlyPercentage.toFixed(0)}% of your monthly
                  quota
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(usage.totalTokens / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usage.totalCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="endpoints">By Endpoint</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usage Over Time</CardTitle>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#8884d8"
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={endpointData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Model Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(usage.byModel).map(([model, data]) => (
                  <div key={model} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{model}</span>
                      <span className="text-sm text-muted-foreground">
                        ${data.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {data.requests} requests •{" "}
                      {(data.tokens / 1000).toFixed(1)}k tokens
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning for high usage */}
      {(dailyPercentage > 90 || monthlyPercentage > 90) && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            You're approaching your {dailyPercentage > 90 ? "daily" : "monthly"}{" "}
            quota limit. Consider upgrading your plan for increased usage.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

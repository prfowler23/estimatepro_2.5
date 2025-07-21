"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Target,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { AnalyticsData } from "@/lib/analytics/data";

interface AnalyticsOverviewProps {
  data: AnalyticsData;
}

const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.totalRevenue)}
            </div>
            <div
              className={`flex items-center text-xs ${getTrendColor(data.overview.monthlyGrowth)}`}
            >
              {getTrendIcon(data.overview.monthlyGrowth)}
              <span className="ml-1">
                {formatPercentage(Math.abs(data.overview.monthlyGrowth))} from
                last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Estimates
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalEstimates}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.overview.activeProjects} active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Estimate Value
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.avgEstimateValue)}
            </div>
            <div
              className={`flex items-center text-xs ${getTrendColor(data.overview.yearOverYear)}`}
            >
              {getTrendIcon(data.overview.yearOverYear)}
              <span className="ml-1">
                {formatPercentage(Math.abs(data.overview.yearOverYear))} vs last
                year
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(data.overview.conversionRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sent to approved estimates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Monthly revenue over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(value as number),
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estimate Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Estimate Volume</CardTitle>
            <CardDescription>
              Number of estimates created monthly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="estimates" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>
              Distribution of revenue across services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenue.breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ service, percentage }) =>
                    `${service} (${percentage.toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {data.revenue.breakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(value as number),
                    "Revenue",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Services</CardTitle>
            <CardDescription>Services ranked by total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.services.slice(0, 5).map((service, index) => (
                <div
                  key={service.serviceType}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{service.serviceType}</p>
                      <p className="text-sm text-gray-500">
                        {service.totalEstimates} estimates •{" "}
                        {formatPercentage(service.conversionRate)} conversion
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(service.totalRevenue)}
                    </p>
                    <div className="flex items-center">
                      {service.trend === "up" && (
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      )}
                      {service.trend === "down" && (
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span
                        className={`text-xs ${
                          service.trend === "up"
                            ? "text-green-600"
                            : service.trend === "down"
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {formatPercentage(Math.abs(service.monthlyGrowth))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
            <CardDescription>
              Customer acquisition and retention metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {data.customers.totalCustomers}
                </div>
                <div className="text-sm text-blue-600">Total Customers</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {data.customers.newCustomers}
                </div>
                <div className="text-sm text-green-600">New This Month</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(data.customers.avgCustomerValue)}
                </div>
                <div className="text-sm text-purple-600">
                  Avg Customer Value
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">
                  {data.customers.repeatCustomers}
                </div>
                <div className="text-sm text-orange-600">Repeat Customers</div>
              </div>
            </div>

            {/* Customer Type Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Customer Types</h4>
              {data.customers.customersByType.map((type) => (
                <div
                  key={type.type}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                    <span className="text-sm">{type.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {type.count} customers
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(type.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              Quote progression through sales stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip />
                <Funnel
                  dataKey="count"
                  data={data.conversion.funnel}
                  isAnimationActive
                  fill="#3B82F6"
                >
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {data.conversion.funnel.map((stage, index) => (
                <div
                  key={stage.stage}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{stage.stage}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{stage.count}</span>
                    <Badge variant="outline">
                      {formatPercentage(stage.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>
            Highest value customers by total revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.customers.topCustomers.slice(0, 6).map((customer, index) => (
              <div
                key={`${customer.name}-${customer.company}`}
                className="p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      {customer.company && (
                        <p className="text-xs text-gray-500">
                          {customer.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <Award className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency(customer.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quotes:</span>
                    <span>{customer.totalQuotes}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Last Quote:</span>
                    <span>
                      {new Date(customer.lastQuote).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Brush,
  ReferenceLine,
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
  Download,
  Filter,
  ZoomIn,
} from "lucide-react";
import { AnalyticsData } from "@/lib/analytics/data";
import { useState, useCallback } from "react";
import * as ExcelJS from "exceljs";

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
  const [selectedDateRange, setSelectedDateRange] = useState<number>(12);
  const [zoomDomain, setZoomDomain] = useState<{
    x?: [number, number];
    y?: [number, number];
  } | null>(null);

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

  // Export functions
  const exportToCSV = useCallback((dataToExport: any[], filename: string) => {
    const csv = convertToCSV(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const exportToExcel = useCallback(
    async (dataToExport: any[], filename: string) => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");

      if (dataToExport.length > 0) {
        // Add headers
        const headers = Object.keys(dataToExport[0]);
        worksheet.addRow(headers);

        // Add data rows
        dataToExport.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });
      }

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    [],
  );

  const convertToCSV = (data: any[]) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((value) => (typeof value === "string" ? `"${value}"` : value))
        .join(","),
    );
    return [headers, ...rows].join("\n");
  };

  // Custom tooltip with more details
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-base p-3 border border-border-primary rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {entry.name.includes("Revenue")
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Filter data based on selected date range
  const filteredData = data.revenue.monthly.slice(-selectedDateRange);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDateRange(3)}
          >
            3M
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDateRange(6)}
          >
            6M
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDateRange(12)}
          >
            12M
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => exportToCSV(data.revenue.monthly, "revenue-data")}
            >
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportToExcel(data.revenue.monthly, "revenue-data")
              }
            >
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPI Cards with hover effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

      {/* Charts Grid with enhanced interactivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend with Brush */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  Monthly revenue over selected period
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomDomain(null)}
                className={zoomDomain ? "" : "invisible"}
              >
                Reset Zoom
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} domain={zoomDomain?.y} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Brush
                  dataKey="month"
                  height={30}
                  stroke="#3B82F6"
                  onChange={(e) => {
                    if (
                      e &&
                      e.startIndex !== undefined &&
                      e.endIndex !== undefined
                    ) {
                      const start = filteredData[e.startIndex]?.revenue;
                      const end = filteredData[e.endIndex]?.revenue;
                      if (start && end) {
                        setZoomDomain({
                          y: [
                            Math.min(start, end) * 0.9,
                            Math.max(start, end) * 1.1,
                          ],
                        });
                      }
                    }
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estimate Volume with clickable bars */}
        <Card>
          <CardHeader>
            <CardTitle>Estimate Volume</CardTitle>
            <CardDescription>
              Number of estimates created monthly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="estimates"
                  fill="#10B981"
                  onClick={(data) => {
                    console.log("Clicked bar data:", data);
                    // Add drill-down functionality here
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance & Revenue Breakdown with interactivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Revenue Breakdown - Interactive Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>Click on segments for details</CardDescription>
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
                  onClick={(data) => {
                    console.log("Selected service:", data);
                    // Add service detail view here
                  }}
                  style={{ cursor: "pointer" }}
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

        {/* Top Services with export option */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Top Performing Services</CardTitle>
                <CardDescription>
                  Services ranked by total revenue
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportToCSV(data.services, "services-performance")
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.services.slice(0, 5).map((service, index) => (
                <div
                  key={service.serviceType}
                  className="flex items-center justify-between hover:bg-bg-secondary p-2 rounded-lg transition-colors cursor-pointer"
                  onClick={() => {
                    console.log("Selected service:", service);
                    // Add service detail view
                  }}
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

      {/* Rest of the original component content remains the same */}
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
              <div className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <div className="text-2xl font-bold text-blue-700">
                  {data.customers.totalCustomers}
                </div>
                <div className="text-sm text-blue-600">Total Customers</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <div className="text-2xl font-bold text-green-700">
                  {data.customers.newCustomers}
                </div>
                <div className="text-sm text-green-600">New This Month</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(data.customers.avgCustomerValue)}
                </div>
                <div className="text-sm text-purple-600">
                  Avg Customer Value
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
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
                  className="flex items-center justify-between hover:bg-bg-secondary p-2 rounded-lg transition-colors"
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
                  className="flex items-center justify-between text-sm hover:bg-bg-secondary p-2 rounded-lg transition-colors"
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

      {/* Top Customers with export */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>
                Highest value customers by total revenue
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToExcel(data.customers.topCustomers, "top-customers")
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.customers.topCustomers.slice(0, 6).map((customer, index) => (
              <div
                key={`${customer.name}-${customer.company}`}
                className="p-4 border rounded-lg hover:border-border-accent hover:shadow-lg transition-all cursor-pointer"
                onClick={() => {
                  console.log("Selected customer:", customer);
                  // Add customer detail view
                }}
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

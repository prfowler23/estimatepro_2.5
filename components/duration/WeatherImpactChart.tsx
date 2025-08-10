import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  CheckCircle,
  AlertTriangle,
  Cloud,
  Thermometer,
  Wind,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  WeatherImpactChartProps,
  ServiceWeatherSensitivity,
  ChartTooltipProps,
} from "./types";
import {
  SERVICE_NAMES,
  SERVICE_WEATHER_SENSITIVITY,
  WEATHER_SENSITIVITY_COLORS,
  WEATHER_SENSITIVITY_BADGES,
  CHART_CONFIG,
} from "./constants";
import { ChartErrorBoundary } from "./ChartErrorBoundary";

export function WeatherImpactChart({
  historical,
  services,
  location = "Project Location",
}: WeatherImpactChartProps) {
  // Transform historical data for charts
  const workabilityData = historical.fiveYearAverages.map((month) => ({
    month: month.month.slice(0, 3), // Abbreviate month names
    workableDays: month.workableDays,
    rainDays: month.rainDays,
    snowDays: month.snowDays,
    extremeTempDays: month.extremeTempDays,
    totalDays: 30, // Approximate
  }));

  const temperatureData = historical.fiveYearAverages.map((month) => ({
    month: month.month.slice(0, 3),
    high: month.avgTempHigh,
    low: month.avgTempLow,
    range: month.avgTempHigh - month.avgTempLow,
  }));

  const precipitationData = historical.fiveYearAverages.map((month) => ({
    month: month.month.slice(0, 3),
    precipitation: month.avgPrecipitation,
    humidity: month.avgHumidity,
    windSpeed: month.avgWindSpeed,
  }));

  const getServiceWeatherSensitivity = (
    service: string,
  ): ServiceWeatherSensitivity => {
    return (
      SERVICE_WEATHER_SENSITIVITY[service] || {
        rain: "medium",
        temperature: "medium",
        wind: "medium",
        snow: "medium",
      }
    );
  };

  const getSensitivityColor = (level: string): string => {
    switch (level) {
      case "low":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-orange-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getSensitivityBadgeVariant = (level: string) => {
    switch (level) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Custom tooltip for charts
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name.includes("Days") && " days"}
              {entry.name.includes("Temperature") && "°F"}
              {entry.name.includes("Precipitation") && " in"}
              {entry.name.includes("Humidity") && "%"}
              {entry.name.includes("Wind") && " mph"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather Impact Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          5-year historical patterns for {location}
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="workability" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workability">Workability</TabsTrigger>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="precipitation">Precipitation</TabsTrigger>
            <TabsTrigger value="sensitivity">Service Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="workability" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Monthly Workability Patterns</h4>
              <ChartErrorBoundary fallbackTitle="Workability Chart Error">
                <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
                  <BarChart data={workabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="workableDays"
                      fill="#10b981"
                      name="Workable Days"
                    />
                    <Bar dataKey="rainDays" fill="#3b82f6" name="Rain Days" />
                    <Bar dataKey="snowDays" fill="#6366f1" name="Snow Days" />
                    <Bar
                      dataKey="extremeTempDays"
                      fill="#f59e0b"
                      name="Extreme Temp Days"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="temperature" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Temperature Ranges</h4>
              <ChartErrorBoundary fallbackTitle="Temperature Chart Error">
                <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
                  <AreaChart data={temperatureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="high"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#fecaca"
                      name="High Temperature (°F)"
                    />
                    <Area
                      type="monotone"
                      dataKey="low"
                      stackId="2"
                      stroke="#3b82f6"
                      fill="#bfdbfe"
                      name="Low Temperature (°F)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="precipitation" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">
                Precipitation and Wind Patterns
              </h4>
              <ChartErrorBoundary fallbackTitle="Precipitation Chart Error">
                <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
                  <LineChart data={precipitationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="precipitation"
                      fill="#06b6d4"
                      name="Precipitation (in)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="windSpeed"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      name="Wind Speed (mph)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Humidity (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="sensitivity" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Service Weather Sensitivity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => {
                  const sensitivity = getServiceWeatherSensitivity(service);
                  return (
                    <Card key={service} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium">
                            {SERVICE_NAMES[service] || service}
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            ({service})
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">Rain</span>
                          </div>
                          <Badge
                            variant={getSensitivityBadgeVariant(
                              sensitivity.rain,
                            )}
                            className="text-xs"
                          >
                            {sensitivity.rain}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Temp</span>
                          </div>
                          <Badge
                            variant={getSensitivityBadgeVariant(
                              sensitivity.temperature,
                            )}
                            className="text-xs"
                          >
                            {sensitivity.temperature}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">Wind</span>
                          </div>
                          <Badge
                            variant={getSensitivityBadgeVariant(
                              sensitivity.wind,
                            )}
                            className="text-xs"
                          >
                            {sensitivity.wind}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-blue-400" />
                            <span className="text-sm">Snow</span>
                          </div>
                          <Badge
                            variant={getSensitivityBadgeVariant(
                              sensitivity.snow,
                            )}
                            className="text-xs"
                          >
                            {sensitivity.snow}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Best and Worst Months Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Best Months for Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {historical.bestMonths.map((month) => (
                  <div key={month} className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{month}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 mt-3">
                Historically optimal conditions for outdoor cleaning work
              </p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Challenging Months
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {historical.worstMonths.map((month) => (
                  <div key={month} className="flex items-center text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                    <span>{month}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-3">
                Higher risk of weather delays and extended timelines
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weather Sensitivity Legend */}
        <Card className="mt-6 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">
              Weather Sensitivity Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Low
                </Badge>
                <span>Minimal impact</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Medium
                </Badge>
                <span>Some delays possible</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  High
                </Badge>
                <span>Significant delays likely</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
                <span>Work not possible</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

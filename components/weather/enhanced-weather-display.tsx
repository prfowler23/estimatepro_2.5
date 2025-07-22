"use client";

import React, { useState, useEffect } from "react";
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
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  Eye,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap,
  Timer,
} from "lucide-react";

interface WeatherDisplayProps {
  location: string;
  services: string[];
  projectDuration?: number;
  onLocationChange?: (location: string) => void;
  onServicesChange?: (services: string[]) => void;
}

interface WeatherData {
  location: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  current: {
    date: string;
    summary: string;
    metrics: {
      temperature: number;
      feelsLike: number;
      humidity: number;
      pressure: number;
      visibility: number;
      precipitation: number;
      windSpeed: number;
      windDirection: number;
      cloudCover: number;
    };
    workability: {
      overall: number;
      factors: {
        temperature: number;
        precipitation: number;
        wind: number;
        humidity: number;
        visibility: number;
      };
      limitations: string[];
      recommendations: string[];
    };
  };
  forecast: Array<{
    date: string;
    summary: string;
    metrics: any;
    workability: any;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    start: string;
    end: string;
  }>;
  serviceInsights: {
    overall_impact: string;
    critical_periods: Array<{
      service: string;
      period: string;
      reason: string;
    }>;
    service_specific: Record<
      string,
      {
        service_name: string;
        risk_level: string;
        risk_reason: string;
        workable_days: number;
        total_forecast_days: number;
        workability_percentage: number;
      }
    >;
    recommendations: string[];
  };
  riskAssessment: {
    overall_risk: string;
    risk_factors: string[];
    mitigation_strategies: string[];
    contingency_plans: string[];
  };
  optimalWindows: Array<{
    start_date: string;
    end_date: string;
    duration_days: number;
    score: number;
    conditions: string;
  }>;
}

export function EnhancedWeatherDisplay({
  location,
  services = [],
  projectDuration = 30,
  onLocationChange,
  onServicesChange,
}: WeatherDisplayProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch weather data
  const fetchWeatherData = async () => {
    if (!location) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        location,
        services: services.join(","),
        projectDuration: projectDuration.toString(),
        includeAlerts: "true",
        includeAirQuality: "true",
        detailLevel: "comprehensive",
      });

      const response = await fetch(`/api/weather/enhanced?${params}`);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setWeatherData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || "Failed to fetch weather data");
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch weather data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [location, services.join(","), projectDuration]);

  // Helper functions
  const getWorkabilityColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getWorkabilityVariant = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      case "critical":
        return "text-red-800";
      default:
        return "text-gray-600";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-800" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !weatherData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">Loading Weather Data</h3>
            <p className="text-gray-500">
              Getting real-time weather analysis...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Weather data unavailable: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchWeatherData}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!weatherData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Cloud className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Weather Data
          </h3>
          <p className="text-gray-500 mb-4">
            Enter a location to get weather analysis for your project
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-500" />
          <h2 className="text-2xl font-bold">
            {weatherData.location.city}, {weatherData.location.state}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated: {formatTime(lastUpdated)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWeatherData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Weather Alerts */}
      {weatherData.alerts && weatherData.alerts.length > 0 && (
        <div className="space-y-2">
          {weatherData.alerts.map((alert) => (
            <Alert key={alert.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.title}</strong>: {alert.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Current Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Current Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Thermometer className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Temperature</p>
                <p className="text-lg font-semibold">
                  {Math.round(weatherData.current.metrics.temperature)}°F
                </p>
                <p className="text-xs text-gray-400">
                  Feels like {Math.round(weatherData.current.metrics.feelsLike)}
                  °F
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Precipitation</p>
                <p className="text-lg font-semibold">
                  {weatherData.current.metrics.precipitation}&rdquo;
                </p>
                <p className="text-xs text-gray-400">
                  {weatherData.current.metrics.humidity}% humidity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Wind className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Wind</p>
                <p className="text-lg font-semibold">
                  {Math.round(weatherData.current.metrics.windSpeed)} mph
                </p>
                <p className="text-xs text-gray-400">
                  {weatherData.current.metrics.windDirection}°
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Visibility</p>
                <p className="text-lg font-semibold">
                  {weatherData.current.metrics.visibility} mi
                </p>
                <p className="text-xs text-gray-400">
                  {weatherData.current.metrics.cloudCover}% clouds
                </p>
              </div>
            </div>
          </div>

          {/* Current Workability */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Workability</span>
              <Badge
                variant={getWorkabilityVariant(
                  weatherData.current.workability.overall,
                )}
              >
                {Math.round(weatherData.current.workability.overall * 100)}%
              </Badge>
            </div>
            <Progress
              value={weatherData.current.workability.overall * 100}
              className="h-2"
            />
            {weatherData.current.workability.limitations.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">
                  Current Limitations:
                </p>
                <div className="flex flex-wrap gap-1">
                  {weatherData.current.workability.limitations.map(
                    (limitation, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {limitation}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="services">Service Impact</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>14-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weatherData.forecast.slice(0, 14).map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium w-16">
                        {formatDate(day.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        {day.metrics.precipitation > 0.1 ? (
                          <CloudRain className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Sun className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm">{day.summary}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        {Math.round(day.metrics.tempHigh)}° /{" "}
                        {Math.round(day.metrics.tempLow)}°
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(day.metrics.windSpeed)} mph
                      </div>
                      <Badge
                        variant={getWorkabilityVariant(day.workability.overall)}
                        className="text-xs"
                      >
                        {Math.round(day.workability.overall * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service-Specific Weather Impact</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No services selected. Add services to see weather impact
                  analysis.
                </p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => {
                    const serviceData =
                      weatherData.serviceInsights.service_specific[service];
                    if (!serviceData) return null;

                    return (
                      <div key={service} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">
                            {serviceData.service_name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {getRiskIcon(serviceData.risk_level)}
                            <span
                              className={`text-sm font-medium ${getRiskColor(serviceData.risk_level)}`}
                            >
                              {serviceData.risk_level.charAt(0).toUpperCase() +
                                serviceData.risk_level.slice(1)}{" "}
                              Risk
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">
                              Workable Days
                            </p>
                            <p className="font-semibold">
                              {serviceData.workable_days} /{" "}
                              {serviceData.total_forecast_days} days
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Workability</p>
                            <p className="font-semibold">
                              {serviceData.workability_percentage}%
                            </p>
                          </div>
                        </div>

                        {serviceData.risk_reason && (
                          <Alert className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {serviceData.risk_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {getRiskIcon(weatherData.riskAssessment.overall_risk)}
                  <span className="text-lg font-semibold">
                    Overall Risk:{" "}
                    {weatherData.riskAssessment.overall_risk
                      .charAt(0)
                      .toUpperCase() +
                      weatherData.riskAssessment.overall_risk.slice(1)}
                  </span>
                </div>

                {weatherData.riskAssessment.risk_factors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Risk Factors</h4>
                    <ul className="space-y-1">
                      {weatherData.riskAssessment.risk_factors.map(
                        (factor, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            {factor}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {weatherData.riskAssessment.mitigation_strategies.length >
                  0 && (
                  <div>
                    <h4 className="font-medium mb-2">Mitigation Strategies</h4>
                    <ul className="space-y-1">
                      {weatherData.riskAssessment.mitigation_strategies.map(
                        (strategy, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {strategy}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {weatherData.riskAssessment.contingency_plans.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Contingency Plans</h4>
                    <ul className="space-y-1">
                      {weatherData.riskAssessment.contingency_plans.map(
                        (plan, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Zap className="h-3 w-3 text-blue-500" />
                            {plan}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Optimal Work Windows
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weatherData.optimalWindows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No optimal work windows found in the forecast period.
                </p>
              ) : (
                <div className="space-y-3">
                  {weatherData.optimalWindows.map((window, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-green-500" />
                          <span className="font-medium">
                            {formatDate(window.start_date)} -{" "}
                            {formatDate(window.end_date)}
                          </span>
                        </div>
                        <Badge variant="default">
                          {Math.round(window.score * 100)}% optimal
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{window.duration_days} days</span>
                        <span>{window.conditions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {weatherData.serviceInsights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Planning Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {weatherData.serviceInsights.recommendations.map(
                    (recommendation, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {recommendation}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

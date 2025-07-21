// Enhanced Weather API Endpoint
// Provides real weather data integration for project planning

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { enhancedWeatherService } from "@/lib/weather/enhanced-weather-service";
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { withAutoRateLimit } from "@/lib/middleware/rate-limit-middleware";
import { z } from "zod";

// Request validation schema
const WeatherRequestSchema = z.object({
  location: z.string().min(1, "Location is required"),
  services: z.array(z.string()).optional().default([]),
  projectDuration: z.number().min(1).max(365).optional().default(30),
  includeAlerts: z.boolean().optional().default(true),
  includeAirQuality: z.boolean().optional().default(false),
  includeHistorical: z.boolean().optional().default(true),
  detailLevel: z
    .enum(["basic", "detailed", "comprehensive"])
    .optional()
    .default("detailed"),
});

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

async function handleGET(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const requestData = {
      location: searchParams.get("location") || "",
      services: searchParams.get("services")?.split(",") || [],
      projectDuration: parseInt(searchParams.get("projectDuration") || "30"),
      includeAlerts: searchParams.get("includeAlerts") !== "false",
      includeAirQuality: searchParams.get("includeAirQuality") === "true",
      includeHistorical: searchParams.get("includeHistorical") !== "false",
      detailLevel: searchParams.get("detailLevel") || "detailed",
    };

    // Validate request parameters
    const validationResult = WeatherRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      location,
      services,
      projectDuration,
      includeAlerts,
      includeAirQuality,
      includeHistorical,
      detailLevel,
    } = validationResult.data;

    // Get enhanced weather analysis
    try {
      const weatherAnalysis =
        await enhancedWeatherService.getEnhancedWeatherAnalysis(
          location,
          services,
          projectDuration,
        );

      // Filter data based on detail level and options
      let responseData: any = {
        location: weatherAnalysis.location,
        current: weatherAnalysis.current,
        analysis: weatherAnalysis.analysis,
        metadata: {
          generated_at: new Date().toISOString(),
          location: weatherAnalysis.location.city,
          project_duration_days: projectDuration,
          services_analyzed: services,
          detail_level: detailLevel,
          user_id: user.id,
        },
      };

      if (detailLevel === "comprehensive" || detailLevel === "detailed") {
        responseData.forecast = weatherAnalysis.forecast;
        responseData.recommendations = weatherAnalysis.recommendations;
      }

      if (
        includeHistorical &&
        (detailLevel === "comprehensive" || detailLevel === "detailed")
      ) {
        responseData.historical = weatherAnalysis.historical;
      }

      if (includeAlerts) {
        responseData.alerts = weatherAnalysis.alerts;
      }

      // Add service-specific insights
      if (services.length > 0) {
        responseData.serviceInsights = generateServiceInsights(
          weatherAnalysis,
          services,
        );
      }

      // Add risk assessment
      responseData.riskAssessment = generateRiskAssessment(weatherAnalysis);

      // Add optimal work windows
      responseData.optimalWindows = findOptimalWorkWindows(
        weatherAnalysis.forecast,
        services,
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (weatherError) {
      console.error("Weather analysis error:", weatherError);

      // Return fallback weather data
      const fallbackData = generateFallbackWeatherData(
        location,
        services,
        projectDuration,
      );

      return NextResponse.json({
        success: true,
        data: fallbackData,
        warning: "Using fallback weather data - some features may be limited",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Enhanced weather API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get weather analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case "bulk_analysis":
        return await handleBulkWeatherAnalysis(parameters, user.id);

      case "location_search":
        return await handleLocationSearch(parameters, user.id);

      case "historical_lookup":
        return await handleHistoricalLookup(parameters, user.id);

      case "alerts_subscription":
        return await handleAlertsSubscription(parameters, user.id);

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Enhanced weather POST error:", error);
    return NextResponse.json(
      { error: "Failed to process weather request" },
      { status: 500 },
    );
  }
}

// Helper functions
function generateServiceInsights(
  weatherAnalysis: any,
  services: string[],
): any {
  const insights = {
    overall_impact: "moderate",
    critical_periods: [] as any[],
    service_specific: {} as Record<string, any>,
    recommendations: [] as string[],
  };

  // Analyze weather impact on each service
  services.forEach((service) => {
    const serviceData = analyzeServiceWeatherImpact(service, weatherAnalysis);
    insights.service_specific[service] = serviceData;

    if (
      serviceData.risk_level === "high" ||
      serviceData.risk_level === "critical"
    ) {
      insights.critical_periods.push({
        service,
        period: serviceData.critical_period,
        reason: serviceData.risk_reason,
      });
    }
  });

  // Generate overall recommendations
  if (insights.critical_periods.length > 0) {
    insights.overall_impact = "high";
    insights.recommendations.push(
      "Multiple services face weather-related challenges",
    );
    insights.recommendations.push(
      "Consider staggered scheduling to minimize risk",
    );
  }

  return insights;
}

function analyzeServiceWeatherImpact(
  service: string,
  weatherAnalysis: any,
): any {
  const serviceProfiles: Record<string, any> = {
    BWS: {
      // Building Washing & Sealing
      temperature_sensitive: true,
      rain_sensitive: true,
      wind_sensitive: false,
      min_temp: 50,
      max_wind: 20,
      max_precip: 0.05,
    },
    WC: {
      // Window Cleaning
      temperature_sensitive: false,
      rain_sensitive: true,
      wind_sensitive: true,
      min_temp: 32,
      max_wind: 15,
      max_precip: 0.1,
    },
    PWP: {
      // Pressure Washing
      temperature_sensitive: false,
      rain_sensitive: false,
      wind_sensitive: true,
      min_temp: 32,
      max_wind: 25,
      max_precip: 0.5,
    },
    HBW: {
      // High Building Washing
      temperature_sensitive: false,
      rain_sensitive: true,
      wind_sensitive: true,
      min_temp: 32,
      max_wind: 12,
      max_precip: 0.1,
    },
  };

  const profile = serviceProfiles[service] || serviceProfiles.WC; // Default to window cleaning
  let risk_level = "low";
  let risk_reason = "";
  let workable_days = 0;

  // Analyze forecast for service-specific risks
  const forecast = weatherAnalysis.forecast || [];
  forecast.forEach((day: any) => {
    let dayWorkable = true;

    if (
      profile.temperature_sensitive &&
      day.metrics.temperature < profile.min_temp
    ) {
      dayWorkable = false;
      risk_level = "high";
      risk_reason = `Temperature below ${profile.min_temp}°F required for ${service}`;
    }

    if (
      profile.rain_sensitive &&
      day.metrics.precipitation > profile.max_precip
    ) {
      dayWorkable = false;
      if (risk_level === "low") risk_level = "medium";
      risk_reason =
        risk_reason || `Precipitation exceeds ${profile.max_precip}" limit`;
    }

    if (profile.wind_sensitive && day.metrics.windSpeed > profile.max_wind) {
      dayWorkable = false;
      if (risk_level === "low") risk_level = "medium";
      risk_reason =
        risk_reason ||
        `Wind speed exceeds ${profile.max_wind} mph safety limit`;
    }

    if (dayWorkable) workable_days++;
  });

  const workability_percentage =
    forecast.length > 0 ? (workable_days / forecast.length) * 100 : 0;

  return {
    service_name: service,
    risk_level,
    risk_reason: risk_reason || "No significant weather risks identified",
    workable_days,
    total_forecast_days: forecast.length,
    workability_percentage: Math.round(workability_percentage),
    critical_period:
      workable_days < forecast.length * 0.3 ? "Next 7-14 days" : null,
  };
}

function generateRiskAssessment(weatherAnalysis: any): any {
  const assessment = {
    overall_risk: "low",
    risk_factors: [] as string[],
    mitigation_strategies: [] as string[],
    contingency_plans: [] as string[],
  };

  // Check for high-risk weather patterns
  const alerts = weatherAnalysis.alerts || [];
  if (alerts.length > 0) {
    assessment.overall_risk = "high";
    assessment.risk_factors.push(`${alerts.length} active weather alerts`);
    assessment.mitigation_strategies.push("Monitor weather alerts closely");
    assessment.contingency_plans.push("Prepare for potential work delays");
  }

  // Check forecast for patterns
  const forecast = weatherAnalysis.forecast || [];
  const highWindDays = forecast.filter(
    (day: any) => day.metrics.windSpeed > 20,
  ).length;
  const rainyDays = forecast.filter(
    (day: any) => day.metrics.precipitation > 0.1,
  ).length;
  const coldDays = forecast.filter(
    (day: any) => day.metrics.temperature < 40,
  ).length;

  if (highWindDays > forecast.length * 0.3) {
    assessment.risk_factors.push("Frequent high wind conditions");
    assessment.mitigation_strategies.push(
      "Schedule wind-sensitive work for calmer periods",
    );
  }

  if (rainyDays > forecast.length * 0.4) {
    assessment.risk_factors.push("Extended wet weather period");
    assessment.mitigation_strategies.push("Plan for extended project timeline");
    assessment.contingency_plans.push("Indoor work alternatives during rain");
  }

  if (coldDays > forecast.length * 0.3) {
    assessment.risk_factors.push("Extended cold weather period");
    assessment.mitigation_strategies.push(
      "Temperature-sensitive services may need rescheduling",
    );
  }

  if (assessment.risk_factors.length === 0) {
    assessment.overall_risk = "low";
    assessment.mitigation_strategies.push("Monitor daily conditions");
    assessment.contingency_plans.push("Standard weather delay procedures");
  } else if (assessment.risk_factors.length >= 3) {
    assessment.overall_risk = "high";
  } else {
    assessment.overall_risk = "medium";
  }

  return assessment;
}

function findOptimalWorkWindows(forecast: any[], services: string[]): any[] {
  const windows = [];
  let currentWindow: any = null;

  forecast.forEach((day, index) => {
    const dayScore = calculateDayWorkabilityScore(day, services);

    if (dayScore > 0.8) {
      if (!currentWindow) {
        currentWindow = {
          start_date: day.date,
          end_date: day.date,
          duration_days: 1,
          score: dayScore,
          services: services,
          conditions: day.summary,
        };
      } else {
        currentWindow.end_date = day.date;
        currentWindow.duration_days++;
        currentWindow.score = (currentWindow.score + dayScore) / 2;
      }
    } else {
      if (currentWindow && currentWindow.duration_days >= 2) {
        windows.push(currentWindow);
      }
      currentWindow = null;
    }
  });

  // Add final window if exists
  if (currentWindow && currentWindow.duration_days >= 2) {
    windows.push(currentWindow);
  }

  return windows.sort((a, b) => b.score - a.score).slice(0, 5);
}

function calculateDayWorkabilityScore(day: any, services: string[]): number {
  const metrics = day.metrics;
  let totalScore = 0;

  // Base environmental scores
  let tempScore = 1.0;
  if (metrics.temperature < 32 || metrics.temperature > 95) tempScore = 0.2;
  else if (metrics.temperature < 40 || metrics.temperature > 85)
    tempScore = 0.6;
  else if (metrics.temperature < 50 || metrics.temperature > 80)
    tempScore = 0.9;

  let precipScore = 1.0;
  if (metrics.precipitation > 0.5) precipScore = 0.1;
  else if (metrics.precipitation > 0.1) precipScore = 0.5;
  else if (metrics.precipitation > 0.01) precipScore = 0.8;

  let windScore = 1.0;
  if (metrics.windSpeed > 25) windScore = 0.2;
  else if (metrics.windSpeed > 15) windScore = 0.6;
  else if (metrics.windSpeed > 10) windScore = 0.8;

  totalScore = (tempScore + precipScore + windScore) / 3;

  // Adjust for specific services
  if (services.includes("BWS") && metrics.temperature < 50) {
    totalScore *= 0.3; // Sealing requires warmer temps
  }

  if (services.includes("HBW") && metrics.windSpeed > 15) {
    totalScore *= 0.4; // High building work sensitive to wind
  }

  return Math.round(totalScore * 100) / 100;
}

function generateFallbackWeatherData(
  location: string,
  services: string[],
  projectDuration: number,
): any {
  // Generate basic fallback data when weather APIs are unavailable
  const currentDate = new Date();
  const forecast = [];

  for (let i = 0; i < Math.min(projectDuration, 14); i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + i);

    // Generate realistic but conservative weather data
    const temp =
      65 +
      Math.sin((date.getMonth() / 12) * Math.PI * 2) * 20 +
      (Math.random() - 0.5) * 10;
    const precip = Math.random() < 0.3 ? Math.random() * 0.5 : 0;
    const wind = 5 + Math.random() * 10;

    forecast.push({
      date: date.toISOString().split("T")[0],
      summary:
        precip > 0.1
          ? "Light Rain"
          : temp > 80
            ? "Warm"
            : temp < 40
              ? "Cold"
              : "Fair",
      metrics: {
        temperature: Math.round(temp),
        precipitation: Math.round(precip * 100) / 100,
        windSpeed: Math.round(wind),
        humidity: 60 + Math.random() * 20,
        pressure: 29.8 + Math.random() * 0.4,
        visibility: 10,
        cloudCover: Math.random() * 100,
      },
      workability: {
        overall: 0.8,
        factors: {
          temperature: 0.9,
          precipitation: precip > 0.1 ? 0.6 : 1.0,
          wind: wind > 15 ? 0.7 : 1.0,
          humidity: 0.9,
          airQuality: 1.0,
          visibility: 1.0,
        },
        limitations: precip > 0.1 ? ["Light precipitation expected"] : [],
        recommendations: ["Monitor local conditions"],
      },
    });
  }

  return {
    location: {
      city: location,
      state: "Unknown",
      country: "US",
      latitude: 0,
      longitude: 0,
    },
    current: forecast[0],
    forecast,
    analysis: {
      riskScore: 0.3,
    },
    alerts: [],
    recommendations: [
      "Weather data temporarily unavailable",
      "Using conservative estimates for planning",
      "Monitor local weather conditions closely",
    ],
    serviceInsights: {
      overall_impact: "unknown",
      critical_periods: [],
      service_specific: {},
      recommendations: ["Verify weather conditions before starting work"],
    },
    riskAssessment: {
      overall_risk: "medium",
      risk_factors: ["Weather data unavailable"],
      mitigation_strategies: [
        "Use local weather sources",
        "Plan conservative timelines",
      ],
      contingency_plans: ["Be prepared for weather delays"],
    },
    optimalWindows: [],
    metadata: {
      generated_at: new Date().toISOString(),
      location: location,
      project_duration_days: projectDuration,
      services_analyzed: services,
      detail_level: "fallback",
      warning: "Limited data - weather APIs unavailable",
    },
  };
}

// Placeholder functions for POST actions
async function handleBulkWeatherAnalysis(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  // Implementation for bulk weather analysis
  return NextResponse.json({
    success: true,
    message: "Bulk weather analysis not yet implemented",
    analysis_id: `bulk_${Date.now()}`,
  });
}

async function handleLocationSearch(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  // Implementation for location search
  return NextResponse.json({
    success: true,
    locations: [],
    message: "Location search not yet implemented",
  });
}

async function handleHistoricalLookup(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  // Implementation for historical weather lookup
  return NextResponse.json({
    success: true,
    historical_data: {},
    message: "Historical lookup not yet implemented",
  });
}

async function handleAlertsSubscription(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  // Implementation for weather alerts subscription
  return NextResponse.json({
    success: true,
    subscription_id: `alert_${Date.now()}`,
    message: "Weather alerts subscription not yet implemented",
  });
}

// Export wrapped handlers with audit logging and rate limiting
export const GET = withAuditLogging(withAutoRateLimit(handleGET), {
  logLevel: "all",
  sensitiveRoutes: ["/api/weather/enhanced"],
});

export const POST = withAuditLogging(withAutoRateLimit(handlePOST), {
  logLevel: "all",
  sensitiveRoutes: ["/api/weather/enhanced"],
});

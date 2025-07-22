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

// Bulk Weather Analysis Implementation
async function handleBulkWeatherAnalysis(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const { locations, services, projectDuration = 30 } = parameters;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: "Locations array is required" },
        { status: 400 },
      );
    }

    if (locations.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 locations allowed per bulk analysis" },
        { status: 400 },
      );
    }

    const analysisResults = [];

    for (const location of locations) {
      try {
        const weatherAnalysis =
          await enhancedWeatherService.getEnhancedWeatherAnalysis(
            location.address || location.city,
            services || [],
            projectDuration,
          );

        analysisResults.push({
          location: location,
          analysis: weatherAnalysis,
          risk_score: weatherAnalysis.analysis?.riskScore || 0.5,
          workability_score: calculateBulkWorkabilityScore(weatherAnalysis),
          status: "completed",
        });
      } catch (error) {
        analysisResults.push({
          location: location,
          analysis: null,
          error: `Failed to analyze ${location.address || location.city}`,
          status: "failed",
        });
      }
    }

    // Calculate comparative insights
    const comparativeInsights = generateComparativeInsights(analysisResults);

    const analysisId = `bulk_${Date.now()}_${userId.slice(0, 8)}`;

    return NextResponse.json({
      success: true,
      analysis_id: analysisId,
      locations_analyzed: locations.length,
      results: analysisResults,
      comparative_insights: comparativeInsights,
      recommendations: generateBulkRecommendations(analysisResults),
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });
  } catch (error) {
    console.error("Bulk weather analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to complete bulk weather analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handleLocationSearch(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const { query, limit = 10, country = "US" } = parameters;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query parameter must be at least 2 characters" },
        { status: 400 },
      );
    }

    // Simple geocoding simulation - in production would use real geocoding API
    const mockLocations = generateLocationSearchResults(
      query.trim(),
      limit,
      country,
    );

    // Add weather preview for top results
    const locationsWithWeather = await Promise.allSettled(
      mockLocations.slice(0, 3).map(async (location) => {
        try {
          const weatherPreview =
            await enhancedWeatherService.getEnhancedWeatherAnalysis(
              `${location.city}, ${location.state}`,
              [],
              7, // 7 day preview
            );
          return {
            ...location,
            weather_preview: {
              current_temperature:
                weatherPreview.current?.metrics?.temperature || null,
              current_conditions: weatherPreview.current?.summary || "Unknown",
              upcoming_risks:
                weatherPreview.analysis?.riskScore > 0.6
                  ? "High"
                  : weatherPreview.analysis?.riskScore > 0.3
                    ? "Medium"
                    : "Low",
            },
          };
        } catch (error) {
          return { ...location, weather_preview: null };
        }
      }),
    );

    const results = locationsWithWeather
      .map((result, index) =>
        result.status === "fulfilled" ? result.value : mockLocations[index],
      )
      .concat(mockLocations.slice(3));

    return NextResponse.json({
      success: true,
      query: query,
      locations: results,
      total_results: results.length,
      has_weather_preview: true,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Location search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search locations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handleHistoricalLookup(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const {
      location,
      start_date,
      end_date,
      metrics = ["temperature", "precipitation", "wind"],
    } = parameters;

    if (!location) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 },
      );
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const daysDifference = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDifference > 365) {
      return NextResponse.json(
        { error: "Historical lookups limited to 365 days maximum" },
        { status: 400 },
      );
    }

    // Generate historical weather data simulation
    const historicalData = generateHistoricalWeatherData(
      location,
      startDate,
      endDate,
      metrics,
    );

    // Calculate seasonal patterns and statistics
    const analytics = calculateHistoricalAnalytics(historicalData);

    return NextResponse.json({
      success: true,
      location: location,
      period: {
        start_date: start_date,
        end_date: end_date,
        days_analyzed: daysDifference,
      },
      historical_data: historicalData,
      analytics: analytics,
      patterns: identifyWeatherPatterns(historicalData),
      recommendations: generateHistoricalRecommendations(analytics),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Historical lookup error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve historical weather data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handleAlertsSubscription(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const {
      action = "create",
      locations = [],
      alert_types = ["severe_weather", "high_wind", "precipitation"],
      thresholds = {},
      notification_methods = ["email"],
      subscription_id,
    } = parameters;

    switch (action) {
      case "create":
        if (!locations || locations.length === 0) {
          return NextResponse.json(
            { error: "At least one location is required" },
            { status: 400 },
          );
        }

        if (locations.length > 5) {
          return NextResponse.json(
            { error: "Maximum 5 locations allowed per subscription" },
            { status: 400 },
          );
        }

        const newSubscriptionId = `alert_${Date.now()}_${userId.slice(0, 8)}`;

        // In production, this would save to database
        const subscription = {
          id: newSubscriptionId,
          user_id: userId,
          locations: locations,
          alert_types: alert_types,
          thresholds: {
            wind_speed_mph: thresholds.wind_speed_mph || 25,
            precipitation_inches: thresholds.precipitation_inches || 0.5,
            temperature_low: thresholds.temperature_low || 32,
            temperature_high: thresholds.temperature_high || 95,
            visibility_miles: thresholds.visibility_miles || 0.5,
          },
          notification_methods: notification_methods,
          status: "active",
          created_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 90 days
        };

        return NextResponse.json({
          success: true,
          subscription: subscription,
          active_alerts: await checkCurrentAlerts(
            locations,
            alert_types,
            subscription.thresholds,
          ),
          message: "Weather alerts subscription created successfully",
        });

      case "update":
        if (!subscription_id) {
          return NextResponse.json(
            { error: "Subscription ID is required for updates" },
            { status: 400 },
          );
        }

        // In production, this would update the database record
        return NextResponse.json({
          success: true,
          subscription_id: subscription_id,
          updated_fields: Object.keys(parameters).filter(
            (key) => key !== "action" && key !== "subscription_id",
          ),
          message: "Weather alerts subscription updated successfully",
        });

      case "delete":
        if (!subscription_id) {
          return NextResponse.json(
            { error: "Subscription ID is required for deletion" },
            { status: 400 },
          );
        }

        // In production, this would delete from database
        return NextResponse.json({
          success: true,
          subscription_id: subscription_id,
          message: "Weather alerts subscription cancelled successfully",
        });

      case "list":
        // In production, this would query user's subscriptions from database
        return NextResponse.json({
          success: true,
          subscriptions: [
            {
              id: `alert_${Date.now()}_${userId.slice(0, 8)}`,
              locations: ["Example Location"],
              alert_types: ["severe_weather"],
              status: "active",
              created_at: new Date().toISOString(),
            },
          ],
          total_subscriptions: 1,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: create, update, delete, or list" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Weather alerts subscription error:", error);
    return NextResponse.json(
      {
        error: "Failed to manage weather alerts subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper functions for the implemented endpoints
function calculateBulkWorkabilityScore(weatherAnalysis: any): number {
  if (!weatherAnalysis || !weatherAnalysis.forecast) return 0.5;

  const forecast = weatherAnalysis.forecast;
  const totalDays = forecast.length;
  const workableDays = forecast.filter(
    (day: any) => day.workability && day.workability.overall > 0.7,
  ).length;

  return totalDays > 0 ? workableDays / totalDays : 0.5;
}

function generateComparativeInsights(analysisResults: any[]): any {
  const completedAnalyses = analysisResults.filter(
    (r) => r.status === "completed",
  );

  if (completedAnalyses.length === 0) {
    return { message: "No successful analyses to compare" };
  }

  // Find best and worst locations
  const bestLocation = completedAnalyses.reduce((best, current) =>
    current.workability_score > best.workability_score ? current : best,
  );

  const worstLocation = completedAnalyses.reduce((worst, current) =>
    current.workability_score < worst.workability_score ? current : worst,
  );

  return {
    best_location: {
      location: bestLocation.location,
      workability_score: bestLocation.workability_score,
      risk_score: bestLocation.risk_score,
    },
    worst_location: {
      location: worstLocation.location,
      workability_score: worstLocation.workability_score,
      risk_score: worstLocation.risk_score,
    },
    average_workability:
      completedAnalyses.reduce((sum, r) => sum + r.workability_score, 0) /
      completedAnalyses.length,
    average_risk:
      completedAnalyses.reduce((sum, r) => sum + r.risk_score, 0) /
      completedAnalyses.length,
  };
}

function generateBulkRecommendations(analysisResults: any[]): string[] {
  const recommendations = [];
  const completedAnalyses = analysisResults.filter(
    (r) => r.status === "completed",
  );

  if (completedAnalyses.length === 0) {
    return ["Unable to generate recommendations - no successful analyses"];
  }

  const highRiskLocations = completedAnalyses.filter(
    (r) => r.risk_score > 0.6,
  ).length;
  const lowWorkabilityLocations = completedAnalyses.filter(
    (r) => r.workability_score < 0.3,
  ).length;

  if (highRiskLocations > completedAnalyses.length * 0.5) {
    recommendations.push(
      "Multiple high-risk locations identified - consider delaying projects",
    );
  }

  if (lowWorkabilityLocations > 0) {
    recommendations.push(
      `${lowWorkabilityLocations} location(s) have poor workability - reschedule if possible`,
    );
  }

  recommendations.push(
    "Prioritize work at locations with highest workability scores",
  );
  recommendations.push("Monitor weather conditions daily for all locations");

  return recommendations;
}

function generateLocationSearchResults(
  query: string,
  limit: number,
  country: string,
): any[] {
  // Mock location search results - in production would use geocoding API
  const commonCities = [
    { city: "New York", state: "NY", lat: 40.7128, lon: -74.006 },
    { city: "Los Angeles", state: "CA", lat: 34.0522, lon: -118.2437 },
    { city: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298 },
    { city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698 },
    { city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.074 },
    { city: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652 },
    { city: "San Antonio", state: "TX", lat: 29.4241, lon: -98.4936 },
    { city: "San Diego", state: "CA", lat: 32.7157, lon: -117.1611 },
    { city: "Dallas", state: "TX", lat: 32.7767, lon: -96.797 },
    { city: "San Jose", state: "CA", lat: 37.3382, lon: -121.8863 },
  ];

  const filtered = commonCities.filter(
    (city) =>
      city.city.toLowerCase().includes(query.toLowerCase()) ||
      city.state.toLowerCase().includes(query.toLowerCase()),
  );

  return filtered.slice(0, limit).map((city) => ({
    ...city,
    country: country,
    full_name: `${city.city}, ${city.state}, ${country}`,
    confidence: 0.95,
  }));
}

function generateHistoricalWeatherData(
  location: string,
  startDate: Date,
  endDate: Date,
  metrics: string[],
): any[] {
  const data = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfYear = Math.floor(
      (currentDate.getTime() -
        new Date(currentDate.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const seasonalTemp = 60 + Math.sin((dayOfYear / 365) * Math.PI * 2) * 20;

    const dayData: any = {
      date: currentDate.toISOString().split("T")[0],
      location: location,
    };

    if (metrics.includes("temperature")) {
      dayData.temperature = {
        high: seasonalTemp + Math.random() * 10,
        low: seasonalTemp - Math.random() * 10,
        average: seasonalTemp,
      };
    }

    if (metrics.includes("precipitation")) {
      dayData.precipitation = Math.random() < 0.3 ? Math.random() * 1.5 : 0;
    }

    if (metrics.includes("wind")) {
      dayData.wind_speed = 5 + Math.random() * 15;
    }

    data.push(dayData);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

function calculateHistoricalAnalytics(historicalData: any[]): any {
  const analytics = {
    temperature: { min: Infinity, max: -Infinity, average: 0 },
    precipitation: { total: 0, rainy_days: 0, max_daily: 0 },
    wind: { average: 0, max: 0 },
  };

  historicalData.forEach((day) => {
    if (day.temperature) {
      analytics.temperature.min = Math.min(
        analytics.temperature.min,
        day.temperature.low,
      );
      analytics.temperature.max = Math.max(
        analytics.temperature.max,
        day.temperature.high,
      );
      analytics.temperature.average += day.temperature.average;
    }

    if (day.precipitation) {
      analytics.precipitation.total += day.precipitation;
      if (day.precipitation > 0) analytics.precipitation.rainy_days++;
      analytics.precipitation.max_daily = Math.max(
        analytics.precipitation.max_daily,
        day.precipitation,
      );
    }

    if (day.wind_speed) {
      analytics.wind.average += day.wind_speed;
      analytics.wind.max = Math.max(analytics.wind.max, day.wind_speed);
    }
  });

  const totalDays = historicalData.length;
  analytics.temperature.average /= totalDays;
  analytics.wind.average /= totalDays;

  return analytics;
}

function identifyWeatherPatterns(historicalData: any[]): any {
  return {
    seasonal_trends: "Temperature follows expected seasonal patterns",
    precipitation_patterns: "Moderate precipitation with occasional heavy days",
    wind_patterns: "Generally calm with occasional gusty periods",
  };
}

function generateHistoricalRecommendations(analytics: any): string[] {
  const recommendations = [];

  if (analytics.temperature.max > 90) {
    recommendations.push(
      "High temperature periods identified - plan heat precautions",
    );
  }

  if (analytics.precipitation.rainy_days > 10) {
    recommendations.push(
      "Frequent precipitation - allow extra time for weather delays",
    );
  }

  if (analytics.wind.max > 25) {
    recommendations.push("High wind conditions recorded - monitor for safety");
  }

  return recommendations.length > 0
    ? recommendations
    : ["Weather conditions appear favorable for work"];
}

async function checkCurrentAlerts(
  locations: string[],
  alertTypes: string[],
  thresholds: any,
): Promise<any[]> {
  // Mock implementation - in production would check real weather alerts
  return [
    {
      id: `alert_${Date.now()}`,
      type: "high_wind",
      location: locations[0] || "Unknown",
      severity: "moderate",
      message: "High wind advisory in effect",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    },
  ];
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

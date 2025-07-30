import { NextResponse } from "next/server";
import { enhancedWeatherService } from "@/lib/weather/enhanced-weather-service";
import {
  BulkAnalysisSchema,
  LocationSearchSchema,
  HistoricalLookupSchema,
  AlertsSubscriptionSchema,
} from "../schemas/weather-schemas";
import {
  generateServiceInsights,
  generateRiskAssessment,
  findOptimalWorkWindows,
} from "../utils/weather-helpers";

export async function handleBulkWeatherAnalysis(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const validation = BulkAnalysisSchema.safeParse(parameters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { locations, services = [], projectDuration } = validation.data;

    const analysisResults = [];

    for (const location of locations) {
      try {
        const weatherAnalysis =
          await enhancedWeatherService.getEnhancedWeatherAnalysis(
            location.address || location.city,
            services,
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
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

export async function handleLocationSearch(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const validation = LocationSearchSchema.safeParse(parameters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { query, limit, country } = validation.data;

    // Simple geocoding simulation - in production would use real geocoding API
    const mockLocations = generateLocationSearchResults(query, limit, country);

    // Add weather preview for top results
    const locationsWithWeather = await Promise.allSettled(
      mockLocations.slice(0, 3).map(async (location) => {
        try {
          const weatherPreview =
            await enhancedWeatherService.getEnhancedWeatherAnalysis(
              `${location.city}, ${location.state}`,
              [],
              7,
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

export async function handleHistoricalLookup(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const validation = HistoricalLookupSchema.safeParse(parameters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { location, start_date, end_date, metrics } = validation.data;

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

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

export async function handleAlertsSubscription(
  parameters: any,
  userId: string,
): Promise<NextResponse> {
  try {
    const validation = AlertsSubscriptionSchema.safeParse(parameters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      action,
      locations = [],
      alert_types = ["severe_weather", "high_wind", "precipitation"],
      thresholds = {},
      notification_methods = ["email"],
      subscription_id,
    } = validation.data;

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
          ).toISOString(),
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

// Helper functions
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

    if (day.precipitation !== undefined) {
      analytics.precipitation.total += day.precipitation;
      if (day.precipitation > 0) analytics.precipitation.rainy_days++;
      analytics.precipitation.max_daily = Math.max(
        analytics.precipitation.max_daily,
        day.precipitation,
      );
    }

    if (day.wind_speed !== undefined) {
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

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { enhancedWeatherService } from "@/lib/weather/enhanced-weather-service";
import { WeatherRequestSchema } from "../schemas/weather-schemas";
import {
  generateServiceInsights,
  generateRiskAssessment,
  findOptimalWorkWindows,
  generateFallbackWeatherData,
} from "../utils/weather-helpers";

export async function handleGET(request: NextRequest) {
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

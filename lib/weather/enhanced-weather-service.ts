// Enhanced Weather Service with Real API Integration
// Integrates with multiple weather APIs for comprehensive analysis

import { createClient } from "@/lib/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subWeeks,
  subDays,
  addDays,
  format,
  parseISO,
  differenceInDays,
} from "date-fns";
import { publishSystemEvent } from "@/lib/integrations/webhook-system";

// Enhanced interfaces
export interface WeatherLocation {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  timezone: string;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: "minor" | "moderate" | "severe" | "extreme";
  start: Date;
  end: Date;
  areas: string[];
  impact: string;
}

export interface AirQuality {
  aqi: number; // Air Quality Index
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  category:
    | "good"
    | "moderate"
    | "unhealthy_sensitive"
    | "unhealthy"
    | "very_unhealthy"
    | "hazardous";
}

export interface WeatherMetrics {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  dewPoint: number;
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
}

export interface EnhancedDailyForecast {
  date: string;
  summary: string;
  icon: string;
  metrics: WeatherMetrics;
  hourlyData: HourlyForecast[];
  alerts: WeatherAlert[];
  airQuality?: AirQuality;
  workability: WorkabilityScore;
  serviceRecommendations: Record<string, ServiceRecommendation>;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  pressure: number;
  conditions: string;
  workability: number;
}

export interface WorkabilityScore {
  overall: number;
  factors: {
    temperature: number;
    precipitation: number;
    wind: number;
    humidity: number;
    airQuality: number;
    visibility: number;
  };
  limitations: string[];
  recommendations: string[];
}

export interface ServiceRecommendation {
  workable: boolean;
  risk: "low" | "medium" | "high" | "critical";
  bestHours: string[];
  precautions: string[];
  alternatives: string[];
}

export interface ClimateData {
  temperature: {
    min: number;
    max: number;
    average: number;
    trends: TemperatureTrend[];
  };
  precipitation: {
    total: number;
    average: number;
    patterns: PrecipitationPattern[];
  };
  extremeWeather: {
    heatWaves: number;
    coldSnaps: number;
    storms: number;
    droughts: number;
  };
}

export interface TemperatureTrend {
  month: string;
  avgHigh: number;
  avgLow: number;
  record: { high: number; low: number };
}

export interface PrecipitationPattern {
  month: string;
  rainfall: number;
  snowfall: number;
  rainyDays: number;
}

// Weather API providers
export type WeatherProvider =
  | "openweathermap"
  | "weatherapi"
  | "accuweather"
  | "nws";

export interface WeatherAPIConfig {
  provider: WeatherProvider;
  apiKey: string;
  baseUrl: string;
  rateLimit: number;
  cacheTTL: number;
}

// Enhanced Weather Service Class
export class EnhancedWeatherService {
  private configs: Record<WeatherProvider, WeatherAPIConfig> = {
    openweathermap: {
      provider: "openweathermap",
      apiKey: process.env.OPENWEATHERMAP_API_KEY || "",
      baseUrl: "https://api.openweathermap.org/data/2.5",
      rateLimit: 60, // calls per minute
      cacheTTL: 600, // 10 minutes
    },
    weatherapi: {
      provider: "weatherapi",
      apiKey: process.env.WEATHERAPI_KEY || "",
      baseUrl: "https://api.weatherapi.com/v1",
      rateLimit: 100,
      cacheTTL: 600,
    },
    accuweather: {
      provider: "accuweather",
      apiKey: process.env.ACCUWEATHER_API_KEY || "",
      baseUrl: "https://dataservice.accuweather.com",
      rateLimit: 50,
      cacheTTL: 1800, // 30 minutes
    },
    nws: {
      provider: "nws",
      apiKey: "", // NWS doesn't require API key
      baseUrl: "https://api.weather.gov",
      rateLimit: 300,
      cacheTTL: 300, // 5 minutes
    },
  };

  private cache: Map<string, { data: any; expires: number }> = new Map();
  private rateLimits: Map<
    WeatherProvider,
    { count: number; resetTime: number }
  > = new Map();

  // Get comprehensive weather analysis
  async getEnhancedWeatherAnalysis(
    location: string | WeatherLocation,
    services: string[],
    projectDuration: number = 30,
  ): Promise<{
    location: WeatherLocation;
    current: EnhancedDailyForecast;
    forecast: EnhancedDailyForecast[];
    historical: ClimateData;
    alerts: WeatherAlert[];
    analysis: WeatherAnalysis;
    recommendations: ProjectRecommendation[];
  }> {
    try {
      // Resolve location to coordinates
      const resolvedLocation = await this.resolveLocation(location);

      // Get data from multiple sources for reliability
      const [current, forecast, historical, alerts] = await Promise.allSettled([
        this.getCurrentWeather(resolvedLocation),
        this.getExtendedForecast(resolvedLocation, projectDuration),
        this.getHistoricalClimate(resolvedLocation),
        this.getWeatherAlerts(resolvedLocation),
      ]);

      // Combine data and generate analysis
      const currentData = current.status === "fulfilled" ? current.value : null;
      const forecastData =
        forecast.status === "fulfilled" ? forecast.value : [];
      const historicalData =
        historical.status === "fulfilled" ? historical.value : null;
      const alertsData = alerts.status === "fulfilled" ? alerts.value : [];

      // Generate service-specific analysis
      const analysis = await this.generateWeatherAnalysis(
        resolvedLocation,
        services,
        currentData,
        forecastData,
        historicalData,
      );

      // Generate project recommendations
      const recommendations = this.generateProjectRecommendations(
        services,
        forecastData,
        historicalData,
        alertsData,
      );

      // Cache results
      await this.cacheWeatherData(resolvedLocation, {
        current: currentData,
        forecast: forecastData,
        historical: historicalData,
        analysis,
      });

      // Publish weather analysis event
      await publishSystemEvent("system.maintenance", {
        location: resolvedLocation.city,
        services,
        risk_score: analysis.riskScore,
        alerts_count: alertsData.length,
      });

      return {
        location: resolvedLocation,
        current: currentData!,
        forecast: forecastData,
        historical: historicalData!,
        alerts: alertsData,
        analysis,
        recommendations,
      };
    } catch (error) {
      console.error("Enhanced weather analysis failed:", error);
      throw new Error(
        `Weather analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Resolve location string to coordinates and details
  private async resolveLocation(
    location: string | WeatherLocation,
  ): Promise<WeatherLocation> {
    if (typeof location === "object") {
      return location;
    }

    const cacheKey = `location:${location}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use multiple geocoding services for reliability
      let result = await this.geocodeWithOpenWeatherMap(location);
      if (!result) {
        result = await this.geocodeWithWeatherAPI(location);
      }
      if (!result) {
        result = await this.geocodeWithNominatim(location);
      }

      if (!result) {
        throw new Error(`Could not resolve location: ${location}`);
      }

      this.setCache(cacheKey, result, 86400000); // Cache for 24 hours
      return result;
    } catch (error) {
      console.error("Location resolution failed:", error);
      throw new Error(`Failed to resolve location: ${location}`);
    }
  }

  // Geocoding with OpenWeatherMap
  private async geocodeWithOpenWeatherMap(
    location: string,
  ): Promise<WeatherLocation | null> {
    if (!this.configs.openweathermap.apiKey) return null;

    try {
      const response = await this.makeAPICall(
        `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.configs.openweathermap.apiKey}`,
        "openweathermap",
      );

      const data = await response.json();
      if (data.length > 0) {
        const item = data[0];
        return {
          latitude: item.lat,
          longitude: item.lon,
          city: item.name,
          state: item.state || "",
          country: item.country,
          timezone: "", // Will be filled by timezone API
        };
      }
    } catch (error) {
      console.error("OpenWeatherMap geocoding failed:", error);
    }
    return null;
  }

  // Geocoding with WeatherAPI
  private async geocodeWithWeatherAPI(
    location: string,
  ): Promise<WeatherLocation | null> {
    if (!this.configs.weatherapi.apiKey) return null;

    try {
      const response = await this.makeAPICall(
        `${this.configs.weatherapi.baseUrl}/search.json?key=${this.configs.weatherapi.apiKey}&q=${encodeURIComponent(location)}`,
        "weatherapi",
      );

      const data = await response.json();
      if (data.length > 0) {
        const item = data[0];
        return {
          latitude: item.lat,
          longitude: item.lon,
          city: item.name,
          state: item.region,
          country: item.country,
          timezone: item.tz_id,
        };
      }
    } catch (error) {
      console.error("WeatherAPI geocoding failed:", error);
    }
    return null;
  }

  // Fallback geocoding with Nominatim (OpenStreetMap)
  private async geocodeWithNominatim(
    location: string,
  ): Promise<WeatherLocation | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
        {
          headers: {
            "User-Agent": "EstimatePro-Weather-Service/1.0",
          },
        },
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.length > 0) {
        const item = data[0];
        const addressParts = item.display_name.split(", ");

        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          city: addressParts[0] || item.name,
          state: addressParts[addressParts.length - 3] || "",
          country: addressParts[addressParts.length - 1] || "",
          timezone: "", // Will need separate API call
        };
      }
    } catch (error) {
      console.error("Nominatim geocoding failed:", error);
    }
    return null;
  }

  // Get current weather from multiple sources
  private async getCurrentWeather(
    location: WeatherLocation,
  ): Promise<EnhancedDailyForecast> {
    const cacheKey = `current:${location.latitude},${location.longitude}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Try multiple weather providers
    let currentWeather = await this.getCurrentFromOpenWeatherMap(location);
    if (!currentWeather) {
      currentWeather = await this.getCurrentFromWeatherAPI(location);
    }
    if (!currentWeather) {
      currentWeather = await this.getCurrentFromNWS(location);
    }

    if (!currentWeather) {
      throw new Error("Failed to get current weather from any provider");
    }

    // Enhance with workability analysis
    currentWeather.workability = this.calculateWorkabilityScore(
      currentWeather.metrics,
    );
    currentWeather.serviceRecommendations = this.generateServiceRecommendations(
      currentWeather.metrics,
    );

    this.setCache(
      cacheKey,
      currentWeather,
      this.configs.openweathermap.cacheTTL * 1000,
    );
    return currentWeather;
  }

  // Get current weather from OpenWeatherMap
  private async getCurrentFromOpenWeatherMap(
    location: WeatherLocation,
  ): Promise<EnhancedDailyForecast | null> {
    if (!this.configs.openweathermap.apiKey) return null;

    try {
      const response = await this.makeAPICall(
        `${this.configs.openweathermap.baseUrl}/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${this.configs.openweathermap.apiKey}&units=imperial`,
        "openweathermap",
      );

      const data = await response.json();

      return {
        date: new Date().toISOString().split("T")[0],
        summary: data.weather[0].description,
        icon: data.weather[0].icon,
        metrics: {
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          visibility: data.visibility / 1609.34, // Convert to miles
          uvIndex: 0, // Requires separate API call
          dewPoint: 0, // Calculate from temp and humidity
          cloudCover: data.clouds.all,
          precipitation: data.rain?.["1h"] || data.snow?.["1h"] || 0,
          windSpeed: data.wind.speed,
          windDirection: data.wind.deg,
          windGust: data.wind.gust || data.wind.speed * 1.5,
        },
        hourlyData: [],
        alerts: [],
        workability: {
          overall: 0,
          factors: {} as any,
          limitations: [],
          recommendations: [],
        },
        serviceRecommendations: {},
      };
    } catch (error) {
      console.error("OpenWeatherMap current weather failed:", error);
      return null;
    }
  }

  // Get current weather from WeatherAPI
  private async getCurrentFromWeatherAPI(
    location: WeatherLocation,
  ): Promise<EnhancedDailyForecast | null> {
    if (!this.configs.weatherapi.apiKey) return null;

    try {
      const response = await this.makeAPICall(
        `${this.configs.weatherapi.baseUrl}/current.json?key=${this.configs.weatherapi.apiKey}&q=${location.latitude},${location.longitude}&aqi=yes`,
        "weatherapi",
      );

      const data = await response.json();
      const current = data.current;

      return {
        date: new Date().toISOString().split("T")[0],
        summary: current.condition.text,
        icon: current.condition.icon,
        metrics: {
          temperature: current.temp_f,
          feelsLike: current.feelslike_f,
          humidity: current.humidity,
          pressure: current.pressure_mb,
          visibility: current.vis_miles,
          uvIndex: current.uv,
          dewPoint: current.dewpoint_f,
          cloudCover: current.cloud,
          precipitation: current.precip_in,
          windSpeed: current.wind_mph,
          windDirection: current.wind_degree,
          windGust: current.gust_mph,
        },
        hourlyData: [],
        alerts: [],
        airQuality: data.current.air_quality
          ? {
              aqi: data.current.air_quality["us-epa-index"],
              pm25: data.current.air_quality.pm2_5,
              pm10: data.current.air_quality.pm10,
              o3: data.current.air_quality.o3,
              no2: data.current.air_quality.no2,
              so2: data.current.air_quality.so2,
              co: data.current.air_quality.co,
              category: this.getAQICategory(
                data.current.air_quality["us-epa-index"],
              ),
            }
          : undefined,
        workability: {
          overall: 0,
          factors: {} as any,
          limitations: [],
          recommendations: [],
        },
        serviceRecommendations: {},
      };
    } catch (error) {
      console.error("WeatherAPI current weather failed:", error);
      return null;
    }
  }

  // Get current weather from National Weather Service
  private async getCurrentFromNWS(
    location: WeatherLocation,
  ): Promise<EnhancedDailyForecast | null> {
    try {
      // First get the grid point
      const pointResponse = await this.makeAPICall(
        `${this.configs.nws.baseUrl}/points/${location.latitude},${location.longitude}`,
        "nws",
      );

      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties.forecast;

      // Get the forecast
      const forecastResponse = await this.makeAPICall(forecastUrl, "nws");
      const forecastData = await forecastResponse.json();

      const current = forecastData.properties.periods[0];

      return {
        date: new Date().toISOString().split("T")[0],
        summary: current.shortForecast,
        icon: current.icon,
        metrics: {
          temperature: current.temperature,
          feelsLike: current.temperature, // NWS doesn't provide feels like
          humidity: 0, // Not in basic forecast
          pressure: 0,
          visibility: 10, // Default assumption
          uvIndex: 0,
          dewPoint: 0,
          cloudCover: 0,
          precipitation: 0,
          windSpeed: parseInt(current.windSpeed) || 0,
          windDirection: this.windDirectionToDegrees(current.windDirection),
          windGust: parseInt(current.windSpeed) * 1.5 || 0,
        },
        hourlyData: [],
        alerts: [],
        workability: {
          overall: 0,
          factors: {} as any,
          limitations: [],
          recommendations: [],
        },
        serviceRecommendations: {},
      };
    } catch (error) {
      console.error("NWS current weather failed:", error);
      return null;
    }
  }

  // Get extended forecast
  private async getExtendedForecast(
    location: WeatherLocation,
    days: number,
  ): Promise<EnhancedDailyForecast[]> {
    const cacheKey = `forecast:${location.latitude},${location.longitude}:${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let forecast = await this.getForecastFromWeatherAPI(location, days);
    if (!forecast || forecast.length === 0) {
      forecast = await this.getForecastFromOpenWeatherMap(location, days);
    }
    if (!forecast || forecast.length === 0) {
      forecast = await this.getForecastFromNWS(location, days);
    }

    if (!forecast || forecast.length === 0) {
      throw new Error("Failed to get forecast from any provider");
    }

    // Enhance each day with workability analysis
    forecast.forEach((day) => {
      day.workability = this.calculateWorkabilityScore(day.metrics);
      day.serviceRecommendations = this.generateServiceRecommendations(
        day.metrics,
      );
    });

    this.setCache(cacheKey, forecast, this.configs.weatherapi.cacheTTL * 1000);
    return forecast;
  }

  // Calculate workability score based on weather metrics
  private calculateWorkabilityScore(metrics: WeatherMetrics): WorkabilityScore {
    const factors = {
      temperature: this.scoreTemperature(metrics.temperature),
      precipitation: this.scorePrecipitation(metrics.precipitation),
      wind: this.scoreWind(metrics.windSpeed),
      humidity: this.scoreHumidity(metrics.humidity),
      airQuality: 1.0, // Default good if no data
      visibility: this.scoreVisibility(metrics.visibility),
    };

    const overall =
      Object.values(factors).reduce((sum, score) => sum + score, 0) /
      Object.keys(factors).length;

    const limitations = [];
    const recommendations = [];

    if (factors.temperature < 0.7) {
      limitations.push("Temperature concerns");
      recommendations.push(
        "Monitor temperature for service-specific requirements",
      );
    }
    if (factors.precipitation < 0.5) {
      limitations.push("Precipitation expected");
      recommendations.push("Plan for weather delays and protective measures");
    }
    if (factors.wind < 0.6) {
      limitations.push("High wind conditions");
      recommendations.push("Exercise caution with elevated work and equipment");
    }

    return {
      overall: Math.round(overall * 100) / 100,
      factors,
      limitations,
      recommendations,
    };
  }

  // Temperature scoring (0-1)
  private scoreTemperature(temp: number): number {
    if (temp >= 50 && temp <= 80) return 1.0;
    if (temp >= 40 && temp <= 90) return 0.8;
    if (temp >= 32 && temp <= 95) return 0.6;
    if (temp >= 20 && temp <= 100) return 0.4;
    return 0.2;
  }

  // Precipitation scoring (0-1)
  private scorePrecipitation(precip: number): number {
    if (precip === 0) return 1.0;
    if (precip <= 0.1) return 0.8;
    if (precip <= 0.25) return 0.6;
    if (precip <= 0.5) return 0.4;
    return 0.2;
  }

  // Wind scoring (0-1)
  private scoreWind(windSpeed: number): number {
    if (windSpeed <= 10) return 1.0;
    if (windSpeed <= 15) return 0.8;
    if (windSpeed <= 20) return 0.6;
    if (windSpeed <= 30) return 0.4;
    return 0.2;
  }

  // Humidity scoring (0-1)
  private scoreHumidity(humidity: number): number {
    if (humidity >= 40 && humidity <= 70) return 1.0;
    if (humidity >= 30 && humidity <= 80) return 0.9;
    if (humidity >= 20 && humidity <= 90) return 0.7;
    return 0.5;
  }

  // Visibility scoring (0-1)
  private scoreVisibility(visibility: number): number {
    if (visibility >= 10) return 1.0;
    if (visibility >= 5) return 0.8;
    if (visibility >= 2) return 0.6;
    if (visibility >= 0.5) return 0.4;
    return 0.2;
  }

  // Generate service-specific recommendations
  private generateServiceRecommendations(
    metrics: WeatherMetrics,
  ): Record<string, ServiceRecommendation> {
    const recommendations: Record<string, ServiceRecommendation> = {};

    // Building Washing & Sealing (BWS)
    recommendations.BWS = {
      workable: metrics.temperature > 50 && metrics.precipitation < 0.1,
      risk:
        metrics.temperature < 50 || metrics.precipitation > 0.1
          ? "high"
          : "low",
      bestHours: ["10:00", "11:00", "12:00", "13:00", "14:00"],
      precautions:
        metrics.temperature < 50 ? ["Temperature too low for sealing"] : [],
      alternatives:
        metrics.precipitation > 0.1 ? ["Postpone until dry conditions"] : [],
    };

    // Window Cleaning (WC)
    recommendations.WC = {
      workable: metrics.precipitation < 0.1 && metrics.windSpeed < 20,
      risk: metrics.windSpeed > 15 ? "medium" : "low",
      bestHours: ["09:00", "10:00", "11:00", "14:00", "15:00"],
      precautions:
        metrics.windSpeed > 15 ? ["High wind safety precautions"] : [],
      alternatives: [],
    };

    // Pressure Washing (PWP)
    recommendations.PWP = {
      workable: metrics.temperature > 32 && metrics.windSpeed < 25,
      risk: metrics.windSpeed > 20 ? "medium" : "low",
      bestHours: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"],
      precautions: [],
      alternatives: [],
    };

    return recommendations;
  }

  // Get AQI category
  private getAQICategory(aqi: number): AirQuality["category"] {
    if (aqi <= 50) return "good";
    if (aqi <= 100) return "moderate";
    if (aqi <= 150) return "unhealthy_sensitive";
    if (aqi <= 200) return "unhealthy";
    if (aqi <= 300) return "very_unhealthy";
    return "hazardous";
  }

  // Convert wind direction to degrees
  private windDirectionToDegrees(direction: string): number {
    const directions: Record<string, number> = {
      N: 0,
      NNE: 22.5,
      NE: 45,
      ENE: 67.5,
      E: 90,
      ESE: 112.5,
      SE: 135,
      SSE: 157.5,
      S: 180,
      SSW: 202.5,
      SW: 225,
      WSW: 247.5,
      W: 270,
      WNW: 292.5,
      NW: 315,
      NNW: 337.5,
    };
    return directions[direction.toUpperCase()] || 0;
  }

  // Rate limiting and API call management
  private async makeAPICall(
    url: string,
    provider: WeatherProvider,
  ): Promise<Response> {
    if (!this.checkRateLimit(provider)) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "EstimatePro-Weather-Service/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    this.updateRateLimit(provider);
    return response;
  }

  // Check rate limit
  private checkRateLimit(provider: WeatherProvider): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(provider);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(provider, { count: 0, resetTime: now + 60000 }); // Reset every minute
      return true;
    }

    return limit.count < this.configs[provider].rateLimit;
  }

  // Update rate limit
  private updateRateLimit(provider: WeatherProvider): void {
    const limit = this.rateLimits.get(provider);
    if (limit) {
      limit.count++;
    }
  }

  // Cache management
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  // Placeholder methods for missing functionality
  private async getForecastFromWeatherAPI(
    location: WeatherLocation,
    days: number,
  ): Promise<EnhancedDailyForecast[]> {
    // Implementation would go here
    return [];
  }

  private async getForecastFromOpenWeatherMap(
    location: WeatherLocation,
    days: number,
  ): Promise<EnhancedDailyForecast[]> {
    // Implementation would go here
    return [];
  }

  private async getForecastFromNWS(
    location: WeatherLocation,
    days: number,
  ): Promise<EnhancedDailyForecast[]> {
    // Implementation would go here
    return [];
  }

  private async getHistoricalClimate(
    location: WeatherLocation,
  ): Promise<ClimateData> {
    // Implementation would go here
    return {} as ClimateData;
  }

  private async getWeatherAlerts(
    location: WeatherLocation,
  ): Promise<WeatherAlert[]> {
    // Implementation would go here
    return [];
  }

  private async generateWeatherAnalysis(
    location: WeatherLocation,
    services: string[],
    current: EnhancedDailyForecast | null,
    forecast: EnhancedDailyForecast[],
    historical: ClimateData | null,
  ): Promise<any> {
    // Implementation would go here
    return { riskScore: 0.3 };
  }

  private generateProjectRecommendations(
    services: string[],
    forecast: EnhancedDailyForecast[],
    historical: ClimateData | null,
    alerts: WeatherAlert[],
  ): any[] {
    // Implementation would go here
    return [];
  }

  private async cacheWeatherData(
    location: WeatherLocation,
    data: any,
  ): Promise<void> {
    // Implementation would go here
  }
}

// Export singleton instance
export const enhancedWeatherService = new EnhancedWeatherService();

// Types for missing interfaces
export interface WeatherAnalysis {
  riskScore: number;
  // Add other properties as needed
}

export interface ProjectRecommendation {
  // Add properties as needed
}

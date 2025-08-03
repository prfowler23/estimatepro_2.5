import { createClient } from "@/lib/supabase/server";
import { AIResponseCache } from "@/lib/ai/ai-response-cache";

export interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    precipitation: number;
  }>;
  location: string;
}

export class WeatherService {
  private cache: AIResponseCache;

  constructor() {
    this.cache = AIResponseCache.getInstance();
  }

  async getForecast(location: string, days: number = 1): Promise<WeatherData> {
    const supabase = createClient();
    // Check cache first
    const cacheKey = `weather:${location}:${days}`;
    const cached = await this.cache.get("weather", cacheKey);
    if (cached) {
      return cached as WeatherData;
    }

    // Simulate weather API call
    // In production, this would call a real weather API
    const weatherData: WeatherData = {
      current: {
        temperature: Math.round(60 + Math.random() * 30),
        condition: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][
          Math.floor(Math.random() * 4)
        ],
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: Math.round(5 + Math.random() * 20),
      },
      forecast: Array.from({ length: days }, (_, i) => ({
        date: new Date(
          Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        high: Math.round(65 + Math.random() * 25),
        low: Math.round(45 + Math.random() * 20),
        condition: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][
          Math.floor(Math.random() * 4)
        ],
        precipitation: Math.round(Math.random() * 100),
      })),
      location,
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, weatherData, 3600);

    return weatherData;
  }
}

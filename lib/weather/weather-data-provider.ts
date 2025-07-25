import {
  MonthlyWeatherData,
  DailyForecast,
  WeeklyForecast,
  HistoricalWeather,
} from "./types";

export class WeatherDataProvider {
  private apiKey =
    process.env.WEATHER_API_KEY || process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  private baseUrl = "https://api.weatherapi.com/v1";

  async getRealWeatherData(
    location: string,
    services: string[],
    proposedStartDate: Date,
  ): Promise<any | null> {
    try {
      // Get current weather from WeatherAPI
      const currentResponse = await fetch(
        `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&aqi=yes`,
      );

      if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status}`);
      }

      const currentData = await currentResponse.json();

      // Get forecast from WeatherAPI
      const forecastResponse = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=14&aqi=yes&alerts=yes`,
      );

      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      console.log(`Real weather data obtained for ${location}`);
      return { currentData, forecastData };
    } catch (error) {
      console.error("Failed to get real weather data:", error);
      return null;
    }
  }

  async getMockWeatherData(location: string, startDate: Date): Promise<any> {
    const historical = await this.getHistoricalWeather(location);
    const forecast = this.generateMockForecast(location, startDate);
    return { historical, forecast };
  }

  async getHistoricalWeather(location: string): Promise<HistoricalWeather> {
    if (this.apiKey) {
      try {
        // In production, make actual API calls to weather service
        return await this.fetchHistoricalFromAPI(location);
      } catch (error) {
        console.error("Historical weather API failed:", error);
      }
    }

    // Fallback to mock data based on general climate patterns
    const fiveYearAverages = this.generateHistoricalData(location);

    return {
      fiveYearAverages,
      extremeEvents: [],
      bestMonths: [],
      worstMonths: [],
    };
  }

  private async fetchHistoricalFromAPI(
    location: string,
  ): Promise<HistoricalWeather> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 5);

    const historicalData: MonthlyWeatherData[] = [];

    // Fetch year-by-year data and aggregate by month
    for (
      let year = startDate.getFullYear();
      year <= endDate.getFullYear();
      year++
    ) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        if (date > endDate) break;

        try {
          const response = await fetch(
            `${this.baseUrl}/history.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&dt=${date.toISOString().split("T")[0]}`,
          );

          if (response.ok) {
            const data = await response.json();
            // Process historical data
            // This is a simplified version - real implementation would aggregate properly
          }
        } catch (error) {
          console.error(
            `Failed to fetch historical data for ${year}-${month + 1}:`,
            error,
          );
        }
      }
    }

    // For now, return generated data
    return {
      fiveYearAverages: this.generateHistoricalData(location),
      extremeEvents: [],
      bestMonths: ["May", "June", "September", "October"],
      worstMonths: ["December", "January", "February", "March"],
    };
  }

  private generateHistoricalData(location: string): MonthlyWeatherData[] {
    // Climate patterns for different regions
    const climatePatterns = this.getClimatePattern(location);

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return months.map((month, index) => {
      const baseTemp =
        climatePatterns.baseTemp +
        climatePatterns.seasonalVariation *
          Math.cos(((index - 6) * Math.PI) / 6);
      const precipitation =
        climatePatterns.basePrecipitation *
        climatePatterns.precipitationPattern[index];

      return {
        month,
        avgTempHigh: Math.round(baseTemp + 15),
        avgTempLow: Math.round(baseTemp - 5),
        avgPrecipitation: Math.round(precipitation * 100) / 100,
        avgHumidity: Math.round(
          climatePatterns.baseHumidity + precipitation * 20,
        ),
        avgWindSpeed: Math.round((10 + Math.random() * 10) * 100) / 100,
        rainDays: Math.round(precipitation * 30),
        snowDays: index < 3 || index > 10 ? Math.round(precipitation * 10) : 0,
        extremeTempDays: Math.round(Math.random() * 5),
        workableDays: Math.round(
          30 -
            precipitation * 15 -
            (index < 3 || index > 10 ? precipitation * 5 : 0),
        ),
      };
    });
  }

  private getClimatePattern(location: string): {
    baseTemp: number;
    seasonalVariation: number;
    basePrecipitation: number;
    precipitationPattern: number[];
    baseHumidity: number;
  } {
    const lowerLocation = location.toLowerCase();

    // Default temperate climate
    let pattern = {
      baseTemp: 55,
      seasonalVariation: 25,
      basePrecipitation: 3.0,
      precipitationPattern: [
        1.0, 0.9, 1.1, 1.2, 1.3, 1.1, 0.9, 0.8, 0.9, 1.0, 1.1, 1.0,
      ],
      baseHumidity: 65,
    };

    // Adjust for different regions
    if (lowerLocation.includes("florida") || lowerLocation.includes("miami")) {
      pattern = {
        baseTemp: 75,
        seasonalVariation: 15,
        basePrecipitation: 4.5,
        precipitationPattern: [
          0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 2.2, 2.1, 1.8, 1.2, 0.8, 0.7,
        ],
        baseHumidity: 80,
      };
    } else if (
      lowerLocation.includes("california") ||
      lowerLocation.includes("los angeles")
    ) {
      pattern = {
        baseTemp: 65,
        seasonalVariation: 20,
        basePrecipitation: 1.5,
        precipitationPattern: [
          1.8, 1.6, 1.4, 0.8, 0.3, 0.1, 0.1, 0.1, 0.2, 0.6, 1.2, 1.8,
        ],
        baseHumidity: 55,
      };
    } else if (
      lowerLocation.includes("seattle") ||
      lowerLocation.includes("washington")
    ) {
      pattern = {
        baseTemp: 50,
        seasonalVariation: 20,
        basePrecipitation: 5.0,
        precipitationPattern: [
          1.8, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3, 0.4, 0.7, 1.2, 1.6, 1.8,
        ],
        baseHumidity: 75,
      };
    } else if (
      lowerLocation.includes("chicago") ||
      lowerLocation.includes("illinois")
    ) {
      pattern = {
        baseTemp: 50,
        seasonalVariation: 35,
        basePrecipitation: 3.5,
        precipitationPattern: [
          0.8, 0.9, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 1.0, 1.0, 0.9,
        ],
        baseHumidity: 70,
      };
    }

    return pattern;
  }

  private generateMockForecast(
    location: string,
    startDate: Date,
  ): {
    next30Days: DailyForecast[];
    next90Days: WeeklyForecast[];
  } {
    const next30Days: DailyForecast[] = [];
    const next90Days: WeeklyForecast[] = [];

    // Generate 30-day forecast
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      next30Days.push(this.generateMockDailyForecast(date, location));
    }

    // Generate 90-day weekly forecast
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      next90Days.push(this.generateMockWeeklyForecast(weekStart, location));
    }

    return { next30Days, next90Days };
  }

  private generateMockDailyForecast(
    date: Date,
    location: string,
  ): DailyForecast {
    const month = date.getMonth();
    const climatePattern = this.getClimatePattern(location);

    const baseTemp =
      climatePattern.baseTemp +
      climatePattern.seasonalVariation * Math.cos(((month - 6) * Math.PI) / 6);
    const precipitation = Math.random() < 0.3 ? Math.random() * 2 : 0;

    const tempHigh = Math.round(baseTemp + 15 + (Math.random() - 0.5) * 10);
    const tempLow = Math.round(baseTemp - 5 + (Math.random() - 0.5) * 8);

    const workability = this.calculateDailyWorkability({
      tempHigh,
      tempLow,
      precipitation,
      windSpeed: 5 + Math.random() * 15,
      humidity: climatePattern.baseHumidity + (Math.random() - 0.5) * 20,
    });

    return {
      date: date.toISOString().split("T")[0],
      tempHigh,
      tempLow,
      precipitation: Math.round(precipitation * 100) / 100,
      humidity: Math.round(
        climatePattern.baseHumidity + (Math.random() - 0.5) * 20,
      ),
      windSpeed: Math.round((5 + Math.random() * 15) * 100) / 100,
      conditions: this.getConditionsFromWeather(
        precipitation,
        tempHigh,
        tempLow,
      ),
      workability,
    };
  }

  private generateMockWeeklyForecast(
    weekStart: Date,
    location: string,
  ): WeeklyForecast {
    const month = weekStart.getMonth();
    const climatePattern = this.getClimatePattern(location);

    const baseTemp =
      climatePattern.baseTemp +
      climatePattern.seasonalVariation * Math.cos(((month - 6) * Math.PI) / 6);
    const totalPrecipitation =
      climatePattern.basePrecipitation *
      climatePattern.precipitationPattern[month] *
      0.25; // Weekly amount

    const avgTempHigh = Math.round(baseTemp + 15);
    const avgTempLow = Math.round(baseTemp - 5);
    const workableDays = Math.max(3, 7 - Math.round(totalPrecipitation * 2));

    let riskLevel: "low" | "medium" | "high" = "low";
    if (totalPrecipitation > 2 || avgTempHigh < 40 || avgTempHigh > 95) {
      riskLevel = "high";
    } else if (totalPrecipitation > 1 || avgTempHigh < 50 || avgTempHigh > 85) {
      riskLevel = "medium";
    }

    return {
      weekStart: weekStart.toISOString().split("T")[0],
      avgTempHigh,
      avgTempLow,
      totalPrecipitation: Math.round(totalPrecipitation * 100) / 100,
      workableDays,
      riskLevel,
    };
  }

  private calculateDailyWorkability(weather: {
    tempHigh: number;
    tempLow: number;
    precipitation: number;
    windSpeed: number;
    humidity: number;
  }): number {
    let score = 1.0;

    // Temperature factors
    if (weather.tempHigh < 32 || weather.tempHigh > 95) score *= 0.3;
    else if (weather.tempHigh < 40 || weather.tempHigh > 85) score *= 0.7;
    else if (weather.tempHigh < 50 || weather.tempHigh > 80) score *= 0.9;

    // Precipitation factors
    if (weather.precipitation > 0.5) score *= 0.2;
    else if (weather.precipitation > 0.1) score *= 0.6;
    else if (weather.precipitation > 0.01) score *= 0.8;

    // Wind factors
    if (weather.windSpeed > 25) score *= 0.4;
    else if (weather.windSpeed > 15) score *= 0.7;
    else if (weather.windSpeed > 10) score *= 0.9;

    // Humidity factors
    if (weather.humidity > 90) score *= 0.8;
    else if (weather.humidity > 80) score *= 0.9;

    return Math.round(score * 100) / 100;
  }

  private getConditionsFromWeather(
    precipitation: number,
    tempHigh: number,
    tempLow: number,
  ): string {
    if (precipitation > 0.5) return "Heavy Rain";
    if (precipitation > 0.1) return "Light Rain";
    if (precipitation > 0.01) return "Drizzle";
    if (tempHigh > 85) return "Hot";
    if (tempLow < 32) return "Freezing";
    if (tempHigh < 40) return "Cold";
    return "Clear";
  }
}

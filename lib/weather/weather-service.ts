import { WeatherAnalysis } from "./types";
import { WeatherDataProvider } from "./weather-data-provider";
import { WeatherAnalysisService } from "./weather-analysis-service";

export class WeatherService {
  private dataProvider: WeatherDataProvider;
  private analysisService: WeatherAnalysisService;

  constructor() {
    this.dataProvider = new WeatherDataProvider();
    this.analysisService = new WeatherAnalysisService();
  }

  async analyzeWeatherForLocation(
    location: string,
    services: string[],
    proposedStartDate: Date,
  ): Promise<WeatherAnalysis> {
    try {
      const realWeatherData = await this.dataProvider.getRealWeatherData(
        location,
        services,
        proposedStartDate,
      );

      if (realWeatherData) {
        return this.analysisService.processRealWeatherData(
          realWeatherData.currentData,
          realWeatherData.forecastData,
          services,
          proposedStartDate,
        );
      }

      const mockWeatherData = await this.dataProvider.getMockWeatherData(
        location,
        proposedStartDate,
      );

      return this.analysisService.processMockWeatherData(
        mockWeatherData.historical,
        mockWeatherData.forecast,
        services,
        proposedStartDate,
      );
    } catch (error) {
      console.error("Weather analysis failed:", error);
      return this.getFallbackWeatherAnalysis(
        location,
        services,
        proposedStartDate,
      );
    }
  }

  private getFallbackWeatherAnalysis(
    location: string,
    services: string[],
    proposedStartDate: Date,
  ): WeatherAnalysis {
    const historical = {
      fiveYearAverages: [],
      extremeEvents: [],
      bestMonths: ["May", "June", "September", "October"],
      worstMonths: ["December", "January", "February", "March"],
    };

    const forecast = {
      next30Days: [],
      next90Days: [],
      recommendations: [
        "Weather data temporarily unavailable. Using historical patterns.",
        "Monitor local weather conditions closely during project execution.",
      ],
    };

    const serviceImpacts = this.analysisService.calculateServiceImpacts(
      services,
      historical,
      forecast,
    );

    return {
      location,
      historical,
      forecast,
      serviceImpacts,
      riskScore: 0.4, // Moderate default risk
    };
  }
}

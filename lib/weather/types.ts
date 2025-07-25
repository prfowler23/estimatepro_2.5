export interface MonthlyWeatherData {
  month: string;
  avgTempHigh: number;
  avgTempLow: number;
  avgPrecipitation: number;
  avgHumidity: number;
  avgWindSpeed: number;
  rainDays: number;
  snowDays: number;
  extremeTempDays: number;
  workableDays: number;
}

export interface WeatherEvent {
  date: string;
  type: "storm" | "extreme_cold" | "extreme_heat" | "high_wind" | "heavy_rain";
  severity: "low" | "medium" | "high" | "extreme";
  impact: string;
  duration: number; // days
}

export interface DailyForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  workability: number; // 0-1 score
}

export interface WeeklyForecast {
  weekStart: string;
  avgTempHigh: number;
  avgTempLow: number;
  totalPrecipitation: number;
  workableDays: number;
  riskLevel: "low" | "medium" | "high";
}

export interface WeatherSensitivity {
  rain: "low" | "medium" | "high" | "critical";
  temperature: "low" | "medium" | "high" | "critical";
  wind: "low" | "medium" | "high" | "critical";
  snow: "low" | "medium" | "high" | "critical";
}

export interface ServiceWeatherImpact {
  service: string;
  weatherSensitivity: WeatherSensitivity;
  impactFactors: {
    productivityLoss: number; // 0-1
    delayRisk: number; // 0-1
    qualityRisk: number; // 0-1
    safetyRisk: number; // 0-1
  };
  delayRisk: number;
  recommendations: string[];
}

export interface HistoricalWeather {
  fiveYearAverages: MonthlyWeatherData[];
  extremeEvents: WeatherEvent[];
  bestMonths: string[];
  worstMonths: string[];
}

export interface WeatherAnalysis {
  location: string;
  historical: HistoricalWeather;
  forecast: {
    next30Days: DailyForecast[];
    next90Days: WeeklyForecast[];
    recommendations: string[];
  };
  serviceImpacts: Record<string, ServiceWeatherImpact>;
  riskScore: number; // 0-1
}

export interface OptimalWindow {
  start: Date;
  end: Date;
  score: number;
  duration: number;
  services: string[];
}

// Weather API response interfaces
export interface WeatherAPIResponse {
  current: any;
  forecast: any;
  history: any;
}

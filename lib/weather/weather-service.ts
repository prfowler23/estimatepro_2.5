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
  type: 'storm' | 'extreme_cold' | 'extreme_heat' | 'high_wind' | 'heavy_rain';
  severity: 'low' | 'medium' | 'high' | 'extreme';
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
  riskLevel: 'low' | 'medium' | 'high';
}

export interface WeatherSensitivity {
  rain: 'low' | 'medium' | 'high' | 'critical';
  temperature: 'low' | 'medium' | 'high' | 'critical';
  wind: 'low' | 'medium' | 'high' | 'critical';
  snow: 'low' | 'medium' | 'high' | 'critical';
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
interface WeatherAPIResponse {
  current: any;
  forecast: any;
  history: any;
}

export class WeatherService {
  private apiKey = process.env.WEATHER_API_KEY || process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  private baseUrl = 'https://api.weatherapi.com/v1';
  
  async analyzeWeatherForLocation(
    location: string,
    services: string[],
    proposedStartDate: Date
  ): Promise<WeatherAnalysis> {
    try {
      // Get historical data
      const historical = await this.getHistoricalWeather(location);
      
      // Get forecast
      const forecast = await this.getForecast(location, proposedStartDate);
      
      // Calculate service-specific impacts
      const serviceImpacts = this.calculateServiceImpacts(services, historical, forecast);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        services,
        historical,
        forecast,
        proposedStartDate
      );
      
      return {
        location,
        historical,
        forecast: {
          ...forecast,
          recommendations
        },
        serviceImpacts,
        riskScore: this.calculateOverallRisk(serviceImpacts)
      };
    } catch (error) {
      console.error('Weather analysis failed:', error);
      // Return fallback data
      return this.getFallbackWeatherAnalysis(location, services, proposedStartDate);
    }
  }
  
  private async getHistoricalWeather(location: string): Promise<HistoricalWeather> {
    if (this.apiKey) {
      try {
        // In production, make actual API calls to weather service
        return await this.fetchHistoricalFromAPI(location);
      } catch (error) {
        console.error('Historical weather API failed:', error);
      }
    }
    
    // Fallback to mock data based on general climate patterns
    const fiveYearAverages = this.generateHistoricalData(location);
    
    return {
      fiveYearAverages,
      extremeEvents: this.identifyExtremeEvents(fiveYearAverages),
      bestMonths: this.identifyBestMonths(fiveYearAverages),
      worstMonths: this.identifyWorstMonths(fiveYearAverages)
    };
  }
  
  private async getForecast(location: string, startDate: Date): Promise<{
    next30Days: DailyForecast[];
    next90Days: WeeklyForecast[];
  }> {
    if (this.apiKey) {
      try {
        return await this.fetchForecastFromAPI(location, startDate);
      } catch (error) {
        console.error('Forecast API failed:', error);
      }
    }
    
    // Fallback to mock forecast
    return this.generateMockForecast(location, startDate);
  }
  
  private async fetchHistoricalFromAPI(location: string): Promise<HistoricalWeather> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 5);
    
    const historicalData: MonthlyWeatherData[] = [];
    
    // Fetch year-by-year data and aggregate by month
    for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        if (date > endDate) break;
        
        try {
          const response = await fetch(
            `${this.baseUrl}/history.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&dt=${date.toISOString().split('T')[0]}`
          );
          
          if (response.ok) {
            const data = await response.json();
            // Process historical data
            // This is a simplified version - real implementation would aggregate properly
          }
        } catch (error) {
          console.error(`Failed to fetch historical data for ${year}-${month + 1}:`, error);
        }
      }
    }
    
    // For now, return generated data
    return {
      fiveYearAverages: this.generateHistoricalData(location),
      extremeEvents: [],
      bestMonths: ['May', 'June', 'September', 'October'],
      worstMonths: ['December', 'January', 'February', 'March']
    };
  }
  
  private async fetchForecastFromAPI(location: string, startDate: Date): Promise<{
    next30Days: DailyForecast[];
    next90Days: WeeklyForecast[];
  }> {
    const next30Days: DailyForecast[] = [];
    const next90Days: WeeklyForecast[] = [];
    
    try {
      // Fetch 14-day forecast (most APIs limit to 10-14 days)
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=14`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Process forecast data
        data.forecast.forecastday.forEach((day: any) => {
          next30Days.push({
            date: day.date,
            tempHigh: day.day.maxtemp_f,
            tempLow: day.day.mintemp_f,
            precipitation: day.day.totalprecip_in,
            humidity: day.day.avghumidity,
            windSpeed: day.day.maxwind_mph,
            conditions: day.day.condition.text,
            workability: this.calculateWorkability(day.day)
          });
        });
      }
    } catch (error) {
      console.error('Forecast API error:', error);
    }
    
    // Fill remaining days with seasonal patterns
    while (next30Days.length < 30) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + next30Days.length);
      next30Days.push(this.generateMockDailyForecast(date, location));
    }
    
    // Generate weekly forecasts
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      
      next90Days.push(this.generateMockWeeklyForecast(weekStart, location));
    }
    
    return { next30Days, next90Days };
  }
  
  private generateHistoricalData(location: string): MonthlyWeatherData[] {
    // Climate patterns for different regions
    const climatePatterns = this.getClimatePattern(location);
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months.map((month, index) => {
      const baseTemp = climatePatterns.baseTemp + climatePatterns.seasonalVariation * Math.cos((index - 6) * Math.PI / 6);
      const precipitation = climatePatterns.basePrecipitation * climatePatterns.precipitationPattern[index];
      
      return {
        month,
        avgTempHigh: Math.round(baseTemp + 15),
        avgTempLow: Math.round(baseTemp - 5),
        avgPrecipitation: Math.round(precipitation * 100) / 100,
        avgHumidity: Math.round(climatePatterns.baseHumidity + (precipitation * 20)),
        avgWindSpeed: Math.round((10 + Math.random() * 10) * 100) / 100,
        rainDays: Math.round(precipitation * 30),
        snowDays: index < 3 || index > 10 ? Math.round(precipitation * 10) : 0,
        extremeTempDays: Math.round(Math.random() * 5),
        workableDays: Math.round(30 - (precipitation * 15) - (index < 3 || index > 10 ? precipitation * 5 : 0))
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
      precipitationPattern: [1.0, 0.9, 1.1, 1.2, 1.3, 1.1, 0.9, 0.8, 0.9, 1.0, 1.1, 1.0],
      baseHumidity: 65
    };
    
    // Adjust for different regions
    if (lowerLocation.includes('florida') || lowerLocation.includes('miami')) {
      pattern = {
        baseTemp: 75,
        seasonalVariation: 15,
        basePrecipitation: 4.5,
        precipitationPattern: [0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 2.2, 2.1, 1.8, 1.2, 0.8, 0.7],
        baseHumidity: 80
      };
    } else if (lowerLocation.includes('california') || lowerLocation.includes('los angeles')) {
      pattern = {
        baseTemp: 65,
        seasonalVariation: 20,
        basePrecipitation: 1.5,
        precipitationPattern: [1.8, 1.6, 1.4, 0.8, 0.3, 0.1, 0.1, 0.1, 0.2, 0.6, 1.2, 1.8],
        baseHumidity: 55
      };
    } else if (lowerLocation.includes('seattle') || lowerLocation.includes('washington')) {
      pattern = {
        baseTemp: 50,
        seasonalVariation: 20,
        basePrecipitation: 5.0,
        precipitationPattern: [1.8, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3, 0.4, 0.7, 1.2, 1.6, 1.8],
        baseHumidity: 75
      };
    } else if (lowerLocation.includes('chicago') || lowerLocation.includes('illinois')) {
      pattern = {
        baseTemp: 50,
        seasonalVariation: 35,
        basePrecipitation: 3.5,
        precipitationPattern: [0.8, 0.9, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 1.0, 1.0, 0.9],
        baseHumidity: 70
      };
    }
    
    return pattern;
  }
  
  private generateMockForecast(location: string, startDate: Date): {
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
  
  private generateMockDailyForecast(date: Date, location: string): DailyForecast {
    const month = date.getMonth();
    const climatePattern = this.getClimatePattern(location);
    
    const baseTemp = climatePattern.baseTemp + climatePattern.seasonalVariation * Math.cos((month - 6) * Math.PI / 6);
    const precipitation = Math.random() < 0.3 ? Math.random() * 2 : 0;
    
    const tempHigh = Math.round(baseTemp + 15 + (Math.random() - 0.5) * 10);
    const tempLow = Math.round(baseTemp - 5 + (Math.random() - 0.5) * 8);
    
    const workability = this.calculateDailyWorkability({
      tempHigh,
      tempLow,
      precipitation,
      windSpeed: 5 + Math.random() * 15,
      humidity: climatePattern.baseHumidity + (Math.random() - 0.5) * 20
    });
    
    return {
      date: date.toISOString().split('T')[0],
      tempHigh,
      tempLow,
      precipitation: Math.round(precipitation * 100) / 100,
      humidity: Math.round(climatePattern.baseHumidity + (Math.random() - 0.5) * 20),
      windSpeed: Math.round((5 + Math.random() * 15) * 100) / 100,
      conditions: this.getConditionsFromWeather(precipitation, tempHigh, tempLow),
      workability
    };
  }
  
  private generateMockWeeklyForecast(weekStart: Date, location: string): WeeklyForecast {
    const month = weekStart.getMonth();
    const climatePattern = this.getClimatePattern(location);
    
    const baseTemp = climatePattern.baseTemp + climatePattern.seasonalVariation * Math.cos((month - 6) * Math.PI / 6);
    const totalPrecipitation = climatePattern.basePrecipitation * climatePattern.precipitationPattern[month] * 0.25; // Weekly amount
    
    const avgTempHigh = Math.round(baseTemp + 15);
    const avgTempLow = Math.round(baseTemp - 5);
    const workableDays = Math.max(3, 7 - Math.round(totalPrecipitation * 2));
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalPrecipitation > 2 || avgTempHigh < 40 || avgTempHigh > 95) {
      riskLevel = 'high';
    } else if (totalPrecipitation > 1 || avgTempHigh < 50 || avgTempHigh > 85) {
      riskLevel = 'medium';
    }
    
    return {
      weekStart: weekStart.toISOString().split('T')[0],
      avgTempHigh,
      avgTempLow,
      totalPrecipitation: Math.round(totalPrecipitation * 100) / 100,
      workableDays,
      riskLevel
    };
  }
  
  private calculateWorkability(dayData: any): number {
    let score = 1.0;
    
    // Temperature factors
    if (dayData.maxtemp_f < 32 || dayData.maxtemp_f > 95) score *= 0.3;
    else if (dayData.maxtemp_f < 40 || dayData.maxtemp_f > 85) score *= 0.7;
    else if (dayData.maxtemp_f < 50 || dayData.maxtemp_f > 80) score *= 0.9;
    
    // Precipitation factors
    if (dayData.totalprecip_in > 0.5) score *= 0.2;
    else if (dayData.totalprecip_in > 0.1) score *= 0.6;
    else if (dayData.totalprecip_in > 0.01) score *= 0.8;
    
    // Wind factors
    if (dayData.maxwind_mph > 25) score *= 0.4;
    else if (dayData.maxwind_mph > 15) score *= 0.7;
    else if (dayData.maxwind_mph > 10) score *= 0.9;
    
    // Humidity factors
    if (dayData.avghumidity > 90) score *= 0.8;
    else if (dayData.avghumidity > 80) score *= 0.9;
    
    return Math.round(score * 100) / 100;
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
  
  private getConditionsFromWeather(precipitation: number, tempHigh: number, tempLow: number): string {
    if (precipitation > 0.5) return 'Heavy Rain';
    if (precipitation > 0.1) return 'Light Rain';
    if (precipitation > 0.01) return 'Drizzle';
    if (tempHigh > 85) return 'Hot';
    if (tempLow < 32) return 'Freezing';
    if (tempHigh < 40) return 'Cold';
    return 'Clear';
  }
  
  private identifyExtremeEvents(monthlyData: MonthlyWeatherData[]): WeatherEvent[] {
    const events: WeatherEvent[] = [];
    
    monthlyData.forEach(month => {
      if (month.avgTempLow < 10) {
        events.push({
          date: `${month.month} (Avg)`,
          type: 'extreme_cold',
          severity: month.avgTempLow < 0 ? 'extreme' : 'high',
          impact: 'Extended cold periods affect outdoor work scheduling',
          duration: month.extremeTempDays
        });
      }
      
      if (month.avgPrecipitation > 5) {
        events.push({
          date: `${month.month} (Avg)`,
          type: 'heavy_rain',
          severity: month.avgPrecipitation > 8 ? 'extreme' : 'high',
          impact: 'Heavy precipitation periods limit outdoor work',
          duration: month.rainDays
        });
      }
    });
    
    return events;
  }
  
  private identifyBestMonths(monthlyData: MonthlyWeatherData[]): string[] {
    return monthlyData
      .filter(month => month.workableDays > 20 && month.avgTempHigh > 50 && month.avgTempHigh < 85)
      .sort((a, b) => b.workableDays - a.workableDays)
      .slice(0, 4)
      .map(month => month.month);
  }
  
  private identifyWorstMonths(monthlyData: MonthlyWeatherData[]): string[] {
    return monthlyData
      .filter(month => month.workableDays < 15 || month.avgTempHigh < 40 || month.avgPrecipitation > 4)
      .sort((a, b) => a.workableDays - b.workableDays)
      .slice(0, 4)
      .map(month => month.month);
  }
  
  private calculateServiceImpacts(
    services: string[],
    historical: HistoricalWeather,
    forecast: any
  ): Record<string, ServiceWeatherImpact> {
    const impacts: Record<string, ServiceWeatherImpact> = {};
    
    services.forEach(service => {
      const sensitivity = this.getWeatherSensitivity(service);
      const impactFactors = this.calculateImpactFactors(service, forecast);
      const delayRisk = this.calculateDelayRisk(service, forecast);
      
      impacts[service] = {
        service,
        weatherSensitivity: sensitivity,
        impactFactors,
        delayRisk,
        recommendations: this.getServiceSpecificRecommendations(service, forecast, historical)
      };
    });
    
    return impacts;
  }
  
  private getWeatherSensitivity(service: string): WeatherSensitivity {
    const sensitivities: Record<string, WeatherSensitivity> = {
      'BWS': {
        rain: 'critical', // Can't seal in rain
        temperature: 'high', // Needs 50°F+ for sealing
        wind: 'medium',
        snow: 'critical'
      },
      'BWP': {
        rain: 'medium', // Can work in light rain
        temperature: 'low', // Can work in most temps
        wind: 'high', // Wind affects spray
        snow: 'high'
      },
      'WC': {
        rain: 'high', // Can't clean windows in rain
        temperature: 'medium', // Freezing is an issue
        wind: 'high', // Safety concern
        snow: 'high'
      },
      'GR': {
        rain: 'medium', // Some products need dry conditions
        temperature: 'medium',
        wind: 'low',
        snow: 'medium'
      },
      'PC': {
        rain: 'low', // Can work in most conditions
        temperature: 'low',
        wind: 'low',
        snow: 'medium'
      },
      'PWP': {
        rain: 'medium',
        temperature: 'low',
        wind: 'medium',
        snow: 'high'
      },
      'PWF': {
        rain: 'medium',
        temperature: 'low',
        wind: 'medium',
        snow: 'high'
      },
      'HBW': {
        rain: 'high',
        temperature: 'medium',
        wind: 'critical', // High-rise safety
        snow: 'critical'
      },
      'IW': {
        rain: 'low', // Indoor work
        temperature: 'low',
        wind: 'low',
        snow: 'low'
      },
      'HFS': {
        rain: 'low', // Indoor work
        temperature: 'low',
        wind: 'low',
        snow: 'low'
      },
      'DC': {
        rain: 'medium',
        temperature: 'medium',
        wind: 'medium',
        snow: 'high'
      }
    };
    
    return sensitivities[service] || {
      rain: 'medium',
      temperature: 'medium',
      wind: 'medium',
      snow: 'medium'
    };
  }
  
  private calculateImpactFactors(service: string, forecast: any): {
    productivityLoss: number;
    delayRisk: number;
    qualityRisk: number;
    safetyRisk: number;
  } {
    const sensitivity = this.getWeatherSensitivity(service);
    let productivityLoss = 0;
    let delayRisk = 0;
    let qualityRisk = 0;
    let safetyRisk = 0;
    
    // Analyze next 30 days
    const poorWeatherDays = forecast.next30Days.filter((day: DailyForecast) => day.workability < 0.7).length;
    const badWeatherDays = forecast.next30Days.filter((day: DailyForecast) => day.workability < 0.3).length;
    
    // Calculate based on weather sensitivity
    if (sensitivity.rain === 'critical' || sensitivity.rain === 'high') {
      const rainyDays = forecast.next30Days.filter((day: DailyForecast) => day.precipitation > 0.1).length;
      productivityLoss += rainyDays / 30 * 0.3;
      delayRisk += rainyDays / 30 * 0.4;
    }
    
    if (sensitivity.wind === 'critical' || sensitivity.wind === 'high') {
      const windyDays = forecast.next30Days.filter((day: DailyForecast) => day.windSpeed > 15).length;
      safetyRisk += windyDays / 30 * 0.5;
      qualityRisk += windyDays / 30 * 0.3;
    }
    
    return {
      productivityLoss: Math.min(1, productivityLoss),
      delayRisk: Math.min(1, delayRisk),
      qualityRisk: Math.min(1, qualityRisk),
      safetyRisk: Math.min(1, safetyRisk)
    };
  }
  
  private calculateDelayRisk(service: string, forecast: any): number {
    const sensitivity = this.getWeatherSensitivity(service);
    const impactFactors = this.calculateImpactFactors(service, forecast);
    
    // Weight different factors based on service type
    let risk = 0;
    risk += impactFactors.delayRisk * 0.4;
    risk += impactFactors.safetyRisk * 0.3;
    risk += impactFactors.productivityLoss * 0.2;
    risk += impactFactors.qualityRisk * 0.1;
    
    return Math.min(1, risk);
  }
  
  private getServiceSpecificRecommendations(
    service: string,
    forecast: any,
    historical: HistoricalWeather
  ): string[] {
    const recommendations: string[] = [];
    const sensitivity = this.getWeatherSensitivity(service);
    
    // Service-specific recommendations
    if (service === 'BWS') {
      const coldDays = forecast.next30Days.filter((day: DailyForecast) => day.tempHigh < 50).length;
      if (coldDays > 10) {
        recommendations.push('Sealing work requires temperatures above 50°F. Consider rescheduling for warmer period.');
      }
      
      const rainyDays = forecast.next30Days.filter((day: DailyForecast) => day.precipitation > 0.1).length;
      if (rainyDays > 8) {
        recommendations.push('Multiple rain days ahead. Plan for 24-48 hour dry periods between sealing applications.');
      }
    }
    
    if (service === 'HBW') {
      const windyDays = forecast.next30Days.filter((day: DailyForecast) => day.windSpeed > 20).length;
      if (windyDays > 5) {
        recommendations.push('High wind days present safety risks for high-rise work. Monitor daily conditions closely.');
      }
    }
    
    if (['WC', 'GR'].includes(service)) {
      const freezingDays = forecast.next30Days.filter((day: DailyForecast) => day.tempLow < 32).length;
      if (freezingDays > 3) {
        recommendations.push('Freezing temperatures affect cleaning solutions. Plan for later start times on cold days.');
      }
    }
    
    // General recommendations based on forecast
    const optimalWindows = this.findOptimalWindows(forecast, [service]);
    if (optimalWindows.length > 0) {
      recommendations.push(`Optimal work windows: ${optimalWindows[0].start.toLocaleDateString()} - ${optimalWindows[0].end.toLocaleDateString()}`);
    }
    
    return recommendations;
  }
  
  private generateRecommendations(
    services: string[],
    historical: HistoricalWeather,
    forecast: any,
    proposedStartDate: Date
  ): string[] {
    const recommendations: string[] = [];
    
    // Check if proposed date is in a bad weather month
    const month = proposedStartDate.toLocaleString('default', { month: 'long' });
    if (historical.worstMonths.includes(month)) {
      recommendations.push(
        `⚠️ ${month} historically has challenging weather. Consider starting in ${historical.bestMonths[0]} for better conditions.`
      );
    }
    
    // Check for specific service concerns
    if (services.includes('BWS')) {
      const dryDays = forecast.next30Days.filter((d: DailyForecast) => d.precipitation < 0.1).length;
      if (dryDays < 10) {
        recommendations.push(
          '⚠️ Limited dry days for sealing work in the next 30 days. Plan for extended timeline.'
        );
      }
    }
    
    // Temperature concerns
    const coldDays = forecast.next30Days.filter((d: DailyForecast) => d.tempHigh < 50).length;
    if (coldDays > 15 && services.some(s => ['BWS', 'GR'].includes(s))) {
      recommendations.push(
        '🌡️ Extended cold period ahead. Some services may need rescheduling.'
      );
    }
    
    // High wind concerns
    const windyDays = forecast.next30Days.filter((d: DailyForecast) => d.windSpeed > 20).length;
    if (windyDays > 8 && services.includes('HBW')) {
      recommendations.push(
        '💨 Multiple high-wind days forecasted. Extra safety precautions needed for high-rise work.'
      );
    }
    
    // Optimal windows
    const optimalWindows = this.findOptimalWindows(forecast, services);
    if (optimalWindows.length > 0) {
      recommendations.push(
        `✅ Optimal work windows: ${optimalWindows.slice(0, 2).map(w => 
          `${w.start.toLocaleDateString()} - ${w.end.toLocaleDateString()}`
        ).join(', ')}`
      );
    }
    
    // Seasonal advice
    if (historical.bestMonths.includes(month)) {
      recommendations.push(
        `✅ ${month} is historically one of the best months for outdoor cleaning work.`
      );
    }
    
    return recommendations;
  }
  
  private findOptimalWindows(
    forecast: any,
    services: string[]
  ): OptimalWindow[] {
    const windows: OptimalWindow[] = [];
    const minWindowDays = 3;
    
    let currentWindow: OptimalWindow | null = null;
    let windowScore = 0;
    let consecutiveGoodDays = 0;
    
    forecast.next30Days.forEach((day: DailyForecast, index: number) => {
      const dayScore = this.scoreDayForServices(day, services);
      
      if (dayScore > 0.7) {
        consecutiveGoodDays++;
        windowScore += dayScore;
        
        if (!currentWindow) {
          currentWindow = { 
            start: new Date(day.date), 
            end: new Date(day.date), 
            score: 0, 
            duration: 0,
            services: services 
          };
        } else {
          currentWindow.end = new Date(day.date);
        }
      } else {
        if (currentWindow && consecutiveGoodDays >= minWindowDays) {
          currentWindow.score = windowScore / consecutiveGoodDays;
          currentWindow.duration = consecutiveGoodDays;
          windows.push(currentWindow);
        }
        currentWindow = null;
        consecutiveGoodDays = 0;
        windowScore = 0;
      }
    });
    
    // Check last window
    if (currentWindow && consecutiveGoodDays >= minWindowDays) {
      currentWindow.score = windowScore / consecutiveGoodDays;
      currentWindow.duration = consecutiveGoodDays;
      windows.push(currentWindow);
    }
    
    return windows.sort((a, b) => b.score - a.score).slice(0, 3);
  }
  
  private scoreDayForServices(day: DailyForecast, services: string[]): number {
    let totalScore = 0;
    
    services.forEach(service => {
      const sensitivity = this.getWeatherSensitivity(service);
      let serviceScore = 1.0;
      
      // Rain impact
      if (day.precipitation > 0.1) {
        const rainImpact = { low: 0.9, medium: 0.7, high: 0.4, critical: 0.1 }[sensitivity.rain];
        serviceScore *= rainImpact;
      }
      
      // Temperature impact
      if (day.tempHigh < 40 || day.tempHigh > 90) {
        const tempImpact = { low: 0.9, medium: 0.7, high: 0.4, critical: 0.1 }[sensitivity.temperature];
        serviceScore *= tempImpact;
      }
      
      // Wind impact
      if (day.windSpeed > 15) {
        const windImpact = { low: 0.95, medium: 0.8, high: 0.5, critical: 0.2 }[sensitivity.wind];
        serviceScore *= windImpact;
      }
      
      totalScore += serviceScore;
    });
    
    return totalScore / services.length;
  }
  
  private calculateOverallRisk(serviceImpacts: Record<string, ServiceWeatherImpact>): number {
    const impacts = Object.values(serviceImpacts);
    if (impacts.length === 0) return 0.3; // Default moderate risk
    
    const avgDelayRisk = impacts.reduce((sum, impact) => sum + impact.delayRisk, 0) / impacts.length;
    const avgProductivityLoss = impacts.reduce((sum, impact) => sum + impact.impactFactors.productivityLoss, 0) / impacts.length;
    const avgSafetyRisk = impacts.reduce((sum, impact) => sum + impact.impactFactors.safetyRisk, 0) / impacts.length;
    
    // Weight the different risk factors
    return Math.min(1, (avgDelayRisk * 0.4) + (avgProductivityLoss * 0.3) + (avgSafetyRisk * 0.3));
  }
  
  private getFallbackWeatherAnalysis(
    location: string,
    services: string[],
    proposedStartDate: Date
  ): WeatherAnalysis {
    const historical = {
      fiveYearAverages: this.generateHistoricalData(location),
      extremeEvents: [],
      bestMonths: ['May', 'June', 'September', 'October'],
      worstMonths: ['December', 'January', 'February', 'March']
    };
    
    const forecast = this.generateMockForecast(location, proposedStartDate);
    const serviceImpacts = this.calculateServiceImpacts(services, historical, forecast);
    
    return {
      location,
      historical,
      forecast: {
        ...forecast,
        recommendations: [
          'Weather data temporarily unavailable. Using historical patterns.',
          'Monitor local weather conditions closely during project execution.'
        ]
      },
      serviceImpacts,
      riskScore: 0.4 // Moderate default risk
    };
  }
}
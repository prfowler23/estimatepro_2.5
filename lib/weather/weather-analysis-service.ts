import {
  DailyForecast,
  WeeklyForecast,
  ServiceWeatherImpact,
  WeatherAnalysis,
  OptimalWindow,
  HistoricalWeather,
  WeatherSensitivity,
} from "./types";

export class WeatherAnalysisService {
  processMockWeatherData(
    historical: HistoricalWeather,
    forecast: {
      next30Days: DailyForecast[];
      next90Days: WeeklyForecast[];
    },
    services: string[],
    proposedStartDate: Date,
  ): WeatherAnalysis {
    const serviceImpacts = this.calculateServiceImpacts(
      services,
      historical,
      forecast,
    );
    const recommendations = this.generateRecommendations(
      services,
      historical,
      forecast,
      proposedStartDate,
    );

    return {
      location: "Mock Location",
      historical,
      forecast: {
        ...forecast,
        recommendations,
      },
      serviceImpacts,
      riskScore: this.calculateOverallRisk(serviceImpacts),
    };
  }

  processRealWeatherData(
    currentData: any,
    forecastData: any,
    services: string[],
    proposedStartDate: Date,
  ): WeatherAnalysis {
    // Extract location info
    const locationInfo = forecastData.location;

    // Process forecast data
    const next30Days: DailyForecast[] = [];
    const next90Days: WeeklyForecast[] = [];

    // Process daily forecasts
    forecastData.forecast.forecastday.forEach((day: any) => {
      const dailyForecast: DailyForecast = {
        date: day.date,
        tempHigh: day.day.maxtemp_f,
        tempLow: day.day.mintemp_f,
        precipitation: day.day.totalprecip_in,
        humidity: day.day.avghumidity,
        windSpeed: day.day.maxwind_mph,
        conditions: day.day.condition.text,
        workability: this.calculateRealWorkability(day.day),
      };
      next30Days.push(dailyForecast);
    });

    // Generate weekly forecasts from daily data
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(proposedStartDate);
      weekStart.setDate(weekStart.getDate() + week * 7);

      const weeklyForecast: WeeklyForecast = {
        weekStart: weekStart.toISOString().split("T")[0],
        avgTempHigh:
          next30Days
            .slice(week * 7, (week + 1) * 7)
            .reduce((sum, day) => sum + day.tempHigh, 0) / 7,
        avgTempLow:
          next30Days
            .slice(week * 7, (week + 1) * 7)
            .reduce((sum, day) => sum + day.tempLow, 0) / 7,
        totalPrecipitation: next30Days
          .slice(week * 7, (week + 1) * 7)
          .reduce((sum, day) => sum + day.precipitation, 0),
        workableDays: next30Days
          .slice(week * 7, (week + 1) * 7)
          .filter((day) => day.workability > 0.7).length,
        riskLevel: this.calculateWeeklyRiskLevel(
          next30Days.slice(week * 7, (week + 1) * 7),
        ),
      };
      next90Days.push(weeklyForecast);
    }

    // Generate historical data (use mock data as we don't have historical API)
    const historical = {
      fiveYearAverages: [],
      extremeEvents: [] as any[],
      bestMonths: ["May", "June", "September", "October"],
      worstMonths: ["December", "January", "February", "March"],
    };

    // Calculate service impacts with real data
    const serviceImpacts = this.calculateServiceImpactsFromReal(
      services,
      next30Days,
      next90Days,
    );

    // Generate recommendations with real data
    const recommendations = this.generateRecommendationsFromReal(
      services,
      next30Days,
      forecastData.alerts,
    );

    return {
      location: locationInfo.name,
      historical,
      forecast: {
        next30Days,
        next90Days,
        recommendations,
      },
      serviceImpacts,
      riskScore: this.calculateOverallRisk(serviceImpacts),
    };
  }

  calculateRealWorkability(dayData: any): number {
    let score = 1.0;

    // Temperature factors
    const temp = dayData.maxtemp_f;
    if (temp < 32 || temp > 95) score *= 0.3;
    else if (temp < 40 || temp > 85) score *= 0.7;
    else if (temp < 50 || temp > 80) score *= 0.9;

    // Precipitation factors
    const precip = dayData.totalprecip_in;
    if (precip > 0.5) score *= 0.2;
    else if (precip > 0.1) score *= 0.6;
    else if (precip > 0.01) score *= 0.8;

    // Wind factors
    const wind = dayData.maxwind_mph;
    if (wind > 25) score *= 0.4;
    else if (wind > 15) score *= 0.7;
    else if (wind > 10) score *= 0.9;

    // Humidity factors
    const humidity = dayData.avghumidity;
    if (humidity > 90) score *= 0.8;
    else if (humidity > 80) score *= 0.9;

    // UV and air quality factors
    if (dayData.uv > 8) score *= 0.9;

    return Math.round(score * 100) / 100;
  }

  calculateWeeklyRiskLevel(
    weekDays: DailyForecast[],
  ): "low" | "medium" | "high" {
    const avgWorkability =
      weekDays.reduce((sum, day) => sum + day.workability, 0) / weekDays.length;
    const totalPrecip = weekDays.reduce(
      (sum, day) => sum + day.precipitation,
      0,
    );
    const maxWind = Math.max(...weekDays.map((day) => day.windSpeed));

    if (avgWorkability < 0.5 || totalPrecip > 2 || maxWind > 25) return "high";
    if (avgWorkability < 0.7 || totalPrecip > 1 || maxWind > 15)
      return "medium";
    return "low";
  }

  calculateServiceImpactsFromReal(
    services: string[],
    forecast: DailyForecast[],
    weeklyForecast: WeeklyForecast[],
  ): Record<string, ServiceWeatherImpact> {
    const impacts: Record<string, ServiceWeatherImpact> = {};

    services.forEach((service) => {
      const sensitivity = this.getWeatherSensitivity(service);
      const impactFactors = this.calculateImpactFactorsFromReal(
        service,
        forecast,
      );
      const delayRisk = this.calculateDelayRiskFromReal(service, forecast);

      impacts[service] = {
        service,
        weatherSensitivity: sensitivity,
        impactFactors,
        delayRisk,
        recommendations: this.getServiceSpecificRecommendationsFromReal(
          service,
          forecast,
        ),
      };
    });

    return impacts;
  }

  calculateImpactFactorsFromReal(
    service: string,
    forecast: DailyForecast[],
  ): {
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

    const poorWeatherDays = forecast.filter(
      (day) => day.workability < 0.7,
    ).length;
    const badWeatherDays = forecast.filter(
      (day) => day.workability < 0.3,
    ).length;

    // Calculate based on weather sensitivity and real forecast
    if (sensitivity.rain === "critical" || sensitivity.rain === "high") {
      const rainyDays = forecast.filter(
        (day) => day.precipitation > 0.1,
      ).length;
      productivityLoss += (rainyDays / forecast.length) * 0.3;
      delayRisk += (rainyDays / forecast.length) * 0.4;
    }

    if (sensitivity.wind === "critical" || sensitivity.wind === "high") {
      const windyDays = forecast.filter((day) => day.windSpeed > 15).length;
      safetyRisk += (windyDays / forecast.length) * 0.5;
      qualityRisk += (windyDays / forecast.length) * 0.3;
    }

    if (
      sensitivity.temperature === "critical" ||
      sensitivity.temperature === "high"
    ) {
      const extremeTempDays = forecast.filter(
        (day) => day.tempHigh < 40 || day.tempHigh > 90,
      ).length;
      qualityRisk += (extremeTempDays / forecast.length) * 0.4;
      delayRisk += (extremeTempDays / forecast.length) * 0.2;
    }

    return {
      productivityLoss: Math.min(1, productivityLoss),
      delayRisk: Math.min(1, delayRisk),
      qualityRisk: Math.min(1, qualityRisk),
      safetyRisk: Math.min(1, safetyRisk),
    };
  }

  calculateDelayRiskFromReal(
    service: string,
    forecast: DailyForecast[],
  ): number {
    const sensitivity = this.getWeatherSensitivity(service);
    const impactFactors = this.calculateImpactFactorsFromReal(
      service,
      forecast,
    );

    let risk = 0;
    risk += impactFactors.delayRisk * 0.4;
    risk += impactFactors.safetyRisk * 0.3;
    risk += impactFactors.productivityLoss * 0.2;
    risk += impactFactors.qualityRisk * 0.1;

    return Math.min(1, risk);
  }

  getServiceSpecificRecommendationsFromReal(
    service: string,
    forecast: DailyForecast[],
  ): string[] {
    const recommendations: string[] = [];
    const sensitivity = this.getWeatherSensitivity(service);

    // Service-specific recommendations based on real forecast
    if (service === "BWS") {
      const coldDays = forecast.filter((day) => day.tempHigh < 50).length;
      if (coldDays > forecast.length * 0.3) {
        recommendations.push(
          "Extended cold period - sealing work may be significantly delayed",
        );
      }

      const rainyDays = forecast.filter(
        (day) => day.precipitation > 0.1,
      ).length;
      if (rainyDays > forecast.length * 0.4) {
        recommendations.push(
          "High precipitation period - plan for 48-72 hour dry windows between applications",
        );
      }
    }

    if (service === "HBW") {
      const windyDays = forecast.filter((day) => day.windSpeed > 20).length;
      if (windyDays > forecast.length * 0.2) {
        recommendations.push(
          "Multiple high-wind days - enhanced safety protocols required for elevated work",
        );
      }
    }

    if (["WC", "GR"].includes(service)) {
      const freezingDays = forecast.filter((day) => day.tempLow < 32).length;
      if (freezingDays > 0) {
        recommendations.push(
          "Freezing temperatures expected - adjust cleaning solution temperatures and start times",
        );
      }
    }

    // General recommendations
    const optimalDays = forecast.filter((day) => day.workability > 0.8).length;
    if (optimalDays < forecast.length * 0.5) {
      recommendations.push(
        "Limited optimal work days - consider extending project timeline",
      );
    }

    const consecutiveWorkableDays = this.findLongestWorkableStreak(forecast);
    if (consecutiveWorkableDays >= 5) {
      recommendations.push(
        `Optimal work window of ${consecutiveWorkableDays} consecutive days identified`,
      );
    }

    return recommendations;
  }

  generateRecommendationsFromReal(
    services: string[],
    forecast: DailyForecast[],
    alerts: any[],
  ): string[] {
    const recommendations: string[] = [];

    // Alert-based recommendations
    if (alerts && alerts.length > 0) {
      alerts.forEach((alert) => {
        recommendations.push(
          `⚠️ Weather Alert: ${alert.headline} - Monitor conditions closely`,
        );
      });
    }

    // Service-specific recommendations
    if (services.includes("BWS")) {
      const dryDays = forecast.filter((d) => d.precipitation < 0.1).length;
      if (dryDays < forecast.length * 0.6) {
        recommendations.push(
          "⚠️ Limited dry periods for sealing work - plan for extended timeline",
        );
      }
    }

    // Temperature concerns
    const coldDays = forecast.filter((d) => d.tempHigh < 50).length;
    if (
      coldDays > forecast.length * 0.4 &&
      services.some((s) => ["BWS", "GR"].includes(s))
    ) {
      recommendations.push(
        "🌡️ Extended cold period - temperature-sensitive services may need rescheduling",
      );
    }

    // Wind concerns
    const windyDays = forecast.filter((d) => d.windSpeed > 20).length;
    if (windyDays > forecast.length * 0.3 && services.includes("HBW")) {
      recommendations.push(
        "💨 Multiple high-wind days - enhanced safety protocols for elevated work",
      );
    }

    // Optimal windows
    const optimalPeriods = this.findOptimalPeriodsInReal(forecast);
    if (optimalPeriods.length > 0) {
      const period = optimalPeriods[0];
      recommendations.push(
        `✅ Optimal work period: ${period.start} to ${period.end} (${period.duration} days)`,
      );
    }

    return recommendations;
  }

  findLongestWorkableStreak(forecast: DailyForecast[]): number {
    let longestStreak = 0;
    let currentStreak = 0;

    forecast.forEach((day) => {
      if (day.workability > 0.7) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return longestStreak;
  }

  findOptimalPeriodsInReal(
    forecast: DailyForecast[],
  ): Array<{ start: string; end: string; duration: number }> {
    const periods = [];
    let currentPeriod: any = null;

    forecast.forEach((day) => {
      if (day.workability > 0.8) {
        if (!currentPeriod) {
          currentPeriod = { start: day.date, end: day.date, duration: 1 };
        } else {
          currentPeriod.end = day.date;
          currentPeriod.duration++;
        }
      } else {
        if (currentPeriod && currentPeriod.duration >= 3) {
          periods.push(currentPeriod);
        }
        currentPeriod = null;
      }
    });

    if (currentPeriod && currentPeriod.duration >= 3) {
      periods.push(currentPeriod);
    }

    return periods.sort((a, b) => b.duration - a.duration);
  }

  identifyExtremeEvents(monthlyData: any[]): any[] {
    const events: any[] = [];

    monthlyData.forEach((month) => {
      if (month.avgTempLow < 10) {
        events.push({
          date: `${month.month} (Avg)`,
          type: "extreme_cold",
          severity: month.avgTempLow < 0 ? "extreme" : "high",
          impact: "Extended cold periods affect outdoor work scheduling",
          duration: month.extremeTempDays,
        });
      }

      if (month.avgPrecipitation > 5) {
        events.push({
          date: `${month.month} (Avg)`,
          type: "heavy_rain",
          severity: month.avgPrecipitation > 8 ? "extreme" : "high",
          impact: "Heavy precipitation periods limit outdoor work",
          duration: month.rainDays,
        });
      }
    });

    return events;
  }

  identifyBestMonths(monthlyData: any[]): string[] {
    return monthlyData
      .filter(
        (month) =>
          month.workableDays > 20 &&
          month.avgTempHigh > 50 &&
          month.avgTempHigh < 85,
      )
      .sort((a, b) => b.workableDays - a.workableDays)
      .slice(0, 4)
      .map((month) => month.month);
  }

  identifyWorstMonths(monthlyData: any[]): string[] {
    return monthlyData
      .filter(
        (month) =>
          month.workableDays < 15 ||
          month.avgTempHigh < 40 ||
          month.avgPrecipitation > 4,
      )
      .sort((a, b) => a.workableDays - b.workableDays)
      .slice(0, 4)
      .map((month) => month.month);
  }

  calculateServiceImpacts(
    services: string[],
    historical: HistoricalWeather,
    forecast: any,
  ): Record<string, ServiceWeatherImpact> {
    const impacts: Record<string, ServiceWeatherImpact> = {};

    services.forEach((service) => {
      const sensitivity = this.getWeatherSensitivity(service);
      const impactFactors = this.calculateImpactFactors(service, forecast);
      const delayRisk = this.calculateDelayRisk(service, forecast);

      impacts[service] = {
        service,
        weatherSensitivity: sensitivity,
        impactFactors,
        delayRisk,
        recommendations: this.getServiceSpecificRecommendations(
          service,
          forecast,
          historical,
        ),
      };
    });

    return impacts;
  }

  getWeatherSensitivity(service: string): WeatherSensitivity {
    const sensitivities: Record<string, WeatherSensitivity> = {
      BWS: {
        rain: "critical", // Can't seal in rain
        temperature: "high", // Needs 50°F+ for sealing
        wind: "medium",
        snow: "critical",
      },
      BWP: {
        rain: "medium", // Can work in light rain
        temperature: "low", // Can work in most temps
        wind: "high", // Wind affects spray
        snow: "high",
      },
      WC: {
        rain: "high", // Can't clean windows in rain
        temperature: "medium", // Freezing is an issue
        wind: "high", // Safety concern
        snow: "high",
      },
      GR: {
        rain: "medium", // Some products need dry conditions
        temperature: "medium",
        wind: "low",
        snow: "medium",
      },
      PC: {
        rain: "low", // Can work in most conditions
        temperature: "low",
        wind: "low",
        snow: "medium",
      },
      PWP: {
        rain: "medium",
        temperature: "low",
        wind: "medium",
        snow: "high",
      },
      PWF: {
        rain: "medium",
        temperature: "low",
        wind: "medium",
        snow: "high",
      },
      HBW: {
        rain: "high",
        temperature: "medium",
        wind: "critical", // High-rise safety
        snow: "critical",
      },
      IW: {
        rain: "low", // Indoor work
        temperature: "low",
        wind: "low",
        snow: "low",
      },
      HFS: {
        rain: "low", // Indoor work
        temperature: "low",
        wind: "low",
        snow: "low",
      },
      DC: {
        rain: "medium",
        temperature: "medium",
        wind: "medium",
        snow: "high",
      },
    };

    return (
      sensitivities[service] || {
        rain: "medium",
        temperature: "medium",
        wind: "medium",
        snow: "medium",
      }
    );
  }

  calculateImpactFactors(
    service: string,
    forecast: any,
  ): {
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
    const poorWeatherDays = forecast.next30Days.filter(
      (day: DailyForecast) => day.workability < 0.7,
    ).length;
    const badWeatherDays = forecast.next30Days.filter(
      (day: DailyForecast) => day.workability < 0.3,
    ).length;

    // Calculate based on weather sensitivity
    if (sensitivity.rain === "critical" || sensitivity.rain === "high") {
      const rainyDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.precipitation > 0.1,
      ).length;
      productivityLoss += (rainyDays / 30) * 0.3;
      delayRisk += (rainyDays / 30) * 0.4;
    }

    if (sensitivity.wind === "critical" || sensitivity.wind === "high") {
      const windyDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.windSpeed > 15,
      ).length;
      safetyRisk += (windyDays / 30) * 0.5;
      qualityRisk += (windyDays / 30) * 0.3;
    }

    return {
      productivityLoss: Math.min(1, productivityLoss),
      delayRisk: Math.min(1, delayRisk),
      qualityRisk: Math.min(1, qualityRisk),
      safetyRisk: Math.min(1, safetyRisk),
    };
  }

  calculateDelayRisk(service: string, forecast: any): number {
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

  getServiceSpecificRecommendations(
    service: string,
    forecast: any,
    historical: HistoricalWeather,
  ): string[] {
    const recommendations: string[] = [];
    const sensitivity = this.getWeatherSensitivity(service);

    // Service-specific recommendations
    if (service === "BWS") {
      const coldDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.tempHigh < 50,
      ).length;
      if (coldDays > 10) {
        recommendations.push(
          "Sealing work requires temperatures above 50°F. Consider rescheduling for warmer period.",
        );
      }

      const rainyDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.precipitation > 0.1,
      ).length;
      if (rainyDays > 8) {
        recommendations.push(
          "Multiple rain days ahead. Plan for 24-48 hour dry periods between sealing applications.",
        );
      }
    }

    if (service === "HBW") {
      const windyDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.windSpeed > 20,
      ).length;
      if (windyDays > 5) {
        recommendations.push(
          "High wind days present safety risks for high-rise work. Monitor daily conditions closely.",
        );
      }
    }

    if (["WC", "GR"].includes(service)) {
      const freezingDays = forecast.next30Days.filter(
        (day: DailyForecast) => day.tempLow < 32,
      ).length;
      if (freezingDays > 3) {
        recommendations.push(
          "Freezing temperatures affect cleaning solutions. Plan for later start times on cold days.",
        );
      }
    }

    // General recommendations based on forecast
    const optimalWindows = this.findOptimalWindows(forecast, [service]);
    if (optimalWindows.length > 0) {
      recommendations.push(
        `Optimal work windows: ${optimalWindows[0].start.toLocaleDateString()} - ${optimalWindows[0].end.toLocaleDateString()}`,
      );
    }

    return recommendations;
  }

  generateRecommendations(
    services: string[],
    historical: HistoricalWeather,
    forecast: any,
    proposedStartDate: Date,
  ): string[] {
    const recommendations: string[] = [];

    // Check if proposed date is in a bad weather month
    const month = proposedStartDate.toLocaleString("default", {
      month: "long",
    });
    if (historical.worstMonths.includes(month)) {
      recommendations.push(
        `⚠️ ${month} historically has challenging weather. Consider starting in ${historical.bestMonths[0]} for better conditions.`,
      );
    }

    // Check for specific service concerns
    if (services.includes("BWS")) {
      const dryDays = forecast.next30Days.filter(
        (d: DailyForecast) => d.precipitation < 0.1,
      ).length;
      if (dryDays < 10) {
        recommendations.push(
          "⚠️ Limited dry days for sealing work in the next 30 days. Plan for extended timeline.",
        );
      }
    }

    // Temperature concerns
    const coldDays = forecast.next30Days.filter(
      (d: DailyForecast) => d.tempHigh < 50,
    ).length;
    if (coldDays > 15 && services.some((s) => ["BWS", "GR"].includes(s))) {
      recommendations.push(
        "🌡️ Extended cold period ahead. Some services may need rescheduling.",
      );
    }

    // High wind concerns
    const windyDays = forecast.next30Days.filter(
      (d: DailyForecast) => d.windSpeed > 20,
    ).length;
    if (windyDays > 8 && services.includes("HBW")) {
      recommendations.push(
        "💨 Multiple high-wind days forecasted. Extra safety precautions needed for high-rise work.",
      );
    }

    // Optimal windows
    const optimalWindows = this.findOptimalWindows(forecast, services);
    if (optimalWindows.length > 0) {
      recommendations.push(
        `✅ Optimal work windows: ${optimalWindows
          .slice(0, 2)
          .map(
            (w) =>
              `${w.start.toLocaleDateString()} - ${w.end.toLocaleDateString()}`,
          )
          .join(", ")}`,
      );
    }

    // Seasonal advice
    if (historical.bestMonths.includes(month)) {
      recommendations.push(
        `✅ ${month} is historically one of the best months for outdoor cleaning work.`,
      );
    }

    return recommendations;
  }

  findOptimalWindows(forecast: any, services: string[]): OptimalWindow[] {
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
            services: services,
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
    if (currentWindow !== null && consecutiveGoodDays >= minWindowDays) {
      const window = currentWindow as OptimalWindow;
      const finalWindow: OptimalWindow = {
        start: window.start,
        end: window.end,
        services: window.services,
        score: windowScore / consecutiveGoodDays,
        duration: consecutiveGoodDays,
      };
      windows.push(finalWindow);
    }

    return windows.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  scoreDayForServices(day: DailyForecast, services: string[]): number {
    let totalScore = 0;

    services.forEach((service) => {
      const sensitivity = this.getWeatherSensitivity(service);
      let serviceScore = 1.0;

      // Rain impact
      if (day.precipitation > 0.1) {
        const rainImpact = { low: 0.9, medium: 0.7, high: 0.4, critical: 0.1 }[
          sensitivity.rain
        ];
        serviceScore *= rainImpact;
      }

      // Temperature impact
      if (day.tempHigh < 40 || day.tempHigh > 90) {
        const tempImpact = { low: 0.9, medium: 0.7, high: 0.4, critical: 0.1 }[
          sensitivity.temperature
        ];
        serviceScore *= tempImpact;
      }

      // Wind impact
      if (day.windSpeed > 15) {
        const windImpact = { low: 0.95, medium: 0.8, high: 0.5, critical: 0.2 }[
          sensitivity.wind
        ];
        serviceScore *= windImpact;
      }

      totalScore += serviceScore;
    });

    return totalScore / services.length;
  }

  calculateOverallRisk(
    serviceImpacts: Record<string, ServiceWeatherImpact>,
  ): number {
    const impacts = Object.values(serviceImpacts);
    if (impacts.length === 0) return 0.3; // Default moderate risk

    const avgDelayRisk =
      impacts.reduce((sum, impact) => sum + impact.delayRisk, 0) /
      impacts.length;
    const avgProductivityLoss =
      impacts.reduce(
        (sum, impact) => sum + impact.impactFactors.productivityLoss,
        0,
      ) / impacts.length;
    const avgSafetyRisk =
      impacts.reduce(
        (sum, impact) => sum + impact.impactFactors.safetyRisk,
        0,
      ) / impacts.length;

    // Weight the different risk factors
    return Math.min(
      1,
      avgDelayRisk * 0.4 + avgProductivityLoss * 0.3 + avgSafetyRisk * 0.3,
    );
  }
}

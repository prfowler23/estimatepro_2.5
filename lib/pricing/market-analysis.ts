export interface PriceDistribution {
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
}

export interface Seasonality {
  currentMultiplier: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface CompetitorProfile {
  name: string;
  tier: 'budget' | 'standard' | 'premium' | 'luxury';
  marketShare: number;
  avgPricing: {
    multiplier: number;
    confidence: number;
  };
  strengths: string[];
  weaknesses: string[];
  typicalDiscount: number;
  responseTime?: number;
  serviceQuality?: number;
  insuranceCoverage?: string;
}

export interface MarketTrend {
  category: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // -100 to 100
  duration: 'short' | 'medium' | 'long';
  impact: 'low' | 'medium' | 'high';
}

export interface MarketAnalysis {
  location: string;
  services: string[];
  priceDistribution: PriceDistribution;
  demandLevel: number; // 0-100
  seasonality: Seasonality;
  competitors: CompetitorProfile[];
  trends: MarketTrend[];
  lastUpdated: Date;
  confidence: number; // 0-100
}

export interface RegionalFactors {
  costOfLiving: number;
  businessDensity: number;
  regulatoryComplexity: number;
  laborCosts: number;
  marketMaturity: 'emerging' | 'growing' | 'mature' | 'saturated';
}

export interface ServicePopularity {
  service: string;
  demandScore: number; // 0-100
  growthRate: number; // annual %
  seasonalVariation: number; // 0-1
}

export class MarketAnalysisService {
  private cache = new Map<string, MarketAnalysis>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async analyzeMarket(
    location: string,
    services: string[],
    projectSize: number
  ): Promise<MarketAnalysis> {
    const cacheKey = `${location}-${services.sort().join(',')}-${projectSize}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached;
    }

    // Get competitor data
    const competitors = await this.getCompetitorData(location, services);
    
    // Calculate price distribution
    const priceDistribution = this.calculatePriceDistribution(
      competitors,
      services,
      projectSize
    );
    
    // Assess current demand
    const demandLevel = await this.assessDemandLevel(location, services);
    
    // Analyze seasonality
    const seasonality = this.analyzeSeasonality(new Date(), services);
    
    // Identify market trends
    const trends = await this.identifyMarketTrends(location, services);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(competitors, demandLevel);

    const analysis: MarketAnalysis = {
      location,
      services,
      priceDistribution,
      demandLevel,
      seasonality,
      competitors,
      trends,
      lastUpdated: new Date(),
      confidence
    };

    this.cache.set(cacheKey, analysis);
    return analysis;
  }

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.CACHE_DURATION;
  }
  
  private async getCompetitorData(
    location: string,
    services: string[]
  ): Promise<CompetitorProfile[]> {
    // Mock competitor data - in production, this would connect to market intelligence APIs
    const regionalMultiplier = this.getRegionalMultiplier(location);
    
    const baseCompetitors: CompetitorProfile[] = [
      {
        name: 'Premium Building Services',
        tier: 'premium',
        marketShare: 25,
        avgPricing: { multiplier: 1.3 * regionalMultiplier, confidence: 0.8 },
        strengths: ['Quality certification', 'Insurance coverage', 'Reliability'],
        weaknesses: ['High pricing', 'Limited availability'],
        typicalDiscount: 5,
        responseTime: 24,
        serviceQuality: 95,
        insuranceCoverage: '$5M General + $2M Professional'
      },
      {
        name: 'City Wide Cleaning Solutions',
        tier: 'standard',
        marketShare: 35,
        avgPricing: { multiplier: 1.0 * regionalMultiplier, confidence: 0.9 },
        strengths: ['Competitive pricing', 'Quick response', 'Local presence'],
        weaknesses: ['Limited specialized services', 'Variable quality'],
        typicalDiscount: 10,
        responseTime: 12,
        serviceQuality: 85,
        insuranceCoverage: '$2M General'
      },
      {
        name: 'Budget Maintenance Co',
        tier: 'budget',
        marketShare: 20,
        avgPricing: { multiplier: 0.8 * regionalMultiplier, confidence: 0.7 },
        strengths: ['Low pricing', 'Flexible scheduling'],
        weaknesses: ['Quality concerns', 'Limited insurance', 'High turnover'],
        typicalDiscount: 15,
        responseTime: 48,
        serviceQuality: 70,
        insuranceCoverage: '$1M General'
      },
      {
        name: 'Elite Commercial Services',
        tier: 'luxury',
        marketShare: 10,
        avgPricing: { multiplier: 1.6 * regionalMultiplier, confidence: 0.75 },
        strengths: ['Premium quality', 'Specialized equipment', 'Certified technicians'],
        weaknesses: ['Very high pricing', 'Limited market'],
        typicalDiscount: 3,
        responseTime: 8,
        serviceQuality: 98,
        insuranceCoverage: '$10M General + $5M Professional'
      },
      {
        name: 'Regional Cleaning Network',
        tier: 'standard',
        marketShare: 10,
        avgPricing: { multiplier: 0.95 * regionalMultiplier, confidence: 0.85 },
        strengths: ['Regional coverage', 'Standardized processes'],
        weaknesses: ['Less personal service', 'Corporate bureaucracy'],
        typicalDiscount: 8,
        responseTime: 18,
        serviceQuality: 82,
        insuranceCoverage: '$3M General'
      }
    ];

    // Filter competitors based on services they actually offer
    return baseCompetitors.filter(competitor => 
      this.competitorOffersServices(competitor, services)
    );
  }

  private competitorOffersServices(competitor: CompetitorProfile, services: string[]): boolean {
    // Simulate service availability based on competitor tier
    const serviceAvailability = {
      budget: ['PW', 'WC'],
      standard: ['PW', 'WC', 'PWS', 'GR'],
      premium: ['PW', 'WC', 'PWS', 'GR', 'FR', 'HBW'],
      luxury: ['PW', 'WC', 'PWS', 'GR', 'FR', 'HBW', 'SWR', 'RESTO']
    };

    const availableServices = serviceAvailability[competitor.tier] || [];
    return services.some(service => availableServices.includes(service));
  }

  private getRegionalMultiplier(location: string): number {
    // Simulate regional pricing variations
    const locationMultipliers: Record<string, number> = {
      'new york': 1.4,
      'san francisco': 1.35,
      'los angeles': 1.25,
      'chicago': 1.15,
      'boston': 1.2,
      'seattle': 1.2,
      'miami': 1.1,
      'atlanta': 1.05,
      'dallas': 1.0,
      'denver': 1.0,
      'phoenix': 0.95,
      'kansas city': 0.9,
      'milwaukee': 0.9
    };

    const key = location.toLowerCase();
    return locationMultipliers[key] || 1.0;
  }
  
  private calculatePriceDistribution(
    competitors: CompetitorProfile[],
    services: string[],
    projectSize: number
  ): PriceDistribution {
    // Base prices per service (per square foot or linear foot)
    const basePrices: Record<string, number> = {
      'PW': 0.35,      // Pressure washing per sq ft
      'PWS': 1.30,     // Pressure washing with sealing per sq ft
      'WC': 3.00,      // Window cleaning per sq ft
      'GR': 20.00,     // Graffiti removal per sq ft
      'FR': 25.00,     // Full restoration per sq ft
      'HBW': 2.50,     // High building work per sq ft
      'SWR': 45.00,    // Stone/brick restoration per sq ft
      'RESTO': 60.00   // Full building restoration per sq ft
    };
    
    const totalBasePrice = services.reduce((sum, service) => 
      sum + ((basePrices[service] || 0) * projectSize), 0
    );
    
    // Apply competitor multipliers
    const competitorPrices = competitors.map(c => 
      totalBasePrice * c.avgPricing.multiplier
    );
    
    competitorPrices.sort((a, b) => a - b);
    
    if (competitorPrices.length === 0) {
      // Fallback if no competitors found
      return {
        min: totalBasePrice * 0.8,
        p25: totalBasePrice * 0.9,
        median: totalBasePrice,
        p75: totalBasePrice * 1.15,
        max: totalBasePrice * 1.4
      };
    }

    return {
      min: Math.max(competitorPrices[0] * 0.9, totalBasePrice * 0.7),
      p25: competitorPrices[Math.floor(competitorPrices.length * 0.25)] || competitorPrices[0],
      median: competitorPrices[Math.floor(competitorPrices.length * 0.5)] || competitorPrices[0],
      p75: competitorPrices[Math.floor(competitorPrices.length * 0.75)] || competitorPrices[competitorPrices.length - 1],
      max: Math.min(competitorPrices[competitorPrices.length - 1] * 1.1, totalBasePrice * 2.0)
    };
  }
  
  private async assessDemandLevel(
    location: string,
    services: string[]
  ): Promise<number> {
    // Factors affecting demand
    const factors = {
      seasonality: this.getSeasonalDemand(new Date(), services),
      marketGrowth: await this.getMarketGrowthRate(location),
      servicePopularity: this.getServicePopularity(services),
      economicIndicators: await this.getEconomicIndicators(location)
    };
    
    // Weighted average
    const weights = { 
      seasonality: 0.3, 
      marketGrowth: 0.2, 
      servicePopularity: 0.3, 
      economicIndicators: 0.2 
    };
    
    const demandScore = Object.entries(factors).reduce((score, [key, value]) => 
      score + value * weights[key as keyof typeof weights], 0
    );
    
    return Math.round(Math.max(10, Math.min(100, demandScore)));
  }

  private getSeasonalDemand(date: Date, services: string[]): number {
    const seasonality = this.analyzeSeasonality(date, services);
    return seasonality.currentMultiplier * 60; // Convert to 0-100 scale
  }

  private async getMarketGrowthRate(location: string): Promise<number> {
    // Simulate market growth data - would come from economic APIs
    const growthRates: Record<string, number> = {
      'new york': 75,
      'san francisco': 85,
      'austin': 90,
      'seattle': 80,
      'denver': 85,
      'atlanta': 70,
      'phoenix': 75,
      'miami': 65
    };

    return growthRates[location.toLowerCase()] || 70;
  }

  private getServicePopularity(services: string[]): number {
    const popularityScores: Record<string, number> = {
      'PW': 85,   // High demand
      'WC': 90,   // Very high demand
      'PWS': 70,  // Moderate demand
      'GR': 45,   // Lower demand, specialized
      'FR': 35,   // Low demand, specialized
      'HBW': 60,  // Moderate demand
      'SWR': 25,  // Very specialized
      'RESTO': 20 // Highly specialized
    };

    const scores = services.map(s => popularityScores[s] || 50);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private async getEconomicIndicators(location: string): Promise<number> {
    // Simulate economic health indicators
    const indicators: Record<string, number> = {
      'new york': 75,
      'san francisco': 80,
      'los angeles': 70,
      'chicago': 65,
      'houston': 75,
      'seattle': 85,
      'boston': 80,
      'atlanta': 70
    };

    return indicators[location.toLowerCase()] || 65;
  }
  
  private analyzeSeasonality(date: Date, services: string[]): Seasonality {
    const month = date.getMonth();
    
    // Service-specific seasonal patterns (monthly multipliers)
    const seasonalFactors: Record<string, number[]> = {
      'PW': [0.6, 0.7, 0.9, 1.1, 1.2, 1.3, 1.3, 1.2, 1.1, 1.0, 0.8, 0.6], // Peak in summer
      'PWS': [0.5, 0.6, 0.8, 1.2, 1.3, 1.4, 1.4, 1.3, 1.2, 0.9, 0.7, 0.5], // Peak in late spring/summer
      'WC': [0.9, 0.9, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 0.9], // Stable year-round
      'GR': [0.8, 0.8, 0.9, 1.1, 1.2, 1.2, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8], // Slight summer peak
      'FR': [0.8, 0.8, 0.9, 1.1, 1.2, 1.2, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8], // Similar to GR
      'HBW': [0.7, 0.7, 0.9, 1.1, 1.3, 1.4, 1.4, 1.3, 1.1, 0.9, 0.8, 0.7], // Strong summer preference
      'SWR': [0.6, 0.7, 0.9, 1.2, 1.3, 1.3, 1.3, 1.2, 1.1, 0.9, 0.8, 0.6], // Weather dependent
      'RESTO': [0.7, 0.8, 1.0, 1.2, 1.3, 1.3, 1.3, 1.2, 1.1, 1.0, 0.8, 0.7] // Similar to SWR
    };
    
    // Calculate average multiplier for selected services
    const multipliers = services.map(s => seasonalFactors[s]?.[month] || 1.0);
    const avgMultiplier = multipliers.reduce((a, b) => a + b, 0) / (multipliers.length || 1);
    
    // Determine trend by comparing with next month
    const nextMonth = (month + 1) % 12;
    const nextMultipliers = services.map(s => seasonalFactors[s]?.[nextMonth] || 1.0);
    const nextAvg = nextMultipliers.reduce((a, b) => a + b, 0) / (nextMultipliers.length || 1);
    
    const trend = Math.abs(nextAvg - avgMultiplier) < 0.05 ? 'stable' :
                  nextAvg > avgMultiplier ? 'increasing' : 'decreasing';
    
    return {
      currentMultiplier: avgMultiplier,
      trend
    };
  }

  private async identifyMarketTrends(location: string, services: string[]): Promise<MarketTrend[]> {
    const trends: MarketTrend[] = [];

    // Economic trends
    trends.push({
      category: 'Economic',
      direction: 'up',
      magnitude: 15,
      duration: 'medium',
      impact: 'medium'
    });

    // Environmental regulations
    if (services.some(s => ['PW', 'PWS', 'GR'].includes(s))) {
      trends.push({
        category: 'Regulatory',
        direction: 'up',
        magnitude: 25,
        duration: 'long',
        impact: 'high'
      });
    }

    // Technology adoption
    trends.push({
      category: 'Technology',
      direction: 'up',
      magnitude: 20,
      duration: 'long',
      impact: 'medium'
    });

    // Labor costs
    trends.push({
      category: 'Labor Costs',
      direction: 'up',
      magnitude: 12,
      duration: 'medium',
      impact: 'high'
    });

    return trends;
  }

  private calculateConfidence(competitors: CompetitorProfile[], demandLevel: number): number {
    let confidence = 70; // Base confidence

    // More competitors = higher confidence
    confidence += Math.min(20, competitors.length * 5);

    // Higher average competitor confidence = higher overall confidence
    const avgCompetitorConfidence = competitors.reduce((sum, c) => sum + c.avgPricing.confidence, 0) / (competitors.length || 1);
    confidence += avgCompetitorConfidence * 10;

    // Stable demand = higher confidence
    if (demandLevel > 60 && demandLevel < 80) {
      confidence += 10;
    }

    return Math.round(Math.max(50, Math.min(95, confidence)));
  }

  // Public utility methods
  public getCompetitorByTier(analysis: MarketAnalysis, tier: CompetitorProfile['tier']): CompetitorProfile[] {
    return analysis.competitors.filter(c => c.tier === tier);
  }

  public getPriceRecommendation(analysis: MarketAnalysis, strategy: 'aggressive' | 'competitive' | 'premium'): number {
    const { priceDistribution } = analysis;
    
    switch (strategy) {
      case 'aggressive':
        return priceDistribution.p25;
      case 'competitive':
        return priceDistribution.median;
      case 'premium':
        return priceDistribution.p75;
      default:
        return priceDistribution.median;
    }
  }

  public getMarketInsights(analysis: MarketAnalysis): string[] {
    const insights: string[] = [];

    // Demand insights
    if (analysis.demandLevel > 80) {
      insights.push('High market demand - pricing power available');
    } else if (analysis.demandLevel < 40) {
      insights.push('Low market demand - competitive pricing necessary');
    }

    // Seasonal insights
    if (analysis.seasonality.trend === 'increasing') {
      insights.push('Demand trending upward - consider seasonal premium');
    } else if (analysis.seasonality.trend === 'decreasing') {
      insights.push('Demand trending downward - may need to offer incentives');
    }

    // Competition insights
    const premiumCompetitors = analysis.competitors.filter(c => c.tier === 'premium').length;
    const budgetCompetitors = analysis.competitors.filter(c => c.tier === 'budget').length;

    if (premiumCompetitors > budgetCompetitors) {
      insights.push('Premium-focused market - quality differentiation important');
    } else if (budgetCompetitors > premiumCompetitors) {
      insights.push('Price-sensitive market - cost efficiency critical');
    }

    // Confidence insights
    if (analysis.confidence < 70) {
      insights.push('Limited market data - consider additional research');
    }

    return insights;
  }
}
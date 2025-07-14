export interface MarketAnalysis {
  priceDistribution: number[];
  demandLevel: number;
  seasonality: number;
  competitionDensity: number;
  averageMargin: number;
}

export interface CustomerProfile {
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  timeline: 'urgent' | 'normal' | 'flexible';
  budgetIndicators: 'tight' | 'moderate' | 'flexible' | 'premium';
  previousVendors: string[];
  priority: 'price' | 'quality' | 'speed' | 'relationship';
  paymentHistory?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ComplexityScore {
  technical: number; // 1-10
  access: number; // 1-10
  safety: number; // 1-10
  timeline: number; // 1-10
  coordination: number; // 1-10
  overall: number; // calculated weighted average
}

export interface CompetitorData {
  name: string;
  services: string[];
  averagePrice: number;
  winRate: number;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
}

export interface WinRateData {
  pricePoint: number;
  services: string[];
  winRate: number;
  customerType: string;
  projectSize: 'small' | 'medium' | 'large';
  margin: number;
}

export interface MarketPosition {
  percentile: number;
  competitiveness: number;
  recommendation: string;
  localFactors: string[];
}

export interface WillingnessScore {
  score: number; // 0-1
  factors: {
    companySize: number;
    urgency: number;
    quality: number;
    budget: number;
  };
  confidence: number;
}

export interface BundleOpportunity {
  applicable: boolean;
  name?: string;
  discount: number;
  value: number;
  expectedLift?: number;
}

export interface PricingAdjustment {
  reason: string;
  percentage: number;
  amount?: number;
}

export interface PricingStrategy {
  name: string;
  price: number;
  adjustments: PricingAdjustment[];
  pros: string[];
  cons: string[];
  confidence: number;
  winProbability?: number;
}

export interface PricingRecommendation {
  basePrice: number;
  recommendedPrice: number;
  adjustments: PricingAdjustment[];
  confidence: number;
  winProbability: number;
  alternativeStrategies: PricingStrategy[];
  insights: string[];
}

export interface PricingFactors {
  baseCost: number;
  margins: { equipment: number; materials: number; labor: number };
  marketData: MarketAnalysis;
  customerProfile: CustomerProfile;
  projectComplexity: ComplexityScore;
  competitorPricing: CompetitorData[];
  historicalWinRates: WinRateData[];
}

export class AIPricingEngine {
  async calculateOptimalPrice(
    factors: PricingFactors,
    services: string[],
    location: string
  ): Promise<PricingRecommendation> {
    // Base calculation with margins
    const markedUpCost = this.calculateMarkedUpCost(factors.baseCost, factors.margins);
    
    // Market position analysis
    const marketPosition = await this.analyzeMarketPosition(
      markedUpCost,
      factors.marketData,
      location
    );
    
    // Competitor analysis
    const competitorInsights = this.analyzeCompetitors(
      factors.competitorPricing,
      services,
      markedUpCost
    );
    
    // Customer willingness to pay
    const customerWTP = this.assessCustomerWillingness(
      factors.customerProfile,
      factors.marketData
    );
    
    // Risk adjustments
    const riskAdjustment = this.calculateRiskAdjustment(
      factors.projectComplexity,
      services
    );
    
    // Bundle optimization
    const bundleOpportunity = this.optimizeBundlePricing(
      services,
      markedUpCost,
      factors.historicalWinRates
    );
    
    // Calculate optimal price points
    const pricingStrategies = this.generatePricingStrategies(
      markedUpCost,
      marketPosition,
      customerWTP,
      riskAdjustment,
      bundleOpportunity
    );
    
    // Win probability for each strategy
    const strategiesWithProbability = pricingStrategies.map(strategy => ({
      ...strategy,
      winProbability: this.calculateWinProbability(
        strategy.price,
        factors.historicalWinRates,
        marketPosition,
        customerWTP
      )
    }));
    
    // Select optimal strategy
    const optimalStrategy = this.selectOptimalStrategy(
      strategiesWithProbability,
      factors.customerProfile.priority
    );
    
    return {
      basePrice: markedUpCost,
      recommendedPrice: optimalStrategy.price,
      adjustments: optimalStrategy.adjustments,
      confidence: optimalStrategy.confidence,
      winProbability: optimalStrategy.winProbability,
      alternativeStrategies: strategiesWithProbability.filter(s => s !== optimalStrategy),
      insights: this.generateInsights(
        optimalStrategy,
        marketPosition,
        competitorInsights,
        customerWTP
      )
    };
  }
  
  private calculateMarkedUpCost(baseCost: number, margins: any): number {
    // Apply weighted margins based on cost breakdown
    const weightedMargin = (margins.equipment * 0.3 + margins.materials * 0.2 + margins.labor * 0.5) / 100;
    return baseCost * (1 + weightedMargin);
  }
  
  private async analyzeMarketPosition(
    ourPrice: number,
    marketData: MarketAnalysis,
    location: string
  ): Promise<MarketPosition> {
    const percentile = this.calculatePercentile(ourPrice, marketData.priceDistribution);
    const competitiveness = this.assessCompetitiveness(percentile, marketData.demandLevel);
    
    return {
      percentile,
      competitiveness,
      recommendation: this.getMarketRecommendation(percentile, competitiveness),
      localFactors: this.getLocalMarketFactors(location)
    };
  }
  
  private calculatePercentile(price: number, distribution: number[]): number {
    const sorted = [...distribution].sort((a, b) => a - b);
    const index = sorted.findIndex(p => p >= price);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }
  
  private assessCompetitiveness(percentile: number, demandLevel: number): number {
    // Base competitiveness on percentile
    let competitiveness = 1.0;
    
    if (percentile < 25) competitiveness = 1.2; // Very competitive
    else if (percentile < 50) competitiveness = 1.1; // Competitive
    else if (percentile > 75) competitiveness = 0.9; // Premium
    
    // Adjust for demand
    if (demandLevel > 80) competitiveness *= 1.05; // High demand allows higher prices
    else if (demandLevel < 40) competitiveness *= 0.95; // Low demand requires lower prices
    
    return competitiveness;
  }
  
  private getMarketRecommendation(percentile: number, competitiveness: number): string {
    if (percentile < 25) return 'Highly competitive pricing - consider value-adds';
    if (percentile < 50) return 'Competitive pricing - good market position';
    if (percentile < 75) return 'Above market - ensure value justification';
    return 'Premium pricing - requires strong differentiation';
  }
  
  private getLocalMarketFactors(location: string): string[] {
    // Simulate location-based factors
    const factors = [
      'High-rise buildings common in area',
      'Strong commercial district',
      'Competitive market with 5+ providers',
      'Quality-focused customer base',
      'Seasonal demand variations'
    ];
    
    return factors.slice(0, 3); // Return subset for brevity
  }
  
  private analyzeCompetitors(
    competitors: CompetitorData[],
    services: string[],
    ourPrice: number
  ): any {
    const relevantCompetitors = competitors.filter(comp =>
      services.some(service => comp.services.includes(service))
    );
    
    const avgCompetitorPrice = relevantCompetitors.length > 0
      ? relevantCompetitors.reduce((sum, comp) => sum + comp.averagePrice, 0) / relevantCompetitors.length
      : ourPrice;
    
    const pricePosition = ourPrice / avgCompetitorPrice;
    
    return {
      averagePrice: avgCompetitorPrice,
      pricePosition,
      strongestCompetitor: relevantCompetitors.sort((a, b) => b.marketShare - a.marketShare)[0],
      insights: this.generateCompetitorInsights(relevantCompetitors, pricePosition)
    };
  }
  
  private generateCompetitorInsights(competitors: CompetitorData[], pricePosition: number): string[] {
    const insights = [];
    
    if (pricePosition > 1.2) {
      insights.push('Pricing significantly above competitors - ensure strong value proposition');
    } else if (pricePosition < 0.8) {
      insights.push('Aggressive pricing strategy - monitor profitability');
    } else {
      insights.push('Competitive pricing aligned with market');
    }
    
    if (competitors.length > 3) {
      insights.push('Highly competitive market - differentiation critical');
    }
    
    return insights;
  }
  
  private assessCustomerWillingness(
    profile: CustomerProfile,
    marketData: MarketAnalysis
  ): WillingnessScore {
    const factors = {
      companySize: this.scoreCompanySize(profile.companySize),
      urgency: this.scoreUrgency(profile.timeline),
      quality: this.scoreQualityExpectation(profile.previousVendors),
      budget: this.scoreBudgetFlexibility(profile.budgetIndicators)
    };
    
    const baseWillingness = Object.values(factors).reduce((sum, score) => sum + score, 0) / 4;
    
    // Adjust for market conditions
    const marketAdjustment = marketData.demandLevel > 70 ? 1.1 : 
                           marketData.demandLevel < 30 ? 0.9 : 1.0;
    
    return {
      score: Math.min(1.0, baseWillingness * marketAdjustment),
      factors,
      confidence: this.calculateConfidence(profile)
    };
  }
  
  private scoreCompanySize(size: string): number {
    const scores = { small: 0.3, medium: 0.6, large: 0.8, enterprise: 0.9 };
    return scores[size as keyof typeof scores] || 0.5;
  }
  
  private scoreUrgency(timeline: string): number {
    const scores = { urgent: 0.9, normal: 0.6, flexible: 0.4 };
    return scores[timeline as keyof typeof scores] || 0.6;
  }
  
  private scoreQualityExpectation(previousVendors: string[]): number {
    // Higher quality expectations if they've used premium vendors
    const premiumVendors = ['ServiceMaster', 'ABM', 'Aramark'];
    const hasPremium = previousVendors.some(vendor => 
      premiumVendors.some(premium => vendor.toLowerCase().includes(premium.toLowerCase()))
    );
    return hasPremium ? 0.8 : 0.5;
  }
  
  private scoreBudgetFlexibility(budget: string): number {
    const scores = { tight: 0.2, moderate: 0.5, flexible: 0.7, premium: 0.9 };
    return scores[budget as keyof typeof scores] || 0.5;
  }
  
  private calculateConfidence(profile: CustomerProfile): number {
    let confidence = 70;
    
    // Increase confidence with more data points
    if (profile.paymentHistory) confidence += 10;
    if (profile.previousVendors.length > 0) confidence += 10;
    
    // Adjust for profile consistency
    if (profile.priority === 'price' && profile.budgetIndicators === 'tight') confidence += 10;
    if (profile.priority === 'quality' && profile.budgetIndicators === 'premium') confidence += 10;
    
    return Math.min(95, confidence);
  }
  
  private calculateRiskAdjustment(complexity: ComplexityScore, services: string[]): number {
    let adjustment = 1.0;
    
    // Base adjustment on complexity
    const complexityFactor = complexity.overall / 10;
    adjustment += complexityFactor * 0.2; // Up to 20% for high complexity
    
    // Service-specific risks
    const highRiskServices = ['HBW', 'GR', 'FR', 'SWR'];
    const riskServiceCount = services.filter(s => highRiskServices.includes(s)).length;
    adjustment += riskServiceCount * 0.05; // 5% per high-risk service
    
    return Math.min(1.5, adjustment); // Cap at 50% increase
  }
  
  private optimizeBundlePricing(
    services: string[],
    basePrice: number,
    historicalData: WinRateData[]
  ): BundleOpportunity {
    // Check for common bundles
    const bundles = [
      { services: ['PW', 'WC'], discount: 5, name: 'Basic Clean' },
      { services: ['PWS', 'GR', 'FR'], discount: 10, name: 'Full Restoration' },
      { services: ['PW', 'WC', 'GR', 'FR'], discount: 12, name: 'Complete Package' },
      { services: ['WC', 'PWS', 'HBW'], discount: 8, name: 'Premium Exterior' }
    ];
    
    const applicableBundles = bundles.filter(bundle => 
      bundle.services.every(s => services.includes(s))
    );
    
    if (applicableBundles.length === 0) {
      return { applicable: false, discount: 0, value: 0 };
    }
    
    // Select best bundle
    const bestBundle = applicableBundles.reduce((best, current) => 
      current.discount > best.discount ? current : best
    );
    
    // Validate bundle performance
    const bundleWinRate = this.getBundleWinRate(bestBundle.services, historicalData);
    const adjustedDiscount = bundleWinRate > 0.7 ? bestBundle.discount * 0.8 : bestBundle.discount;
    
    return {
      applicable: true,
      name: bestBundle.name,
      discount: adjustedDiscount,
      value: basePrice * (adjustedDiscount / 100),
      expectedLift: bundleWinRate * 1.2 // Bundle typically increases win rate
    };
  }
  
  private getBundleWinRate(services: string[], historicalData: WinRateData[]): number {
    const bundleData = historicalData.filter(data =>
      services.every(service => data.services.includes(service))
    );
    
    if (bundleData.length === 0) return 0.6; // Default assumption
    
    return bundleData.reduce((sum, data) => sum + data.winRate, 0) / bundleData.length;
  }
  
  private generatePricingStrategies(
    basePrice: number,
    marketPosition: MarketPosition,
    customerWTP: WillingnessScore,
    riskAdjustment: number,
    bundleOpportunity: BundleOpportunity
  ): PricingStrategy[] {
    const strategies: PricingStrategy[] = [];
    
    // 1. Value-based pricing
    strategies.push({
      name: 'Value Optimized',
      price: basePrice * (1 + (customerWTP.score - 0.5) * 0.4) * riskAdjustment,
      adjustments: [
        { reason: 'Customer value perception', percentage: (customerWTP.score - 0.5) * 40 },
        { reason: 'Project risk factors', percentage: (riskAdjustment - 1) * 100 }
      ],
      pros: ['Maximizes profit on high-value customers', 'Reflects true project value'],
      cons: ['May lose price-sensitive customers', 'Higher price point'],
      confidence: customerWTP.confidence
    });
    
    // 2. Competitive pricing
    strategies.push({
      name: 'Market Competitive',
      price: basePrice * marketPosition.competitiveness,
      adjustments: [
        { reason: 'Market positioning', percentage: (marketPosition.competitiveness - 1) * 100 }
      ],
      pros: ['Competitive with market', 'Balanced approach'],
      cons: ['May leave money on table', 'Less differentiation'],
      confidence: 85
    });
    
    // 3. Penetration pricing (if new market)
    if (marketPosition.percentile > 60) {
      strategies.push({
        name: 'Market Penetration',
        price: basePrice * 0.85,
        adjustments: [
          { reason: 'Penetration discount', percentage: -15 }
        ],
        pros: ['Increases win probability', 'Builds market share'],
        cons: ['Lower margins', 'Sets price expectations'],
        confidence: 70
      });
    }
    
    // 4. Bundle pricing (if applicable)
    if (bundleOpportunity.applicable) {
      strategies.push({
        name: 'Bundle Discount',
        price: basePrice * (1 - bundleOpportunity.discount / 100),
        adjustments: [
          { reason: `${bundleOpportunity.name} bundle`, percentage: -bundleOpportunity.discount }
        ],
        pros: ['Encourages larger projects', 'Increases customer value'],
        cons: ['Lower per-service margin', 'Requires all services'],
        confidence: 90
      });
    }
    
    return strategies;
  }
  
  private calculateWinProbability(
    price: number,
    historicalData: WinRateData[],
    marketPosition: MarketPosition,
    customerWTP: WillingnessScore
  ): number {
    // Base probability from historical data
    const historicalWinRate = this.getHistoricalWinRate(price, historicalData);
    
    // Adjust for market conditions
    const marketAdjustment = marketPosition.percentile < 40 ? 1.2 :
                           marketPosition.percentile > 70 ? 0.8 : 1.0;
    
    // Adjust for customer profile
    const customerAdjustment = customerWTP.score > 0.7 ? 1.1 :
                             customerWTP.score < 0.3 ? 0.9 : 1.0;
    
    // Calculate final probability
    const probability = historicalWinRate * marketAdjustment * customerAdjustment;
    
    // Ensure within bounds
    return Math.max(0.1, Math.min(0.95, probability));
  }
  
  private getHistoricalWinRate(price: number, historicalData: WinRateData[]): number {
    if (historicalData.length === 0) return 0.6; // Default assumption
    
    // Find similar price points
    const sortedData = [...historicalData].sort((a, b) => Math.abs(a.pricePoint - price) - Math.abs(b.pricePoint - price));
    const relevantData = sortedData.slice(0, Math.min(5, sortedData.length));
    
    // Weight by proximity
    let totalWeight = 0;
    let weightedWinRate = 0;
    
    relevantData.forEach(data => {
      const distance = Math.abs(data.pricePoint - price) / price;
      const weight = Math.max(0.1, 1 - distance);
      weightedWinRate += data.winRate * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedWinRate / totalWeight : 0.6;
  }
  
  private selectOptimalStrategy(
    strategies: PricingStrategy[],
    priority: string
  ): PricingStrategy {
    switch (priority) {
      case 'price':
        // Select strategy with highest win probability
        return strategies.reduce((best, current) => 
          (current.winProbability || 0) > (best.winProbability || 0) ? current : best
        );
      
      case 'quality':
        // Select strategy with highest price (assumes quality correlation)
        return strategies.reduce((best, current) => 
          current.price > best.price ? current : best
        );
      
      case 'speed':
        // Select most confident strategy
        return strategies.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
      
      default:
        // Balance profit and win probability
        return strategies.reduce((best, current) => {
          const currentScore = current.price * (current.winProbability || 0.5);
          const bestScore = best.price * (best.winProbability || 0.5);
          return currentScore > bestScore ? current : best;
        });
    }
  }
  
  private generateInsights(
    strategy: PricingStrategy,
    marketPosition: MarketPosition,
    competitorInsights: any,
    customerWTP: WillingnessScore
  ): string[] {
    const insights = [];
    
    // Strategy-specific insights
    if (strategy.name === 'Value Optimized' && customerWTP.score > 0.7) {
      insights.push('Customer shows high willingness to pay - value strategy well-suited');
    }
    
    if (marketPosition.percentile > 75) {
      insights.push('Premium positioning requires strong value demonstration');
    }
    
    if (strategy.winProbability && strategy.winProbability > 0.8) {
      insights.push('High win probability - pricing is well-calibrated for this customer');
    }
    
    // Add market insights
    insights.push(marketPosition.recommendation);
    
    // Add competitive insights
    if (competitorInsights.insights) {
      insights.push(...competitorInsights.insights);
    }
    
    return insights.slice(0, 5); // Limit to most important insights
  }
}
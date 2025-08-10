/**
 * Pricing Strategies Implementation
 * Uses Strategy Pattern for flexible pricing calculations
 */

import {
  PricingInput,
  PricingAdjustment,
  ServicePricingBreakdown,
  RealTimePricingResult,
  ConfidenceLevel,
  CustomerProfile,
  ComplexityScore,
  MarketAnalysisData,
  PricingStrategy as IPricingStrategy,
  PricingCondition,
} from "./types";
import { ServiceType } from "@/lib/types/estimate-types";
import { ServiceTypeCode } from "@/components/calculator/types";
import {
  roundToCents,
  calculateMarkup,
  calculateTax,
} from "@/lib/utils/currency";

/**
 * Abstract base class for pricing strategies
 */
export abstract class PricingStrategy {
  protected name: string;
  protected description: string;
  protected priority: number;

  constructor(name: string, description: string, priority: number = 0) {
    this.name = name;
    this.description = description;
    this.priority = priority;
  }

  /**
   * Calculate pricing using this strategy
   */
  abstract calculate(
    input: PricingInput,
    context?: PricingContext,
  ): ServicePricingBreakdown;

  /**
   * Check if this strategy is applicable
   */
  abstract isApplicable(input: PricingInput, context?: PricingContext): boolean;

  /**
   * Get strategy confidence level
   */
  abstract getConfidence(
    input: PricingInput,
    context?: PricingContext,
  ): ConfidenceLevel;

  /**
   * Get strategy adjustments
   */
  protected getBaseAdjustments(
    input: PricingInput,
    context?: PricingContext,
  ): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = [];

    // Height adjustment
    if (input.height && input.height > 30) {
      const heightMultiplier = Math.min((input.height - 30) / 100, 0.5);
      adjustments.push({
        type: "risk",
        description: "Height premium",
        value: heightMultiplier * 100,
        isPercentage: true,
        appliedTo: "total",
        reason: `Building height ${input.height}ft requires special equipment`,
      });
    }

    // Urgency adjustment
    if (input.urgency === "urgent") {
      adjustments.push({
        type: "duration",
        description: "Rush service",
        value: 25,
        isPercentage: true,
        appliedTo: "total",
        reason: "Urgent timeline requires priority scheduling",
      });
    }

    // Seasonal adjustment
    if (input.seasonalFactor && input.seasonalFactor !== 1) {
      const seasonalAdjustment = (input.seasonalFactor - 1) * 100;
      adjustments.push({
        type: "seasonal",
        description: seasonalAdjustment > 0 ? "Peak season" : "Off-season",
        value: seasonalAdjustment,
        isPercentage: true,
        appliedTo: "total",
        reason: "Seasonal demand adjustment",
      });
    }

    return adjustments;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPriority(): number {
    return this.priority;
  }
}

/**
 * Pricing context for strategy calculations
 */
export interface PricingContext {
  customerProfile?: CustomerProfile;
  marketAnalysis?: MarketAnalysisData;
  complexityScore?: ComplexityScore;
  historicalData?: any;
  competitorPricing?: number;
}

/**
 * Standard hourly rate pricing strategy
 */
export class HourlyRatePricingStrategy extends PricingStrategy {
  private baseHourlyRate: number;
  private rateTable: Map<ServiceType, number>;

  constructor(baseHourlyRate: number = 75) {
    super("Hourly Rate", "Standard hourly rate pricing", 1);
    this.baseHourlyRate = baseHourlyRate;
    this.rateTable = new Map([
      ["WC" as ServiceType, 85],
      ["PW" as ServiceType, 75],
      ["PWS" as ServiceType, 95],
      ["GR" as ServiceType, 120],
      ["FR" as ServiceType, 150],
      ["HBW" as ServiceType, 110],
    ]);
  }

  calculate(
    input: PricingInput,
    context?: PricingContext,
  ): ServicePricingBreakdown {
    const hourlyRate =
      this.rateTable.get(input.serviceType) || this.baseHourlyRate;

    // Estimate hours based on area and complexity
    const baseHours = this.estimateHours(input);
    const adjustments = this.getBaseAdjustments(input, context);

    // Calculate costs
    const laborCost = roundToCents(baseHours * hourlyRate);
    const materialCost = this.estimateMaterialCost(input);
    const equipmentCost = this.estimateEquipmentCost(input);

    const basePrice = laborCost + materialCost + equipmentCost;
    let adjustedPrice = basePrice;

    // Apply adjustments
    for (const adjustment of adjustments) {
      if (adjustment.isPercentage) {
        adjustedPrice += basePrice * (adjustment.value / 100);
      } else {
        adjustedPrice += adjustment.value;
      }
    }

    return {
      serviceType: input.serviceType,
      serviceName: this.getServiceName(input.serviceType),
      basePrice: roundToCents(basePrice),
      adjustedPrice: roundToCents(adjustedPrice),
      hours: baseHours,
      area: input.area,
      laborCost,
      materialCost,
      equipmentCost,
      confidence: this.getConfidence(input, context),
      adjustments,
    };
  }

  isApplicable(input: PricingInput, context?: PricingContext): boolean {
    // Hourly rate is always applicable as fallback
    return true;
  }

  getConfidence(
    input: PricingInput,
    context?: PricingContext,
  ): ConfidenceLevel {
    if (input.area > 0 && input.complexity !== undefined) {
      return "high";
    }
    if (input.area > 0) {
      return "medium";
    }
    return "low";
  }

  private estimateHours(input: PricingInput): number {
    // Base hours per 1000 sq ft
    const baseHoursPer1000SqFt: Record<string, number> = {
      WC: 4,
      PW: 3,
      PWS: 5,
      GR: 8,
      FR: 12,
      HBW: 6,
    };

    const baseRate = baseHoursPer1000SqFt[input.serviceType] || 4;
    let hours = (input.area / 1000) * baseRate;

    // Adjust for complexity
    if (input.complexity) {
      hours *= 1 + (input.complexity - 5) / 10;
    }

    // Adjust for access type
    if (input.accessType === "rope") {
      hours *= 1.5;
    } else if (input.accessType === "scaffold") {
      hours *= 1.3;
    } else if (input.accessType === "lift") {
      hours *= 1.2;
    }

    return Math.max(1, roundToCents(hours));
  }

  private estimateMaterialCost(input: PricingInput): number {
    // Material cost per 1000 sq ft
    const materialCostPer1000SqFt: Record<string, number> = {
      WC: 20,
      PW: 30,
      PWS: 80,
      GR: 150,
      FR: 200,
      HBW: 40,
    };

    const baseCost = materialCostPer1000SqFt[input.serviceType] || 30;
    return roundToCents((input.area / 1000) * baseCost);
  }

  private estimateEquipmentCost(input: PricingInput): number {
    // Equipment rental cost
    let cost = 0;

    if (input.accessType === "lift") {
      cost += 500; // Daily rental
    } else if (input.accessType === "scaffold") {
      cost += 800; // Setup and rental
    } else if (input.accessType === "rope") {
      cost += 300; // Specialized equipment
    }

    // Add service-specific equipment
    if (
      input.serviceType === ServiceTypeCode.PRESSURE_WASHING ||
      input.serviceType === ServiceTypeCode.PRESSURE_WASH_SEAL
    ) {
      cost += 100; // Pressure washer rental
    }

    return roundToCents(cost);
  }

  private getServiceName(serviceType: ServiceType): string {
    const names: Record<string, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      PWS: "Pressure Washing & Sealing",
      GR: "Graffiti Removal",
      FR: "Facade Restoration",
      HBW: "High Building Work",
    };
    return names[serviceType] || serviceType;
  }
}

/**
 * Square footage pricing strategy
 */
export class SquareFootPricingStrategy extends PricingStrategy {
  private pricePerSqFt: Map<ServiceType, number>;

  constructor() {
    super("Square Foot", "Price per square foot calculation", 2);
    this.pricePerSqFt = new Map([
      ["WC" as ServiceType, 2.5],
      ["PW" as ServiceType, 0.45],
      ["PWS" as ServiceType, 1.2],
      ["GR" as ServiceType, 15],
      ["FR" as ServiceType, 25],
      ["HBW" as ServiceType, 3.5],
    ]);
  }

  calculate(
    input: PricingInput,
    context?: PricingContext,
  ): ServicePricingBreakdown {
    const basePricePerSqFt = this.pricePerSqFt.get(input.serviceType) || 1;
    const basePrice = roundToCents(input.area * basePricePerSqFt);

    // Estimate breakdown
    const laborCost = roundToCents(basePrice * 0.5);
    const materialCost = roundToCents(basePrice * 0.3);
    const equipmentCost = roundToCents(basePrice * 0.2);

    const adjustments = this.getBaseAdjustments(input, context);
    let adjustedPrice = basePrice;

    // Apply adjustments
    for (const adjustment of adjustments) {
      if (adjustment.isPercentage) {
        adjustedPrice += basePrice * (adjustment.value / 100);
      } else {
        adjustedPrice += adjustment.value;
      }
    }

    // Estimate hours based on price and typical hourly rate
    const hours = Math.max(1, roundToCents(laborCost / 75));

    return {
      serviceType: input.serviceType,
      serviceName: this.getServiceName(input.serviceType),
      basePrice,
      adjustedPrice: roundToCents(adjustedPrice),
      hours,
      area: input.area,
      laborCost,
      materialCost,
      equipmentCost,
      confidence: this.getConfidence(input, context),
      adjustments,
    };
  }

  isApplicable(input: PricingInput, context?: PricingContext): boolean {
    // Square foot pricing is applicable when we have area
    return input.area > 0;
  }

  getConfidence(
    input: PricingInput,
    context?: PricingContext,
  ): ConfidenceLevel {
    if (input.area > 100 && context?.marketAnalysis) {
      return "high";
    }
    if (input.area > 0) {
      return "medium";
    }
    return "low";
  }

  private getServiceName(serviceType: ServiceType): string {
    const names: Record<string, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      PWS: "Pressure Washing & Sealing",
      GR: "Graffiti Removal",
      FR: "Facade Restoration",
      HBW: "High Building Work",
    };
    return names[serviceType] || serviceType;
  }
}

/**
 * Market-based pricing strategy
 */
export class MarketBasedPricingStrategy extends PricingStrategy {
  constructor() {
    super("Market-Based", "Pricing based on market analysis", 3);
  }

  calculate(
    input: PricingInput,
    context?: PricingContext,
  ): ServicePricingBreakdown {
    if (!context?.marketAnalysis) {
      // Fallback to hourly rate if no market data
      const hourlyStrategy = new HourlyRatePricingStrategy();
      return hourlyStrategy.calculate(input, context);
    }

    const market = context.marketAnalysis;
    const basePrice = this.calculateMarketPrice(input, market);

    // Estimate cost breakdown
    const laborCost = roundToCents(basePrice * 0.45);
    const materialCost = roundToCents(basePrice * 0.25);
    const equipmentCost = roundToCents(basePrice * 0.15);

    const adjustments = this.getMarketAdjustments(input, context);
    let adjustedPrice = basePrice;

    // Apply adjustments
    for (const adjustment of adjustments) {
      if (adjustment.isPercentage) {
        adjustedPrice += basePrice * (adjustment.value / 100);
      } else {
        adjustedPrice += adjustment.value;
      }
    }

    // Estimate hours
    const hours = Math.max(1, roundToCents(laborCost / 85));

    return {
      serviceType: input.serviceType,
      serviceName: this.getServiceName(input.serviceType),
      basePrice,
      adjustedPrice: roundToCents(adjustedPrice),
      hours,
      area: input.area,
      laborCost,
      materialCost,
      equipmentCost,
      confidence: this.getConfidence(input, context),
      adjustments,
    };
  }

  isApplicable(input: PricingInput, context?: PricingContext): boolean {
    return context?.marketAnalysis !== undefined;
  }

  getConfidence(
    input: PricingInput,
    context?: PricingContext,
  ): ConfidenceLevel {
    if (!context?.marketAnalysis) return "low";

    const marketConfidence = context.marketAnalysis.confidence;
    if (marketConfidence > 80) return "high";
    if (marketConfidence > 60) return "medium";
    return "low";
  }

  private calculateMarketPrice(
    input: PricingInput,
    market: MarketAnalysisData,
  ): number {
    // Use market median as base
    let price = market.priceDistribution.median;

    // Adjust for service type if in the list
    const serviceIndex = market.services.indexOf(input.serviceType);
    if (serviceIndex >= 0) {
      // Weight by service position in list (assumes ordered by commonality)
      const weight = 1 - serviceIndex * 0.1;
      price *= weight;
    }

    // Adjust for demand level
    const demandMultiplier = 0.8 + (market.demandLevel / 100) * 0.4;
    price *= demandMultiplier;

    return roundToCents(price);
  }

  private getMarketAdjustments(
    input: PricingInput,
    context: PricingContext,
  ): PricingAdjustment[] {
    const adjustments = this.getBaseAdjustments(input, context);

    if (context.marketAnalysis) {
      const market = context.marketAnalysis;

      // Competition adjustment
      if (market.competitorData.length > 5) {
        adjustments.push({
          type: "discount",
          description: "Competitive market",
          value: -5,
          isPercentage: true,
          appliedTo: "total",
          reason: "High competition requires competitive pricing",
        });
      }

      // Demand adjustment
      if (market.demandLevel > 80) {
        adjustments.push({
          type: "markup",
          description: "High demand premium",
          value: 10,
          isPercentage: true,
          appliedTo: "total",
          reason: "Market demand supports premium pricing",
        });
      }
    }

    return adjustments;
  }

  private getServiceName(serviceType: ServiceType): string {
    const names: Record<string, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      PWS: "Pressure Washing & Sealing",
      GR: "Graffiti Removal",
      FR: "Facade Restoration",
      HBW: "High Building Work",
    };
    return names[serviceType] || serviceType;
  }
}

/**
 * Value-based pricing strategy
 */
export class ValueBasedPricingStrategy extends PricingStrategy {
  constructor() {
    super("Value-Based", "Pricing based on customer value perception", 4);
  }

  calculate(
    input: PricingInput,
    context?: PricingContext,
  ): ServicePricingBreakdown {
    // Start with a base calculation
    const hourlyStrategy = new HourlyRatePricingStrategy();
    const baseResult = hourlyStrategy.calculate(input, context);

    if (!context?.customerProfile) {
      return baseResult;
    }

    // Calculate value multiplier
    const valueMultiplier = this.calculateValueMultiplier(
      context.customerProfile,
    );

    // Adjust pricing based on value
    const adjustedPrice = roundToCents(baseResult.basePrice * valueMultiplier);

    // Add value adjustment
    const adjustments = [...baseResult.adjustments];
    adjustments.push({
      type: "markup",
      description: "Value-based pricing",
      value: (valueMultiplier - 1) * 100,
      isPercentage: true,
      appliedTo: "total",
      reason: this.getValueReason(context.customerProfile),
    });

    return {
      ...baseResult,
      adjustedPrice,
      adjustments,
      confidence: this.getConfidence(input, context),
    };
  }

  isApplicable(input: PricingInput, context?: PricingContext): boolean {
    return context?.customerProfile !== undefined;
  }

  getConfidence(
    input: PricingInput,
    context?: PricingContext,
  ): ConfidenceLevel {
    if (!context?.customerProfile) return "low";

    const profile = context.customerProfile;
    if (profile.paymentHistory && profile.lifetimeValue) {
      return "high";
    }
    if (profile.companySize && profile.budgetIndicators) {
      return "medium";
    }
    return "low";
  }

  private calculateValueMultiplier(profile: CustomerProfile): number {
    let multiplier = 1.0;

    // Company size factor
    const sizeMultipliers = {
      small: 0.9,
      medium: 1.0,
      large: 1.15,
      enterprise: 1.3,
    };
    multiplier *= sizeMultipliers[profile.companySize];

    // Budget flexibility factor
    const budgetMultipliers = {
      tight: 0.85,
      moderate: 1.0,
      flexible: 1.1,
      premium: 1.25,
    };
    multiplier *= budgetMultipliers[profile.budgetIndicators];

    // Priority factor
    if (profile.priority === "quality") {
      multiplier *= 1.15;
    } else if (profile.priority === "speed") {
      multiplier *= 1.1;
    } else if (profile.priority === "price") {
      multiplier *= 0.95;
    }

    // Loyalty factor
    if (profile.loyaltyScore && profile.loyaltyScore > 80) {
      multiplier *= 0.95; // Loyalty discount
    }

    return Math.max(0.7, Math.min(1.5, multiplier));
  }

  private getValueReason(profile: CustomerProfile): string {
    const reasons = [];

    if (profile.companySize === "enterprise") {
      reasons.push("Enterprise client");
    }
    if (profile.budgetIndicators === "premium") {
      reasons.push("Premium service expectations");
    }
    if (profile.priority === "quality") {
      reasons.push("Quality-focused requirements");
    }
    if (profile.loyaltyScore && profile.loyaltyScore > 80) {
      reasons.push("Loyalty discount applied");
    }

    return reasons.join(", ") || "Customer value assessment";
  }
}

/**
 * Pricing strategy manager
 */
export class PricingStrategyManager {
  private strategies: Map<string, PricingStrategy>;
  private defaultStrategy: PricingStrategy;

  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = new HourlyRatePricingStrategy();

    // Register default strategies
    this.registerStrategy("hourly", new HourlyRatePricingStrategy());
    this.registerStrategy("square-foot", new SquareFootPricingStrategy());
    this.registerStrategy("market-based", new MarketBasedPricingStrategy());
    this.registerStrategy("value-based", new ValueBasedPricingStrategy());
  }

  /**
   * Register a pricing strategy
   */
  registerStrategy(id: string, strategy: PricingStrategy): void {
    this.strategies.set(id, strategy);
  }

  /**
   * Get a specific strategy
   */
  getStrategy(id: string): PricingStrategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Select best strategy for input
   */
  selectStrategy(
    input: PricingInput,
    context?: PricingContext,
    preferredStrategyId?: string,
  ): PricingStrategy {
    // Use preferred strategy if specified and applicable
    if (preferredStrategyId) {
      const preferred = this.strategies.get(preferredStrategyId);
      if (preferred && preferred.isApplicable(input, context)) {
        return preferred;
      }
    }

    // Find applicable strategies sorted by priority
    const applicable = Array.from(this.strategies.values())
      .filter((strategy) => strategy.isApplicable(input, context))
      .sort((a, b) => b.getPriority() - a.getPriority());

    return applicable[0] || this.defaultStrategy;
  }

  /**
   * Calculate pricing using best strategy
   */
  calculatePricing(
    input: PricingInput,
    context?: PricingContext,
    preferredStrategyId?: string,
  ): ServicePricingBreakdown {
    const strategy = this.selectStrategy(input, context, preferredStrategyId);
    return strategy.calculate(input, context);
  }

  /**
   * Calculate pricing using multiple strategies for comparison
   */
  calculateMultipleStrategies(
    input: PricingInput,
    context?: PricingContext,
  ): Map<string, ServicePricingBreakdown> {
    const results = new Map<string, ServicePricingBreakdown>();

    Array.from(this.strategies.entries()).forEach(([id, strategy]) => {
      if (strategy.isApplicable(input, context)) {
        results.set(id, strategy.calculate(input, context));
      }
    });

    return results;
  }
}

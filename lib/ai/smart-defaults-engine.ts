// AI-Powered Smart Defaults and Suggestions Engine
// Provides intelligent field pre-population and context-aware suggestions

import { GuidedFlowData } from "@/lib/types/estimate-types";
import { getAIConfig } from "./ai-config";
import { callAIEndpoint } from "./client-utils";

export interface SmartDefault {
  field: string;
  value: any;
  confidence: number; // 0-1
  reasoning: string;
  source: "ai" | "historical" | "template" | "rules";
}

export interface SmartSuggestion {
  id: string;
  type:
    | "field-value"
    | "service-addition"
    | "pricing-adjustment"
    | "risk-mitigation"
    | "optimization";
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number;
  suggestedValue?: any;
  targetField?: string;
  reasoning: string;
  actionType: "auto-apply" | "user-confirm" | "informational";
}

export interface ContextualHelp {
  field: string;
  helpText: string;
  examples: string[];
  commonMistakes: string[];
  bestPractices: string[];
}

export interface PredictiveInput {
  field: string;
  predictions: Array<{
    value: string;
    probability: number;
    description?: string;
  }>;
  isLoading: boolean;
}

export interface SmartDefaultsContext {
  flowData: GuidedFlowData;
  currentStep: number;
  userProfile?: {
    experienceLevel: "novice" | "intermediate" | "expert";
    role: string;
    preferences: Record<string, any>;
  };
  historicalData?: any[];
  marketData?: any;
  buildingAnalysis?: any;
}

export class SmartDefaultsEngine {
  private static cache = new Map<string, any>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Generate smart defaults for a specific step
  static async generateSmartDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const cacheKey = `defaults-${context.currentStep}-${JSON.stringify(context.flowData).slice(0, 100)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const defaults: SmartDefault[] = [];

    try {
      // Step-specific defaults
      switch (context.currentStep) {
        case 1: // Initial Contact
          defaults.push(...(await this.generateContactDefaults(context)));
          break;
        case 2: // Scope Details
          defaults.push(...(await this.generateScopeDefaults(context)));
          break;
        case 3: // Files/Photos
          defaults.push(...(await this.generatePhotoDefaults(context)));
          break;
        case 4: // Area of Work
          defaults.push(...(await this.generateAreaDefaults(context)));
          break;
        case 5: // Takeoff
          defaults.push(...(await this.generateTakeoffDefaults(context)));
          break;
        case 6: // Duration
          defaults.push(...(await this.generateDurationDefaults(context)));
          break;
        case 7: // Expenses
          defaults.push(...(await this.generateExpenseDefaults(context)));
          break;
        case 8: // Pricing
          defaults.push(...(await this.generatePricingDefaults(context)));
          break;
        case 9: // Summary
          defaults.push(...(await this.generateSummaryDefaults(context)));
          break;
      }

      // Cache results
      this.cache.set(cacheKey, {
        data: defaults,
        timestamp: Date.now(),
      });

      return defaults;
    } catch (error) {
      console.error("Error generating smart defaults:", error);
      return [];
    }
  }

  // Generate contextual suggestions
  static async generateSuggestions(
    context: SmartDefaultsContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    try {
      // Analyze current data for improvement opportunities
      suggestions.push(...(await this.analyzeForOptimizations(context)));
      suggestions.push(...(await this.analyzeForRisks(context)));
      suggestions.push(...(await this.analyzeForPricingOpportunities(context)));
      suggestions.push(...(await this.analyzeForServiceAdditions(context)));

      // Sort by impact and confidence
      return suggestions.sort((a, b) => {
        const scoreA = this.calculateSuggestionScore(a);
        const scoreB = this.calculateSuggestionScore(b);
        return scoreB - scoreA;
      });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  }

  // Generate predictive input suggestions
  static async generatePredictiveInputs(
    field: string,
    currentValue: string,
    context: SmartDefaultsContext,
  ): Promise<PredictiveInput> {
    try {
      const predictions = await this.getPredictionsForField(
        field,
        currentValue,
        context,
      );

      return {
        field,
        predictions,
        isLoading: false,
      };
    } catch (error) {
      console.error("Error generating predictive inputs:", error);
      return {
        field,
        predictions: [],
        isLoading: false,
      };
    }
  }

  // Step-specific default generators
  private static async generateContactDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Auto-detect contact method if not specified
    if (!flowData.initialContact?.contactMethod) {
      let suggestedMethod = "email";
      let confidence = 0.6;
      let reasoning = "Email is the most common initial contact method";

      // Check if we have phone number in extracted data
      if (flowData.initialContact?.aiExtractedData?.customer?.phone) {
        suggestedMethod = "phone";
        confidence = 0.8;
        reasoning = "Phone number detected in contact information";
      }

      defaults.push({
        field: "initialContact.contactMethod",
        value: suggestedMethod,
        confidence,
        reasoning,
        source: "rules",
      });
    }

    // Auto-set contact date to today if not specified
    if (!flowData.initialContact?.contactDate) {
      defaults.push({
        field: "initialContact.contactDate",
        value: new Date().toISOString().split("T")[0],
        confidence: 0.9,
        reasoning: "Most contacts are logged on the same day",
        source: "rules",
      });
    }

    return defaults;
  }

  private static async generateScopeDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Suggest services based on building type and extracted requirements
    if (flowData.initialContact?.aiExtractedData?.requirements?.services) {
      const extractedServices =
        flowData.initialContact.aiExtractedData.requirements.services;
      const mappedServices =
        this.mapExtractedServicesToServiceCodes(extractedServices);

      if (mappedServices.length > 0) {
        defaults.push({
          field: "scopeDetails.selectedServices",
          value: mappedServices,
          confidence: 0.8,
          reasoning: "Services detected from initial contact analysis",
          source: "ai",
        });
      }
    }

    // Suggest service order based on best practices
    if (
      flowData.scopeDetails?.selectedServices &&
      flowData.scopeDetails.selectedServices.length > 1
    ) {
      const optimizedOrder = this.optimizeServiceOrder(
        flowData.scopeDetails.selectedServices,
      );
      defaults.push({
        field: "scopeDetails.serviceOrder",
        value: optimizedOrder,
        confidence: 0.7,
        reasoning: "Optimized order for efficiency and quality",
        source: "rules",
      });
    }

    return defaults;
  }

  private static async generatePhotoDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];

    // Suggest minimum number of photos based on building complexity
    const buildingType =
      context.flowData.initialContact?.aiExtractedData?.requirements
        ?.buildingType;
    const suggestedPhotoCount =
      this.calculateRecommendedPhotoCount(buildingType);

    defaults.push({
      field: "filesPhotos.recommendedPhotoCount",
      value: suggestedPhotoCount,
      confidence: 0.8,
      reasoning: `Recommended ${suggestedPhotoCount} photos for ${buildingType || "this building type"}`,
      source: "rules",
    });

    return defaults;
  }

  private static async generateAreaDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];

    // If we have AI analysis with area estimates, use them as defaults
    if (context.buildingAnalysis?.estimatedArea) {
      defaults.push({
        field: "areaOfWork.totalArea",
        value: context.buildingAnalysis.estimatedArea,
        confidence: 0.7,
        reasoning: "Estimated from AI photo analysis",
        source: "ai",
      });
    }

    return defaults;
  }

  private static async generateTakeoffDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Generate default measurements based on area and services
    if (
      flowData.areaOfWork?.workAreas &&
      flowData.scopeDetails?.selectedServices
    ) {
      const totalArea = flowData.areaOfWork.workAreas.reduce(
        (sum: number, area: any) => sum + area.area,
        0,
      );

      for (const service of flowData.scopeDetails.selectedServices) {
        const defaultMeasurement = this.generateDefaultMeasurementForService(
          service,
          totalArea,
        );
        if (defaultMeasurement) {
          defaults.push({
            field: `takeoff.measurements.${service}`,
            value: defaultMeasurement,
            confidence: 0.6,
            reasoning: `Estimated based on ${totalArea} sq ft area and ${service} service requirements`,
            source: "rules",
          });
        }
      }
    }

    return defaults;
  }

  private static async generateDurationDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Calculate estimated duration based on services and area
    if (
      flowData.takeoff?.measurements &&
      flowData.scopeDetails?.selectedServices
    ) {
      const estimatedHours = this.calculateEstimatedDuration(
        flowData.scopeDetails.selectedServices,
        flowData.takeoff.measurements,
      );

      defaults.push({
        field: "duration.estimatedDuration",
        value: estimatedHours,
        confidence: 0.7,
        reasoning: `Estimated based on service complexity and area measurements`,
        source: "rules",
      });

      // Suggest start date (next business day)
      const suggestedStartDate = this.getNextBusinessDay();
      defaults.push({
        field: "duration.timeline.startDate",
        value: suggestedStartDate,
        confidence: 0.8,
        reasoning: "Next available business day",
        source: "rules",
      });
    }

    return defaults;
  }

  private static async generateExpenseDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Generate default equipment costs based on services
    if (flowData.scopeDetails?.selectedServices) {
      for (const service of flowData.scopeDetails.selectedServices) {
        const equipmentDefaults = this.getDefaultEquipmentForService(service);
        equipmentDefaults.forEach((equipment) => {
          defaults.push({
            field: `expenses.equipment.${equipment.item}`,
            value: equipment,
            confidence: 0.8,
            reasoning: `Standard equipment for ${service} service`,
            source: "rules",
          });
        });
      }
    }

    return defaults;
  }

  private static async generatePricingDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];
    const { flowData } = context;

    // Suggest pricing strategy based on customer profile and project size
    if (flowData.expenses?.totalCosts?.grand) {
      const projectSize = this.categorizeProjectSize(
        flowData.expenses.totalCosts.grand,
      );
      const suggestedStrategy = this.suggestPricingStrategy(
        projectSize,
        context.userProfile,
      );

      defaults.push({
        field: "pricing.strategy",
        value: suggestedStrategy.strategy,
        confidence: suggestedStrategy.confidence,
        reasoning: suggestedStrategy.reasoning,
        source: "rules",
      });
    }

    return defaults;
  }

  private static async generateSummaryDefaults(
    context: SmartDefaultsContext,
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];

    // Suggest delivery method based on customer preferences
    const suggestedDelivery = context.flowData.initialContact?.aiExtractedData
      ?.customer?.email
      ? "email"
      : "print";
    defaults.push({
      field: "summary.deliveryMethod",
      value: suggestedDelivery,
      confidence: 0.8,
      reasoning:
        suggestedDelivery === "email"
          ? "Email address available"
          : "No email address provided",
      source: "rules",
    });

    // Suggest follow-up date (1 week from now)
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);
    defaults.push({
      field: "summary.followUpDate",
      value: followUpDate.toISOString().split("T")[0],
      confidence: 0.7,
      reasoning: "Standard 1-week follow-up period",
      source: "rules",
    });

    return defaults;
  }

  // Analysis methods for suggestions
  private static async analyzeForOptimizations(
    context: SmartDefaultsContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const { flowData } = context;

    // Check for service bundling opportunities
    if (
      flowData.scopeDetails?.selectedServices?.includes("pressure-washing") &&
      flowData.scopeDetails?.selectedServices?.includes("window-cleaning")
    ) {
      suggestions.push({
        id: "bundle-pw-wc",
        type: "optimization",
        title: "Service Bundle Opportunity",
        description:
          "Combine pressure washing and window cleaning for better efficiency",
        impact: "medium",
        confidence: 0.8,
        reasoning: "Services can be performed together to reduce setup time",
        actionType: "user-confirm",
      });
    }

    return suggestions;
  }

  private static async analyzeForRisks(
    context: SmartDefaultsContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const { flowData } = context;

    // Check for weather risks
    if (flowData.duration?.timeline && this.isWeatherSensitiveSeason()) {
      suggestions.push({
        id: "weather-risk",
        type: "risk-mitigation",
        title: "Weather Risk Alert",
        description:
          "Consider weather contingency for outdoor services during this season",
        impact: "high",
        confidence: 0.9,
        reasoning:
          "Historical weather patterns show increased risk during this period",
        actionType: "informational",
      });
    }

    return suggestions;
  }

  private static async analyzeForPricingOpportunities(
    context: SmartDefaultsContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const { flowData } = context;

    // Check for pricing optimization
    if (flowData.pricing && context.marketData) {
      const marketComparison = this.compareToMarketRates(
        flowData.pricing,
        context.marketData,
      );
      if (marketComparison.canIncrease) {
        suggestions.push({
          id: "pricing-optimization",
          type: "pricing-adjustment",
          title: "Pricing Optimization",
          description: `Consider increasing price by ${marketComparison.suggestedIncrease}%`,
          impact: "high",
          confidence: marketComparison.confidence,
          suggestedValue: marketComparison.suggestedPrice,
          targetField: "pricing.finalPrice",
          reasoning: marketComparison.reasoning,
          actionType: "user-confirm",
        });
      }
    }

    return suggestions;
  }

  private static async analyzeForServiceAdditions(
    context: SmartDefaultsContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const { flowData } = context;

    // Suggest additional services based on building analysis
    if (
      context.buildingAnalysis?.surfaceCondition === "weathered" &&
      !flowData.scopeDetails?.selectedServices?.includes("soft-washing")
    ) {
      suggestions.push({
        id: "add-soft-washing",
        type: "service-addition",
        title: "Add Soft Washing Service",
        description:
          "Building analysis shows weathered surfaces that would benefit from soft washing",
        impact: "medium",
        confidence: 0.7,
        suggestedValue: "soft-washing",
        targetField: "scopeDetails.selectedServices",
        reasoning:
          "AI analysis detected weathered surfaces requiring gentle cleaning",
        actionType: "user-confirm",
      });
    }

    return suggestions;
  }

  // Utility methods
  private static calculateSuggestionScore(suggestion: SmartSuggestion): number {
    const impactWeights = { low: 1, medium: 2, high: 3 };
    return suggestion.confidence * impactWeights[suggestion.impact];
  }

  private static mapExtractedServicesToServiceCodes(
    services: string[],
  ): string[] {
    const serviceMap: Record<string, string> = {
      "window cleaning": "window-cleaning",
      "pressure washing": "pressure-washing",
      "soft washing": "soft-washing",
      "glass restoration": "glass-restoration",
      "frame restoration": "frame-restoration",
    };

    return services
      .map((service) => serviceMap[service.toLowerCase()] || service)
      .filter(Boolean);
  }

  private static optimizeServiceOrder(services: string[]): string[] {
    // Define optimal service order
    const orderPriority: Record<string, number> = {
      "pressure-washing": 1,
      "soft-washing": 2,
      "glass-restoration": 3,
      "frame-restoration": 4,
      "window-cleaning": 5,
      "final-clean": 6,
    };

    return [...services].sort(
      (a, b) => (orderPriority[a] || 99) - (orderPriority[b] || 99),
    );
  }

  private static calculateRecommendedPhotoCount(buildingType?: string): number {
    const photoRequirements: Record<string, number> = {
      residential: 8,
      office: 12,
      retail: 10,
      industrial: 15,
      hospital: 20,
    };

    return photoRequirements[buildingType?.toLowerCase() || "office"] || 12;
  }

  private static generateDefaultMeasurementForService(
    service: string,
    totalArea: number,
  ): any {
    const serviceFactors: Record<string, { factor: number; unit: string }> = {
      "window-cleaning": { factor: 0.3, unit: "sq ft" },
      "pressure-washing": { factor: 1.0, unit: "sq ft" },
      "soft-washing": { factor: 0.8, unit: "sq ft" },
    };

    const factor = serviceFactors[service];
    if (!factor) return null;

    return {
      quantity: Math.round(totalArea * factor.factor),
      unit: factor.unit,
      category: service,
      notes: "Auto-generated based on area analysis",
    };
  }

  private static calculateEstimatedDuration(
    services: string[],
    measurements: any,
  ): number {
    const serviceHours: Record<string, number> = {
      "window-cleaning": 0.1, // hours per sq ft
      "pressure-washing": 0.05,
      "soft-washing": 0.08,
    };

    let totalHours = 0;
    for (const service of services) {
      const measurement = measurements[service];
      if (measurement && serviceHours[service]) {
        totalHours += measurement.quantity * serviceHours[service];
      }
    }

    return Math.max(4, Math.round(totalHours)); // Minimum 4 hours
  }

  private static getNextBusinessDay(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    return date.toISOString().split("T")[0];
  }

  private static getDefaultEquipmentForService(
    service: string,
  ): Array<{ item: string; cost: number; quantity: number }> {
    const equipmentDefaults: Record<
      string,
      Array<{ item: string; cost: number; quantity: number }>
    > = {
      "window-cleaning": [
        { item: "Squeegees", cost: 25, quantity: 2 },
        { item: "Extension Pole", cost: 75, quantity: 1 },
        { item: "Cleaning Solution", cost: 30, quantity: 1 },
      ],
      "pressure-washing": [
        { item: "Pressure Washer", cost: 200, quantity: 1 },
        { item: "Surface Cleaner", cost: 150, quantity: 1 },
        { item: "Hoses", cost: 50, quantity: 1 },
      ],
    };

    return equipmentDefaults[service] || [];
  }

  private static categorizeProjectSize(
    totalCost: number,
  ): "small" | "medium" | "large" {
    if (totalCost < 5000) return "small";
    if (totalCost < 20000) return "medium";
    return "large";
  }

  private static suggestPricingStrategy(
    projectSize: string,
    userProfile?: any,
  ): { strategy: string; confidence: number; reasoning: string } {
    if (projectSize === "large") {
      return {
        strategy: "value_based",
        confidence: 0.8,
        reasoning:
          "Large projects benefit from value-based pricing to maximize profit",
      };
    }

    return {
      strategy: "competitive",
      confidence: 0.7,
      reasoning: "Competitive pricing recommended for smaller projects",
    };
  }

  private static isWeatherSensitiveSeason(): boolean {
    const month = new Date().getMonth(); // 0-11
    return month >= 10 || month <= 2; // Nov, Dec, Jan, Feb, Mar
  }

  private static compareToMarketRates(
    pricing: any,
    marketData: any,
  ): {
    canIncrease: boolean;
    suggestedIncrease: number;
    suggestedPrice: number;
    confidence: number;
    reasoning: string;
  } {
    if (!pricing?.finalPrice || !marketData) {
      return {
        canIncrease: false,
        suggestedIncrease: 0,
        suggestedPrice: pricing?.finalPrice || 0,
        confidence: 0.2,
        reasoning: "Insufficient pricing or market data for comparison",
      };
    }

    // Get market benchmarks based on service type and building characteristics
    const serviceType = marketData.serviceType || "window-cleaning";
    const buildingType = marketData.buildingType || "commercial";
    const regionFactor = marketData.regionFactor || 1.0;

    // Industry standard rates (per sq ft or per window)
    const marketRates = {
      "window-cleaning": {
        commercial: { min: 2.5, max: 5.0, avg: 3.5 },
        residential: { min: 1.8, max: 3.5, avg: 2.5 },
        industrial: { min: 3.0, max: 6.0, avg: 4.2 },
      },
      "pressure-washing": {
        commercial: { min: 0.15, max: 0.35, avg: 0.25 },
        residential: { min: 0.12, max: 0.28, avg: 0.2 },
        industrial: { min: 0.18, max: 0.4, avg: 0.3 },
      },
      "soft-washing": {
        commercial: { min: 0.2, max: 0.45, avg: 0.32 },
        residential: { min: 0.15, max: 0.35, avg: 0.25 },
        industrial: { min: 0.25, max: 0.5, avg: 0.38 },
      },
    };

    const rates =
      marketRates[serviceType]?.[buildingType] ||
      marketRates["window-cleaning"]["commercial"];
    const marketAvg = rates.avg * regionFactor;
    const marketMax = rates.max * regionFactor;

    // Calculate current rate per unit
    const area = pricing.area || pricing.windows || 1000; // Default area if not provided
    const currentRate = pricing.finalPrice / area;

    // Compare against market rates
    const percentageOfMarket = (currentRate / marketAvg) * 100;
    let confidence = 0.7; // Base confidence
    let reasoning = "";
    let canIncrease = false;
    let suggestedIncrease = 0;
    let suggestedPrice = pricing.finalPrice;

    if (currentRate < marketAvg * 0.85) {
      // Significantly below market
      canIncrease = true;
      const targetRate = Math.min(marketAvg, currentRate * 1.25); // Cap increase at 25%
      suggestedPrice = targetRate * area;
      suggestedIncrease = suggestedPrice - pricing.finalPrice;
      confidence = 0.85;
      reasoning = `Current rate ($${currentRate.toFixed(2)}/unit) is ${(100 - percentageOfMarket).toFixed(1)}% below market average ($${marketAvg.toFixed(2)}/unit). Consider increasing to capture market value.`;
    } else if (currentRate < marketAvg) {
      // Slightly below market
      canIncrease = true;
      const targetRate = marketAvg * 0.95; // Conservative increase
      suggestedPrice = targetRate * area;
      suggestedIncrease = suggestedPrice - pricing.finalPrice;
      confidence = 0.75;
      reasoning = `Current rate is ${(100 - percentageOfMarket).toFixed(1)}% below market average. Small increase opportunity available.`;
    } else if (currentRate <= marketMax) {
      // Within reasonable market range
      canIncrease = false;
      suggestedIncrease = 0;
      confidence = 0.8;
      reasoning = `Current rate ($${currentRate.toFixed(2)}/unit) is competitive at ${percentageOfMarket.toFixed(1)}% of market average.`;
    } else {
      // Above market maximum
      canIncrease = false;
      suggestedIncrease = 0;
      const targetRate = marketMax * 0.95;
      suggestedPrice = targetRate * area;
      confidence = 0.7;
      reasoning = `Current rate is ${(percentageOfMarket - 100).toFixed(1)}% above market average. Consider reducing to improve competitiveness.`;
    }

    // Adjust confidence based on data quality
    if (marketData.confidence) {
      confidence *= marketData.confidence;
    }

    return {
      canIncrease,
      suggestedIncrease: Math.round(suggestedIncrease),
      suggestedPrice: Math.round(suggestedPrice),
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  private static async getPredictionsForField(
    field: string,
    currentValue: string,
    context: SmartDefaultsContext,
  ): Promise<
    Array<{ value: string; probability: number; description?: string }>
  > {
    // Implement field-specific predictions
    const predictions: Array<{
      value: string;
      probability: number;
      description?: string;
    }> = [];

    switch (field) {
      case "customer.name":
        // Return common business names if partial match
        if (currentValue.length > 2) {
          predictions.push(
            { value: currentValue + " Corporation", probability: 0.3 },
            { value: currentValue + " LLC", probability: 0.2 },
            { value: currentValue + " Inc", probability: 0.2 },
          );
        }
        break;

      case "building.type":
        predictions.push(
          {
            value: "Office Building",
            probability: 0.4,
            description: "Commercial office space",
          },
          {
            value: "Retail Store",
            probability: 0.3,
            description: "Retail storefront",
          },
          {
            value: "Restaurant",
            probability: 0.2,
            description: "Food service establishment",
          },
        );
        break;
    }

    return predictions;
  }
}

export default SmartDefaultsEngine;

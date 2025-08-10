/**
 * Unified Real-time Pricing Service
 * Consolidates real-time pricing functionality from both v1 and v2 services
 *
 * This service combines two previous services:
 * 1. real-time-pricing-service.ts - Original singleton-based service
 * 2. real-time-pricing-service-v2.ts - Enhanced non-singleton service with caching
 */

import {
  GuidedFlowData,
  ServiceCalculationResult,
  ServiceType,
  ServiceFormData,
  PricingStepData,
  AreaOfWorkData,
  DurationStepData,
  ExpensesStepData,
  TakeoffStepData,
} from "@/lib/types/estimate-types";

import {
  RealTimePricingResult,
  ServicePricingBreakdown,
  PricingAdjustment,
  PricingDependency,
  PricingConfig,
  ConfidenceLevel,
  PricingInput,
  PricingError,
  PricingErrorType,
  CustomerProfile,
  MarketAnalysisData,
  ComplexityScore,
} from "@/lib/pricing/types";

import {
  PricingStrategyManager,
  PricingContext,
  HourlyRatePricingStrategy,
} from "@/lib/pricing/pricing-strategies";

import {
  PricingCache,
  memoize,
  getSharedPricingCache,
} from "@/lib/pricing/pricing-cache";

import { formatCurrency, roundToCents } from "@/lib/utils/currency";
import { CalculatorService } from "./calculator-service";
import { BaseService } from "./core/base-service";
import { ValidationError, ServiceError } from "./core/errors";

// ==============================================================================
// TYPE DEFINITIONS AND COMPATIBILITY EXPORTS
// ==============================================================================

// Compatibility export for v1 types
export interface RealTimePricingConfig extends PricingConfig {
  updateInterval?: number;
  enableLiveUpdates?: boolean;
  confidenceThreshold?: number;
  includeRiskAdjustments?: boolean;
  enableDependencyTracking?: boolean;
  debounceDelay?: number;
  batchUpdates?: boolean;
}

// Re-export all types for backward compatibility
export type {
  RealTimePricingResult,
  ServicePricingBreakdown,
  PricingAdjustment,
  PricingDependency,
  PricingConfig,
  ConfidenceLevel,
  PricingInput,
  PricingError,
  PricingErrorType,
  CustomerProfile,
  MarketAnalysisData,
  ComplexityScore,
};

// Additional interfaces for unified service
export interface PricingSubscription {
  id: string;
  callback: (result: RealTimePricingResult) => void;
  filters?: {
    minChange?: number;
    serviceTypes?: ServiceType[];
    confidenceThreshold?: number;
  };
}

export interface PricingValidationResult {
  isValid: boolean;
  errors: PricingError[];
  warnings: string[];
  confidence: ConfidenceLevel;
}

export interface PricingMetrics {
  calculationsPerformed: number;
  cacheHitRate: number;
  averageCalculationTime: number;
  lastCalculationTime: number;
  activeSubscriptions: number;
}

// ==============================================================================
// UNIFIED REAL-TIME PRICING SERVICE CLASS
// ==============================================================================

export class UnifiedRealTimePricingService extends BaseService {
  private config: RealTimePricingConfig;
  private cache: PricingCache;
  private strategyManager: PricingStrategyManager;

  // Dependency tracking and subscription management
  private dependencies: Map<string, PricingDependency[]>;
  private listeners: Map<string, Set<PricingSubscription>>;
  private updateTimers: Map<string, NodeJS.Timeout>;
  private lastResults: Map<string, RealTimePricingResult>;

  // Performance tracking
  private metrics: PricingMetrics;
  private calculationStartTimes: Map<string, number>;

  // Memoized calculation function
  private memoizedCalculate: (
    input: PricingInput,
  ) => Promise<RealTimePricingResult>;

  constructor(config?: Partial<RealTimePricingConfig>, cache?: PricingCache) {
    super("UnifiedRealTimePricingService", {
      enableCache: true,
      cachePrefix: "pricing",
      defaultCacheTTL: 300, // 5 minutes
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
    });

    // Merge configuration from both services
    this.config = {
      // V2 defaults (more modern)
      updateInterval: 1000,
      enableLiveUpdates: true,
      confidenceThreshold: 0.6,
      includeRiskAdjustments: true,
      enableDependencyTracking: true,
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxCacheSize: 100,
      enableAlternativePricing: false,
      enableMarketAnalysis: false,
      debugMode: false,
      // V1 compatibility
      debounceDelay: 800,
      batchUpdates: true,
      ...config,
    };

    // Initialize caching
    this.cache =
      cache ||
      (this.config.cacheEnabled
        ? getSharedPricingCache()
        : new PricingCache(0));

    // Initialize strategy manager
    this.strategyManager = new PricingStrategyManager();

    // Initialize state management
    this.dependencies = new Map();
    this.listeners = new Map();
    this.updateTimers = new Map();
    this.lastResults = new Map();

    // Initialize metrics
    this.metrics = {
      calculationsPerformed: 0,
      cacheHitRate: 0,
      averageCalculationTime: 0,
      lastCalculationTime: 0,
      activeSubscriptions: 0,
    };

    this.calculationStartTimes = new Map();

    // Create memoized calculation function
    this.memoizedCalculate = memoize(
      this.performCalculation.bind(this),
      (input: PricingInput) => this.generateCacheKey(input),
      this.config.cacheTTL || 300000,
    );
  }

  // ==============================================================================
  // CORE PRICING CALCULATION METHODS
  // ==============================================================================

  /**
   * Calculate pricing in real-time with full workflow data
   */
  async calculatePricing(
    workflowData: GuidedFlowData,
    customerId?: string,
  ): Promise<RealTimePricingResult> {
    return this.executeWithErrorHandling(
      "calculatePricing",
      async () => {
        const startTime = Date.now();
        const calculationId = this.generateCalculationId(
          workflowData,
          customerId,
        );
        this.calculationStartTimes.set(calculationId, startTime);

        // Convert workflow data to pricing input
        const pricingInput = this.convertWorkflowDataToPricingInput(
          workflowData,
          customerId,
        );

        // Validate input
        const validation = this.validatePricingInput(pricingInput);
        if (!validation.isValid) {
          throw new ValidationError(
            `Invalid pricing input: ${validation.errors.map((e) => e.message).join(", ")}`,
          );
        }

        // Perform calculation (with memoization if enabled)
        let result: RealTimePricingResult;
        if (this.config.cacheEnabled) {
          result = await this.memoizedCalculate(pricingInput);
        } else {
          result = await this.performCalculation(pricingInput);
        }

        // Update metrics
        const calculationTime = Date.now() - startTime;
        this.updateMetrics(calculationId, calculationTime);

        // Cache result
        this.lastResults.set(calculationId, result);

        // Notify subscribers
        this.notifySubscribers(calculationId, result);

        return result;
      },
      {
        operation: "calculate_pricing",
        metadata: { customerId, hasWorkflowData: !!workflowData },
      },
    );
  }

  /**
   * Perform the core pricing calculation
   */
  private async performCalculation(
    input: PricingInput,
  ): Promise<RealTimePricingResult> {
    const services: ServicePricingBreakdown[] = [];
    const adjustments: PricingAdjustment[] = [];
    const warnings: string[] = [];
    const missingData: string[] = [];

    let totalCost = 0;
    let totalHours = 0;
    let totalArea = 0;
    let overallConfidence: ConfidenceLevel = "high";

    // Process each service
    for (const serviceData of input.services) {
      try {
        const serviceResult = await this.calculateServicePricing(
          serviceData,
          input.context,
        );

        services.push(serviceResult);
        totalCost += serviceResult.adjustedPrice;
        totalHours += serviceResult.hours;
        totalArea += serviceResult.area;

        // Update confidence based on service confidence
        if (serviceResult.confidence === "low") {
          overallConfidence = "low";
        } else if (
          serviceResult.confidence === "medium" &&
          overallConfidence === "high"
        ) {
          overallConfidence = "medium";
        }
      } catch (error) {
        this.logger.warn(
          `Failed to calculate pricing for service ${serviceData.type}:`,
          error,
        );
        warnings.push(
          `Unable to calculate pricing for ${serviceData.type}: ${error.message}`,
        );
      }
    }

    // Apply global adjustments
    const globalAdjustments = this.calculateGlobalAdjustments(input, totalCost);
    adjustments.push(...globalAdjustments);

    // Apply adjustments to total
    for (const adjustment of globalAdjustments) {
      if (adjustment.appliedTo === "total") {
        if (adjustment.isPercentage) {
          totalCost *= 1 + adjustment.value / 100;
        } else {
          totalCost += adjustment.value;
        }
      }
    }

    // Round to cents
    totalCost = roundToCents(totalCost);

    // Validate missing critical data
    const criticalData = this.validateCriticalData(input);
    missingData.push(...criticalData.missing);
    warnings.push(...criticalData.warnings);

    // Adjust confidence based on missing data
    if (missingData.length > 2) {
      overallConfidence = "low";
    } else if (missingData.length > 0) {
      overallConfidence =
        overallConfidence === "high" ? "medium" : overallConfidence;
    }

    return {
      totalCost,
      totalHours,
      totalArea,
      serviceBreakdown: services,
      adjustments,
      confidence: overallConfidence,
      missingData,
      warnings,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate pricing for individual service
   */
  private async calculateServicePricing(
    serviceData: ServiceFormData,
    context: PricingContext,
  ): Promise<ServicePricingBreakdown> {
    // Get pricing strategy for service
    const strategy = this.strategyManager.getStrategy(
      serviceData.type,
      context,
    );

    // Calculate base pricing using calculator service
    const calculationResult = await CalculatorService.calculateService(
      serviceData.type,
      serviceData.formData,
    );

    if (!calculationResult.success || !calculationResult.data) {
      throw new ServiceError(
        `Service calculation failed: ${calculationResult.error || "Unknown error"}`,
      );
    }

    const basePrice = calculationResult.data.totalPrice || 0;
    const hours = calculationResult.data.totalHours || 0;
    const area = calculationResult.data.totalArea || 0;

    // Apply pricing strategy adjustments
    const strategyResult = await strategy.calculatePrice({
      basePrice,
      hours,
      area,
      serviceType: serviceData.type,
      context,
    });

    // Determine confidence
    const confidence = this.determineServiceConfidence(
      serviceData,
      calculationResult.data,
    );

    // Get dependencies for this service
    const dependencies = this.getServiceDependencies(serviceData.type);

    return {
      serviceType: serviceData.type,
      serviceName: this.getServiceDisplayName(serviceData.type),
      basePrice,
      adjustedPrice: strategyResult.adjustedPrice,
      hours,
      area,
      confidence,
      calculations: calculationResult.data,
      dependencies,
    };
  }

  /**
   * Calculate global pricing adjustments
   */
  private calculateGlobalAdjustments(
    input: PricingInput,
    totalCost: number,
  ): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = [];

    // Risk adjustments
    if (this.config.includeRiskAdjustments && input.riskFactors) {
      for (const [factor, value] of Object.entries(input.riskFactors)) {
        if (value > 0) {
          adjustments.push({
            type: "risk",
            description: `Risk adjustment for ${factor}`,
            value,
            isPercentage: true,
            appliedTo: "total",
          });
        }
      }
    }

    // Complexity adjustments
    if (input.complexityScore && input.complexityScore.overall > 0.7) {
      const complexityAdjustment = (input.complexityScore.overall - 0.5) * 20; // 0-20% adjustment
      adjustments.push({
        type: "complexity",
        description: "High complexity project adjustment",
        value: complexityAdjustment,
        isPercentage: true,
        appliedTo: "total",
      });
    }

    // Duration adjustments
    if (input.timeline && input.timeline.isRushed) {
      adjustments.push({
        type: "duration",
        description: "Rush job premium",
        value: 15,
        isPercentage: true,
        appliedTo: "total",
      });
    }

    return adjustments;
  }

  // ==============================================================================
  // SUBSCRIPTION AND LISTENER MANAGEMENT
  // ==============================================================================

  /**
   * Subscribe to real-time pricing updates
   */
  subscribe(
    workflowId: string,
    callback: (result: RealTimePricingResult) => void,
    filters?: PricingSubscription["filters"],
  ): string {
    const subscriptionId = `${workflowId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: PricingSubscription = {
      id: subscriptionId,
      callback,
      filters,
    };

    if (!this.listeners.has(workflowId)) {
      this.listeners.set(workflowId, new Set());
    }

    this.listeners.get(workflowId)!.add(subscription);
    this.metrics.activeSubscriptions++;

    return subscriptionId;
  }

  /**
   * Unsubscribe from pricing updates
   */
  unsubscribe(workflowId: string, subscriptionId?: string): boolean {
    const workflowListeners = this.listeners.get(workflowId);
    if (!workflowListeners) return false;

    if (subscriptionId) {
      // Remove specific subscription
      for (const subscription of workflowListeners) {
        if (subscription.id === subscriptionId) {
          workflowListeners.delete(subscription);
          this.metrics.activeSubscriptions--;
          return true;
        }
      }
      return false;
    } else {
      // Remove all subscriptions for workflow
      const count = workflowListeners.size;
      workflowListeners.clear();
      this.metrics.activeSubscriptions -= count;

      if (workflowListeners.size === 0) {
        this.listeners.delete(workflowId);
      }

      return count > 0;
    }
  }

  /**
   * Notify subscribers of pricing updates
   */
  private notifySubscribers(
    calculationId: string,
    result: RealTimePricingResult,
  ): void {
    const listeners = this.listeners.get(calculationId);
    if (!listeners) return;

    for (const subscription of listeners) {
      try {
        // Check filters
        if (subscription.filters) {
          if (!this.passesFilters(result, subscription.filters)) {
            continue;
          }
        }

        // Call subscriber
        subscription.callback(result);
      } catch (error) {
        this.logger.error(
          `Error notifying subscription ${subscription.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Check if result passes subscription filters
   */
  private passesFilters(
    result: RealTimePricingResult,
    filters: PricingSubscription["filters"],
  ): boolean {
    if (
      filters.confidenceThreshold &&
      this.confidenceToNumber(result.confidence) < filters.confidenceThreshold
    ) {
      return false;
    }

    if (filters.serviceTypes && filters.serviceTypes.length > 0) {
      const hasMatchingService = result.serviceBreakdown.some((service) =>
        filters.serviceTypes!.includes(service.serviceType),
      );
      if (!hasMatchingService) return false;
    }

    if (filters.minChange && filters.minChange > 0) {
      // Implementation would compare with previous result
      // For now, always pass this filter
    }

    return true;
  }

  // ==============================================================================
  // DEPENDENCY TRACKING METHODS
  // ==============================================================================

  /**
   * Register dependencies between workflow steps and pricing
   */
  registerDependency(
    stepId: string,
    fieldPath: string,
    affects: string[],
    validator?: (value: unknown) => boolean,
  ): void {
    const dependency: PricingDependency = {
      stepId,
      fieldPath,
      affects,
      validator,
    };

    if (!this.dependencies.has(stepId)) {
      this.dependencies.set(stepId, []);
    }

    this.dependencies.get(stepId)!.push(dependency);
  }

  /**
   * Check if a change affects pricing calculations
   */
  checkDependencies(
    stepId: string,
    fieldPath: string,
    newValue: unknown,
  ): string[] {
    const stepDependencies = this.dependencies.get(stepId) || [];
    const affected: string[] = [];

    for (const dependency of stepDependencies) {
      if (dependency.fieldPath === fieldPath) {
        // Validate if validator exists
        if (dependency.validator && !dependency.validator(newValue)) {
          continue;
        }

        affected.push(...dependency.affects);
      }
    }

    return [...new Set(affected)]; // Remove duplicates
  }

  /**
   * Clear dependencies for a workflow
   */
  clearDependencies(workflowId: string): void {
    this.dependencies.delete(workflowId);
  }

  // ==============================================================================
  // VALIDATION AND UTILITY METHODS
  // ==============================================================================

  /**
   * Validate pricing input data
   */
  private validatePricingInput(input: PricingInput): PricingValidationResult {
    const errors: PricingError[] = [];
    const warnings: string[] = [];

    // Validate services
    if (!input.services || input.services.length === 0) {
      errors.push({
        type: "MISSING_DATA" as PricingErrorType,
        message: "No services provided for pricing calculation",
        field: "services",
      });
    }

    // Validate context
    if (!input.context) {
      errors.push({
        type: "MISSING_DATA" as PricingErrorType,
        message: "Pricing context is required",
        field: "context",
      });
    }

    // Service-specific validation
    for (const [index, service] of (input.services || []).entries()) {
      if (!service.type) {
        errors.push({
          type: "INVALID_DATA" as PricingErrorType,
          message: `Service ${index} missing type`,
          field: `services[${index}].type`,
        });
      }

      if (!service.formData || Object.keys(service.formData).length === 0) {
        warnings.push(`Service ${index} (${service.type}) has no form data`);
      }
    }

    const confidence: ConfidenceLevel =
      errors.length > 0 ? "low" : warnings.length > 2 ? "medium" : "high";

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence,
    };
  }

  /**
   * Validate critical data for pricing accuracy
   */
  private validateCriticalData(input: PricingInput): {
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check for critical pricing data
    if (!input.customerProfile) {
      missing.push("Customer profile information");
    }

    if (!input.timeline) {
      missing.push("Project timeline information");
    }

    // Check service-specific critical data
    for (const service of input.services) {
      const serviceRequiredFields = this.getRequiredFieldsForService(
        service.type,
      );
      for (const field of serviceRequiredFields) {
        if (!service.formData[field]) {
          missing.push(`${service.type}: ${field}`);
        }
      }
    }

    return { missing, warnings };
  }

  /**
   * Get required fields for a service type
   */
  private getRequiredFieldsForService(serviceType: ServiceType): string[] {
    // This would be defined based on each service's requirements
    const requiredFields: Record<ServiceType, string[]> = {
      WC: ["totalWindows", "windowSize"],
      PW: ["surfaceArea", "surfaceType"],
      SW: ["surfaceArea"],
      GR: ["glassArea", "glassType"],
      FR: ["frameLength"],
      HD: ["area", "height"],
      BR: ["area", "biofilmSeverity"],
      FC: ["area", "cleaningLevel"],
      GRC: ["area", "stoneType"],
      PWS: ["area", "sealingType"],
      PD: ["area", "deckType"],
    };

    return requiredFields[serviceType] || [];
  }

  /**
   * Determine confidence level for service calculation
   */
  private determineServiceConfidence(
    serviceData: ServiceFormData,
    calculationResult: ServiceCalculationResult,
  ): ConfidenceLevel {
    let confidence: ConfidenceLevel = "high";

    // Check calculation confidence
    if (
      calculationResult.confidence &&
      calculationResult.confidence < this.config.confidenceThreshold
    ) {
      confidence = "low";
    }

    // Check data completeness
    const requiredFields = this.getRequiredFieldsForService(serviceData.type);
    const missingFields = requiredFields.filter(
      (field) => !serviceData.formData[field],
    );

    if (missingFields.length > requiredFields.length * 0.5) {
      confidence = "low";
    } else if (missingFields.length > 0) {
      confidence = confidence === "high" ? "medium" : confidence;
    }

    // Check for warnings
    if (calculationResult.warnings && calculationResult.warnings.length > 2) {
      confidence = confidence === "high" ? "medium" : "low";
    }

    return confidence;
  }

  /**
   * Get service dependencies
   */
  private getServiceDependencies(serviceType: ServiceType): string[] {
    const dependencies: Record<ServiceType, string[]> = {
      WC: ["area", "accessibility", "height"],
      PW: ["area", "surface_preparation", "water_access"],
      SW: ["area", "detergent_type"],
      GR: ["WC"], // Glass restoration depends on window cleaning
      FR: ["WC"], // Frame restoration often goes with window cleaning
      HD: ["area", "height", "accessibility"],
      BR: ["area", "water_access"],
      FC: ["area", "cleaning_frequency"],
      GRC: ["area", "stone_condition"],
      PWS: ["PW"], // Sealing typically follows pressure washing
      PD: ["area", "traffic_level"],
    };

    return dependencies[serviceType] || [];
  }

  /**
   * Get display name for service type
   */
  private getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      SW: "Soft Washing",
      GR: "Glass Restoration",
      FR: "Frame Restoration",
      HD: "High Dusting",
      BR: "Biofilm Removal",
      FC: "Final Clean",
      GRC: "Granite Reconditioning",
      PWS: "Pressure Wash & Seal",
      PD: "Parking Deck Cleaning",
    };

    return displayNames[serviceType] || serviceType;
  }

  // ==============================================================================
  // UTILITY AND CONVERSION METHODS
  // ==============================================================================

  /**
   * Convert workflow data to pricing input format
   */
  private convertWorkflowDataToPricingInput(
    workflowData: GuidedFlowData,
    customerId?: string,
  ): PricingInput {
    const services: ServiceFormData[] = [];

    // Extract services from workflow data
    if (workflowData.areaOfWork?.selectedServices) {
      for (const serviceType of workflowData.areaOfWork.selectedServices) {
        const serviceData = workflowData.services?.[serviceType];
        if (serviceData) {
          services.push({
            type: serviceType,
            formData: serviceData,
          });
        }
      }
    }

    // Build pricing context
    const context: PricingContext = {
      customerId: customerId || "default",
      projectType: workflowData.projectInfo?.buildingType || "commercial",
      location: workflowData.projectInfo?.buildingAddress || "",
      urgency: workflowData.duration?.isRushed ? "high" : "normal",
      complexity: workflowData.duration?.complexity || "medium",
      seasonality: this.getCurrentSeasonality(),
      marketConditions: "normal", // Would be determined by market analysis
    };

    // Extract customer profile
    const customerProfile: CustomerProfile | undefined = customerId
      ? {
          id: customerId,
          type: "commercial", // Would be determined from customer data
          loyaltyLevel: "standard",
          riskProfile: "low",
          paymentTerms: "net30",
        }
      : undefined;

    // Extract timeline info
    const timeline = workflowData.duration
      ? {
          startDate: new Date(),
          endDate: new Date(
            Date.now() +
              (workflowData.duration.totalHours || 40) * 60 * 60 * 1000,
          ),
          isRushed: workflowData.duration.isRushed || false,
          flexibility: "medium" as const,
        }
      : undefined;

    return {
      services,
      context,
      customerProfile,
      timeline,
      riskFactors: this.extractRiskFactors(workflowData),
      complexityScore: this.calculateComplexityScore(workflowData),
    };
  }

  /**
   * Extract risk factors from workflow data
   */
  private extractRiskFactors(
    workflowData: GuidedFlowData,
  ): Record<string, number> {
    const riskFactors: Record<string, number> = {};

    // Height risk
    const buildingHeight = workflowData.projectInfo?.buildingHeightFeet || 0;
    if (buildingHeight > 100) {
      riskFactors.height = Math.min(((buildingHeight - 100) / 100) * 10, 20); // Up to 20% for very tall buildings
    }

    // Weather risk
    const season = this.getCurrentSeasonality();
    if (season === "winter") {
      riskFactors.weather = 5; // 5% winter premium
    }

    // Complexity risk
    const serviceCount = workflowData.areaOfWork?.selectedServices?.length || 0;
    if (serviceCount > 5) {
      riskFactors.complexity = (serviceCount - 5) * 2; // 2% per additional service
    }

    return riskFactors;
  }

  /**
   * Calculate project complexity score
   */
  private calculateComplexityScore(
    workflowData: GuidedFlowData,
  ): ComplexityScore {
    const factors = {
      serviceCount: workflowData.areaOfWork?.selectedServices?.length || 0,
      buildingHeight: workflowData.projectInfo?.buildingHeightFeet || 0,
      surfaceArea: workflowData.takeoff?.totalArea || 0,
      accessibilityIssues: 0, // Would be extracted from form data
      specialRequirements: 0, // Would be extracted from form data
    };

    // Calculate individual scores (0-1 scale)
    const serviceComplexity = Math.min(factors.serviceCount / 8, 1);
    const heightComplexity = Math.min(factors.buildingHeight / 200, 1);
    const sizeComplexity = Math.min(factors.surfaceArea / 50000, 1);

    // Overall complexity (weighted average)
    const overall =
      serviceComplexity * 0.3 +
      heightComplexity * 0.3 +
      sizeComplexity * 0.2 +
      factors.accessibilityIssues * 0.1 +
      factors.specialRequirements * 0.1;

    return {
      overall: Math.min(overall, 1),
      serviceComplexity,
      heightComplexity,
      sizeComplexity,
      accessibilityComplexity: factors.accessibilityIssues,
      specialRequirementsComplexity: factors.specialRequirements,
    };
  }

  /**
   * Get current seasonality factor
   */
  private getCurrentSeasonality(): "spring" | "summer" | "fall" | "winter" {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  /**
   * Generate cache key for pricing input
   */
  private generateCacheKey(input: PricingInput): string {
    const keyData = {
      services: input.services.map((s) => ({ type: s.type, data: s.formData })),
      context: input.context,
      timeline: input.timeline,
      riskFactors: input.riskFactors,
    };

    // Create hash of the key data
    return `pricing_${JSON.stringify(keyData).replace(/\s/g, "")}`;
  }

  /**
   * Generate calculation ID for tracking
   */
  private generateCalculationId(
    workflowData: GuidedFlowData,
    customerId?: string,
  ): string {
    const timestamp = Date.now();
    const customerPart = customerId ? `_${customerId}` : "";
    const servicesPart =
      workflowData.areaOfWork?.selectedServices?.join("-") || "no-services";
    return `calc_${timestamp}${customerPart}_${servicesPart}`;
  }

  /**
   * Convert confidence level to number for comparisons
   */
  private confidenceToNumber(confidence: ConfidenceLevel): number {
    switch (confidence) {
      case "high":
        return 0.8;
      case "medium":
        return 0.6;
      case "low":
        return 0.4;
      default:
        return 0.5;
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(calculationId: string, calculationTime: number): void {
    this.metrics.calculationsPerformed++;
    this.metrics.lastCalculationTime = calculationTime;

    // Update average calculation time (running average)
    const currentAvg = this.metrics.averageCalculationTime;
    const count = this.metrics.calculationsPerformed;
    this.metrics.averageCalculationTime =
      (currentAvg * (count - 1) + calculationTime) / count;

    // Calculate cache hit rate if caching is enabled
    if (this.config.cacheEnabled && this.cache) {
      const cacheStats = this.cache.getStats();
      this.metrics.cacheHitRate =
        cacheStats.requests > 0
          ? (cacheStats.hits / cacheStats.requests) * 100
          : 0;
    }

    this.calculationStartTimes.delete(calculationId);
  }

  // ==============================================================================
  // PUBLIC API METHODS (V1 AND V2 COMPATIBILITY)
  // ==============================================================================

  /**
   * Start live pricing updates (V1 compatibility)
   */
  async startLivePricing(
    workflowId: string,
    workflowData: GuidedFlowData,
    callback: (result: RealTimePricingResult) => void,
    customerId?: string,
  ): Promise<void> {
    // Calculate initial pricing
    const initialResult = await this.calculatePricing(workflowData, customerId);

    // Subscribe to updates
    this.subscribe(workflowId, callback);

    // Send initial result
    callback(initialResult);
  }

  /**
   * Stop live pricing updates (V1 compatibility)
   */
  stopLivePricing(workflowId: string): void {
    this.unsubscribe(workflowId);

    // Clear any pending timers
    const timer = this.updateTimers.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(workflowId);
    }
  }

  /**
   * Update pricing when workflow data changes (V1 compatibility)
   */
  async updatePricing(
    workflowId: string,
    updatedData: Partial<GuidedFlowData>,
    customerId?: string,
  ): Promise<void> {
    // Get existing workflow data and merge updates
    const existingResult = this.lastResults.get(workflowId);
    if (!existingResult) {
      this.logger.warn(`No existing pricing result for workflow ${workflowId}`);
      return;
    }

    // For now, trigger a full recalculation
    // In a more sophisticated implementation, we would do incremental updates
    const fullWorkflowData = updatedData as GuidedFlowData; // Type assertion for compatibility

    await this.calculatePricing(fullWorkflowData, customerId);
  }

  /**
   * Get cached pricing result (V1 and V2 compatibility)
   */
  getLastResult(workflowId: string): RealTimePricingResult | null {
    return this.lastResults.get(workflowId) || null;
  }

  /**
   * Clear pricing data for workflow (V1 and V2 compatibility)
   */
  clearPricingData(workflowId: string): void {
    this.stopLivePricing(workflowId);
    this.lastResults.delete(workflowId);
    this.clearDependencies(workflowId);
  }

  /**
   * Get pricing configuration
   */
  getConfig(): RealTimePricingConfig {
    return { ...this.config };
  }

  /**
   * Update pricing configuration
   */
  updateConfig(newConfig: Partial<RealTimePricingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update cache if needed
    if (newConfig.cacheEnabled !== undefined) {
      if (newConfig.cacheEnabled && !this.cache) {
        this.cache = getSharedPricingCache();
      }
    }
  }

  /**
   * Get pricing metrics and performance data
   */
  getMetrics(): PricingMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all pricing data and reset service
   */
  reset(): void {
    // Clear all data
    this.lastResults.clear();
    this.dependencies.clear();
    this.updateTimers.clear();
    this.calculationStartTimes.clear();

    // Clear listeners
    for (const [workflowId] of this.listeners) {
      this.unsubscribe(workflowId);
    }

    // Reset metrics
    this.metrics = {
      calculationsPerformed: 0,
      cacheHitRate: 0,
      averageCalculationTime: 0,
      lastCalculationTime: 0,
      activeSubscriptions: 0,
    };

    // Clear cache if enabled
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Health check for pricing service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      config: this.config,
      metrics: this.metrics,
      activeCalculations: this.calculationStartTimes.size,
      cacheEnabled: this.config.cacheEnabled,
    };

    try {
      // Test calculation with minimal data
      const testInput: PricingInput = {
        services: [
          {
            type: "WC" as ServiceType,
            formData: { totalWindows: 10, windowSize: "standard" },
          },
        ],
        context: {
          customerId: "test",
          projectType: "commercial",
          location: "test",
          urgency: "normal",
          complexity: "medium",
          seasonality: "spring",
          marketConditions: "normal",
        },
      };

      const startTime = Date.now();
      await this.performCalculation(testInput);
      const responseTime = Date.now() - startTime;

      details.testCalculation = {
        success: true,
        responseTime,
      };

      // Determine status
      const status =
        responseTime > 5000
          ? "warning"
          : responseTime > 10000
            ? "critical"
            : "healthy";

      return { status, details };
    } catch (error) {
      details.testCalculation = {
        success: false,
        error: error.message,
      };

      return {
        status: "critical",
        details,
      };
    }
  }
}

// ==============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ==============================================================================

export const unifiedRealTimePricingService =
  new UnifiedRealTimePricingService();

// Factory function for creating instances
export function getUnifiedRealTimePricingService(
  config?: Partial<RealTimePricingConfig>,
): UnifiedRealTimePricingService {
  if (config) {
    return new UnifiedRealTimePricingService(config);
  }
  return unifiedRealTimePricingService;
}

// Export default instance
export default unifiedRealTimePricingService;

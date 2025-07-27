// Optimized Real-time Pricing Service
// Addresses performance issues identified in the audit

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
import { CalculatorService } from "./calculator-service";

export interface RealTimePricingResult {
  totalCost: number;
  totalHours: number;
  totalArea: number;
  serviceBreakdown: ServicePricingBreakdown[];
  adjustments: PricingAdjustment[];
  confidence: "high" | "medium" | "low";
  missingData: string[];
  warnings: string[];
  lastUpdated: Date;
}

export interface ServicePricingBreakdown {
  serviceType: ServiceType;
  serviceName: string;
  basePrice: number;
  adjustedPrice: number;
  hours: number;
  area: number;
  confidence: "high" | "medium" | "low";
  calculations?: ServiceCalculationResult;
  dependencies?: string[];
}

export interface PricingAdjustment {
  type:
    | "markup"
    | "discount"
    | "risk"
    | "complexity"
    | "duration"
    | "equipment";
  description: string;
  value: number;
  percentage: boolean;
}

export interface RealTimePricingConfig {
  enableLiveUpdates: boolean;
  updateInterval: number; // milliseconds - OPTIMIZED: increased from 1000ms to 2000ms
  maxCacheAge: number; // milliseconds - NEW: cache expiration
  enableCalculationCaching: boolean; // NEW: enable/disable service calculation caching
  batchUpdates: boolean; // NEW: batch multiple updates together
}

// NEW: Data fingerprinting for intelligent cache invalidation
interface DataFingerprint {
  selectedServices: string;
  formData: string;
  timestamp: number;
}

// NEW: Batched update request
interface BatchedUpdate {
  estimateId: string;
  flowData: GuidedFlowData;
  timestamp: number;
}

export class OptimizedRealTimePricingService {
  private static instance: OptimizedRealTimePricingService;
  private listeners: Map<string, (result: RealTimePricingResult) => void>;
  private updateTimers: Map<string, NodeJS.Timeout>;
  private lastResults: Map<string, RealTimePricingResult>;
  private config: RealTimePricingConfig;

  // NEW: Performance optimizations
  private calculationCache: Map<string, ServiceCalculationResult>; // Cache service calculations
  private dataFingerprints: Map<string, DataFingerprint>; // Track data changes
  private batchedUpdates: Map<string, BatchedUpdate>; // Batch updates
  private batchTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.listeners = new Map();
    this.updateTimers = new Map();
    this.lastResults = new Map();
    this.calculationCache = new Map();
    this.dataFingerprints = new Map();
    this.batchedUpdates = new Map();

    this.config = {
      enableLiveUpdates: true,
      updateInterval: 2000, // OPTIMIZED: Increased from 1000ms to reduce CPU usage
      maxCacheAge: 300000, // NEW: 5 minutes cache expiration
      enableCalculationCaching: true, // NEW: Enable caching by default
      batchUpdates: true, // NEW: Enable batching by default
    };
  }

  static getInstance(): OptimizedRealTimePricingService {
    if (!OptimizedRealTimePricingService.instance) {
      OptimizedRealTimePricingService.instance =
        new OptimizedRealTimePricingService();
    }
    return OptimizedRealTimePricingService.instance;
  }

  // NEW: Generate fingerprint for data change detection
  private generateDataFingerprint(flowData: GuidedFlowData): DataFingerprint {
    const selectedServices = JSON.stringify(
      flowData.scopeDetails?.selectedServices || [],
    );
    const formData = JSON.stringify({
      areaOfWork: flowData.areaOfWork,
      scopeDetails: flowData.scopeDetails,
      pricing: flowData.pricing,
      expenses: flowData.expenses,
    });

    return {
      selectedServices,
      formData,
      timestamp: Date.now(),
    };
  }

  // NEW: Check if data has meaningfully changed
  private hasDataChanged(
    estimateId: string,
    flowData: GuidedFlowData,
  ): boolean {
    const currentFingerprint = this.generateDataFingerprint(flowData);
    const lastFingerprint = this.dataFingerprints.get(estimateId);

    if (!lastFingerprint) {
      this.dataFingerprints.set(estimateId, currentFingerprint);
      return true;
    }

    const hasChanged =
      lastFingerprint.selectedServices !==
        currentFingerprint.selectedServices ||
      lastFingerprint.formData !== currentFingerprint.formData;

    if (hasChanged) {
      this.dataFingerprints.set(estimateId, currentFingerprint);
    }

    return hasChanged;
  }

  // NEW: Generate cache key for service calculations
  private generateServiceCacheKey(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): string {
    const relevantData = {
      serviceType,
      areaOfWork: flowData.areaOfWork,
      scopeDetails: flowData.scopeDetails,
      takeoff: flowData.takeoff,
    };
    return `${serviceType}_${JSON.stringify(relevantData)}`;
  }

  // NEW: Get cached service calculation or compute new one
  private getCachedOrCalculateService(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServiceCalculationResult | null {
    if (!this.config.enableCalculationCaching) {
      return this.computeServiceCalculation(serviceType, flowData);
    }

    const cacheKey = this.generateServiceCacheKey(serviceType, flowData);
    let cached = this.calculationCache.get(cacheKey);

    // Check cache age
    if (
      cached &&
      cached.timestamp &&
      Date.now() - cached.timestamp > this.config.maxCacheAge
    ) {
      this.calculationCache.delete(cacheKey);
      cached = undefined;
    }

    if (!cached) {
      const computed = this.computeServiceCalculation(serviceType, flowData);
      if (computed) {
        computed.timestamp = Date.now();
        this.calculationCache.set(cacheKey, computed);
        cached = computed;
      }
    }

    return cached ?? null;
  }

  // Extracted actual calculation logic
  private computeServiceCalculation(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServiceCalculationResult | null {
    try {
      const formData = this.extractServiceFormData(serviceType, flowData);
      if (!formData) return null;

      return CalculatorService.calculateService({
        serviceType,
        formData,
      });
    } catch (error) {
      console.error(`Service calculation failed for ${serviceType}:`, error);
      return null;
    }
  }

  // OPTIMIZED: Batched update processing
  private processBatchedUpdates(): void {
    if (this.batchedUpdates.size === 0) return;

    const updates = Array.from(this.batchedUpdates.values());
    this.batchedUpdates.clear();

    // Process all updates
    for (const update of updates) {
      const result = this.performCalculation(update.flowData);
      this.lastResults.set(update.estimateId, result);
      this.notifyListeners(update.estimateId, result);
    }
  }

  // OPTIMIZED: Intelligent update scheduling
  updatePricing(
    flowData: GuidedFlowData,
    estimateId: string,
    changedStep?: string,
  ): void {
    if (!this.config.enableLiveUpdates) return;

    // OPTIMIZATION: Skip update if data hasn't meaningfully changed
    if (!this.hasDataChanged(estimateId, flowData)) {
      return;
    }

    if (this.config.batchUpdates) {
      // Add to batch
      this.batchedUpdates.set(estimateId, {
        estimateId,
        flowData,
        timestamp: Date.now(),
      });

      // Clear existing batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      // Set new batch timer
      this.batchTimer = setTimeout(() => {
        this.processBatchedUpdates();
        this.batchTimer = null;
      }, this.config.updateInterval);
    } else {
      // Original individual update logic
      this.clearUpdateTimer(estimateId);

      const timer = setTimeout(() => {
        const result = this.calculateRealTimePricing(flowData, estimateId);
        this.notifyListeners(estimateId, result);
      }, this.config.updateInterval);

      this.updateTimers.set(estimateId, timer);
    }
  }

  // Calculate real-time pricing with optimizations
  calculateRealTimePricing(
    flowData: GuidedFlowData,
    estimateId?: string,
  ): RealTimePricingResult {
    const result = this.performCalculation(flowData);

    // Cache result
    if (estimateId) {
      this.lastResults.set(estimateId, result);
    }

    return result;
  }

  // OPTIMIZED: Main calculation with caching
  private performCalculation(flowData: GuidedFlowData): RealTimePricingResult {
    const serviceBreakdown: ServicePricingBreakdown[] = [];
    const adjustments: PricingAdjustment[] = [];
    const missingData: string[] = [];
    const warnings: string[] = [];
    let totalCost = 0;
    let totalHours = 0;
    let totalArea = 0;
    let overallConfidence: "high" | "medium" | "low" = "high";

    // Extract selected services
    const selectedServices = flowData.scopeDetails?.selectedServices || [];

    if (selectedServices.length === 0) {
      missingData.push("No services selected");
      overallConfidence = "low";
    }

    // OPTIMIZED: Calculate each service with caching
    for (const serviceType of selectedServices) {
      try {
        const serviceCalc = this.calculateServicePricing(serviceType, flowData);

        if (serviceCalc) {
          serviceBreakdown.push(serviceCalc);
          totalCost += serviceCalc.adjustedPrice;
          totalHours += serviceCalc.hours;
          totalArea += serviceCalc.area;

          // Update confidence
          if (serviceCalc.confidence === "low") {
            overallConfidence = "low";
          } else if (
            serviceCalc.confidence === "medium" &&
            overallConfidence === "high"
          ) {
            overallConfidence = "medium";
          }
        }
      } catch (error) {
        warnings.push(
          `Failed to calculate ${serviceType}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Apply pricing adjustments
    if (flowData.pricing) {
      const pricingAdjustments = this.extractPricingAdjustments(
        flowData.pricing,
        totalCost,
      );
      adjustments.push(...pricingAdjustments);

      // Apply adjustments to total
      for (const adj of pricingAdjustments) {
        if (adj.percentage) {
          totalCost *= 1 + adj.value / 100;
        } else {
          totalCost += adj.value;
        }
      }
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      totalArea: Math.round(totalArea * 100) / 100,
      serviceBreakdown,
      adjustments,
      confidence: overallConfidence,
      missingData,
      warnings,
      lastUpdated: new Date(),
    };
  }

  // OPTIMIZED: Service pricing calculation with caching
  private calculateServicePricing(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServicePricingBreakdown | null {
    const calculation = this.getCachedOrCalculateService(serviceType, flowData);

    if (!calculation) {
      return null;
    }

    return {
      serviceType,
      serviceName: this.getServiceDisplayName(serviceType),
      basePrice: calculation.basePrice,
      adjustedPrice: calculation.basePrice,
      hours: calculation.totalHours,
      area: calculation.area,
      confidence: calculation.warnings.length > 0 ? "medium" : "high",
      calculations: calculation,
      dependencies: [],
    };
  }

  // Extract service form data from flow data
  private extractServiceFormData(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServiceFormData | null {
    // Implementation would extract relevant form data for the service type
    // This is a simplified version
    return {
      area: flowData.areaOfWork?.totalSquareFootage || 0,
      building_height_feet: flowData.areaOfWork?.averageHeight || 10,
      height: flowData.areaOfWork?.averageHeight || 10,
      accessType: "ladder",
      timeConstraints: undefined,
      specialRequirements: undefined,
      glassArea: undefined,
    } as ServiceFormData;
  }

  // Extract pricing adjustments
  private extractPricingAdjustments(
    pricingData: PricingStepData,
    baseTotal: number,
  ): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = [];

    // Example adjustments - would be based on actual pricing data structure
    if (pricingData.strategy?.markup) {
      adjustments.push({
        type: "markup",
        description: "Standard markup",
        value: pricingData.strategy.markup,
        percentage: true,
      });
    }

    return adjustments;
  }

  // Get service display name
  private getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      SW: "Soft Washing",
      BF: "Biofilm Removal",
      GR: "Glass Restoration",
      FR: "Frame Restoration",
      HD: "High Dusting",
      FC: "Final Clean",
      GRC: "Granite Reconditioning",
      PWS: "Pressure Wash & Seal",
      PD: "Parking Deck",
      GC: "General Cleaning",
    };

    return displayNames[serviceType] || serviceType;
  }

  // Listener management
  addListener(
    estimateId: string,
    callback: (result: RealTimePricingResult) => void,
  ): void {
    this.listeners.set(estimateId, callback);
  }

  removeListener(estimateId: string): void {
    this.listeners.delete(estimateId);
    this.clearUpdateTimer(estimateId);
    this.lastResults.delete(estimateId);
    this.dataFingerprints.delete(estimateId);
    this.batchedUpdates.delete(estimateId);
    // Clear related cache entries
    this.clearCacheForEstimate(estimateId);
  }

  // NEW: Clear cache entries for specific estimate
  private clearCacheForEstimate(estimateId: string): void {
    // This would clear cache entries related to the specific estimate
    // For now, we'll do a simple cleanup of old entries
    const now = Date.now();
    for (const [key, result] of this.calculationCache.entries()) {
      if (
        result.timestamp &&
        now - result.timestamp > this.config.maxCacheAge
      ) {
        this.calculationCache.delete(key);
      }
    }
  }

  private notifyListeners(
    estimateId: string,
    result: RealTimePricingResult,
  ): void {
    const listener = this.listeners.get(estimateId);
    if (listener) {
      listener(result);
    }
  }

  private clearUpdateTimer(estimateId: string): void {
    const timer = this.updateTimers.get(estimateId);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(estimateId);
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<RealTimePricingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RealTimePricingConfig {
    return { ...this.config };
  }

  // NEW: Performance monitoring methods
  getCacheStats(): {
    cacheSize: number;
    hitRate: number;
    memoryUsage: string;
  } {
    return {
      cacheSize: this.calculationCache.size,
      hitRate: 0, // Would implement hit rate tracking
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.calculationCache.entries())).length / 1024)} KB`,
    };
  }

  // NEW: Clear all caches (for memory management)
  clearCaches(): void {
    this.calculationCache.clear();
    this.dataFingerprints.clear();
    this.batchedUpdates.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // Cleanup method
  cleanup(): void {
    // Clear all timers
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Clear all data
    this.updateTimers.clear();
    this.listeners.clear();
    this.lastResults.clear();
    this.clearCaches();
  }
}

// Export singleton instance
export const optimizedRealTimePricingService =
  OptimizedRealTimePricingService.getInstance();
export default optimizedRealTimePricingService;

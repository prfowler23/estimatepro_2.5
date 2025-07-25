// Real-time Pricing Service
// Provides live cost calculations and updates throughout the guided workflow

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
  isPercentage: boolean;
  appliedTo: "total" | "labor" | "materials" | ServiceType;
}

export interface PricingDependency {
  stepId: string;
  fieldPath: string;
  affects: string[];
  validator?: (value: any) => boolean;
}

// Real-time pricing configuration
export interface RealTimePricingConfig {
  updateInterval: number; // milliseconds
  enableLiveUpdates: boolean;
  confidenceThreshold: number; // 0-1
  includeRiskAdjustments: boolean;
  enableDependencyTracking: boolean;
}

export class RealTimePricingService {
  private static instance: RealTimePricingService | null = null;
  private config: RealTimePricingConfig;
  private dependencies: Map<string, PricingDependency[]>;
  private listeners: Map<string, ((result: RealTimePricingResult) => void)[]>;
  private lastResults: Map<string, RealTimePricingResult>;
  private updateTimers: Map<string, NodeJS.Timeout>;

  private constructor(config: Partial<RealTimePricingConfig> = {}) {
    this.config = {
      updateInterval: 1000, // 1 second
      enableLiveUpdates: true,
      confidenceThreshold: 0.6,
      includeRiskAdjustments: true,
      enableDependencyTracking: true,
      ...config,
    };

    this.dependencies = new Map();
    this.listeners = new Map();
    this.lastResults = new Map();
    this.updateTimers = new Map();

    this.initializeDependencies();
  }

  static getInstance(
    config?: Partial<RealTimePricingConfig>,
  ): RealTimePricingService {
    if (!RealTimePricingService.instance) {
      RealTimePricingService.instance = new RealTimePricingService(config);
    }
    return RealTimePricingService.instance;
  }

  // Initialize dependency tracking
  private initializeDependencies(): void {
    const dependencies: Record<string, PricingDependency[]> = {
      "scope-details": [
        {
          stepId: "scope-details",
          fieldPath: "selectedServices",
          affects: ["takeoff", "duration", "expenses", "pricing"],
          validator: (services) =>
            Array.isArray(services) && services.length > 0,
        },
      ],
      "area-of-work": [
        {
          stepId: "area-of-work",
          fieldPath: "measurements.totalArea",
          affects: ["takeoff", "duration", "expenses", "pricing"],
          validator: (area) => typeof area === "number" && area > 0,
        },
        {
          stepId: "area-of-work",
          fieldPath: "buildingDetails.height",
          affects: ["duration", "expenses", "pricing"],
          validator: (height) => typeof height === "number" && height > 0,
        },
      ],
      takeoff: [
        {
          stepId: "takeoff",
          fieldPath: "measurements",
          affects: ["duration", "expenses", "pricing"],
          validator: (measurements) =>
            measurements && Object.keys(measurements).length > 0,
        },
      ],
      duration: [
        {
          stepId: "duration",
          fieldPath: "timeline.estimatedHours",
          affects: ["expenses", "pricing"],
          validator: (hours) => typeof hours === "number" && hours > 0,
        },
      ],
      expenses: [
        {
          stepId: "expenses",
          fieldPath: "breakdown",
          affects: ["pricing"],
          validator: (breakdown) => breakdown && breakdown.totalCost > 0,
        },
      ],
    };

    Object.entries(dependencies).forEach(([stepId, deps]) => {
      this.dependencies.set(stepId, deps);
    });
  }

  // Subscribe to live pricing updates
  subscribe(
    estimateId: string,
    callback: (result: RealTimePricingResult) => void,
  ): () => void {
    if (!this.listeners.has(estimateId)) {
      this.listeners.set(estimateId, []);
    }

    this.listeners.get(estimateId)!.push(callback);

    // Unsubscribe function
    return () => {
      const callbacks = this.listeners.get(estimateId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.listeners.delete(estimateId);
          this.clearUpdateTimer(estimateId);
        }
      }
    };
  }

  // Calculate real-time pricing
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

  // Update pricing with live recalculation
  updatePricing(
    flowData: GuidedFlowData,
    estimateId: string,
    changedStep?: string,
  ): void {
    if (!this.config.enableLiveUpdates) {
      return;
    }

    // Clear existing timer
    this.clearUpdateTimer(estimateId);

    // Set up debounced update
    const timer = setTimeout(() => {
      const result = this.calculateRealTimePricing(flowData, estimateId);
      this.notifyListeners(estimateId, result);
    }, this.config.updateInterval);

    this.updateTimers.set(estimateId, timer);
  }

  // Perform the actual calculation
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

    // Calculate each service
    for (const serviceType of selectedServices) {
      try {
        const serviceCalc = this.calculateServicePricing(serviceType, flowData);

        if (serviceCalc) {
          serviceBreakdown.push(serviceCalc);
          totalCost += serviceCalc.adjustedPrice;
          totalHours += serviceCalc.hours;
          totalArea += serviceCalc.area;

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

    // Apply pricing adjustments from pricing step
    if (flowData.pricing) {
      const pricingAdjustments = this.extractPricingAdjustments(
        flowData.pricing,
      );
      adjustments.push(...pricingAdjustments);

      // Apply adjustments to total cost
      for (const adj of pricingAdjustments) {
        if (adj.appliedTo === "total") {
          if (adj.isPercentage) {
            totalCost *= 1 + adj.value / 100;
          } else {
            totalCost += adj.value;
          }
        }
      }
    }

    // Apply risk adjustments if enabled
    if (this.config.includeRiskAdjustments) {
      const riskAdjustments = this.calculateRiskAdjustments(flowData);
      adjustments.push(...riskAdjustments);

      // Apply risk multipliers
      for (const adj of riskAdjustments) {
        if (adj.appliedTo === "total") {
          totalCost *= 1 + adj.value / 100;
        }
      }
    }

    // Check for missing critical data
    const calculatedTotalArea =
      flowData.areaOfWork?.measurements?.reduce(
        (sum, m) => sum + (m.type === "area" ? m.value : 0),
        0,
      ) || 0;
    if (!calculatedTotalArea) {
      missingData.push("Total area measurement");
    }
    if (!flowData.duration?.timeline?.estimatedHours) {
      missingData.push("Estimated duration");
    }

    // Determine confidence based on missing data
    if (missingData.length > 2) {
      overallConfidence = "low";
    } else if (missingData.length > 0) {
      overallConfidence = "medium";
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

  // Calculate pricing for individual service
  private calculateServicePricing(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServicePricingBreakdown | null {
    try {
      // Extract service-specific data
      const takeoffData =
        flowData.takeoff?.measurements?.[
          serviceType as keyof typeof flowData.takeoff.measurements
        ];
      const areaData = flowData.areaOfWork?.measurements;
      const durationData =
        flowData.duration?.serviceTimelines?.[
          serviceType as keyof typeof flowData.duration.serviceTimelines
        ];

      // Determine service area
      const area =
        takeoffData?.calculations?.totalArea ||
        areaData?.reduce(
          (sum, m) => sum + (m.type === "area" ? m.value : 0),
          0,
        ) ||
        0;

      if (area === 0) {
        return {
          serviceType,
          serviceName: CalculatorService.getServiceDisplayName(serviceType),
          basePrice: 0,
          adjustedPrice: 0,
          hours: 0,
          area: 0,
          confidence: "low",
          dependencies: ["area-of-work", "takeoff"],
        };
      }

      // Build form data for calculation
      const formData: ServiceFormData = this.buildServiceFormData(
        serviceType,
        flowData,
      );

      // Perform calculation using existing calculator service
      const calculation = CalculatorService.calculateService({
        serviceType,
        formData,
        buildingContext: {
          stories: flowData.areaOfWork?.buildingDetails?.stories || 1,
          heightFeet: flowData.areaOfWork?.buildingDetails?.height,
          buildingType:
            flowData.initialContact?.aiExtractedData?.requirements
              ?.buildingType,
          accessDifficulty: this.determineAccessDifficulty(flowData),
        },
      });

      return {
        serviceType,
        serviceName: CalculatorService.getServiceDisplayName(serviceType),
        basePrice: calculation.basePrice,
        adjustedPrice: calculation.basePrice, // Will be adjusted later
        hours: calculation.totalHours,
        area: calculation.area,
        confidence: "high",
        calculations: calculation,
      };
    } catch (error) {
      console.error(`Error calculating service ${serviceType}:`, error);
      return null;
    }
  }

  // Build service form data from flow data
  private buildServiceFormData(
    serviceType: ServiceType,
    flowData: GuidedFlowData,
  ): ServiceFormData {
    const areaData = flowData.areaOfWork?.measurements;
    const takeoffArea =
      flowData.takeoff?.takeoffData?.calculations?.totalArea || 0;

    const baseData = {
      area:
        takeoffArea ||
        areaData?.reduce(
          (sum, m) => sum + (m.type === "area" ? m.value : 0),
          0,
        ) ||
        0,
      building_height_feet:
        flowData.areaOfWork?.buildingDetails?.height || null,
      accessType: this.determineAccessType(flowData) as
        | "ladder"
        | "lift"
        | "scaffold"
        | "rope",
      timeConstraints: flowData.duration?.constraints?.timeConstraints,
      specialRequirements: flowData.scopeDetails?.requirements?.special,
    };

    // Add service-specific data based on type
    switch (serviceType) {
      case "WC":
        return {
          ...baseData,
          windowType: "standard",
          interiorCleaning: true,
          screenCleaning: false,
          sillCleaning: true,
          frequency: "one-time",
        };

      case "PW":
      case "PWS":
        return {
          ...baseData,
          surfaceType: "concrete",
          pressure: 3000,
          detergentRequired: true,
          waterRecovery: false,
          environmentalConcerns: false,
          requiresSealing: serviceType === "PWS",
        };

      case "GR":
        return {
          ...baseData,
          damageType: "mineral-deposits",
          severityLevel: "moderate",
          glassType: "standard",
          treatmentMethod: "chemical",
        };

      default:
        return baseData;
    }
  }

  // Extract pricing adjustments from pricing step data
  private extractPricingAdjustments(
    pricingData: PricingStepData,
  ): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = [];

    // Extract markup/margin
    if (pricingData.strategy?.markup) {
      adjustments.push({
        type: "markup",
        description: "Profit margin",
        value: pricingData.strategy.markup,
        isPercentage: true,
        appliedTo: "total",
      });
    }

    // Extract discounts
    if (pricingData.strategy?.discount) {
      adjustments.push({
        type: "discount",
        description: "Customer discount",
        value: -pricingData.strategy.discount,
        isPercentage: true,
        appliedTo: "total",
      });
    }

    // Extract other adjustments if available
    if (pricingData.breakdown?.adjustments) {
      for (const adj of pricingData.breakdown.adjustments) {
        adjustments.push({
          type: adj.type || "markup",
          description: adj.description || "Pricing adjustment",
          value: adj.value || 0,
          isPercentage: adj.isPercentage ?? true,
          appliedTo: adj.appliedTo || "total",
        });
      }
    }

    return adjustments;
  }

  // Calculate risk-based adjustments
  private calculateRiskAdjustments(
    flowData: GuidedFlowData,
  ): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = [];

    // Height risk
    const height = flowData.areaOfWork?.buildingDetails?.height || 0;
    if (height > 50) {
      adjustments.push({
        type: "risk",
        description: "High building risk premium",
        value: 15, // 15% increase
        isPercentage: true,
        appliedTo: "total",
      });
    } else if (height > 25) {
      adjustments.push({
        type: "risk",
        description: "Medium height risk premium",
        value: 8, // 8% increase
        isPercentage: true,
        appliedTo: "total",
      });
    }

    // Timeline risk
    const timeline = flowData.duration?.timeline;
    if (timeline?.urgency === "urgent") {
      adjustments.push({
        type: "risk",
        description: "Rush job premium",
        value: 25, // 25% increase
        isPercentage: true,
        appliedTo: "total",
      });
    }

    // Access difficulty
    const accessType = this.determineAccessType(flowData);
    if (accessType === "rope") {
      adjustments.push({
        type: "risk",
        description: "Rope access premium",
        value: 30, // 30% increase
        isPercentage: true,
        appliedTo: "total",
      });
    } else if (accessType === "scaffold") {
      adjustments.push({
        type: "risk",
        description: "Scaffolding setup premium",
        value: 15, // 15% increase
        isPercentage: true,
        appliedTo: "total",
      });
    }

    return adjustments;
  }

  // Helper methods
  private determineAccessType(flowData: GuidedFlowData): string {
    const height = flowData.areaOfWork?.buildingDetails?.height || 0;

    if (height > 100) return "rope";
    if (height > 40) return "scaffold";
    if (height > 20) return "lift";
    return "ladder";
  }

  private determineAccessDifficulty(
    flowData: GuidedFlowData,
  ): "easy" | "moderate" | "difficult" {
    const height = flowData.areaOfWork?.buildingDetails?.height || 0;

    if (height > 50) return "difficult";
    if (height > 25) return "moderate";
    return "easy";
  }

  // Utility methods
  private notifyListeners(
    estimateId: string,
    result: RealTimePricingResult,
  ): void {
    const listeners = this.listeners.get(estimateId);
    if (listeners) {
      listeners.forEach((callback) => callback(result));
    }
  }

  private clearUpdateTimer(estimateId: string): void {
    const timer = this.updateTimers.get(estimateId);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(estimateId);
    }
  }

  // Get last calculated result
  getLastResult(estimateId: string): RealTimePricingResult | null {
    return this.lastResults.get(estimateId) || null;
  }

  // Check if step changes affect pricing
  doesStepAffectPricing(stepId: string, changedField?: string): boolean {
    const stepDeps = this.dependencies.get(stepId);
    if (!stepDeps) return false;

    if (!changedField) return true;

    return stepDeps.some(
      (dep) =>
        dep.fieldPath === changedField ||
        dep.fieldPath.startsWith(changedField + ".") ||
        changedField.startsWith(dep.fieldPath + "."),
    );
  }

  // Cleanup
  cleanup(): void {
    // Clear all timers
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();
    this.listeners.clear();
    this.lastResults.clear();
  }
}

export default RealTimePricingService;

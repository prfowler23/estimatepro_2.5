// Unified Resource Service - Combines equipment, materials, vendor, and calculator services
// Consolidates equipment-materials-service, vendor-service, and calculator-service
// into a single unified resource management service

import { createClient } from "@/lib/supabase/universal-client";
import {
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
} from "@/lib/types/estimate-types";
import { CalculatorFactory } from "../calculations/services/calculator-factory";
import type { Database } from "@/types/supabase";

// ================================
// EQUIPMENT & MATERIALS TYPES
// ================================

export interface EquipmentItem {
  id: string;
  category: string;
  name: string;
  description: string;
  manufacturer?: string;
  model?: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  replacementCost?: number;
  specifications: Record<string, any>;
  availabilityStatus: "available" | "unavailable" | "maintenance";
  vendors: EquipmentVendor[];
}

export interface EquipmentVendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  rating?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deliveryFee?: number;
  pickupFee?: number;
  minimumRentalDays?: number;
}

export interface MaterialItem {
  id: string;
  category: string;
  name: string;
  description: string;
  brand?: string;
  sku?: string;
  unitOfMeasure: string;
  costPerUnit: number;
  coverageRate?: number;
  dilutionRatio?: string;
  environmentalImpactRating?: "low" | "medium" | "high";
  specifications: Record<string, any>;
  vendors: MaterialVendor[];
}

export interface MaterialVendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  rating?: number;
  costPerUnit?: number;
  minimumOrder?: number;
  bulkDiscounts?: Array<{ quantity: number; discount: number }>;
  deliveryFee?: number;
  leadTimeDays?: number;
}

// ================================
// VENDOR MANAGEMENT TYPES
// ================================

export interface Vendor {
  id: string;
  name: string;
  type: "equipment" | "materials" | "both";
  rating: number;
  reliability: number;
  preferredVendor: boolean;
  contact: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  paymentTerms?: string;
  deliveryRadius?: number;
  specialties?: string[];
  notes?: string;
}

export interface VendorPricing {
  vendorId: string;
  equipmentId?: string;
  materialId?: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  unitCost?: number;
  available: boolean;
  leadTime?: number;
  minOrder?: number;
  deliveryCharge?: number;
  bulkDiscounts?: { quantity: number; discount: number }[];
}

export interface EquipmentWithVendors {
  id: string;
  name: string;
  category: string;
  description: string;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  specifications: Record<string, any>;
  vendors: VendorPricing[];
}

// ================================
// CALCULATOR TYPES
// ================================

export interface CalculationParams {
  serviceType: ServiceType;
  formData: ServiceFormData;
  buildingContext?: {
    stories: number;
    heightFeet?: number;
    buildingType?: string;
    accessDifficulty?: "easy" | "moderate" | "difficult";
  };
  marketFactors?: {
    laborRate?: number;
    materialMarkup?: number;
    equipmentRates?: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ================================
// RESOURCE ALLOCATION TYPES
// ================================

export interface ResourceRequirement {
  id: string;
  serviceType: ServiceType;
  category: "equipment" | "material" | "labor";
  itemId: string;
  quantity: number;
  duration?: number; // For equipment rental
  preferences?: {
    preferredVendors?: string[];
    maxCostPerUnit?: number;
    qualityRequirement?: "basic" | "standard" | "premium";
  };
}

export interface ResourceAllocation {
  requirement: ResourceRequirement;
  selectedVendor: Vendor;
  pricing: VendorPricing;
  totalCost: number;
  availability: boolean;
  leadTime: number;
  alternatives: Array<{
    vendor: Vendor;
    pricing: VendorPricing;
    costDifference: number;
  }>;
}

// ================================
// UNIFIED RESOURCE SERVICE
// ================================

export class UnifiedResourceService {
  // ================================
  // EQUIPMENT MANAGEMENT
  // ================================

  /**
   * Get all available equipment
   */
  async getEquipment(category?: string): Promise<EquipmentItem[]> {
    const supabase = createClient();

    let query = supabase
      .from("equipment")
      .select("*, equipment_vendors(*)")
      .eq("availability_status", "available");

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching equipment:", error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || "",
      manufacturer: item.manufacturer,
      model: item.model,
      dailyRate: item.daily_rate,
      weeklyRate: item.weekly_rate,
      monthlyRate: item.monthly_rate,
      replacementCost: item.replacement_cost,
      specifications: item.specifications || {},
      availabilityStatus: item.availability_status as
        | "available"
        | "unavailable"
        | "maintenance",
      vendors: (item.equipment_vendors || []).map((v: any) => ({
        id: v.vendor_id,
        name: v.vendor_name || "",
        contactEmail: v.contact_email,
        contactPhone: v.contact_phone,
        website: v.website,
        rating: v.rating,
        dailyRate: v.daily_rate,
        weeklyRate: v.weekly_rate,
        monthlyRate: v.monthly_rate,
        deliveryFee: v.delivery_fee,
        pickupFee: v.pickup_fee,
        minimumRentalDays: v.minimum_rental_days,
      })),
    }));
  }

  /**
   * Get equipment by service type
   */
  async getEquipmentByService(
    serviceType: ServiceType,
  ): Promise<EquipmentItem[]> {
    const serviceEquipmentMap: Record<ServiceType, string[]> = {
      WC: ["window-cleaning", "scaffolding"],
      PW: ["pressure-washing", "scaffolding"],
      SW: ["soft-washing", "pressure-washing"],
      BR: ["biofilm-cleaning"],
      GR: ["glass-restoration", "scaffolding"],
      FR: ["frame-restoration", "scaffolding"],
      HD: ["high-dusting", "scaffolding"],
      FC: ["final-cleaning"],
      GRC: ["granite-restoration"],
      PWS: ["pressure-washing", "sealing"],
      PD: ["pressure-washing", "heavy-duty"],
    };

    const categories = serviceEquipmentMap[serviceType] || [];
    const allEquipment = await this.getEquipment();

    return allEquipment.filter((eq) =>
      categories.some((cat) => eq.category.includes(cat)),
    );
  }

  // ================================
  // MATERIALS MANAGEMENT
  // ================================

  /**
   * Get all available materials
   */
  async getMaterials(category?: string): Promise<MaterialItem[]> {
    const supabase = createClient();

    let query = supabase.from("materials").select("*, material_vendors(*)");

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching materials:", error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description || "",
      brand: item.brand,
      sku: item.sku,
      unitOfMeasure: item.unit_of_measure,
      costPerUnit: item.cost_per_unit,
      coverageRate: item.coverage_rate,
      dilutionRatio: item.dilution_ratio,
      environmentalImpactRating: item.environmental_impact_rating as
        | "low"
        | "medium"
        | "high",
      specifications: item.specifications || {},
      vendors: (item.material_vendors || []).map((v: any) => ({
        id: v.vendor_id,
        name: v.vendor_name || "",
        contactEmail: v.contact_email,
        contactPhone: v.contact_phone,
        website: v.website,
        rating: v.rating,
        costPerUnit: v.cost_per_unit,
        minimumOrder: v.minimum_order,
        bulkDiscounts: v.bulk_discounts || [],
        deliveryFee: v.delivery_fee,
        leadTimeDays: v.lead_time_days,
      })),
    }));
  }

  /**
   * Get materials by service type
   */
  async getMaterialsByService(
    serviceType: ServiceType,
  ): Promise<MaterialItem[]> {
    const serviceMaterialMap: Record<ServiceType, string[]> = {
      WC: ["window-cleaning", "detergents"],
      PW: ["pressure-washing", "detergents"],
      SW: ["soft-washing", "chemicals"],
      BR: ["biofilm-removal", "chemicals"],
      GR: ["glass-restoration", "polishing"],
      FR: ["frame-restoration", "restoration"],
      HD: ["dusting", "cleaning"],
      FC: ["final-cleaning", "detergents"],
      GRC: ["granite", "restoration"],
      PWS: ["pressure-washing", "sealants"],
      PD: ["pressure-washing", "heavy-duty"],
    };

    const categories = serviceMaterialMap[serviceType] || [];
    const allMaterials = await this.getMaterials();

    return allMaterials.filter((mat) =>
      categories.some((cat) => mat.category.includes(cat)),
    );
  }

  // ================================
  // VENDOR MANAGEMENT
  // ================================

  /**
   * Get all vendors
   */
  async getVendors(
    type?: "equipment" | "materials" | "both",
  ): Promise<Vendor[]> {
    const supabase = createClient();

    let query = supabase.from("vendors").select("*");

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching vendors:", error);
      return [];
    }

    return (data || []).map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      type: vendor.type as "equipment" | "materials" | "both",
      rating: vendor.rating || 0,
      reliability: vendor.reliability || 0,
      preferredVendor: vendor.preferred_vendor || false,
      contact: {
        name: vendor.contact_name,
        phone: vendor.contact_phone,
        email: vendor.contact_email,
        address: vendor.contact_address,
      },
      paymentTerms: vendor.payment_terms,
      deliveryRadius: vendor.delivery_radius,
      specialties: vendor.specialties || [],
      notes: vendor.notes,
    }));
  }

  /**
   * Get vendor pricing for specific items
   */
  async getVendorPricing(
    vendorId: string,
    itemType: "equipment" | "material",
    itemId?: string,
  ): Promise<VendorPricing[]> {
    const supabase = createClient();

    const table =
      itemType === "equipment"
        ? "equipment_vendor_pricing"
        : "material_vendor_pricing";

    let query = supabase.from(table).select("*").eq("vendor_id", vendorId);

    if (itemId) {
      const itemColumn =
        itemType === "equipment" ? "equipment_id" : "material_id";
      query = query.eq(itemColumn, itemId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching vendor pricing:", error);
      return [];
    }

    return (data || []).map((pricing) => ({
      vendorId: pricing.vendor_id,
      equipmentId: pricing.equipment_id,
      materialId: pricing.material_id,
      dailyRate: pricing.daily_rate,
      weeklyRate: pricing.weekly_rate,
      monthlyRate: pricing.monthly_rate,
      unitCost: pricing.unit_cost,
      available: pricing.available || false,
      leadTime: pricing.lead_time,
      minOrder: pricing.min_order,
      deliveryCharge: pricing.delivery_charge,
      bulkDiscounts: pricing.bulk_discounts || [],
    }));
  }

  // ================================
  // CALCULATOR INTEGRATION
  // ================================

  /**
   * Calculate service with resource integration
   */
  static calculateService(params: CalculationParams): ServiceCalculationResult {
    const calculator = CalculatorFactory.create(params);
    const validation = calculator.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }
    return calculator.calculate();
  }

  /**
   * Calculate from AI tool parameters
   */
  async calculate(
    serviceType: string,
    parameters: Record<string, any>,
    userId?: string,
  ): Promise<ServiceCalculationResult> {
    // Map common service type aliases
    const serviceTypeMap: Record<string, ServiceType> = {
      "window-cleaning": "WC",
      "pressure-washing": "PW",
      "soft-washing": "SW",
      "biofilm-removal": "BR",
      "glass-restoration": "GR",
      "frame-restoration": "FR",
      "high-dusting": "HD",
      "final-cleaning": "FC",
      "granite-reconditioning": "GRC",
      "pressure-wash-seal": "PWS",
      "parking-deck": "PD",
    };

    const mappedServiceType =
      serviceTypeMap[serviceType] || (serviceType as ServiceType);

    const calculationParams: CalculationParams = {
      serviceType: mappedServiceType,
      formData: {
        serviceType: mappedServiceType,
        ...parameters,
      } as ServiceFormData,
      buildingContext: {
        stories: parameters.stories || 1,
        heightFeet: parameters.heightFeet,
        buildingType: parameters.buildingType,
        accessDifficulty: parameters.accessDifficulty || "moderate",
      },
    };

    return UnifiedResourceService.calculateService(calculationParams);
  }

  // ================================
  // RESOURCE ALLOCATION
  // ================================

  /**
   * Allocate resources for a service
   */
  async allocateResources(
    requirements: ResourceRequirement[],
  ): Promise<ResourceAllocation[]> {
    const allocations: ResourceAllocation[] = [];

    for (const requirement of requirements) {
      const allocation = await this.allocateResource(requirement);
      if (allocation) {
        allocations.push(allocation);
      }
    }

    return allocations;
  }

  /**
   * Allocate a single resource
   */
  private async allocateResource(
    requirement: ResourceRequirement,
  ): Promise<ResourceAllocation | null> {
    // Get available vendors for this resource type
    const vendorType =
      requirement.category === "equipment" ? "equipment" : "materials";
    const vendors = await this.getVendors(vendorType);

    if (vendors.length === 0) {
      return null;
    }

    // Get pricing from all vendors
    const vendorOptions: Array<{
      vendor: Vendor;
      pricing: VendorPricing;
      totalCost: number;
      leadTime: number;
    }> = [];

    for (const vendor of vendors) {
      const pricingList = await this.getVendorPricing(
        vendor.id,
        requirement.category === "equipment" ? "equipment" : "material",
        requirement.itemId,
      );

      for (const pricing of pricingList) {
        if (!pricing.available) continue;

        let totalCost = 0;

        if (requirement.category === "equipment" && requirement.duration) {
          // Calculate equipment rental cost
          if (requirement.duration <= 1 && pricing.dailyRate) {
            totalCost = pricing.dailyRate * requirement.quantity;
          } else if (requirement.duration <= 7 && pricing.weeklyRate) {
            totalCost = pricing.weeklyRate * requirement.quantity;
          } else if (pricing.monthlyRate) {
            totalCost = pricing.monthlyRate * requirement.quantity;
          }
        } else if (pricing.unitCost) {
          // Calculate material cost
          totalCost = pricing.unitCost * requirement.quantity;
        }

        // Apply bulk discounts if available
        if (pricing.bulkDiscounts) {
          const applicableDiscount = pricing.bulkDiscounts
            .filter((d) => requirement.quantity >= d.quantity)
            .sort((a, b) => b.discount - a.discount)[0];

          if (applicableDiscount) {
            totalCost *= 1 - applicableDiscount.discount / 100;
          }
        }

        // Add delivery charges
        if (pricing.deliveryCharge) {
          totalCost += pricing.deliveryCharge;
        }

        vendorOptions.push({
          vendor,
          pricing,
          totalCost,
          leadTime: pricing.leadTime || 0,
        });
      }
    }

    if (vendorOptions.length === 0) {
      return null;
    }

    // Sort by cost and select best option
    vendorOptions.sort((a, b) => {
      // Preferred vendors get priority
      if (a.vendor.preferredVendor && !b.vendor.preferredVendor) return -1;
      if (!a.vendor.preferredVendor && b.vendor.preferredVendor) return 1;

      // Then by cost
      return a.totalCost - b.totalCost;
    });

    const bestOption = vendorOptions[0];
    const alternatives = vendorOptions
      .slice(1, 4) // Top 3 alternatives
      .map((option) => ({
        vendor: option.vendor,
        pricing: option.pricing,
        costDifference: option.totalCost - bestOption.totalCost,
      }));

    return {
      requirement,
      selectedVendor: bestOption.vendor,
      pricing: bestOption.pricing,
      totalCost: bestOption.totalCost,
      availability: bestOption.pricing.available,
      leadTime: bestOption.leadTime,
      alternatives,
    };
  }

  // ================================
  // PERFORMANCE MONITORING METHODS
  // ================================

  private isMonitoring: boolean = false;
  private resourceMetrics: Record<string, any> = {};

  /**
   * Get current resource status
   */
  getResourceStatus(): {
    memory: { used: number; total: number; percentage: number };
    cpu: { usage: number };
    database: { connections: number; maxConnections: number };
    cache: { hitRate: number; size: number };
    isHealthy: boolean;
  } {
    // Mock resource status for testing/development
    const memory = {
      used: 150,
      total: 1024,
      percentage: (150 / 1024) * 100,
    };

    const cpu = { usage: 25 };

    const database = {
      connections: 5,
      maxConnections: 100,
    };

    const cache = {
      hitRate: 0.85,
      size: 50,
    };

    const isHealthy =
      memory.percentage < 80 &&
      cpu.usage < 80 &&
      database.connections < database.maxConnections * 0.8 &&
      cache.hitRate > 0.7;

    return {
      memory,
      cpu,
      database,
      cache,
      isHealthy,
    };
  }

  /**
   * Optimize resource allocation and performance
   */
  async optimizeResources(): Promise<{
    success: boolean;
    optimizations: string[];
    metrics: Record<string, any>;
  }> {
    const optimizations: string[] = [];

    // Simulate optimization operations
    const status = this.getResourceStatus();

    if (status.memory.percentage > 70) {
      optimizations.push("Memory optimization applied");
    }

    if (status.cpu.usage > 60) {
      optimizations.push("CPU optimization applied");
    }

    if (status.cache.hitRate < 0.8) {
      optimizations.push("Cache optimization applied");
    }

    if (status.database.connections > status.database.maxConnections * 0.6) {
      optimizations.push("Database connection optimization applied");
    }

    // Update metrics
    this.resourceMetrics = {
      ...this.resourceMetrics,
      lastOptimization: new Date().toISOString(),
      optimizationsApplied: optimizations.length,
    };

    return {
      success: true,
      optimizations,
      metrics: this.resourceMetrics,
    };
  }

  /**
   * Start performance monitoring
   */
  monitorPerformance(): void {
    if (this.isMonitoring) {
      return; // Already monitoring
    }

    this.isMonitoring = true;
    this.resourceMetrics = {
      ...this.resourceMetrics,
      monitoringStarted: new Date().toISOString(),
      isActive: true,
    };

    // In a real implementation, this would set up interval monitoring
    // For testing purposes, we just set the flag
  }

  /**
   * Cleanup resources and stop monitoring
   */
  cleanup(): void {
    this.isMonitoring = false;
    this.resourceMetrics = {
      ...this.resourceMetrics,
      monitoringStopped: new Date().toISOString(),
      isActive: false,
    };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Get resource cost estimate
   */
  async getResourceCostEstimate(
    serviceType: ServiceType,
    quantity: number = 1,
    duration?: number,
  ): Promise<{
    equipment: number;
    materials: number;
    total: number;
  }> {
    const equipment = await this.getEquipmentByService(serviceType);
    const materials = await this.getMaterialsByService(serviceType);

    let equipmentCost = 0;
    let materialsCost = 0;

    // Calculate equipment costs
    for (const item of equipment) {
      if (duration && duration <= 1) {
        equipmentCost += item.dailyRate * quantity;
      } else if (duration && duration <= 7 && item.weeklyRate) {
        equipmentCost += item.weeklyRate * quantity;
      } else if (item.monthlyRate) {
        equipmentCost += item.monthlyRate * quantity;
      }
    }

    // Calculate materials costs
    for (const item of materials) {
      materialsCost += item.costPerUnit * quantity;
    }

    return {
      equipment: equipmentCost,
      materials: materialsCost,
      total: equipmentCost + materialsCost,
    };
  }
}

// Export singleton instance
export const unifiedResourceService = new UnifiedResourceService();

// Legacy exports for backward compatibility
export { unifiedResourceService as equipmentMaterialsService };
export { unifiedResourceService as EquipmentMaterialsService };
export { unifiedResourceService as vendorService };
export { unifiedResourceService as VendorService };
export { unifiedResourceService as calculatorService };
export { unifiedResourceService as CalculatorService };
export { UnifiedResourceService as ResourceService };

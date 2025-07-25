import {
  Material,
  MeasurementEntry,
  MaterialRequirement,
  VendorPricing,
} from "./types";
import { EquipmentMaterialsService } from "@/lib/services/equipment-materials-service";
import MATERIALS_DATABASE from "./materials.json";

export class MaterialCalculator {
  /**
   * Calculate required materials based on services and measurements
   * Uses dynamic service when available, falls back to static data
   */
  calculateRequiredMaterials(
    services: string[],
    measurements: MeasurementEntry[],
  ): MaterialRequirement[] {
    // Try to use dynamic service first
    try {
      const dynamicMaterials = EquipmentMaterialsService.getMaterials();

      if (dynamicMaterials.length > 0) {
        return this.calculateFromDynamicMaterials(
          dynamicMaterials,
          services,
          measurements,
        );
      }
    } catch (error) {
      console.warn(
        "Failed to load dynamic materials data, using static fallback:",
        error,
      );
    }

    // Fallback to static data
    const requirements: MaterialRequirement[] = [];

    services.forEach((service) => {
      const materials = MATERIALS_DATABASE.filter((m) =>
        m.requiredFor.includes(service),
      );

      materials.forEach((material) => {
        const baseQuantity = this.calculateQuantity(
          material,
          service,
          measurements,
        );
        if (baseQuantity > 0) {
          const waste = this.getWastePercentage(material, service);
          const adjustedQuantity = Math.ceil(baseQuantity * (1 + waste / 100));
          const coverage = this.calculateCoverage(
            material,
            service,
            measurements,
          );

          requirements.push({
            material,
            quantity: baseQuantity,
            adjustedQuantity,
            service,
            totalCost: adjustedQuantity * material.unitCost,
            coverage,
            waste,
            notes: this.generateMaterialNotes(
              material,
              service,
              adjustedQuantity,
            ),
          });
        }
      });
    });

    // Consolidate duplicate materials across services
    return this.consolidateMaterials(requirements);
  }

  /**
   * Calculate materials from dynamic service data
   */
  private calculateFromDynamicMaterials(
    dynamicMaterials: any[],
    services: string[],
    measurements: MeasurementEntry[],
  ): MaterialRequirement[] {
    const requirements: MaterialRequirement[] = [];

    services.forEach((service) => {
      const materials = dynamicMaterials.filter((m) =>
        this.isRequiredForService(m, service),
      );

      materials.forEach((material) => {
        const convertedMaterial = this.convertDynamicToStatic(material);
        const baseQuantity = this.calculateQuantity(
          convertedMaterial,
          service,
          measurements,
        );
        if (baseQuantity > 0) {
          const waste = this.getWastePercentage(convertedMaterial, service);
          const adjustedQuantity = Math.ceil(baseQuantity * (1 + waste / 100));
          const coverage = this.calculateCoverage(
            convertedMaterial,
            service,
            measurements,
          );

          requirements.push({
            material: convertedMaterial,
            quantity: baseQuantity,
            adjustedQuantity,
            service,
            totalCost: adjustedQuantity * convertedMaterial.unitCost,
            coverage,
            waste,
            notes: this.generateMaterialNotes(
              convertedMaterial,
              service,
              adjustedQuantity,
            ),
          });
        }
      });
    });

    return this.consolidateMaterials(requirements);
  }

  /**
   * Check if dynamic material is required for service
   */
  private isRequiredForService(material: any, service: string): boolean {
    const categoryServiceMap: Record<string, string[]> = {
      "Cleaning Chemicals": [
        "BWP",
        "BWS",
        "PWF",
        "PWP",
        "WC",
        "HFS",
        "IW",
        "PC",
      ],
      "Restoration Materials": ["GR"],
      "Sealers & Coatings": ["BWS", "DC"],
      "Safety Materials": [
        "BWP",
        "BWS",
        "WC",
        "GR",
        "PWF",
        "PWP",
        "HFS",
        "PC",
        "DC",
      ],
    };

    const services = categoryServiceMap[material.category] || [];
    return services.includes(service);
  }

  /**
   * Convert dynamic material data to static format
   */
  private convertDynamicToStatic(dynamicMat: any): Material {
    return {
      id: dynamicMat.id,
      name: dynamicMat.name,
      category: this.mapDynamicMaterialCategory(dynamicMat.category),
      unit: this.mapUnit(dynamicMat.unitOfMeasure),
      unitCost: dynamicMat.costPerUnit,
      coverage: dynamicMat.coverageRate,
      dilutionRatio: this.parseDilutionRatio(dynamicMat.dilutionRatio),
      shelfLife: 24, // Default shelf life
      requiredFor: this.getRequiredServices(dynamicMat.category),
      vendors: dynamicMat.vendors.map((v: any) => ({
        vendorId: v.id,
        unitCost: v.costPerUnit,
        minOrder: v.minimumQuantity || 1,
        available: true,
        leadTime: v.leadTimeDays || 1,
      })),
      description: dynamicMat.description,
      hazardous: dynamicMat.environmentalImpactRating === "high",
      alternatives: [],
    };
  }

  /**
   * Map dynamic material category to static category
   */
  private mapDynamicMaterialCategory(category: string): Material["category"] {
    const categoryMap: Record<string, Material["category"]> = {
      "Cleaning Chemicals": "chemical",
      "Restoration Materials": "restoration",
      "Sealers & Coatings": "sealant",
      "Safety Materials": "safety",
    };
    return categoryMap[category] || "consumable";
  }

  /**
   * Map unit of measure to our format
   */
  private mapUnit(unit: string): Material["unit"] {
    const unitMap: Record<string, Material["unit"]> = {
      gallon: "gallon",
      pound: "pound",
      each: "each",
      bottle: "bottle",
      bucket: "bucket",
      linear_foot: "linear_foot",
      box: "box",
    };
    return unitMap[unit] || "each";
  }

  /**
   * Parse dilution ratio from string format
   */
  private parseDilutionRatio(ratio: string): number | undefined {
    if (!ratio || ratio === "concentrate" || ratio === "ready-to-use") {
      return undefined;
    }

    // Parse "1:20" format
    const match = ratio.match(/1:(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }

    return undefined;
  }

  /**
   * Get required services for material category
   */
  private getRequiredServices(category: string): string[] {
    const serviceMap: Record<string, string[]> = {
      "Cleaning Chemicals": ["BWP", "BWS", "PWF", "PWP", "WC", "HFS"],
      "Restoration Materials": ["GR"],
      "Sealers & Coatings": ["BWS", "DC"],
      "Safety Materials": [
        "BWP",
        "BWS",
        "WC",
        "GR",
        "PWF",
        "PWP",
        "HFS",
        "PC",
        "DC",
      ],
    };
    return serviceMap[category] || ["WC"];
  }

  /**
   * Calculate base quantity needed for a material
   */
  private calculateQuantity(
    material: Material,
    service: string,
    measurements: MeasurementEntry[],
  ): number {
    if (!material.coverage) {
      // Non-coverage based materials (tools, safety items, consumables)
      return this.getFixedQuantity(material, service);
    }

    let totalArea = 0;

    switch (service) {
      case "BWP":
      case "BWS":
        totalArea = measurements
          .filter(
            (m) =>
              m.category.startsWith("facade_") || m.category === "flat_surface",
          )
          .reduce((sum, m) => sum + m.total, 0);
        break;

      case "WC":
      case "GR":
        totalArea = measurements
          .filter((m) => m.category === "glass_windows")
          .reduce((sum, m) => sum + m.total, 0);
        break;

      case "PWF":
      case "PWP":
      case "PC":
        totalArea = measurements
          .filter((m) => m.category === "flat_surface")
          .reduce((sum, m) => sum + m.total, 0);
        break;

      case "HFS":
        totalArea = measurements
          .filter((m) => m.category === "interior_floor")
          .reduce((sum, m) => sum + m.total, 0);
        break;

      case "IW":
        totalArea = measurements
          .filter((m) => m.category === "interior_wall")
          .reduce((sum, m) => sum + m.total, 0);
        break;

      case "DC":
        totalArea = measurements
          .filter((m) => m.category === "deck_surface")
          .reduce((sum, m) => sum + m.total, 0);
        break;
    }

    // Apply dilution ratio if applicable
    let effectiveCoverage = material.coverage;
    if (material.dilutionRatio) {
      effectiveCoverage = material.coverage * material.dilutionRatio;
    }

    return totalArea / effectiveCoverage;
  }

  /**
   * Get fixed quantity for non-coverage materials
   */
  private getFixedQuantity(material: Material, service: string): number {
    // Base quantities for consumables and safety items
    const fixedQuantities: Record<string, Record<string, number>> = {
      "caution-tape": { default: 1 },
      "drop-cloths": { GR: 2, IW: 1, HFS: 1 },
      "plastic-sheeting": { BWP: 1, BWS: 1, GR: 1, DC: 1 },
      "squeegee-rubber": { WC: 1 },
      "scrubber-sleeves": { WC: 1 },
      "polishing-pads": { GR: 1 },
      "scrubber-pads": { HFS: 1 },
      "rags-cotton": { default: 1 },
      "paper-towels": { default: 1 },
      "gum-remover": { PC: 2 },
    };

    const materialQuantities = fixedQuantities[material.id];
    if (!materialQuantities) return 1;

    return materialQuantities[service] || materialQuantities["default"] || 1;
  }

  /**
   * Calculate waste percentage based on material type and service
   */
  private getWastePercentage(material: Material, service: string): number {
    const wasteByCategory: Record<string, number> = {
      chemical: 10, // 10% waste for chemicals
      sealant: 5, // 5% waste for sealants
      restoration: 15, // 15% waste for restoration materials
      safety: 0, // No waste for safety items
      consumable: 20, // 20% waste for consumables
    };

    return wasteByCategory[material.category] || 10;
  }

  /**
   * Calculate actual coverage for a material/service combination
   */
  private calculateCoverage(
    material: Material,
    service: string,
    measurements: MeasurementEntry[],
  ): number {
    if (!material.coverage) return 0;

    let effectiveCoverage = material.coverage;
    if (material.dilutionRatio) {
      effectiveCoverage = material.coverage * material.dilutionRatio;
    }

    return effectiveCoverage;
  }

  /**
   * Generate contextual notes for material usage
   */
  private generateMaterialNotes(
    material: Material,
    service: string,
    quantity: number,
  ): string {
    const notes: string[] = [];

    if (material.dilutionRatio) {
      notes.push(`Dilute 1:${material.dilutionRatio} with water`);
    }

    if (material.hazardous) {
      notes.push("Hazardous material - proper safety equipment required");
    }

    if (material.shelfLife && material.shelfLife < 24) {
      notes.push(`${material.shelfLife} month shelf life - order fresh`);
    }

    if (quantity > 10 && material.category === "chemical") {
      notes.push("Large quantity - consider bulk pricing");
    }

    const bestVendor = this.selectBestVendor(material, quantity);
    if (bestVendor?.minOrder && quantity < bestVendor.minOrder) {
      notes.push(`Minimum order: ${bestVendor.minOrder} ${material.unit}s`);
    }

    return notes.join("; ");
  }

  /**
   * Consolidate duplicate materials across services
   */
  private consolidateMaterials(
    requirements: MaterialRequirement[],
  ): MaterialRequirement[] {
    const consolidated = new Map<string, MaterialRequirement>();

    requirements.forEach((req) => {
      const existing = consolidated.get(req.material.id);
      if (existing) {
        // Combine quantities and costs
        existing.quantity += req.quantity;
        existing.adjustedQuantity += req.adjustedQuantity;
        existing.totalCost += req.totalCost;
        existing.service += `, ${req.service}`;
      } else {
        consolidated.set(req.material.id, { ...req });
      }
    });

    return Array.from(consolidated.values());
  }

  /**
   * Select best vendor based on quantity and pricing
   */
  private selectBestVendor(
    material: Material,
    quantity: number,
  ): VendorPricing | undefined {
    const availableVendors = material.vendors.filter((v) => v.available);
    if (availableVendors.length === 0) return undefined;

    // Calculate effective cost including bulk discounts
    const vendorCosts = availableVendors.map((vendor) => {
      let effectiveCost = vendor.unitCost;

      if (vendor.bulkDiscounts) {
        for (const discount of vendor.bulkDiscounts) {
          if (quantity >= discount.quantity) {
            effectiveCost = vendor.unitCost * (1 - discount.discount / 100);
          }
        }
      }

      return { vendor, effectiveCost };
    });

    vendorCosts.sort((a, b) => a.effectiveCost - b.effectiveCost);
    return vendorCosts[0]?.vendor;
  }

  /**
   * Get material by ID
   */
  getMaterialById(id: string): Material | undefined {
    return MATERIALS_DATABASE.find((m) => m.id === id);
  }

  /**
   * Search materials by criteria
   */
  searchMaterials(criteria: {
    category?: string;
    service?: string;
    maxCost?: number;
    hazardous?: boolean;
  }): Material[] {
    return MATERIALS_DATABASE.filter((material) => {
      if (criteria.category && material.category !== criteria.category)
        return false;
      if (criteria.service && !material.requiredFor.includes(criteria.service))
        return false;
      if (criteria.maxCost && material.unitCost > criteria.maxCost)
        return false;
      if (
        criteria.hazardous !== undefined &&
        material.hazardous !== criteria.hazardous
      )
        return false;
      return true;
    });
  }

  /**
   * Calculate total material costs with markup
   */
  calculateTotalMaterialCosts(requirements: MaterialRequirement[]): {
    subtotal: number;
    markup: number;
    total: number;
    breakdown: Record<string, number>;
  } {
    const subtotal = requirements.reduce((sum, req) => sum + req.totalCost, 0);
    const markup = subtotal * 0.2; // 20% markup for materials
    const total = subtotal + markup;

    const breakdown = requirements.reduce(
      (acc, req) => {
        acc[req.material.category] =
          (acc[req.material.category] || 0) + req.totalCost;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { subtotal, markup, total, breakdown };
  }
}

// Calculator service layer for all service calculations

import {
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
  ServiceBreakdownItem,
  RiskFactor,
  MaterialItem,
} from "@/lib/types/estimate-types";
import { toFullName } from "@/lib/utils/service-type-mapper";
import {
  safeNumber,
  safeString,
  withDefaultArray,
  isNotNull,
} from "@/lib/utils/null-safety";

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

export class CalculatorService {
  // Base rates and factors
  private static readonly BASE_LABOR_RATE = 35; // per hour
  private static readonly BASE_MATERIAL_MARKUP = 1.3; // 30% markup
  private static readonly CREW_SIZES: Record<ServiceType, number> = {
    WC: 2, // window-cleaning
    PW: 2, // pressure-washing
    SW: 2, // soft-washing
    BF: 2, // biofilm-removal
    GR: 1, // glass-restoration
    FR: 1, // frame-restoration
    HD: 3, // high-dusting
    FC: 4, // final-clean
    GRC: 2, // granite-reconditioning
    PWS: 3, // pressure-wash-seal
    PD: 4, // parking-deck
  };

  private static readonly PRODUCTION_RATES: Record<ServiceType, number> = {
    WC: 150, // window-cleaning - sqft per hour
    PW: 800, // pressure-washing - sqft per hour
    SW: 600, // soft-washing - sqft per hour
    BF: 200, // biofilm-removal - sqft per hour
    GR: 50, // glass-restoration - sqft per hour
    FR: 30, // frame-restoration - sqft per hour
    HD: 1200, // high-dusting - sqft per hour
    FC: 2000, // final-clean - sqft per hour
    GRC: 100, // granite-reconditioning - sqft per hour
    PWS: 400, // pressure-wash-seal - sqft per hour
    PD: 1500, // parking-deck - sqft per hour
  };

  // Main calculation method
  static calculateService(params: CalculationParams): ServiceCalculationResult {
    const { serviceType, formData, buildingContext, marketFactors } = params;

    // Validate inputs
    const validation = this.validateInputs(params);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Calculate base metrics
    const area = this.calculateArea(formData);
    const laborHours = this.calculateLaborHours(
      serviceType,
      area,
      formData,
      buildingContext,
    );
    const materialCosts = this.calculateMaterialCosts(
      serviceType,
      area,
      formData,
      marketFactors,
    );
    const equipmentCosts = this.calculateEquipmentCosts(
      serviceType,
      area,
      formData,
      buildingContext,
    );
    const setupHours = this.calculateSetupHours(serviceType, buildingContext);
    const rigHours = this.calculateRigHours(serviceType, buildingContext);

    // Calculate totals
    const totalHours = laborHours + setupHours + rigHours;
    const crewSize = this.getCrewSize(serviceType, buildingContext);
    const laborCost =
      totalHours *
      crewSize *
      (marketFactors?.laborRate || this.BASE_LABOR_RATE);
    const basePrice = laborCost + materialCosts + equipmentCosts;

    // Generate breakdown
    const breakdown = this.generateBreakdown(
      serviceType,
      area,
      laborHours,
      crewSize,
      laborCost,
      materialCosts,
      equipmentCosts,
      marketFactors?.laborRate || this.BASE_LABOR_RATE,
    );

    // Assess risks
    const riskFactors = this.assessRiskFactors(
      serviceType,
      formData,
      buildingContext,
    );

    // Generate warnings
    const warnings = this.generateWarnings(
      serviceType,
      formData,
      buildingContext,
    );

    // Get materials list
    const materials = this.getMaterialsList(serviceType, area, formData);

    // Equipment details
    const equipment =
      equipmentCosts > 0
        ? {
            type: this.getEquipmentType(serviceType),
            days: this.getEquipmentDays(serviceType, totalHours),
            cost: equipmentCosts,
          }
        : undefined;

    return {
      area,
      basePrice,
      laborHours,
      setupHours,
      rigHours,
      totalHours,
      crewSize,
      equipment,
      breakdown,
      warnings,
      materials,
      riskFactors,
    };
  }

  // Batch calculation for multiple services
  static calculateMultipleServices(
    calculations: CalculationParams[],
  ): ServiceCalculationResult[] {
    return calculations.map((params) => this.calculateService(params));
  }

  // Validation methods
  static validateInputs(params: CalculationParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Service type validation
    if (!params.serviceType) {
      errors.push("Service type is required");
    }

    // Form data validation
    if (!params.formData) {
      errors.push("Form data is required");
    } else {
      const formValidation = this.validateFormData(
        params.serviceType,
        params.formData,
      );
      errors.push(...formValidation.errors);
      warnings.push(...formValidation.warnings);
    }

    // Building context validation
    if (params.buildingContext) {
      if (safeNumber(params.buildingContext.stories) < 1) {
        errors.push("Building stories must be at least 1");
      }
      if (safeNumber(params.buildingContext.stories) > 50) {
        warnings.push(
          "Extremely tall building may require specialized equipment",
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateFormData(
    serviceType: ServiceType,
    formData: ServiceFormData,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validations
    if (safeNumber(formData.area) <= 0) {
      errors.push("Area must be greater than 0");
    }

    if (safeNumber(formData.buildingHeight) <= 0) {
      warnings.push("Building height should be specified for accurate pricing");
    }

    // Service-specific validations
    switch (serviceType) {
      case "WC": // window-cleaning
        // No specific validations needed for window cleaning beyond base validations
        break;

      case "PW": // pressure-washing
        const pwFormData = formData as any; // Type assertion since we know this is pressure-washing
        if (
          pwFormData.surfaceType &&
          !["concrete", "brick", "stone", "wood", "metal"].includes(
            pwFormData.surfaceType,
          )
        ) {
          warnings.push(
            "Unusual surface type may require special considerations",
          );
        }
        if (pwFormData.pressure && safeNumber(pwFormData.pressure) > 4000) {
          warnings.push("High pressure may damage some surfaces");
        }
        break;

      case "GR": // glass-restoration
        const grFormData = formData as any; // Type assertion since we know this is glass-restoration
        if (
          grFormData.damageLevel &&
          !["light", "moderate", "heavy"].includes(grFormData.damageLevel)
        ) {
          errors.push("Damage level must be specified");
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Calculation methods
  private static calculateArea(formData: ServiceFormData): number {
    // Use the area directly from form data
    return safeNumber(formData.area);
  }

  private static calculateLaborHours(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    buildingContext?: CalculationParams["buildingContext"],
  ): number {
    const productionRate = this.PRODUCTION_RATES[serviceType];
    let baseHours = area / productionRate;

    // Apply difficulty factors
    if (buildingContext?.accessDifficulty === "moderate") {
      baseHours *= 1.3;
    } else if (buildingContext?.accessDifficulty === "difficult") {
      baseHours *= 1.8;
    }

    // Apply height factors
    if (buildingContext?.stories && buildingContext.stories > 3) {
      baseHours *= 1 + (buildingContext.stories - 3) * 0.1;
    }

    // Service-specific adjustments
    switch (serviceType) {
      case "WC": // window-cleaning
        // Calculate based on area since windowCount is not available
        const windowArea = area / 20; // Assume 20 sq ft per window
        const windowFactor = windowArea / 50; // Base 50 windows
        baseHours *= Math.max(windowFactor, 0.5);
        break;

      case "GR": // glass-restoration
        const grFormData2 = formData as any; // Type assertion
        if (grFormData2.damageLevel === "moderate") {
          baseHours *= 1.5;
        } else if (grFormData2.damageLevel === "heavy") {
          baseHours *= 2.5;
        }
        break;

      case "BF": // biofilm-removal
        baseHours *= 1.8; // More intensive process
        break;
    }

    return Math.max(baseHours, 0.5); // Minimum 0.5 hours
  }

  private static calculateMaterialCosts(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    marketFactors?: CalculationParams["marketFactors"],
  ): number {
    const markup = marketFactors?.materialMarkup || this.BASE_MATERIAL_MARKUP;
    let baseCost = 0;

    // Material costs per square foot
    const materialRates: Record<ServiceType, number> = {
      WC: 0.15, // window-cleaning
      PW: 0.08, // pressure-washing
      SW: 0.12, // soft-washing
      BF: 0.25, // biofilm-removal
      GR: 2.5, // glass-restoration
      FR: 1.8, // frame-restoration
      HD: 0.05, // high-dusting
      FC: 0.1, // final-clean
      GRC: 0.45, // granite-reconditioning
      PWS: 0.35, // pressure-wash-seal
      PD: 0.12, // parking-deck
    };

    baseCost = area * materialRates[serviceType];

    // Service-specific adjustments
    switch (serviceType) {
      case "PW": // pressure-washing
        const pwFormData2 = formData as any; // Type assertion
        if (pwFormData2.requiresSealing) {
          baseCost += area * 0.2; // Sealer cost
        }
        break;

      case "GR": // glass-restoration
        const grFormData3 = formData as any; // Type assertion
        if (grFormData3.damageLevel === "heavy") {
          baseCost *= 1.8; // More materials needed
        }
        break;
    }

    return baseCost * markup;
  }

  private static calculateEquipmentCosts(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
    buildingContext?: CalculationParams["buildingContext"],
  ): number {
    let cost = 0;

    // Equipment requirements by service
    switch (serviceType) {
      case "PW": // pressure-washing
      case "SW": // soft-washing
        cost += 150; // Pressure washer rental
        if (buildingContext?.stories && buildingContext.stories > 2) {
          cost += 200; // Lift or scaffolding
        }
        break;

      case "HD": // high-dusting
        cost += 300; // Specialized equipment
        break;

      case "PD": // parking-deck
        cost += 400; // Heavy-duty equipment
        break;

      case "GR": // glass-restoration
      case "FR": // frame-restoration
        cost += 100; // Specialized tools
        break;
    }

    // Height-based equipment costs
    if (buildingContext?.stories && buildingContext.stories > 5) {
      cost += 500; // Specialized access equipment
    }

    return cost;
  }

  private static calculateSetupHours(
    serviceType: ServiceType,
    buildingContext?: CalculationParams["buildingContext"],
  ): number {
    let setupHours = 0.5; // Base setup time

    // Service-specific setup
    switch (serviceType) {
      case "PW": // pressure-washing
      case "SW": // soft-washing
        setupHours = 1.0;
        break;

      case "HD": // high-dusting
        setupHours = 1.5;
        break;

      case "PD": // parking-deck
        setupHours = 2.0;
        break;
    }

    // Height adjustment
    if (buildingContext?.stories && buildingContext.stories > 3) {
      setupHours *= 1.3;
    }

    return setupHours;
  }

  private static calculateRigHours(
    serviceType: ServiceType,
    buildingContext?: CalculationParams["buildingContext"],
  ): number {
    let rigHours = 0.25; // Base rig time

    // Service-specific rig time
    switch (serviceType) {
      case "PW": // pressure-washing
      case "SW": // soft-washing
        rigHours = 0.5;
        break;

      case "HD": // high-dusting
        rigHours = 0.75;
        break;

      case "PD": // parking-deck
        rigHours = 1.0;
        break;
    }

    // Height adjustment
    if (buildingContext?.stories && buildingContext.stories > 3) {
      rigHours *= 1.2;
    }

    return rigHours;
  }

  private static getCrewSize(
    serviceType: ServiceType,
    buildingContext?: CalculationParams["buildingContext"],
  ): number {
    let crewSize = this.CREW_SIZES[serviceType];

    // Adjust for building complexity
    if (buildingContext?.stories && buildingContext.stories > 10) {
      crewSize += 1;
    }

    return crewSize;
  }

  // Helper methods
  private static generateBreakdown(
    serviceType: ServiceType,
    area: number,
    laborHours: number,
    crewSize: number,
    laborCost: number,
    materialCosts: number,
    equipmentCosts: number,
    laborRate: number,
  ): ServiceBreakdownItem[] {
    const breakdown: ServiceBreakdownItem[] = [];

    // Labor breakdown
    breakdown.push({
      category: "labor",
      description: `${laborHours.toFixed(1)} hours × ${crewSize} crew × $${laborRate}/hour`,
      quantity: laborHours * crewSize,
      unitPrice: laborRate,
      total: laborCost,
    });

    // Materials breakdown
    if (materialCosts > 0) {
      breakdown.push({
        category: "materials",
        description: `Materials for ${area.toFixed(0)} sq ft`,
        quantity: area,
        unitPrice: materialCosts / area,
        total: materialCosts,
      });
    }

    // Equipment breakdown
    if (equipmentCosts > 0) {
      breakdown.push({
        category: "equipment",
        description: "Equipment rental and setup",
        quantity: 1,
        unitPrice: equipmentCosts,
        total: equipmentCosts,
      });
    }

    return breakdown;
  }

  private static assessRiskFactors(
    serviceType: ServiceType,
    formData: ServiceFormData,
    buildingContext?: CalculationParams["buildingContext"],
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Height risks
    if (buildingContext?.stories && buildingContext.stories > 5) {
      risks.push({
        type: "height",
        description: "High-rise work requires specialized safety equipment",
        level: buildingContext.stories > 15 ? "high" : "medium",
        multiplier: buildingContext.stories > 15 ? 1.25 : 1.15,
      });
    }

    // Access risks
    if (buildingContext?.accessDifficulty === "difficult") {
      risks.push({
        type: "access",
        level: "medium",
        multiplier: 1.15,
        description:
          "Difficult access may require additional time and equipment",
      });
    }

    // Service-specific risks
    switch (serviceType) {
      case "GR": // glass-restoration
        if ((formData as any).damageLevel === "heavy") {
          risks.push({
            type: "complexity",
            level: "high",
            multiplier: 1.3,
            description:
              "Extensive damage may require replacement rather than restoration",
          });
        }
        break;

      case "PW": // pressure-washing
        if (
          (formData as any).pressure &&
          safeNumber((formData as any).pressure) > 3000
        ) {
          risks.push({
            type: "complexity",
            level: "medium",
            multiplier: 1.2,
            description: "High pressure may damage building surfaces",
          });
        }
        break;
    }

    return risks;
  }

  private static generateWarnings(
    serviceType: ServiceType,
    formData: ServiceFormData,
    buildingContext?: CalculationParams["buildingContext"],
  ): string[] {
    const warnings: string[] = [];

    // Common warnings
    if (buildingContext?.stories && buildingContext.stories > 20) {
      warnings.push("High-rise building may require special permits");
    }

    // Service-specific warnings
    switch (serviceType) {
      case "WC": // window-cleaning
        if (buildingContext?.stories && buildingContext.stories > 10) {
          warnings.push(
            "High-rise window cleaning requires certified technicians",
          );
        }
        break;

      case "BF": // biofilm-removal
        warnings.push(
          "Biofilm removal requires specialized chemicals and handling",
        );
        break;

      case "GR": // glass-restoration
        warnings.push("Results may vary based on glass condition and type");
        break;
    }

    return warnings;
  }

  private static getMaterialsList(
    serviceType: ServiceType,
    area: number,
    formData: ServiceFormData,
  ): MaterialItem[] {
    const materials: MaterialItem[] = [];

    // Service-specific materials
    switch (serviceType) {
      case "WC": // window-cleaning
        materials.push(
          {
            name: "Window cleaning solution",
            quantity: Math.ceil(area / 1000),
            unit: "gallon",
            unitCost: 15,
            totalCost: Math.ceil(area / 1000) * 15,
          },
          {
            name: "Squeegees",
            quantity: 2,
            unit: "each",
            unitCost: 25,
            totalCost: 50,
          },
          {
            name: "Cleaning cloths",
            quantity: 10,
            unit: "each",
            unitCost: 3,
            totalCost: 30,
          },
        );
        break;

      case "PW": // pressure-washing
        materials.push(
          {
            name: "Pressure washing detergent",
            quantity: Math.ceil(area / 500),
            unit: "gallon",
            unitCost: 20,
            totalCost: Math.ceil(area / 500) * 20,
          },
          {
            name: "Surface cleaner",
            quantity: 1,
            unit: "each",
            unitCost: 150,
            totalCost: 150,
          },
        );
        if ((formData as any).requiresSealing) {
          materials.push({
            name: "Surface sealer",
            quantity: Math.ceil(area / 400),
            unit: "gallon",
            unitCost: 45,
            totalCost: Math.ceil(area / 400) * 45,
          });
        }
        break;

      case "GR": // glass-restoration
        materials.push(
          {
            name: "Glass polish compound",
            quantity: Math.ceil(area / 100),
            unit: "bottle",
            unitCost: 45.0,
            totalCost: Math.ceil(area / 100) * 45.0,
          },
          {
            name: "Polishing pads",
            quantity: 5,
            unit: "each",
            unitCost: 8.0,
            totalCost: 5 * 8.0,
          },
          {
            name: "Protective film",
            quantity: Math.ceil(area / 50),
            unit: "roll",
            unitCost: 25.0,
            totalCost: Math.ceil(area / 50) * 25.0,
          },
        );
        break;
    }

    return materials;
  }

  private static getEquipmentType(serviceType: ServiceType): string {
    const equipmentTypes: Record<ServiceType, string> = {
      WC: "cleaning",
      PW: "pressure",
      SW: "pressure",
      BF: "specialized",
      GR: "restoration",
      FR: "restoration",
      HD: "access",
      FC: "cleaning",
      GRC: "specialized",
      PWS: "pressure",
      PD: "heavy-duty",
    };

    return equipmentTypes[serviceType];
  }

  private static getEquipmentDays(
    serviceType: ServiceType,
    totalHours: number,
  ): number {
    // Most equipment is rented by the day
    const hoursPerDay = 8;
    return Math.ceil(totalHours / hoursPerDay);
  }

  // Utility methods
  static getServiceDisplayName(serviceType: ServiceType): string {
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
      PD: "Parking Deck Cleaning",
    };

    return displayNames[serviceType] || serviceType;
  }

  static getServiceDescription(serviceType: ServiceType): string {
    const descriptions: Record<ServiceType, string> = {
      WC: "Professional interior and exterior window cleaning",
      PW: "High-pressure cleaning for building exteriors",
      SW: "Low-pressure cleaning with specialized detergents",
      BF: "Specialized removal of biofilm and organic buildup",
      GR: "Restoration of damaged or etched glass surfaces",
      FR: "Cleaning and restoration of window frames",
      HD: "Cleaning of high and hard-to-reach areas",
      FC: "Comprehensive post-construction cleaning",
      GRC: "Restoration and sealing of granite surfaces",
      PWS: "Pressure washing followed by protective sealing",
      PD: "Heavy-duty cleaning of parking structures",
    };

    return descriptions[serviceType] || "Professional cleaning service";
  }
}

export default CalculatorService;

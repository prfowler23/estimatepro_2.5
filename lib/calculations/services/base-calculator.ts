import {
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
  ServiceBreakdownItem,
  RiskFactor,
  MaterialItem,
} from "@/lib/types/estimate-types";
import { safeNumber } from "@/lib/utils/null-safety";
import {
  CalculationParams,
  ValidationResult,
} from "@/lib/services/calculator-service";

export abstract class BaseCalculator {
  protected readonly serviceType: ServiceType;
  protected readonly formData: ServiceFormData;
  protected readonly buildingContext?: CalculationParams["buildingContext"];
  protected readonly marketFactors?: CalculationParams["marketFactors"];

  constructor(params: CalculationParams) {
    this.serviceType = params.serviceType;
    this.formData = params.formData;
    this.buildingContext = params.buildingContext;
    this.marketFactors = params.marketFactors;
  }

  abstract calculate(): ServiceCalculationResult;
  abstract validate(): ValidationResult;

  protected calculateArea(): number {
    return safeNumber(this.formData.area);
  }

  protected getCrewSize(): number {
    // Default implementation, can be overridden
    return 2;
  }

  protected getProductionRate(): number {
    // Default implementation, can be overridden
    return 100;
  }

  protected calculateLaborHours(): number {
    const productionRate = this.getProductionRate();
    let baseHours = this.calculateArea() / productionRate;

    if (this.buildingContext?.accessDifficulty === "moderate") {
      baseHours *= 1.3;
    } else if (this.buildingContext?.accessDifficulty === "difficult") {
      baseHours *= 1.8;
    }

    if (this.buildingContext?.stories && this.buildingContext.stories > 3) {
      baseHours *= 1 + (this.buildingContext.stories - 3) * 0.1;
    }

    return Math.max(baseHours, 0.5);
  }

  protected calculateMaterialCosts(): number {
    // Default implementation, can be overridden
    return 0;
  }

  protected calculateEquipmentCosts(): number {
    // Default implementation, can be overridden
    return 0;
  }

  protected calculateSetupHours(): number {
    let setupHours = 0.5;
    if (this.buildingContext?.stories && this.buildingContext.stories > 3) {
      setupHours *= 1.3;
    }
    return setupHours;
  }

  protected calculateRigHours(): number {
    let rigHours = 0.25;
    if (this.buildingContext?.stories && this.buildingContext.stories > 3) {
      rigHours *= 1.2;
    }
    return rigHours;
  }

  protected generateBreakdown(
    area: number,
    laborHours: number,
    crewSize: number,
    laborCost: number,
    materialCosts: number,
    equipmentCosts: number,
    laborRate: number,
  ): ServiceBreakdownItem[] {
    const breakdown: ServiceBreakdownItem[] = [];

    breakdown.push({
      category: "labor",
      description: `${laborHours.toFixed(
        1,
      )} hours × ${crewSize} crew × $${laborRate}/hour`,
      quantity: laborHours * crewSize,
      unitPrice: laborRate,
      total: laborCost,
    });

    if (materialCosts > 0) {
      breakdown.push({
        category: "materials",
        description: `Materials for ${area.toFixed(0)} sq ft`,
        quantity: area,
        unitPrice: materialCosts / area,
        total: materialCosts,
      });
    }

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

  protected assessRiskFactors(): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (this.buildingContext?.stories && this.buildingContext.stories > 5) {
      risks.push({
        type: "height",
        description: "High-rise work requires specialized safety equipment",
        level: this.buildingContext.stories > 15 ? "high" : "medium",
        multiplier: this.buildingContext.stories > 15 ? 1.25 : 1.15,
      });
    }

    if (this.buildingContext?.accessDifficulty === "difficult") {
      risks.push({
        type: "access",
        level: "medium",
        multiplier: 1.15,
        description:
          "Difficult access may require additional time and equipment",
      });
    }

    return risks;
  }

  protected generateWarnings(): string[] {
    const warnings: string[] = [];

    if (this.buildingContext?.stories && this.buildingContext.stories > 20) {
      warnings.push("High-rise building may require special permits");
    }

    return warnings;
  }

  protected getMaterialsList(): MaterialItem[] {
    // Default implementation, can be overridden
    return [];
  }

  protected getEquipmentType(): string {
    // Default implementation, can be overridden
    return "cleaning";
  }

  protected getEquipmentDays(totalHours: number): number {
    const hoursPerDay = 8;
    return Math.ceil(totalHours / hoursPerDay);
  }
}

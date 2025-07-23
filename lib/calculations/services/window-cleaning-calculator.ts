import {
  ServiceCalculationResult,
  ServiceFormData,
} from "@/lib/types/estimate-types";
import {
  CalculationParams,
  ValidationResult,
} from "@/lib/services/calculator-service";
import { BaseCalculator } from "./base-calculator";
import { safeNumber } from "@/lib/utils/null-safety";

export class WindowCleaningCalculator extends BaseCalculator {
  constructor(params: CalculationParams) {
    super(params);
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (safeNumber(this.formData.area) <= 0) {
      errors.push("Area must be greater than 0");
    }

    if (safeNumber(this.formData.buildingHeight) <= 0) {
      warnings.push("Building height should be specified for accurate pricing");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  calculate(): ServiceCalculationResult {
    const area = this.calculateArea();
    const laborHours = this.calculateLaborHours();
    const materialCosts = this.calculateMaterialCosts();
    const equipmentCosts = this.calculateEquipmentCosts();
    const setupHours = this.calculateSetupHours();
    const rigHours = this.calculateRigHours();

    const totalHours = laborHours + setupHours + rigHours;
    const crewSize = this.getCrewSize();
    const laborRate = this.marketFactors?.laborRate || 35;
    const laborCost = totalHours * crewSize * laborRate;
    const basePrice = laborCost + materialCosts + equipmentCosts;

    const breakdown = this.generateBreakdown(
      area,
      laborHours,
      crewSize,
      laborCost,
      materialCosts,
      equipmentCosts,
      laborRate,
    );

    const riskFactors = this.assessRiskFactors();
    const warnings = this.generateWarnings();
    const materials = this.getMaterialsList();

    const equipment =
      equipmentCosts > 0
        ? {
            type: this.getEquipmentType(),
            days: this.getEquipmentDays(totalHours),
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

  protected getProductionRate(): number {
    return 150;
  }

  protected calculateLaborHours(): number {
    let baseHours = super.calculateLaborHours();
    const windowArea = this.calculateArea() / 20;
    const windowFactor = windowArea / 50;
    baseHours *= Math.max(windowFactor, 0.5);
    return baseHours;
  }

  protected calculateMaterialCosts(): number {
    const markup = this.marketFactors?.materialMarkup || 1.3;
    let baseCost = this.calculateArea() * 0.15;
    return baseCost * markup;
  }

  protected getMaterialsList() {
    const area = this.calculateArea();
    return [
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
    ];
  }

  protected generateWarnings(): string[] {
    const warnings = super.generateWarnings();
    if (this.buildingContext?.stories && this.buildingContext.stories > 10) {
      warnings.push("High-rise window cleaning requires certified technicians");
    }
    return warnings;
  }
}

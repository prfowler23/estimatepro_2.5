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

export class PressureWashingCalculator extends BaseCalculator {
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

    const pwFormData = this.formData as any;
    if (
      pwFormData.surfaceType &&
      !["concrete", "brick", "stone", "wood", "metal"].includes(
        pwFormData.surfaceType,
      )
    ) {
      warnings.push("Unusual surface type may require special considerations");
    }
    if (pwFormData.pressure && safeNumber(pwFormData.pressure) > 4000) {
      warnings.push("High pressure may damage some surfaces");
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
    return 800;
  }

  protected calculateMaterialCosts(): number {
    const markup = this.marketFactors?.materialMarkup || 1.3;
    let baseCost = this.calculateArea() * 0.08;
    const pwFormData = this.formData as any;
    if (pwFormData.requiresSealing) {
      baseCost += this.calculateArea() * 0.2;
    }
    return baseCost * markup;
  }

  protected calculateEquipmentCosts(): number {
    let cost = 150;
    if (this.buildingContext?.stories && this.buildingContext.stories > 2) {
      cost += 200;
    }
    if (this.buildingContext?.stories && this.buildingContext.stories > 5) {
      cost += 500;
    }
    return cost;
  }

  protected calculateSetupHours(): number {
    let setupHours = 1.0;
    if (this.buildingContext?.stories && this.buildingContext.stories > 3) {
      setupHours *= 1.3;
    }
    return setupHours;
  }

  protected calculateRigHours(): number {
    let rigHours = 0.5;
    if (this.buildingContext?.stories && this.buildingContext.stories > 3) {
      rigHours *= 1.2;
    }
    return rigHours;
  }

  protected getMaterialsList() {
    const area = this.calculateArea();
    const materials = [
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
    ];

    if ((this.formData as any).requiresSealing) {
      materials.push({
        name: "Surface sealer",
        quantity: Math.ceil(area / 400),
        unit: "gallon",
        unitCost: 45,
        totalCost: Math.ceil(area / 400) * 45,
      });
    }

    return materials;
  }

  protected assessRiskFactors() {
    const risks = super.assessRiskFactors();
    if (
      (this.formData as any).pressure &&
      safeNumber((this.formData as any).pressure) > 3000
    ) {
      risks.push({
        type: "complexity",
        level: "medium",
        multiplier: 1.2,
        description: "High pressure may damage building surfaces",
      });
    }
    return risks;
  }
}

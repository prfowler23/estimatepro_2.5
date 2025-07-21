import {
  BaseCalculator,
  CalculationInput,
  CalculationResult,
} from "../base-calculator";
import {
  PRESSURE_WASH_RATES,
  LOCATION_RATES,
  PRODUCTION_RATES,
  EQUIPMENT_TYPES,
  RIG_TIME,
} from "../constants";
import {
  getEquipmentForHeight,
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements,
} from "../utils";

interface PressureWashingInput extends CalculationInput {
  facadeArea: number;
  surfaceType: "regular" | "ornate" | "mixed";
  flatSurfaceArea?: number;
  includesHardscapes: boolean;
  hardscapeArea?: number;
  buildingHeightStories?: number;
  numberOfDrops?: number;
}

export class PressureWashingCalculator extends BaseCalculator<PressureWashingInput> {
  calculate(input: PressureWashingInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState();

    const {
      facadeArea,
      surfaceType,
      flatSurfaceArea = 0,
      includesHardscapes,
      hardscapeArea = 0,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      location,
    } = input;

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input);
    const shiftLength = this.getShiftLengthFromInput(input);

    // Validate inputs
    this.validateInput(input);

    if (facadeArea <= 0) {
      throw new Error("Facade area must be greater than 0");
    }

    if (includesHardscapes && hardscapeArea <= 0) {
      throw new Error(
        "Hardscape area must be greater than 0 when hardscapes are included",
      );
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea,
      heightStories: buildingHeightStories,
    });
    measurementWarnings.forEach((warning) => this.addWarning(warning));

    // Calculate facade price
    const facadeRate = this.getFacadeRate(surfaceType);
    this.addBreakdown(
      "Facade Rate",
      `${surfaceType} facade`,
      `$${facadeRate}/sq ft`,
    );

    const facadePrice = facadeArea * facadeRate;
    this.addBreakdown(
      "Facade Price",
      `${facadeArea} sq ft × $${facadeRate}`,
      this.formatCurrency(facadePrice),
    );

    // Calculate flat surface price
    let flatSurfacePrice = 0;
    if (flatSurfaceArea > 0) {
      const flatRate =
        location === "charlotte"
          ? LOCATION_RATES.pressureWashFlat.charlotte
          : LOCATION_RATES.pressureWashFlat.raleigh;

      flatSurfacePrice = flatSurfaceArea * flatRate;
      this.addBreakdown(
        "Flat Surface Price",
        `${flatSurfaceArea} sq ft × $${flatRate} (${location} rate)`,
        this.formatCurrency(flatSurfacePrice),
      );
    }

    // Calculate hardscape price
    let hardscapePrice = 0;
    if (includesHardscapes && hardscapeArea > 0) {
      const hardscapeRate = PRESSURE_WASH_RATES.hardscapes;
      hardscapePrice = hardscapeArea * hardscapeRate;
      this.addBreakdown(
        "Hardscape Price",
        `${hardscapeArea} sq ft × $${hardscapeRate}`,
        this.formatCurrency(hardscapePrice),
      );
    }

    // Total base price
    const basePrice = facadePrice + flatSurfacePrice + hardscapePrice;
    this.addBreakdown(
      "Total Base Price",
      "Facade + Flat + Hardscape",
      this.formatCurrency(basePrice),
    );

    // Calculate labor hours
    const facadeLaborHours =
      facadeArea / (PRODUCTION_RATES.pwFacade * crewSize);
    const flatLaborHours =
      flatSurfaceArea / (PRODUCTION_RATES.pwFlatSurface * crewSize);
    const hardscapeLaborHours =
      hardscapeArea / (PRODUCTION_RATES.pwFlatSurface * crewSize);

    const laborHours = facadeLaborHours + flatLaborHours + hardscapeLaborHours;
    this.addBreakdown(
      "Labor Hours",
      `Facade: ${facadeLaborHours.toFixed(1)}h, Flat: ${flatLaborHours.toFixed(1)}h, Hardscape: ${hardscapeLaborHours.toFixed(1)}h`,
      `${laborHours.toFixed(2)} hours`,
    );

    // Setup time
    const setupHours = this.calculateSetupTime(laborHours);
    this.addBreakdown(
      "Setup Time",
      `${laborHours.toFixed(2)} hours × 25%`,
      `${setupHours.toFixed(2)} hours`,
    );

    // Rig time (if building > 1 story)
    let rigHours = 0;
    if (buildingHeightStories > 1) {
      rigHours = numberOfDrops * RIG_TIME.boomLift;
      this.addBreakdown(
        "Rig Time",
        `${numberOfDrops} drops × ${RIG_TIME.boomLift} hours`,
        `${rigHours.toFixed(2)} hours`,
      );
    }

    // Total hours
    const totalHours = laborHours + setupHours + rigHours;
    this.addBreakdown(
      "Total Hours",
      "Labor + Setup + Rig",
      `${totalHours.toFixed(2)} hours`,
    );

    // Project days
    const projectDays = this.calculateProjectDays(
      totalHours,
      crewSize,
      shiftLength,
    );

    // Equipment if needed
    let equipment = undefined;
    if (buildingHeightStories > 1) {
      const equipmentType = getEquipmentForHeight(buildingHeightStories, "PW");
      const equipmentCost = calculateEquipmentCost(equipmentType, projectDays);
      equipment = {
        type: equipmentType,
        days: projectDays,
        cost: equipmentCost,
      };
      this.addBreakdown(
        "Equipment Cost",
        `${equipmentType} for ${projectDays} days`,
        this.formatCurrency(equipmentCost),
      );
    }

    // Round final price
    const roundedPrice = roundToNearest(basePrice);
    if (roundedPrice !== basePrice) {
      this.addBreakdown(
        "Final Price (Rounded)",
        "Rounded to nearest $50",
        this.formatCurrency(roundedPrice),
      );
    }

    // Apply minimum charge
    const finalPrice = this.calculateMinimumCharge("PW", roundedPrice);

    // Validations
    this.validateSetupTime(setupHours, laborHours);

    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories);
    }

    // Service-specific warnings
    if (surfaceType === "ornate" && finalPrice < 1000) {
      this.addWarning(
        "Price seems low for ornate facade - verify measurements",
      );
    }

    if (includesHardscapes && !hardscapeArea) {
      this.addWarning("Hardscapes included but no area specified");
    }

    if (facadeArea > 15000) {
      this.addWarning(
        "Large facade area - consider splitting into multiple phases",
      );
    }

    if (surfaceType === "mixed" && facadeArea > 5000) {
      this.addWarning(
        "Mixed surface type on large area - consider separate pricing for regular vs ornate sections",
      );
    }

    if (projectDays > 10) {
      this.addWarning("Extended project duration - consider weather delays");
    }

    if (buildingHeightStories > 15) {
      this.addWarning(
        "Very tall building - additional safety equipment may be required",
      );
    }

    // Build and return result
    return this.buildCalculationResult(
      "Pressure Washing",
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment,
    );
  }

  private getFacadeRate(surfaceType: string): number {
    switch (surfaceType) {
      case "ornate":
        return PRESSURE_WASH_RATES.ornateFacade;
      case "mixed":
        return (
          (PRESSURE_WASH_RATES.regularFacade +
            PRESSURE_WASH_RATES.ornateFacade) /
          2
        );
      default:
        return PRESSURE_WASH_RATES.regularFacade;
    }
  }

  // Helper method to calculate efficiency based on surface combinations
  static calculateSurfaceEfficiency(
    facadeArea: number,
    flatSurfaceArea: number,
    hardscapeArea: number,
  ): { efficiency: number; recommendation: string } {
    const totalArea = facadeArea + flatSurfaceArea + hardscapeArea;
    const facadeRatio = facadeArea / totalArea;

    if (facadeRatio > 0.8) {
      return {
        efficiency: 0.9, // 10% efficiency loss for mostly vertical work
        recommendation: "Consider specialized facade equipment for efficiency",
      };
    }

    if (facadeRatio < 0.3) {
      return {
        efficiency: 1.1, // 10% efficiency gain for mostly horizontal work
        recommendation:
          "Efficient ground-level work - good productivity expected",
      };
    }

    return {
      efficiency: 1.0,
      recommendation: "Balanced work mix - standard efficiency",
    };
  }

  // Helper method to estimate water usage
  static calculateWaterUsage(
    facadeArea: number,
    flatSurfaceArea: number,
    hardscapeArea: number,
    surfaceType: string,
  ): { gallons: number; cost: number } {
    const facadeGallonsPerSqFt = surfaceType === "ornate" ? 0.5 : 0.3;
    const flatGallonsPerSqFt = 0.2;
    const hardscapeGallonsPerSqFt = 0.4;

    const totalGallons =
      facadeArea * facadeGallonsPerSqFt +
      flatSurfaceArea * flatGallonsPerSqFt +
      hardscapeArea * hardscapeGallonsPerSqFt;

    const waterCostPerGallon = 0.004; // $0.004 per gallon
    const totalCost = totalGallons * waterCostPerGallon;

    return {
      gallons: Math.ceil(totalGallons),
      cost: totalCost,
    };
  }

  // Helper method to validate environmental conditions
  static validateEnvironmentalConditions(
    temperature: number,
    windSpeed: number,
    nearWaterSources: boolean,
  ): string[] {
    const warnings: string[] = [];

    if (temperature < 40) {
      warnings.push(
        "Low temperature - equipment may freeze, consider heated units",
      );
    }

    if (windSpeed > 15) {
      warnings.push("High wind speed - overspray control required");
    }

    if (nearWaterSources) {
      warnings.push(
        "Near water sources - environmental protection measures required",
      );
    }

    return warnings;
  }

  // Helper method to calculate chemical usage
  static calculateChemicalUsage(
    totalArea: number,
    surfaceType: string,
    soilLevel: "light" | "medium" | "heavy",
  ): { chemical: string; gallons: number; cost: number } {
    const chemicalRates = {
      light: 0.01, // 1 gallon per 100 sq ft
      medium: 0.015, // 1.5 gallons per 100 sq ft
      heavy: 0.02, // 2 gallons per 100 sq ft
    };

    const surfaceMultiplier = surfaceType === "ornate" ? 1.3 : 1.0;
    const gallonsNeeded =
      totalArea * chemicalRates[soilLevel] * surfaceMultiplier;

    return {
      chemical: "Multi-Surface Cleaner",
      gallons: Math.ceil(gallonsNeeded),
      cost: gallonsNeeded * 12.5, // $12.50 per gallon
    };
  }
}

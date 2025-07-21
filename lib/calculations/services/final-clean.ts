import {
  BaseCalculator,
  CalculationInput,
  CalculationResult,
} from "../base-calculator";
import {
  SURFACE,
  TIME_PER_UNIT,
  LOCATION_RATES,
  EQUIPMENT_TYPES,
  RIG_TIME,
} from "../constants";
import {
  getEquipmentForHeight,
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements,
} from "../utils";

interface FinalCleanInput extends CalculationInput {
  glassArea: number;
  includesInterior: boolean;
  postConstruction: boolean;
  buildingHeightStories?: number;
  numberOfDrops?: number;
}

export class FinalCleanCalculator extends BaseCalculator<FinalCleanInput> {
  calculate(input: FinalCleanInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState();

    const {
      glassArea,
      includesInterior,
      postConstruction,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      location,
    } = input;

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input);
    const shiftLength = this.getShiftLengthFromInput(input);

    // Validate inputs
    this.validateInput(input);

    if (glassArea <= 0) {
      throw new Error("Glass area must be greater than 0");
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      glassArea,
      heightStories: buildingHeightStories,
    });
    measurementWarnings.forEach((warning) => this.addWarning(warning));

    // Calculate windows
    const windows = Math.ceil(glassArea / SURFACE.standardWindowSize);
    this.addBreakdown(
      "Number of Windows",
      `${glassArea} sq ft ÷ ${SURFACE.standardWindowSize} sq ft per window`,
      `${windows} windows`,
    );

    // Base time per window (more thorough than regular cleaning)
    let timePerWindow = TIME_PER_UNIT.finalClean;
    if (postConstruction) {
      timePerWindow *= 1.5; // 50% more time for construction debris
      this.addBreakdown(
        "Post-Construction Adjustment",
        "Base time × 1.5",
        `${timePerWindow.toFixed(3)} hrs/window`,
      );
    }

    // Calculate labor hours
    let laborHours = windows * timePerWindow;
    if (includesInterior) {
      const interiorHours = windows * timePerWindow * 0.8; // Interior slightly faster
      laborHours += interiorHours;
      this.addBreakdown(
        "Interior Cleaning",
        `${windows} × ${(timePerWindow * 0.8).toFixed(3)} hrs/window`,
        `${interiorHours.toFixed(2)} hours`,
      );
    }

    this.addBreakdown(
      "Total Labor Hours",
      includesInterior ? "Exterior + Interior" : "Exterior only",
      `${laborHours.toFixed(2)} hours`,
    );

    // Setup time (special calculation for FC)
    const setupHours = this.calculateSetupTime(laborHours, true);
    this.addBreakdown(
      "Setup Time (Special)",
      `2 × (${laborHours.toFixed(2)} ÷ ${shiftLength})`,
      `${setupHours.toFixed(2)} hours`,
    );

    // Rig time
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

    // Get hourly rate
    const hourlyRate = LOCATION_RATES.finalClean[location];
    this.addBreakdown(
      "Hourly Rate",
      `${location} location`,
      `$${hourlyRate}/hour`,
    );

    // Calculate price
    const basePrice = totalHours * hourlyRate;
    this.addBreakdown(
      "Base Price",
      `${totalHours.toFixed(2)} hours × $${hourlyRate}/hour`,
      this.formatCurrency(basePrice),
    );

    // Project days
    const projectDays = this.calculateProjectDays(
      totalHours,
      crewSize,
      shiftLength,
    );

    // Equipment
    let equipment = undefined;
    if (buildingHeightStories > 1) {
      const equipmentType = getEquipmentForHeight(buildingHeightStories, "FC");
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
    const finalPrice = this.calculateMinimumCharge("FC", roundedPrice);

    // Validations
    this.validatePricePerWindow(finalPrice, windows);
    this.validateSetupTime(setupHours, laborHours);

    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories);
    }

    // Service-specific warnings
    if (postConstruction && !includesInterior) {
      this.addWarning("Post-construction cleaning typically includes interior");
    }

    if (windows > 150) {
      this.addWarning(
        "Large window count - consider splitting into multiple days",
      );
    }

    if (postConstruction && finalPrice < 500) {
      this.addWarning(
        "Post-construction cleaning price seems low - verify scope",
      );
    }

    if (includesInterior && buildingHeightStories > 5) {
      this.addWarning(
        "Interior cleaning on high-rise may require additional access arrangements",
      );
    }

    if (projectDays > 3) {
      this.addWarning(
        "Extended final clean duration - consider weather delays",
      );
    }

    if (buildingHeightStories > 15) {
      this.addWarning(
        "Very tall building - additional safety measures may be required",
      );
    }

    // Build and return result
    return this.buildCalculationResult(
      "Final Clean",
      finalPrice,
      laborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment,
    );
  }

  // Helper method to calculate detailed cleaning time
  static calculateDetailedCleaningTime(
    windows: number,
    constructionLevel: "light" | "medium" | "heavy",
    includesInterior: boolean,
  ): { exteriorHours: number; interiorHours: number; totalHours: number } {
    const baseTimePerWindow = TIME_PER_UNIT.finalClean;

    const constructionMultipliers = {
      light: 1.2,
      medium: 1.5,
      heavy: 2.0,
    };

    const adjustedTime =
      baseTimePerWindow * constructionMultipliers[constructionLevel];
    const exteriorHours = windows * adjustedTime;
    const interiorHours = includesInterior ? windows * adjustedTime * 0.8 : 0;

    return {
      exteriorHours,
      interiorHours,
      totalHours: exteriorHours + interiorHours,
    };
  }

  // Helper method to estimate material costs
  static calculateMaterialCosts(
    windows: number,
    postConstruction: boolean,
    includesInterior: boolean,
  ): {
    cleaningSupplies: number;
    protectionMaterials: number;
    totalCost: number;
  } {
    const baseSupplyCost = windows * 0.5; // $0.50 per window
    const cleaningSupplies = postConstruction
      ? baseSupplyCost * 1.5
      : baseSupplyCost;

    const protectionMaterials = includesInterior ? windows * 0.25 : 0;
    const totalCost = cleaningSupplies + protectionMaterials;

    return {
      cleaningSupplies,
      protectionMaterials,
      totalCost,
    };
  }

  // Helper method to validate construction readiness
  static validateConstructionReadiness(
    constructionPhase: "rough" | "trim" | "final" | "complete",
    includesInterior: boolean,
  ): string[] {
    const warnings: string[] = [];

    if (constructionPhase === "rough" || constructionPhase === "trim") {
      warnings.push("Construction phase not ready for final cleaning");
    }

    if (includesInterior && constructionPhase !== "complete") {
      warnings.push(
        "Interior cleaning should wait until construction is complete",
      );
    }

    return warnings;
  }

  // Helper method to calculate quality control requirements
  static calculateQualityControl(
    windows: number,
    postConstruction: boolean,
    criticalAreas: string[],
  ): { inspectionTime: number; touchUpTime: number; totalQcTime: number } {
    const baseInspectionTime = windows * 0.02; // 1.2 minutes per window
    const inspectionTime = postConstruction
      ? baseInspectionTime * 1.5
      : baseInspectionTime;

    const touchUpRate = postConstruction ? 0.15 : 0.05; // 15% or 5% touch-up rate
    const touchUpTime = windows * TIME_PER_UNIT.finalClean * touchUpRate;

    const criticalAreaTime = criticalAreas.length * 0.5; // 30 minutes per critical area
    const totalQcTime = inspectionTime + touchUpTime + criticalAreaTime;

    return {
      inspectionTime,
      touchUpTime,
      totalQcTime,
    };
  }

  // Helper method to estimate scheduling requirements
  static calculateSchedulingRequirements(
    totalHours: number,
    crewSize: number,
    includesInterior: boolean,
    weatherSensitive: boolean,
  ): {
    minDays: number;
    recommendedDays: number;
    weatherBuffer: number;
    recommendations: string[];
  } {
    const hoursPerDay = crewSize * 8;
    const minDays = Math.ceil(totalHours / hoursPerDay);

    let recommendedDays = minDays;
    if (includesInterior) recommendedDays += 1; // Buffer for interior coordination

    const weatherBuffer = weatherSensitive
      ? Math.ceil(recommendedDays * 0.2)
      : 0;

    const recommendations: string[] = [];

    if (includesInterior) {
      recommendations.push(
        "Schedule interior cleaning after exterior completion",
      );
    }

    if (weatherSensitive) {
      recommendations.push("Allow weather buffer for outdoor work");
    }

    if (minDays > 5) {
      recommendations.push("Consider splitting into multiple phases");
    }

    return {
      minDays,
      recommendedDays: recommendedDays + weatherBuffer,
      weatherBuffer,
      recommendations,
    };
  }
}

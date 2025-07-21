import {
  BaseCalculator,
  CalculationInput,
  CalculationResult,
} from "../base-calculator";
import { OTHER_RATES, EQUIPMENT_TYPES, RIG_TIME } from "../constants";
import {
  getEquipmentForHeight,
  calculateEquipmentCost,
  roundToNearest,
  validateBuildingMeasurements,
} from "../utils";

interface BiofilmRemovalInput extends CalculationInput {
  area: number;
  biofilmSeverity: "light" | "moderate" | "severe";
  surfaceType: "concrete" | "stone" | "metal" | "glass" | "mixed";
  buildingHeightStories?: number;
  numberOfDrops?: number;
  requiresSealing: boolean;
  hasWaterFeatures: boolean;
}

export class BiofilmRemovalCalculator extends BaseCalculator<BiofilmRemovalInput> {
  calculate(input: BiofilmRemovalInput): CalculationResult {
    // Clear previous calculation state
    this.clearCalculationState();

    const {
      area,
      biofilmSeverity,
      surfaceType,
      buildingHeightStories = 1,
      numberOfDrops = 1,
      requiresSealing,
      hasWaterFeatures,
      location,
    } = input;

    // Get crew and shift settings
    const crewSize = this.getCrewSize(input);
    const shiftLength = this.getShiftLengthFromInput(input);

    // Validate inputs
    this.validateInput(input);

    if (area <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate building measurements
    const measurementWarnings = validateBuildingMeasurements({
      facadeArea: area,
      heightStories: buildingHeightStories,
    });
    measurementWarnings.forEach((warning) => this.addWarning(warning));

    // Calculate rate based on severity and surface
    const baseRate = this.getBaseRate(biofilmSeverity, surfaceType);
    this.addBreakdown(
      "Base Rate",
      `${biofilmSeverity} biofilm on ${surfaceType}`,
      `$${baseRate}/sq ft`,
    );

    // Calculate base price
    let basePrice = area * baseRate;
    this.addBreakdown(
      "Base Price",
      `${area} sq ft × $${baseRate}`,
      this.formatCurrency(basePrice),
    );

    // Sealing surcharge
    if (requiresSealing) {
      const sealingSurcharge = area * 0.2; // $0.20 per sq ft
      basePrice += sealingSurcharge;
      this.addBreakdown(
        "Protective Sealing",
        `${area} sq ft × $0.20`,
        this.formatCurrency(sealingSurcharge),
      );
    }

    // Water feature complexity
    if (hasWaterFeatures) {
      const waterFeatureSurcharge = basePrice * 0.15; // 15% increase
      basePrice += waterFeatureSurcharge;
      this.addBreakdown(
        "Water Feature Complexity",
        "Base price × 15%",
        this.formatCurrency(waterFeatureSurcharge),
      );
    }

    // Calculate labor hours
    const laborHours = this.calculateLaborHours(
      area,
      biofilmSeverity,
      surfaceType,
      hasWaterFeatures,
      crewSize,
    );
    this.addBreakdown(
      "Labor Hours",
      `${area} sq ft, ${biofilmSeverity} severity`,
      `${laborHours.toFixed(1)} hours`,
    );

    // Sealing labor
    let sealingHours = 0;
    if (requiresSealing) {
      sealingHours = area * 0.02; // 0.02 hours per sq ft
      this.addBreakdown(
        "Sealing Labor",
        `${area} sq ft × 0.02 hrs`,
        `${sealingHours.toFixed(1)} hours`,
      );
    }

    const totalLaborHours = laborHours + sealingHours;
    if (sealingHours > 0) {
      this.addBreakdown(
        "Total Labor Hours",
        "Treatment + Sealing",
        `${totalLaborHours.toFixed(1)} hours`,
      );
    }

    // Setup time
    const setupHours = this.calculateSetupTime(totalLaborHours);
    this.addBreakdown(
      "Setup Time",
      `${totalLaborHours.toFixed(1)} hours × 25%`,
      `${setupHours.toFixed(1)} hours`,
    );

    // Rig time
    let rigHours = 0;
    if (buildingHeightStories > 1) {
      rigHours = numberOfDrops * RIG_TIME.boomLift;
      this.addBreakdown(
        "Rig Time",
        `${numberOfDrops} drops × ${RIG_TIME.boomLift} hours`,
        `${rigHours.toFixed(1)} hours`,
      );
    }

    // Total hours
    const totalHours = totalLaborHours + setupHours + rigHours;
    this.addBreakdown(
      "Total Hours",
      "Labor + Setup + Rig",
      `${totalHours.toFixed(1)} hours`,
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
      const equipmentType = getEquipmentForHeight(buildingHeightStories, "BR");
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
    const finalPrice = this.calculateMinimumCharge("BR", roundedPrice);

    // Validations
    this.validateSetupTime(setupHours, totalLaborHours);

    if (buildingHeightStories) {
      this.validateBuildingHeight(buildingHeightStories);
    }

    // Service-specific warnings
    if (biofilmSeverity === "severe") {
      this.addWarning("Severe biofilm may require multiple treatment cycles");
    }

    if (hasWaterFeatures && !requiresSealing) {
      this.addWarning(
        "Water features typically require protective sealing to prevent recurrence",
      );
    }

    if (surfaceType === "metal" && biofilmSeverity !== "light") {
      this.addWarning(
        "Metal surfaces with biofilm may show staining - test area recommended",
      );
    }

    if (area > 5000) {
      this.addWarning(
        "Large area treatment - consider environmental impact and runoff management",
      );
    }

    if (biofilmSeverity === "severe" && finalPrice < 1000) {
      this.addWarning(
        "Severe biofilm price seems low - verify measurements and scope",
      );
    }

    if (projectDays > 7) {
      this.addWarning(
        "Extended project duration - coordinate with facility operations",
      );
    }

    if (buildingHeightStories > 12) {
      this.addWarning(
        "Very tall building - additional safety equipment may be required",
      );
    }

    if (surfaceType === "stone" && biofilmSeverity === "severe") {
      this.addWarning(
        "Severe biofilm on stone may require specialized treatment - verify chemical compatibility",
      );
    }

    if (hasWaterFeatures && area > 2000) {
      this.addWarning(
        "Large water feature area - consider phased treatment to minimize disruption",
      );
    }

    // Environmental warnings
    if (biofilmSeverity === "severe" || area > 3000) {
      this.addWarning(
        "Biofilm treatment chemicals require proper containment and disposal",
      );
    }

    // Build and return result
    return this.buildCalculationResult(
      "Biofilm Removal",
      finalPrice,
      totalLaborHours,
      setupHours,
      rigHours,
      crewSize,
      equipment,
    );
  }

  private getBaseRate(severity: string, surfaceType: string): number {
    // Start with base rate range
    let rate: number = OTHER_RATES.biofilmRemoval.min;

    // Severity adjustments
    switch (severity) {
      case "light":
        rate = OTHER_RATES.biofilmRemoval.min;
        break;
      case "moderate":
        rate =
          (OTHER_RATES.biofilmRemoval.min + OTHER_RATES.biofilmRemoval.max) / 2;
        break;
      case "severe":
        rate = OTHER_RATES.biofilmRemoval.max;
        break;
    }

    // Surface type adjustments
    switch (surfaceType) {
      case "concrete":
        rate *= 1.0; // Base rate
        break;
      case "stone":
        rate *= 1.1; // 10% more - porous surface
        break;
      case "metal":
        rate *= 0.9; // 10% less - smoother surface
        break;
      case "glass":
        rate *= 0.8; // 20% less - easiest to clean
        break;
      case "mixed":
        rate *= 1.05; // 5% more - complexity
        break;
    }

    return Number(rate.toFixed(2));
  }

  private calculateLaborHours(
    area: number,
    severity: string,
    surfaceType: string,
    hasWaterFeatures: boolean,
    crewSize: number,
  ): number {
    let baseHoursPerSqFt = 0.03; // 0.03 hours per sq ft base

    // Severity adjustments
    switch (severity) {
      case "light":
        baseHoursPerSqFt *= 0.8;
        break;
      case "moderate":
        baseHoursPerSqFt *= 1.0;
        break;
      case "severe":
        baseHoursPerSqFt *= 1.5;
        break;
    }

    // Surface type adjustments
    switch (surfaceType) {
      case "stone":
        baseHoursPerSqFt *= 1.2; // More time for porous surfaces
        break;
      case "glass":
        baseHoursPerSqFt *= 0.7; // Less time for smooth surfaces
        break;
      case "mixed":
        baseHoursPerSqFt *= 1.1; // More time for complexity
        break;
    }

    let laborHours = area * baseHoursPerSqFt;

    if (hasWaterFeatures) {
      laborHours *= 1.2; // 20% more time for water feature complexity
    }

    return laborHours;
  }

  // Helper method to assess biofilm severity
  static assessBiofilmSeverity(
    coverage: number, // percentage of surface covered
    thickness: "thin" | "medium" | "thick",
    color: "green" | "brown" | "black",
    age: number, // months since first noticed
  ): { severity: "light" | "moderate" | "severe"; factors: string[] } {
    const factors: string[] = [];
    let severity: "light" | "moderate" | "severe" = "light";

    if (coverage > 50) {
      factors.push("High surface coverage (>50%)");
      severity = "moderate";
    }

    if (coverage > 80) {
      factors.push("Extensive surface coverage (>80%)");
      severity = "severe";
    }

    if (thickness === "thick") {
      factors.push("Thick biofilm layer");
      severity = severity === "light" ? "moderate" : "severe";
    }

    if (color === "black") {
      factors.push("Dark coloration indicates mature biofilm");
      severity = severity === "light" ? "moderate" : "severe";
    }

    if (age > 12) {
      factors.push("Biofilm established for over 1 year");
      severity = severity === "light" ? "moderate" : "severe";
    }

    return { severity, factors };
  }

  // Helper method to calculate treatment chemicals
  static calculateChemicalRequirements(
    area: number,
    severity: string,
    surfaceType: string,
    requiresSealing: boolean,
  ): {
    biocide: number;
    cleaner: number;
    sealer: number;
    neutralizer: number;
    totalCost: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Biocide requirements
    const biocideRates = {
      light: 0.01, // gallons per sq ft
      moderate: 0.015,
      severe: 0.025,
    };

    const biocide = area * biocideRates[severity as keyof typeof biocideRates];

    // Cleaner requirements
    const cleanerRate = surfaceType === "stone" ? 0.02 : 0.015;
    const cleaner = area * cleanerRate;

    // Sealer requirements
    const sealer = requiresSealing ? area * 0.008 : 0;

    // Neutralizer requirements
    const neutralizer = area * 0.005;

    // Calculate costs
    const costs = {
      biocide: biocide * 45.0, // $45 per gallon
      cleaner: cleaner * 22.5, // $22.50 per gallon
      sealer: sealer * 38.0, // $38 per gallon
      neutralizer: neutralizer * 15.0, // $15 per gallon
    };

    const totalCost =
      costs.biocide + costs.cleaner + costs.sealer + costs.neutralizer;

    // Recommendations
    if (severity === "severe") {
      recommendations.push(
        "Severe biofilm may require multiple biocide applications",
      );
    }

    if (surfaceType === "stone") {
      recommendations.push("Test biocide compatibility on stone surfaces");
    }

    if (requiresSealing) {
      recommendations.push("Allow 24-48 hours between treatment and sealing");
    }

    return {
      biocide: Math.ceil(biocide),
      cleaner: Math.ceil(cleaner),
      sealer: Math.ceil(sealer),
      neutralizer: Math.ceil(neutralizer),
      totalCost,
      recommendations,
    };
  }

  // Helper method to calculate environmental impact
  static calculateEnvironmentalImpact(
    area: number,
    severity: string,
    hasWaterFeatures: boolean,
    nearVegetation: boolean,
  ): {
    runoffVolume: number;
    containmentRequired: boolean;
    environmentalScore: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Calculate runoff volume
    const runoffRates = {
      light: 0.5, // gallons per sq ft
      moderate: 0.8,
      severe: 1.2,
    };

    const runoffVolume =
      area * runoffRates[severity as keyof typeof runoffRates];

    // Determine containment requirements
    const containmentRequired =
      hasWaterFeatures || nearVegetation || area > 1000;

    // Calculate environmental score (higher is more impactful)
    let environmentalScore = runoffVolume * 0.1;

    if (hasWaterFeatures) {
      environmentalScore *= 1.5;
      recommendations.push(
        "Water features require complete runoff containment",
      );
    }

    if (nearVegetation) {
      environmentalScore *= 1.3;
      recommendations.push("Protect vegetation from chemical runoff");
    }

    if (severity === "severe") {
      environmentalScore *= 1.2;
      recommendations.push(
        "Severe biofilm treatment requires enhanced containment",
      );
    }

    if (containmentRequired) {
      recommendations.push(
        "Implement proper containment and collection systems",
      );
    }

    return {
      runoffVolume,
      containmentRequired,
      environmentalScore,
      recommendations,
    };
  }

  // Helper method to calculate treatment timeline
  static calculateTreatmentTimeline(
    area: number,
    severity: string,
    surfaceType: string,
    requiresSealing: boolean,
    crewSize: number,
  ): {
    treatmentDays: number;
    dwellTime: number;
    sealingDays: number;
    totalDays: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    const hoursPerDay = crewSize * 8;

    // Treatment phase
    const treatmentMultipliers = {
      light: 1.0,
      moderate: 1.5,
      severe: 2.0,
    };

    const treatmentHours =
      area *
      0.03 *
      treatmentMultipliers[severity as keyof typeof treatmentMultipliers];
    const treatmentDays = Math.ceil(treatmentHours / hoursPerDay);

    // Dwell time (chemical reaction time)
    const dwellTimes = {
      light: 2, // hours
      moderate: 4,
      severe: 8,
    };

    const dwellTime = dwellTimes[severity as keyof typeof dwellTimes];

    // Sealing phase
    const sealingDays = requiresSealing
      ? Math.ceil((area * 0.02) / hoursPerDay)
      : 0;

    // Total timeline includes dwell time
    const totalDays = treatmentDays + Math.ceil(dwellTime / 24) + sealingDays;

    // Recommendations
    if (severity === "severe") {
      recommendations.push(
        "Severe biofilm may require multiple treatment cycles",
      );
    }

    if (surfaceType === "stone") {
      recommendations.push(
        "Allow extended dwell time for porous stone surfaces",
      );
    }

    if (requiresSealing) {
      recommendations.push("Ensure complete drying before sealer application");
    }

    return {
      treatmentDays,
      dwellTime,
      sealingDays,
      totalDays,
      recommendations,
    };
  }

  // Helper method to calculate prevention recommendations
  static calculatePreventionPlan(
    area: number,
    surfaceType: string,
    hasWaterFeatures: boolean,
    environment: "indoor" | "outdoor",
  ): {
    maintenanceFrequency: string;
    preventiveTreatments: string[];
    annualCost: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const preventiveTreatments: string[] = [];

    // Base maintenance frequency
    let maintenanceFrequency = "quarterly";

    if (hasWaterFeatures) {
      maintenanceFrequency = "monthly";
      preventiveTreatments.push("Water feature algaecide");
      recommendations.push("Water features require frequent monitoring");
    }

    if (environment === "outdoor") {
      if (maintenanceFrequency === "quarterly")
        maintenanceFrequency = "bi-monthly";
      preventiveTreatments.push("Protective surface treatment");
      recommendations.push("Outdoor surfaces need more frequent attention");
    }

    if (surfaceType === "stone") {
      preventiveTreatments.push("Penetrating sealer");
      recommendations.push("Porous stone surfaces benefit from sealing");
    }

    // Calculate annual cost
    const frequencyMultipliers = {
      monthly: 12,
      "bi-monthly": 6,
      quarterly: 4,
      "semi-annually": 2,
      annually: 1,
    };

    const cleaningCost =
      area *
      0.15 *
      frequencyMultipliers[
        maintenanceFrequency as keyof typeof frequencyMultipliers
      ];
    const treatmentCost = preventiveTreatments.length * 150; // $150 per treatment type
    const annualCost = cleaningCost + treatmentCost;

    return {
      maintenanceFrequency,
      preventiveTreatments,
      annualCost,
      recommendations,
    };
  }
}

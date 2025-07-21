import { VALIDATION, EQUIPMENT_TYPES } from "./constants";

// Rounding function following business rules
export function roundToNearest(amount: number): number {
  // Round to nearest $50
  // If rounding would change price by more than $100, round to nearest $100 instead
  const roundedTo50 = Math.round(amount / 50) * 50;
  const difference = Math.abs(roundedTo50 - amount);

  if (difference > 100) {
    return Math.round(amount / 100) * 100;
  }

  return roundedTo50;
}

// Equipment selection based on building height
export function getEquipmentForHeight(
  heightStories: number,
  serviceType: string,
): string {
  // Glass Restoration always requires scaffold
  if (serviceType === "GR") {
    return EQUIPMENT_TYPES.SCAFFOLD;
  }

  // Ground level (1-4 stories)
  if (heightStories <= 4) {
    return EQUIPMENT_TYPES.GROUND;
  }

  // Mid-rise (5-9 stories)
  if (heightStories <= 9) {
    return EQUIPMENT_TYPES.BOOM;
  }

  // High-rise (10+ stories)
  return EQUIPMENT_TYPES.RDS;
}

// Calculate equipment cost based on type and duration
export function calculateEquipmentCost(
  equipmentType: string,
  days: number,
): number {
  const rates = {
    [EQUIPMENT_TYPES.SCAFFOLD]: { daily: 0, weekly: 0, monthly: 4000 },
    [EQUIPMENT_TYPES.BOOM]: { daily: 1400, weekly: 2400, monthly: 4025 },
    [EQUIPMENT_TYPES.RDS]: { daily: 0, weekly: 0, monthly: 0 }, // No rental cost
    [EQUIPMENT_TYPES.SCISSOR]: { daily: 700, weekly: 900, monthly: 725 },
    [EQUIPMENT_TYPES.GROUND]: { daily: 0, weekly: 0, monthly: 0 },
  };

  const rate = rates[equipmentType as keyof typeof rates];
  if (!rate) return 0;

  // Special pricing for scaffold
  if (equipmentType === EQUIPMENT_TYPES.SCAFFOLD) {
    const months = Math.ceil(days / 30);
    if (months === 1) return 4000;
    return 4000 + (months - 1) * 1800;
  }

  // Other equipment - choose most economical rental period
  if (days <= 3) return rate.daily * days;
  if (days <= 7) return rate.weekly;
  if (days <= 14) return rate.weekly * 2;
  if (days <= 30) return rate.monthly;

  return rate.monthly * Math.ceil(days / 30);
}

// Validate building measurements
export function validateBuildingMeasurements(measurements: {
  glassArea?: number;
  facadeArea?: number;
  heightStories?: number;
  heightFeet?: number;
}): string[] {
  const warnings: string[] = [];

  if (measurements.glassArea && measurements.facadeArea) {
    const ratio = measurements.glassArea / measurements.facadeArea;
    if (ratio > VALIDATION.maxGlassToFacadeRatio) {
      warnings.push(
        `Glass area (${measurements.glassArea} sq ft) is ${(ratio * 100).toFixed(0)}% of facade area - please verify`,
      );
    }
  }

  if (
    measurements.heightStories &&
    measurements.heightStories > VALIDATION.maxBuildingHeight
  ) {
    warnings.push(
      `Building height (${measurements.heightStories} stories) is unusually tall - please verify`,
    );
  }

  if (measurements.heightStories && measurements.heightFeet) {
    const avgStoryHeight = measurements.heightFeet / measurements.heightStories;
    if (avgStoryHeight < 8 || avgStoryHeight > 20) {
      warnings.push(
        `Average story height (${avgStoryHeight.toFixed(1)} ft) seems unusual`,
      );
    }
  }

  return warnings;
}

// Calculate number of windows from glass area
export function calculateWindowCount(
  glassArea: number,
  windowSize: number = 24,
): number {
  return Math.ceil(glassArea / windowSize);
}

// Calculate optimal crew size based on area
export function suggestCrewSize(area: number): number {
  if (area < 1000) return 2;
  if (area < 5000) return 3;
  if (area < 10000) return 4;
  return Math.min(6, Math.ceil(area / 2500));
}

// Format hours for display
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }
  return `${hours.toFixed(1)} hours`;
}

// Format area for display
export function formatArea(area: number): string {
  return new Intl.NumberFormat("en-US").format(area) + " sq ft";
}

// Calculate pricing competitiveness
export function analyzePriceCompetitiveness(
  price: number,
  marketRange: { min: number; max: number },
): "low" | "competitive" | "high" {
  const position =
    (price - marketRange.min) / (marketRange.max - marketRange.min);

  if (position < 0.3) return "low";
  if (position > 0.7) return "high";
  return "competitive";
}

// Calculate drops (access points) based on building size
export function calculateDrops(
  buildingArea: number,
  equipmentType: string,
): number {
  if (equipmentType === EQUIPMENT_TYPES.GROUND) {
    return 0;
  }

  // Base drops on building size
  if (buildingArea <= 5000) return 1;
  if (buildingArea <= 15000) return 2;
  if (buildingArea <= 30000) return 3;

  return Math.ceil(buildingArea / 10000);
}

// Calculate material coverage
export function calculateMaterialCoverage(
  area: number,
  coverageRate: number,
  wastePercentage: number = 0.1,
): number {
  const baseGallons = area / coverageRate;
  return Math.ceil(baseGallons * (1 + wastePercentage));
}

// Validate price per unit calculations
export function validatePricePerUnit(
  totalPrice: number,
  unitCount: number,
  unitType: string,
  expectedRange: { min: number; max: number },
): string[] {
  const warnings: string[] = [];

  if (unitCount <= 0) {
    warnings.push(`Invalid ${unitType} count: ${unitCount}`);
    return warnings;
  }

  const pricePerUnit = totalPrice / unitCount;

  if (pricePerUnit < expectedRange.min) {
    warnings.push(
      `Price per ${unitType} ($${pricePerUnit.toFixed(2)}) is below expected range ($${expectedRange.min}-$${expectedRange.max})`,
    );
  }

  if (pricePerUnit > expectedRange.max) {
    warnings.push(
      `Price per ${unitType} ($${pricePerUnit.toFixed(2)}) is above expected range ($${expectedRange.min}-$${expectedRange.max})`,
    );
  }

  return warnings;
}

// Calculate weather delays
export function calculateWeatherDelay(
  scheduledDays: number,
  weatherConditions: {
    precipitation: number; // percentage chance
    temperature: number; // degrees F
    windSpeed: number; // mph
  },
): number {
  let delayFactor = 1;

  // Precipitation delays
  if (weatherConditions.precipitation > 30) {
    delayFactor *= 1.2;
  }

  // Temperature delays
  if (weatherConditions.temperature < 35) {
    delayFactor *= 1.3;
  }

  // Wind delays
  if (weatherConditions.windSpeed > 20) {
    delayFactor *= 1.15;
  }

  return Math.ceil(scheduledDays * delayFactor);
}

// Calculate overtime costs
export function calculateOvertimeCost(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  overtimeMultiplier: number = 1.5,
): number {
  const regularCost = regularHours * hourlyRate;
  const overtimeCost = overtimeHours * hourlyRate * overtimeMultiplier;

  return regularCost + overtimeCost;
}

// Validate setup time percentage
export function validateSetupTimePercentage(
  setupHours: number,
  laborHours: number,
): { isValid: boolean; percentage: number; warnings: string[] } {
  const warnings: string[] = [];
  const percentage = setupHours / laborHours;

  let isValid = true;

  if (percentage < VALIDATION.minSetupTimePercent) {
    warnings.push(
      `Setup time (${(percentage * 100).toFixed(1)}%) is below minimum ${VALIDATION.minSetupTimePercent * 100}%`,
    );
    isValid = false;
  }

  if (percentage > VALIDATION.maxSetupTimePercent) {
    warnings.push(
      `Setup time (${(percentage * 100).toFixed(1)}%) exceeds maximum ${VALIDATION.maxSetupTimePercent * 100}%`,
    );
    isValid = false;
  }

  return { isValid, percentage, warnings };
}

// Calculate project timeline
export function calculateProjectTimeline(
  totalHours: number,
  crewSize: number,
  shiftLength: number,
  weatherDelay: number = 0,
): {
  workingDays: number;
  calendarDays: number;
  estimatedWeeks: number;
} {
  const hoursPerDay = crewSize * shiftLength;
  const workingDays = Math.ceil(totalHours / hoursPerDay);
  const adjustedDays = workingDays + weatherDelay;

  // Assume 5 working days per week
  const calendarDays = Math.ceil(adjustedDays * 1.4); // Account for weekends
  const estimatedWeeks = Math.ceil(calendarDays / 7);

  return {
    workingDays: adjustedDays,
    calendarDays,
    estimatedWeeks,
  };
}

// Format currency consistently
export function formatCurrency(
  amount: number,
  showCents: boolean = false,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

// Calculate efficiency metrics
export function calculateEfficiencyMetrics(
  actualHours: number,
  estimatedHours: number,
  actualCost: number,
  estimatedCost: number,
): {
  timeEfficiency: number;
  costEfficiency: number;
  overallEfficiency: number;
} {
  const timeEfficiency = estimatedHours / actualHours;
  const costEfficiency = estimatedCost / actualCost;
  const overallEfficiency = (timeEfficiency + costEfficiency) / 2;

  return {
    timeEfficiency: Math.round(timeEfficiency * 100) / 100,
    costEfficiency: Math.round(costEfficiency * 100) / 100,
    overallEfficiency: Math.round(overallEfficiency * 100) / 100,
  };
}

// Generate calculation summary
export function generateCalculationSummary(
  serviceType: string,
  totalPrice: number,
  totalHours: number,
  crewSize: number,
  projectDays: number,
  warnings: string[],
): string {
  const summary = [
    `${serviceType} Calculation Summary:`,
    `Total Price: ${formatCurrency(totalPrice)}`,
    `Total Hours: ${formatHours(totalHours)}`,
    `Crew Size: ${crewSize} people`,
    `Project Duration: ${projectDays} days`,
  ];

  if (warnings.length > 0) {
    summary.push(`Warnings: ${warnings.length}`);
  }

  return summary.join("\n");
}

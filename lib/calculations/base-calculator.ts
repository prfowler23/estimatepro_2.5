import { DEFAULTS, SETUP_TIME, VALIDATION, type Location } from "./constants";

export interface CalculationInput {
  location: Location;
  crewSize?: number;
  shiftLength?: number;
  workWeek?: number;
}

export interface CalculationResult {
  serviceType: string;
  basePrice: number;
  laborHours: number;
  setupHours: number;
  rigHours?: number;
  totalHours: number;
  crewSize: number;
  projectDays: number;
  equipment?: {
    type: string;
    days: number;
    cost: number;
  };
  warnings: string[];
  breakdown: Array<{
    step: string;
    description: string;
    value: string | number;
  }>;
}

export abstract class BaseCalculator<T extends CalculationInput> {
  protected warnings: string[] = [];
  protected breakdown: Array<{
    step: string;
    description: string;
    value: string | number;
  }> = [];

  abstract calculate(input: T): CalculationResult;

  protected addWarning(message: string): void {
    this.warnings.push(message);
  }

  protected addBreakdown(
    step: string,
    description: string,
    value: string | number,
  ): void {
    this.breakdown.push({ step, description, value });
  }

  protected calculateSetupTime(
    laborHours: number,
    isSpecial: boolean = false,
  ): number {
    if (isSpecial) {
      // Special setup time for FC/FR
      return 2 * (laborHours / (this.getShiftLength() || DEFAULTS.shiftLength));
    }
    return laborHours * SETUP_TIME.standard;
  }

  protected calculateProjectDays(
    totalHours: number,
    crewSize: number,
    shiftLength: number,
  ): number {
    const hoursPerDay = crewSize * shiftLength;
    return Math.ceil(totalHours / hoursPerDay);
  }

  protected validateInput(input: T): void {
    if (input.crewSize && input.crewSize < 1) {
      throw new Error("Crew size must be at least 1");
    }
    if (input.shiftLength && input.shiftLength < 4) {
      throw new Error("Shift length must be at least 4 hours");
    }
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  protected getShiftLength(): number {
    return DEFAULTS.shiftLength;
  }

  protected validateGlassToFacadeRatio(
    glassArea: number,
    facadeArea: number,
  ): void {
    if (facadeArea > 0) {
      const ratio = glassArea / facadeArea;
      if (ratio > VALIDATION.maxGlassToFacadeRatio) {
        this.addWarning(
          `Glass area is ${(ratio * 100).toFixed(0)}% of facade area - please verify measurements`,
        );
      }
    }
  }

  protected validatePricePerWindow(
    totalPrice: number,
    windowCount: number,
  ): void {
    if (windowCount > 0) {
      const pricePerWindow = totalPrice / windowCount;
      if (
        pricePerWindow < VALIDATION.pricePerWindowRange.min ||
        pricePerWindow > VALIDATION.pricePerWindowRange.max
      ) {
        this.addWarning(
          `Price per window (${pricePerWindow.toFixed(2)}) outside typical range (${VALIDATION.pricePerWindowRange.min}-${VALIDATION.pricePerWindowRange.max})`,
        );
      }
    }
  }

  protected validateSetupTime(setupHours: number, laborHours: number): void {
    const setupPercentage = setupHours / laborHours;
    if (
      setupPercentage < VALIDATION.minSetupTimePercent ||
      setupPercentage > VALIDATION.maxSetupTimePercent
    ) {
      this.addWarning(
        `Setup time is ${(setupPercentage * 100).toFixed(0)}% of labor hours - outside normal range (${VALIDATION.minSetupTimePercent * 100}%-${VALIDATION.maxSetupTimePercent * 100}%)`,
      );
    }
  }

  protected clearCalculationState(): void {
    this.warnings = [];
    this.breakdown = [];
  }

  protected getCrewSize(input: T): number {
    return input.crewSize || DEFAULTS.crewSize;
  }

  protected getShiftLengthFromInput(input: T): number {
    return input.shiftLength || DEFAULTS.shiftLength;
  }

  protected getWorkWeek(input: T): number {
    return input.workWeek || DEFAULTS.workWeek;
  }

  protected calculateRigTime(equipmentType: string, drops: number = 1): number {
    const rigTimes = {
      Ground: 0,
      "Boom Lift": 0.25,
      "Scissor Lift": 0.25,
      RDS: 0.5,
      Scaffold: 3.0,
    };

    const baseRigTime = rigTimes[equipmentType as keyof typeof rigTimes] || 0;
    return baseRigTime * drops;
  }

  protected determineEquipmentType(
    buildingHeight: number,
    serviceType: string,
  ): string {
    // Glass Restoration always uses scaffold
    if (serviceType === "GR") {
      return "Scaffold";
    }

    // Height-based equipment selection
    if (buildingHeight <= 2) {
      return "Ground";
    } else if (buildingHeight <= 5) {
      return "Boom Lift";
    } else {
      return "RDS";
    }
  }

  protected calculateMinimumCharge(
    serviceType: string,
    calculatedPrice: number,
  ): number {
    const minimums = {
      GR: 500,
      WC: 150,
      PW: 200,
      PWS: 250,
      FC: 200,
      FR: 300,
      HD: 180,
      SW: 250,
      PD: 400,
      GRC: 300,
      BR: 350,
    };

    const minimumCharge = minimums[serviceType as keyof typeof minimums] || 0;

    if (calculatedPrice < minimumCharge) {
      this.addWarning(
        `Price adjusted from ${this.formatCurrency(calculatedPrice)} to minimum charge of ${this.formatCurrency(minimumCharge)}`,
      );
      return minimumCharge;
    }

    return calculatedPrice;
  }

  protected validateBuildingHeight(height: number): void {
    if (height > VALIDATION.maxBuildingHeight) {
      this.addWarning(
        `Building height of ${height} stories exceeds maximum of ${VALIDATION.maxBuildingHeight} stories`,
      );
    }
  }

  protected roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  protected buildCalculationResult(
    serviceType: string,
    basePrice: number,
    laborHours: number,
    setupHours: number,
    rigHours: number = 0,
    crewSize: number,
    equipment?: { type: string; days: number; cost: number },
  ): CalculationResult {
    const totalHours = laborHours + setupHours + rigHours;
    const projectDays = this.calculateProjectDays(
      totalHours,
      crewSize,
      this.getShiftLength(),
    );

    return {
      serviceType,
      basePrice: this.roundToTwoDecimals(basePrice),
      laborHours: this.roundToTwoDecimals(laborHours),
      setupHours: this.roundToTwoDecimals(setupHours),
      rigHours: rigHours > 0 ? this.roundToTwoDecimals(rigHours) : undefined,
      totalHours: this.roundToTwoDecimals(totalHours),
      crewSize,
      projectDays,
      equipment,
      warnings: [...this.warnings],
      breakdown: [...this.breakdown],
    };
  }
}

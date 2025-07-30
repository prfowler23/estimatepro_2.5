import { ServiceType } from "@/lib/types/estimate-types";
import { CalculationParams } from "@/lib/services/calculator-service";
import { WindowCleaningCalculator } from "../services/window-cleaning";
import { PressureWashingCalculator } from "../services/pressure-washing";
import { CalculationResult } from "../base-calculator";

// Adapter to convert between the two calculator systems
export class CalculatorFactory {
  static create(params: CalculationParams): {
    validate(): { isValid: boolean; errors: string[]; warnings: string[] };
    calculate(): any;
  } {
    switch (params.serviceType) {
      case "WC": {
        const calculator = new WindowCleaningCalculator();
        return {
          validate() {
            const warnings: string[] = [];
            const errors: string[] = [];

            if (!params.formData.glassArea && !params.formData.squareFootage) {
              errors.push("Glass area or square footage is required");
            }

            return { isValid: errors.length === 0, errors, warnings };
          },
          calculate() {
            const input = {
              glassArea:
                params.formData.glassArea || params.formData.squareFootage || 0,
              buildingHeightStories:
                params.buildingContext?.stories || params.formData.stories || 1,
              numberOfDrops: params.formData.drops || 1,
              hasRoofAnchors: params.formData.roofAnchors || false,
              location: params.formData.location || "CA-Los Angeles",
              markupPercentage: params.formData.markupPercentage || 35,
              marginPercentage: params.formData.marginPercentage || 0,
              crewSize: params.formData.crewSize || 2,
              shiftLength: params.formData.shiftLength || 8,
            };

            return calculator.calculate(input);
          },
        };
      }
      case "PW": {
        const calculator = new PressureWashingCalculator();
        return {
          validate() {
            const warnings: string[] = [];
            const errors: string[] = [];

            if (!params.formData.squareFootage) {
              errors.push("Square footage is required");
            }

            return { isValid: errors.length === 0, errors, warnings };
          },
          calculate() {
            const input = {
              squareFootage: params.formData.squareFootage || 0,
              surface: params.formData.surface || "concrete",
              buildingHeightStories:
                params.buildingContext?.stories || params.formData.stories || 1,
              location: params.formData.location || "CA-Los Angeles",
              markupPercentage: params.formData.markupPercentage || 35,
              marginPercentage: params.formData.marginPercentage || 0,
              crewSize: params.formData.crewSize || 2,
              shiftLength: params.formData.shiftLength || 8,
            };

            return calculator.calculate(input);
          },
        };
      }
      // Add other calculators here
      default:
        throw new Error(
          `Calculator for service type ${params.serviceType} not found`,
        );
    }
  }
}

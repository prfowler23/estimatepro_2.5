import { ServiceType } from "@/lib/types/estimate-types";
import { CalculationParams } from "@/lib/services/calculator-service";
import { BaseCalculator } from "./base-calculator";
import { WindowCleaningCalculator } from "./window-cleaning-calculator";
import { PressureWashingCalculator } from "./pressure-washing-calculator";

export class CalculatorFactory {
  static create(params: CalculationParams): BaseCalculator {
    switch (params.serviceType) {
      case "WC":
        return new WindowCleaningCalculator(params);
      case "PW":
        return new PressureWashingCalculator(params);
      // Add other calculators here
      default:
        throw new Error(
          `Calculator for service type ${params.serviceType} not found`,
        );
    }
  }
}

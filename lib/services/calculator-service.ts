// Calculator service layer for all service calculations

import {
  ServiceCalculationResult,
  ServiceFormData,
  ServiceType,
} from "@/lib/types/estimate-types";
import { CalculatorFactory } from "../calculations/services/calculator-factory";

export interface CalculationParams {
  serviceType: ServiceType;
  formData: ServiceFormData;
  buildingContext?: {
    stories: number;
    heightFeet?: number;
    buildingType?: string;
    accessDifficulty?: "easy" | "moderate" | "difficult";
  };
  marketFactors?: {
    laborRate?: number;
    materialMarkup?: number;
    equipmentRates?: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CalculatorService {
  static calculateService(params: CalculationParams): ServiceCalculationResult {
    const calculator = CalculatorFactory.create(params);
    const validation = calculator.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }
    return calculator.calculate();
  }

  static calculateMultipleServices(
    calculations: CalculationParams[],
  ): ServiceCalculationResult[] {
    return calculations.map((params) => this.calculateService(params));
  }

  static getServiceDisplayName(serviceType: ServiceType): string {
    const displayNames: Record<ServiceType, string> = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      SW: "Soft Washing",
      BF: "Biofilm Removal",
      GR: "Glass Restoration",
      FR: "Frame Restoration",
      HD: "High Dusting",
      FC: "Final Clean",
      GRC: "Granite Reconditioning",
      PWS: "Pressure Wash & Seal",
      PD: "Parking Deck Cleaning",
    };

    return displayNames[serviceType] || serviceType;
  }

  static getServiceDescription(serviceType: ServiceType): string {
    const descriptions: Record<ServiceType, string> = {
      WC: "Professional interior and exterior window cleaning",
      PW: "High-pressure cleaning for building exteriors",
      SW: "Low-pressure cleaning with specialized detergents",
      BF: "Specialized removal of biofilm and organic buildup",
      GR: "Restoration of damaged or etched glass surfaces",
      FR: "Cleaning and restoration of window frames",
      HD: "Cleaning of high and hard-to-reach areas",
      FC: "Comprehensive post-construction cleaning",
      GRC: "Restoration and sealing of granite surfaces",
      PWS: "Pressure washing followed by protective sealing",
      PD: "Heavy-duty cleaning of parking structures",
    };

    return descriptions[serviceType] || "Professional cleaning service";
  }
}

export default CalculatorService;

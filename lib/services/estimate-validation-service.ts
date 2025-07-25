// Validation service for estimates
// Extracted from monolithic estimate-service.ts for better separation of concerns

import {
  safeString,
  safeNumber,
  withDefaultArray,
} from "@/lib/utils/null-safety";
import { EstimateService, ServiceType } from "@/lib/types/estimate-types";

export interface EstimateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EstimateCreationParams {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  buildingName: string;
  buildingAddress: string;
  buildingHeightStories: number;
  buildingHeightFeet?: number;
  buildingType?: string;
  notes?: string;
  services: EstimateService[];
}

export class EstimateValidationService {
  /**
   * Validate complete estimate data
   */
  static validateEstimate(
    params: EstimateCreationParams,
  ): EstimateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!safeString(params.customerName).trim()) {
      errors.push("Customer name is required");
    }

    if (!safeString(params.customerEmail).trim()) {
      errors.push("Customer email is required");
    } else if (!this.isValidEmail(params.customerEmail)) {
      errors.push("Customer email is invalid");
    }

    if (!safeString(params.customerPhone).trim()) {
      errors.push("Customer phone is required");
    } else if (!this.isValidPhoneNumber(params.customerPhone)) {
      warnings.push("Customer phone format may be invalid");
    }

    if (!safeString(params.buildingName).trim()) {
      errors.push("Building name is required");
    }

    if (!safeString(params.buildingAddress).trim()) {
      errors.push("Building address is required");
    }

    if (safeNumber(params.buildingHeightStories) < 1) {
      errors.push("Building height must be at least 1 story");
    }

    if (withDefaultArray(params.services).length === 0) {
      errors.push("At least one service is required");
    }

    // Service validation
    params.services.forEach((service, index) => {
      const serviceErrors = this.validateService(service);
      serviceErrors.forEach((error) => {
        errors.push(`Service ${index + 1}: ${error}`);
      });
    });

    // Business logic warnings
    if (safeNumber(params.buildingHeightStories) > 20) {
      warnings.push(
        "High-rise building may require special permits and equipment",
      );
    }

    if (params.services.length > 5) {
      warnings.push("Multiple services may require extended project timeline");
    }

    // Check for potential conflicts between services
    const serviceConflicts = this.checkServiceConflicts(params.services);
    warnings.push(...serviceConflicts);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual service
   */
  static validateService(service: EstimateService): string[] {
    const errors: string[] = [];

    if (!safeString(service.serviceType).trim()) {
      errors.push("Service type is required");
    }

    if (!service.calculationResult) {
      errors.push("Calculation result is required");
    } else {
      const result = service.calculationResult;

      if (safeNumber(result.area) <= 0) {
        errors.push("Service area must be greater than 0");
      }

      if (safeNumber(result.basePrice) <= 0) {
        errors.push("Service price must be greater than 0");
      }

      if (safeNumber(result.laborHours) <= 0) {
        errors.push("Labor hours must be greater than 0");
      }

      if (safeNumber(result.crewSize) < 1) {
        errors.push("Crew size must be at least 1");
      }

      // Validate reasonable bounds
      if (safeNumber(result.area) > 1000000) {
        errors.push("Service area seems unreasonably large (>1M sqft)");
      }

      if (safeNumber(result.basePrice) > 1000000) {
        errors.push("Service price seems unreasonably high (>$1M)");
      }

      if (safeNumber(result.laborHours) > 10000) {
        errors.push("Labor hours seem unreasonably high (>10,000 hours)");
      }

      if (safeNumber(result.crewSize) > 50) {
        errors.push("Crew size seems unreasonably large (>50 people)");
      }
    }

    return errors;
  }

  /**
   * Check for conflicts between services
   */
  static checkServiceConflicts(services: EstimateService[]): string[] {
    const warnings: string[] = [];
    const serviceTypes = services.map((s) => s.serviceType);

    // Check for incompatible service combinations
    const conflictGroups = [
      {
        services: ["PW", "SW"],
        warning:
          "Pressure washing and soft washing may conflict - consider one approach",
      },
      {
        services: ["GR", "FR"],
        warning:
          "Glass and frame restoration should be coordinated to avoid conflicts",
      },
    ];

    conflictGroups.forEach((group) => {
      const hasMultiple =
        group.services.filter((s) => serviceTypes.includes(s as ServiceType))
          .length > 1;
      if (hasMultiple) {
        warnings.push(group.warning);
      }
    });

    // Check for services that should be done together
    if (
      serviceTypes.includes("GR" as ServiceType) &&
      !serviceTypes.includes("WC" as ServiceType)
    ) {
      warnings.push(
        "Glass restoration typically requires window cleaning - consider adding window cleaning",
      );
    }

    if (
      serviceTypes.includes("BF" as ServiceType) &&
      !serviceTypes.includes("PW" as ServiceType) &&
      !serviceTypes.includes("SW" as ServiceType)
    ) {
      warnings.push(
        "Biofilm removal typically requires pressure or soft washing - consider adding washing service",
      );
    }

    return warnings;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(safeString(email));
  }

  /**
   * Validate phone number format (basic check)
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = safeString(phone).replace(/[\s\-\(\)\.]/g, "");
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
  }

  /**
   * Validate estimate is ready for approval
   */
  static validateForApproval(estimate: any): EstimateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if estimate has all required data
    if (!estimate.customerName || !estimate.customerEmail) {
      errors.push("Customer information is incomplete");
    }

    if (!estimate.buildingName || !estimate.buildingAddress) {
      errors.push("Building information is incomplete");
    }

    if (!estimate.services || estimate.services.length === 0) {
      errors.push("No services selected");
    }

    if (!estimate.summary?.totalPrice || estimate.summary.totalPrice <= 0) {
      errors.push("Total price is invalid");
    }

    // Check business rules for approval
    if (estimate.summary?.totalPrice > 100000) {
      warnings.push("High-value estimate may require additional approval");
    }

    if (estimate.summary?.complexityScore > 8) {
      warnings.push("High-complexity estimate may require technical review");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate estimate update data
   */
  static validateEstimateUpdate(
    updateData: Partial<EstimateCreationParams>,
  ): EstimateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate only provided fields
    if (updateData.customerEmail !== undefined && updateData.customerEmail) {
      if (!this.isValidEmail(updateData.customerEmail)) {
        errors.push("Customer email is invalid");
      }
    }

    if (updateData.customerPhone !== undefined && updateData.customerPhone) {
      if (!this.isValidPhoneNumber(updateData.customerPhone)) {
        warnings.push("Customer phone format may be invalid");
      }
    }

    if (updateData.buildingHeightStories !== undefined) {
      if (safeNumber(updateData.buildingHeightStories) < 1) {
        errors.push("Building height must be at least 1 story");
      }
      if (safeNumber(updateData.buildingHeightStories) > 20) {
        warnings.push(
          "High-rise building may require special permits and equipment",
        );
      }
    }

    if (updateData.services !== undefined) {
      if (withDefaultArray(updateData.services).length === 0) {
        errors.push("At least one service is required");
      } else {
        // Validate services
        updateData.services.forEach((service, index) => {
          const serviceErrors = this.validateService(service);
          serviceErrors.forEach((error) => {
            errors.push(`Service ${index + 1}: ${error}`);
          });
        });

        // Check service conflicts
        const serviceConflicts = this.checkServiceConflicts(
          updateData.services,
        );
        warnings.push(...serviceConflicts);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate service type is supported
   */
  static isValidServiceType(serviceType: string): serviceType is ServiceType {
    const validTypes: ServiceType[] = [
      "WC",
      "PW",
      "SW",
      "BF",
      "GR",
      "FR",
      "HD",
      "FC",
      "GRC",
      "PWS",
      "PD",
    ];
    return validTypes.includes(serviceType as ServiceType);
  }

  /**
   * Get validation summary for estimate
   */
  static getValidationSummary(params: EstimateCreationParams): {
    score: number;
    status: "excellent" | "good" | "fair" | "poor";
    issues: string[];
    recommendations: string[];
  } {
    const validation = this.validateEstimate(params);
    const issues = [...validation.errors, ...validation.warnings];
    const recommendations: string[] = [];

    // Calculate validation score (0-100)
    let score = 100;
    score -= validation.errors.length * 20; // Major deductions for errors
    score -= validation.warnings.length * 5; // Minor deductions for warnings

    // Add recommendations based on validation
    if (params.services.length === 1) {
      recommendations.push(
        "Consider adding complementary services for better value",
      );
    }

    if (
      params.buildingHeightStories > 3 &&
      !params.services.some((s) => s.serviceType === "HD")
    ) {
      recommendations.push("Consider adding high dusting for tall buildings");
    }

    if (!params.buildingType) {
      recommendations.push("Specify building type for more accurate pricing");
    }

    // Determine status
    let status: "excellent" | "good" | "fair" | "poor";
    if (score >= 90) status = "excellent";
    else if (score >= 75) status = "good";
    else if (score >= 60) status = "fair";
    else status = "poor";

    return {
      score: Math.max(0, score),
      status,
      issues,
      recommendations,
    };
  }
}

export default EstimateValidationService;

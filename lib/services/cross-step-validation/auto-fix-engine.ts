/**
 * Auto-Fix Engine
 * Automatic correction logic for fixable validation issues
 */

import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";

export class AutoFixEngine {
  /**
   * Auto-fix service area consistency issues
   */
  static autoFixServiceAreaConsistency(
    data: GuidedFlowData,
  ): Partial<GuidedFlowData> {
    const fixes: Partial<GuidedFlowData> = {};
    const selectedServices = data.scopeDetails?.selectedServices || [];
    const totalArea = data.areaOfWork?.measurements?.totalArea || 0;

    if (totalArea > 0) {
      const takeoffMeasurements = { ...data.takeoff?.measurements } || {};

      for (const service of selectedServices) {
        if (!takeoffMeasurements[service]?.area && totalArea > 0) {
          // Auto-assign reasonable area based on service type
          const serviceAreaRatio = {
            WC: 0.8, // Window cleaning - most of building
            PW: 1.0, // Pressure washing - full building
            SW: 0.9, // Soft washing - most of building
            BF: 0.3, // Biofilm removal - specific areas
            GR: 0.2, // Glass restoration - specific damaged areas
            FR: 0.15, // Frame restoration - specific frames
            HD: 0.6, // High dusting - upper areas
            FC: 0.4, // Final clean - interior areas
            GRC: 0.1, // Granite reconditioning - specific surfaces
            PWS: 1.0, // Pressure wash & seal - full building
            PD: 1.0, // Parking deck - full deck area
          };

          const ratio =
            serviceAreaRatio[service as keyof typeof serviceAreaRatio] || 0.5;
          takeoffMeasurements[service] = {
            ...takeoffMeasurements[service],
            area: Math.round(totalArea * ratio),
          };
        }
      }

      fixes.takeoff = {
        ...data.takeoff,
        measurements: takeoffMeasurements,
      };
    }

    return fixes;
  }

  /**
   * Auto-fix equipment access issues
   */
  static autoFixEquipmentAccess(data: GuidedFlowData): Partial<GuidedFlowData> {
    const height = data.areaOfWork?.buildingDetails?.height || 0;
    let accessType = "ladder";

    // Determine appropriate access equipment based on height
    if (height > 50) {
      accessType = "scaffold";
    } else if (height > 30) {
      accessType = "lift";
    } else if (height > 20) {
      accessType = "extension-ladder";
    }

    return {
      takeoff: {
        ...data.takeoff,
        equipment: {
          ...data.takeoff?.equipment,
          access: accessType,
        },
      },
    };
  }

  /**
   * Auto-fix duration issues
   */
  static autoFixDurationFeasibility(
    data: GuidedFlowData,
  ): Partial<GuidedFlowData> {
    const selectedServices = data.scopeDetails?.selectedServices || [];
    const totalArea = data.areaOfWork?.measurements?.totalArea || 0;
    const crewSize = data.duration?.crew?.size || 2;

    // Calculate realistic duration based on industry standards
    let estimatedHours = 0;

    for (const service of selectedServices) {
      const serviceArea =
        data.takeoff?.measurements?.[service]?.area || totalArea;

      // Industry estimates (hours per sq ft)
      const ratesPerSqFt = {
        WC: 0.035, // Window cleaning
        PW: 0.02, // Pressure washing
        SW: 0.025, // Soft washing
        BF: 0.045, // Biofilm removal
        GR: 0.075, // Glass restoration
        FR: 0.06, // Frame restoration
        HD: 0.04, // High dusting
        FC: 0.03, // Final clean
        GRC: 0.08, // Granite reconditioning
        PWS: 0.025, // Pressure wash & seal
        PD: 0.03, // Parking deck
      };

      const rate = ratesPerSqFt[service as keyof typeof ratesPerSqFt] || 0.03;
      estimatedHours += (serviceArea * rate) / crewSize;
    }

    // Round to reasonable increments
    estimatedHours = Math.ceil(estimatedHours / 0.5) * 0.5; // Round to nearest 0.5 hours

    return {
      duration: {
        ...data.duration,
        timeline: {
          ...data.duration?.timeline,
          estimatedHours: Math.max(estimatedHours, 1), // Minimum 1 hour
        },
      },
    };
  }

  /**
   * Auto-fix pricing consistency issues
   */
  static autoFixPricingConsistency(
    data: GuidedFlowData,
    suggestedPrice: number,
  ): Partial<GuidedFlowData> {
    return {
      pricing: {
        ...data.pricing,
        strategy: {
          ...data.pricing?.strategy,
          totalPrice: suggestedPrice,
        },
      },
    };
  }

  /**
   * Auto-fix service dependencies
   */
  static autoFixServiceDependencies(
    data: GuidedFlowData,
    missingDependencies: string[],
  ): Partial<GuidedFlowData> {
    const currentServices = data.scopeDetails?.selectedServices || [];
    const newServices = [...currentServices];

    // Add missing dependencies
    for (const dep of missingDependencies) {
      if (!newServices.includes(dep as ServiceType)) {
        newServices.push(dep as ServiceType);
      }
    }

    return {
      scopeDetails: {
        ...data.scopeDetails,
        selectedServices: newServices,
      },
    };
  }

  /**
   * Auto-fix timeline constraints
   */
  static autoFixTimelineConstraints(
    data: GuidedFlowData,
    suggestedCrewSize: number,
  ): Partial<GuidedFlowData> {
    return {
      duration: {
        ...data.duration,
        crew: {
          ...data.duration?.crew,
          size: suggestedCrewSize,
        },
      },
    };
  }

  /**
   * Auto-fix window cleaning access requirements
   */
  static autoFixWindowCleaningAccess(
    data: GuidedFlowData,
  ): Partial<GuidedFlowData> {
    const height = data.areaOfWork?.buildingDetails?.height || 0;
    let accessType = "ladder";

    if (height > 40) {
      accessType = "rope-access";
    } else if (height > 20) {
      accessType = "lift";
    } else if (height > 15) {
      accessType = "extension-ladder";
    }

    return {
      takeoff: {
        ...data.takeoff,
        equipment: {
          ...data.takeoff?.equipment,
          access: accessType,
          specialEquipment: height > 40 ? ["rope-access-gear"] : [],
        },
      },
    };
  }

  /**
   * Apply multiple auto-fixes to data
   */
  static applyAutoFixes(
    data: GuidedFlowData,
    fixes: Partial<GuidedFlowData>[],
  ): GuidedFlowData {
    let result = { ...data };

    // Apply each fix sequentially
    for (const fix of fixes) {
      result = this.mergeDeep(result, fix);
    }

    return result;
  }

  /**
   * Deep merge utility for applying fixes
   */
  private static mergeDeep(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === "object") {
        if (Array.isArray(source[key])) {
          result[key] = [...source[key]];
        } else {
          result[key] = this.mergeDeep(result[key] || {}, source[key]);
        }
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate fix before applying
   */
  static validateFix(
    originalData: GuidedFlowData,
    fixedData: Partial<GuidedFlowData>,
    fixType: string,
  ): boolean {
    try {
      // Basic validation to ensure fix doesn't break data integrity
      switch (fixType) {
        case "service-area-consistency":
          return this.validateAreaFix(originalData, fixedData);
        case "equipment-access":
          return this.validateEquipmentFix(originalData, fixedData);
        case "duration-feasibility":
          return this.validateDurationFix(originalData, fixedData);
        default:
          return true; // Allow other fixes by default
      }
    } catch (error) {
      console.warn(`Fix validation failed for ${fixType}:`, error);
      return false;
    }
  }

  /**
   * Validate area fix doesn't create impossible values
   */
  private static validateAreaFix(
    originalData: GuidedFlowData,
    fixedData: Partial<GuidedFlowData>,
  ): boolean {
    const totalArea = originalData.areaOfWork?.measurements?.totalArea || 0;
    const fixedMeasurements = fixedData.takeoff?.measurements;

    if (!fixedMeasurements || totalArea === 0) return true;

    // Check that no service area exceeds total area
    for (const [service, measurement] of Object.entries(fixedMeasurements)) {
      if (measurement?.area && measurement.area > totalArea * 1.2) {
        return false; // Fix would create invalid area
      }
    }

    return true;
  }

  /**
   * Validate equipment fix is appropriate
   */
  private static validateEquipmentFix(
    originalData: GuidedFlowData,
    fixedData: Partial<GuidedFlowData>,
  ): boolean {
    const height = originalData.areaOfWork?.buildingDetails?.height || 0;
    const fixedAccess = fixedData.takeoff?.equipment?.access;

    if (!fixedAccess) return true;

    // Ensure access method is appropriate for height
    const validAccessMethods = {
      ladder: height <= 20,
      "extension-ladder": height <= 30,
      lift: height <= 50,
      scaffold: height > 30,
      "rope-access": height > 20,
    };

    return (
      validAccessMethods[fixedAccess as keyof typeof validAccessMethods] !==
      false
    );
  }

  /**
   * Validate duration fix is reasonable
   */
  private static validateDurationFix(
    originalData: GuidedFlowData,
    fixedData: Partial<GuidedFlowData>,
  ): boolean {
    const fixedHours = fixedData.duration?.timeline?.estimatedHours;
    const totalArea = originalData.areaOfWork?.measurements?.totalArea || 0;

    if (!fixedHours || totalArea === 0) return true;

    // Ensure duration is within reasonable bounds (0.01 to 2 hours per sq ft)
    const hoursPerSqFt = fixedHours / totalArea;
    return hoursPerSqFt >= 0.005 && hoursPerSqFt <= 2.0;
  }
}

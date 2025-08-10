import {
  MeasurementEntry,
  MeasurementCategory,
} from "@/lib/types/measurements";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface Requirement {
  category: MeasurementCategory;
  label: string;
  level: "required" | "recommended" | "optional";
  minArea?: number;
  maxArea?: number;
}

export interface ValidationContext {
  buildingType?: string;
  photoAnalysis?: any;
  areaMapping?: any;
  previousEstimates?: any;
}

/**
 * Service for validating takeoff measurements and requirements
 */
export class TakeoffValidationService {
  /**
   * Validate measurements against service requirements and quality standards
   * @param measurements - Array of measurements to validate
   * @param services - Service codes to validate against
   * @param context - Optional validation context with external data
   * @returns Validation result with errors, warnings, and suggestions
   */
  validateMeasurements(
    measurements: MeasurementEntry[],
    services: string[],
    context?: ValidationContext,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required measurements for each service
    this.validateServiceRequirements(measurements, services, errors, warnings);

    // Validate measurement values
    this.validateMeasurementValues(measurements, errors, warnings);

    // Check for data quality issues
    this.validateDataQuality(measurements, warnings, suggestions);

    // Cross-validation with external data
    if (context) {
      this.performCrossValidation(measurements, context, warnings, suggestions);
    }

    // Check for completeness and consistency
    this.validateCompleteness(measurements, services, warnings, suggestions);

    // Validate measurement relationships
    this.validateMeasurementRelationships(measurements, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  private validateServiceRequirements(
    measurements: MeasurementEntry[],
    services: string[],
    errors: string[],
    warnings: string[],
  ): void {
    services.forEach((service) => {
      const requirements = this.getRequirementsForService(service);

      requirements.forEach((req) => {
        const categoryMeasurements = measurements.filter(
          (m) => m.category === req.category,
        );
        const hasCategory = categoryMeasurements.length > 0;
        const totalArea = categoryMeasurements.reduce(
          (sum, m) => sum + m.total,
          0,
        );

        if (!hasCategory && req.level === "required") {
          errors.push(
            `${req.label} measurements required for ${this.getServiceName(service)}`,
          );
        } else if (!hasCategory && req.level === "recommended") {
          warnings.push(
            `${req.label} measurements recommended for ${this.getServiceName(service)}`,
          );
        }

        // Check minimum area requirements
        if (hasCategory && req.minArea && totalArea < req.minArea) {
          warnings.push(
            `${req.label} area (${totalArea.toFixed(0)} sqft) below expected minimum (${req.minArea} sqft) for ${this.getServiceName(service)}`,
          );
        }

        // Check maximum area warnings
        if (hasCategory && req.maxArea && totalArea > req.maxArea) {
          warnings.push(
            `${req.label} area (${totalArea.toFixed(0)} sqft) exceeds typical maximum (${req.maxArea} sqft) for ${this.getServiceName(service)} - please verify`,
          );
        }
      });
    });
  }

  private validateMeasurementValues(
    measurements: MeasurementEntry[],
    errors: string[],
    warnings: string[],
  ): void {
    measurements.forEach((m) => {
      // Check for zero or negative dimensions
      if (m.width <= 0) {
        errors.push(
          `Invalid width (${m.width}) in ${m.description || "unnamed measurement"}`,
        );
      }

      if (m.height <= 0 && !m.length) {
        errors.push(
          `Invalid height (${m.height}) in ${m.description || "unnamed measurement"}`,
        );
      }

      if (m.length && m.length <= 0) {
        errors.push(
          `Invalid length (${m.length}) in ${m.description || "unnamed measurement"}`,
        );
      }

      if (m.quantity <= 0) {
        errors.push(
          `Invalid quantity (${m.quantity}) in ${m.description || "unnamed measurement"}`,
        );
      }

      if (m.total <= 0) {
        errors.push(
          `Invalid total area (${m.total}) in ${m.description || "unnamed measurement"}`,
        );
      }

      // Check for unreasonable dimensions
      this.validateReasonableDimensions(m, warnings);

      // Check calculation accuracy
      const expectedTotal = this.calculateExpectedTotal(m);
      const tolerance = Math.max(0.1, expectedTotal * 0.01); // 1% tolerance or 0.1 minimum

      if (Math.abs(m.total - expectedTotal) > tolerance) {
        warnings.push(
          `Calculation mismatch in ${m.description}: expected ${expectedTotal.toFixed(2)}, got ${m.total.toFixed(2)}`,
        );
      }
    });
  }

  private validateReasonableDimensions(
    m: MeasurementEntry,
    warnings: string[],
  ): void {
    const reasonableRanges = {
      glass_windows: { minWidth: 1, maxWidth: 20, minHeight: 2, maxHeight: 15 },
      glass_doors: { minWidth: 2, maxWidth: 12, minHeight: 6, maxHeight: 12 },
      glass_storefront: {
        minWidth: 4,
        maxWidth: 50,
        minHeight: 6,
        maxHeight: 20,
      },
      facade_brick: {
        minWidth: 5,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100,
      },
      facade_concrete: {
        minWidth: 5,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100,
      },
      facade_metal: {
        minWidth: 5,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100,
      },
      facade_stone: {
        minWidth: 5,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100,
      },
      flat_surface: {
        minWidth: 5,
        maxWidth: 500,
        minHeight: 5,
        maxHeight: 1000,
      },
      parking_spaces: {
        minWidth: 8,
        maxWidth: 12,
        minHeight: 16,
        maxHeight: 24,
      },
      parking_deck: {
        minWidth: 50,
        maxWidth: 500,
        minHeight: 100,
        maxHeight: 800,
      },
    };

    const range = reasonableRanges[m.category as keyof typeof reasonableRanges];
    if (!range) return;

    if (m.width < range.minWidth || m.width > range.maxWidth) {
      warnings.push(
        `Unusual width (${m.width} ft) for ${m.category} in ${m.description} - typical range is ${range.minWidth}-${range.maxWidth} ft`,
      );
    }

    const height = m.height || m.length || 0;
    if (height < range.minHeight || height > range.maxHeight) {
      warnings.push(
        `Unusual ${m.height ? "height" : "length"} (${height} ft) for ${m.category} in ${m.description} - typical range is ${range.minHeight}-${range.maxHeight} ft`,
      );
    }

    // Check for extremely large areas
    if (
      m.total > 10000 &&
      !m.category.includes("facade") &&
      !m.category.includes("flat_surface")
    ) {
      warnings.push(
        `Very large area (${m.total.toFixed(0)} sqft) for ${m.category} in ${m.description} - please verify`,
      );
    }
  }

  private validateDataQuality(
    measurements: MeasurementEntry[],
    warnings: string[],
    suggestions: string[],
  ): void {
    // Check for missing descriptions
    const missingDescriptions = measurements.filter(
      (m) => !m.description || m.description.trim() === "",
    );
    if (missingDescriptions.length > 0) {
      warnings.push(
        `${missingDescriptions.length} measurement(s) missing descriptions`,
      );
      suggestions.push(
        "Add descriptive names to help identify measurements during estimation and invoicing",
      );
    }

    // Check for missing locations
    const missingLocations = measurements.filter(
      (m) => !m.location || m.location.trim() === "",
    );
    if (missingLocations.length > 0) {
      suggestions.push(
        `Consider adding location details to ${missingLocations.length} measurement(s) for better project planning`,
      );
    }

    // Check for duplicate entries
    const duplicates = this.findDuplicateMeasurements(measurements);
    if (duplicates.length > 0) {
      warnings.push(
        `Found ${duplicates.length} potentially duplicate measurement(s) - review for consolidation`,
      );
    }

    // Check for suspiciously similar measurements
    const similar = this.findSimilarMeasurements(measurements);
    if (similar.length > 0) {
      suggestions.push(
        `Found ${similar.length} very similar measurement(s) - consider consolidating for efficiency`,
      );
    }
  }

  private performCrossValidation(
    measurements: MeasurementEntry[],
    context: ValidationContext,
    warnings: string[],
    suggestions: string[],
  ): void {
    // Validate against photo analysis
    if (context.photoAnalysis) {
      this.validateAgainstPhotoAnalysis(
        measurements,
        context.photoAnalysis,
        warnings,
        suggestions,
      );
    }

    // Validate against area mapping
    if (context.areaMapping) {
      this.validateAgainstAreaMapping(
        measurements,
        context.areaMapping,
        warnings,
        suggestions,
      );
    }

    // Validate against building type expectations
    if (context.buildingType) {
      this.validateAgainstBuildingType(
        measurements,
        context.buildingType,
        suggestions,
      );
    }
  }

  private validateAgainstPhotoAnalysis(
    measurements: MeasurementEntry[],
    photoAnalysis: any,
    warnings: string[],
    suggestions: string[],
  ): void {
    if (photoAnalysis.detectedFeatures) {
      const { windows, doors } = photoAnalysis.detectedFeatures;

      if (windows && windows.count > 0) {
        const windowMeasurements = measurements.filter(
          (m) => m.category === "glass_windows",
        );
        const totalWindowCount = windowMeasurements.reduce(
          (sum, m) => sum + m.quantity,
          0,
        );

        if (totalWindowCount < windows.count * 0.8) {
          warnings.push(
            `Photo analysis detected ${windows.count} windows, but only ${totalWindowCount} measured - some may be missing`,
          );
        }

        if (totalWindowCount > windows.count * 1.5) {
          warnings.push(
            `Measured ${totalWindowCount} windows, but photo analysis only detected ${windows.count} - please verify count`,
          );
        }
      }

      if (doors && doors.count > 0) {
        const doorMeasurements = measurements.filter(
          (m) => m.category === "glass_doors",
        );
        const totalDoorCount = doorMeasurements.reduce(
          (sum, m) => sum + m.quantity,
          0,
        );

        if (totalDoorCount === 0 && doors.count > 0) {
          suggestions.push(
            `Photo analysis detected ${doors.count} door(s) - consider adding door measurements`,
          );
        }
      }
    }
  }

  private validateAgainstAreaMapping(
    measurements: MeasurementEntry[],
    areaMapping: any,
    warnings: string[],
    suggestions: string[],
  ): void {
    if (areaMapping.shapes) {
      const totalMappedArea = areaMapping.shapes.reduce(
        (sum: number, shape: any) => sum + shape.area,
        0,
      );
      const totalMeasuredArea = measurements.reduce(
        (sum, m) => sum + m.total,
        0,
      );

      const difference = Math.abs(totalMappedArea - totalMeasuredArea);
      const tolerance = Math.max(totalMappedArea * 0.2, 100); // 20% tolerance or 100 sqft minimum

      if (difference > tolerance) {
        warnings.push(
          `Total measured area (${totalMeasuredArea.toFixed(0)} sqft) differs significantly from mapped area (${totalMappedArea.toFixed(0)} sqft)`,
        );
        suggestions.push(
          "Review area mapping and measurements for consistency",
        );
      }
    }
  }

  private validateAgainstBuildingType(
    measurements: MeasurementEntry[],
    buildingType: string,
    suggestions: string[],
  ): void {
    const expectations = this.getBuildingTypeExpectations(buildingType);

    expectations.forEach((expectation) => {
      const hasCategory = measurements.some(
        (m) => m.category === expectation.category,
      );
      if (!hasCategory && expectation.common) {
        suggestions.push(
          `${expectation.label} measurements are common for ${buildingType} buildings - consider adding if applicable`,
        );
      }
    });
  }

  private validateCompleteness(
    measurements: MeasurementEntry[],
    services: string[],
    warnings: string[],
    suggestions: string[],
  ): void {
    // Check if all selected services have adequate measurements
    const serviceMapping = this.getServiceCategoryMapping();

    services.forEach((service) => {
      const requiredCategories = serviceMapping[service] || [];
      const hasAnyMeasurements = requiredCategories.some((category) =>
        measurements.some((m) => m.category === category),
      );

      if (!hasAnyMeasurements) {
        warnings.push(
          `No measurements found for ${this.getServiceName(service)} - estimation may be incomplete`,
        );
      }
    });

    // Suggest additional measurements for better accuracy
    if (measurements.length < 3) {
      suggestions.push(
        "Consider adding more measurement details for more accurate estimation",
      );
    }
  }

  private validateMeasurementRelationships(
    measurements: MeasurementEntry[],
    warnings: string[],
  ): void {
    // Check facade to window ratio
    const facadeArea = measurements
      .filter((m) => m.category.startsWith("facade_"))
      .reduce((sum, m) => sum + m.total, 0);

    const windowArea = measurements
      .filter((m) => m.category.startsWith("glass_"))
      .reduce((sum, m) => sum + m.total, 0);

    if (facadeArea > 0 && windowArea > 0) {
      const windowRatio = windowArea / facadeArea;

      if (windowRatio > 0.8) {
        warnings.push(
          `Window area (${windowArea.toFixed(0)} sqft) seems very high compared to facade area (${facadeArea.toFixed(0)} sqft) - please verify`,
        );
      }

      if (windowRatio < 0.05 && facadeArea > 1000) {
        warnings.push(
          `Window area (${windowArea.toFixed(0)} sqft) seems low for large facade area (${facadeArea.toFixed(0)} sqft) - some windows may be missing`,
        );
      }
    }
  }

  private calculateExpectedTotal(m: MeasurementEntry): number {
    if (m.length) {
      return m.width * m.length * m.quantity;
    }
    return m.width * m.height * m.quantity;
  }

  private findDuplicateMeasurements(
    measurements: MeasurementEntry[],
  ): MeasurementEntry[] {
    const duplicates: MeasurementEntry[] = [];
    const seen = new Map<string, MeasurementEntry>();

    for (const m of measurements) {
      // Create a unique key based on properties that identify duplicates
      const key = `${m.category}-${m.description}-${m.location}-${m.width.toFixed(1)}-${m.height.toFixed(1)}`;

      if (seen.has(key)) {
        duplicates.push(m);
      } else {
        seen.set(key, m);
      }
    }

    return duplicates;
  }

  private findSimilarMeasurements(
    measurements: MeasurementEntry[],
  ): MeasurementEntry[] {
    const similar: MeasurementEntry[] = [];
    const categoryGroups = new Map<string, MeasurementEntry[]>();

    // Group by category for faster comparison
    for (const m of measurements) {
      const existing = categoryGroups.get(m.category) || [];
      existing.push(m);
      categoryGroups.set(m.category, existing);
    }

    // Only compare within same category
    for (const [category, items] of categoryGroups) {
      if (items.length < 2) continue;

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const m1 = items[i];
          const m2 = items[j];

          if (
            Math.abs(m1.width - m2.width) < 1 &&
            Math.abs(m1.height - m2.height) < 1 &&
            Math.abs(m1.total - m2.total) < 5
          ) {
            similar.push(m2);
          }
        }
      }
    }

    return similar;
  }

  private getRequirementsForService(service: string): Requirement[] {
    const requirements: Record<string, Requirement[]> = {
      WC: [
        {
          category: "glass_windows",
          label: "Window",
          level: "required",
          minArea: 10,
        },
        { category: "glass_doors", label: "Glass door", level: "recommended" },
      ],
      GR: [
        {
          category: "glass_windows",
          label: "Window",
          level: "required",
          minArea: 10,
        },
        {
          category: "glass_storefront",
          label: "Storefront",
          level: "recommended",
        },
      ],
      BWP: [
        {
          category: "facade_brick",
          label: "Facade",
          level: "required",
          minArea: 100,
          maxArea: 50000,
        },
        {
          category: "facade_concrete",
          label: "Concrete facade",
          level: "optional",
        },
      ],
      BWS: [
        {
          category: "facade_brick",
          label: "Facade",
          level: "required",
          minArea: 100,
          maxArea: 50000,
        },
        {
          category: "facade_concrete",
          label: "Concrete facade",
          level: "optional",
        },
      ],
      HBW: [
        {
          category: "facade_concrete",
          label: "High-rise facade",
          level: "required",
          minArea: 500,
          maxArea: 100000,
        },
      ],
      PWF: [
        {
          category: "flat_surface",
          label: "Flat surface",
          level: "required",
          minArea: 50,
          maxArea: 20000,
        },
      ],
      HFS: [
        {
          category: "flat_surface",
          label: "Hard floor surface",
          level: "required",
          minArea: 100,
        },
      ],
      PC: [
        {
          category: "parking_spaces",
          label: "Parking space",
          level: "required",
        },
        {
          category: "parking_deck",
          label: "Parking deck",
          level: "recommended",
        },
      ],
      PWP: [
        {
          category: "parking_deck",
          label: "Parking deck",
          level: "required",
          minArea: 500,
        },
        {
          category: "parking_spaces",
          label: "Parking space",
          level: "optional",
        },
      ],
      IW: [
        {
          category: "inner_wall",
          label: "Interior wall",
          level: "required",
          minArea: 50,
        },
      ],
      DC: [
        {
          category: "ceiling",
          label: "Deck/ceiling",
          level: "required",
          minArea: 100,
        },
      ],
    };

    return requirements[service] || [];
  }

  private getServiceName(service: string): string {
    const names: Record<string, string> = {
      WC: "Window Cleaning",
      GR: "Glass Restoration",
      BWP: "Building Wash (Pressure)",
      BWS: "Building Wash (Soft)",
      HBW: "High-Rise Building Wash",
      PWF: "Pressure Wash (Flat)",
      HFS: "Hard Floor Scrubbing",
      PC: "Parking Cleaning",
      PWP: "Parking Pressure Wash",
      IW: "Interior Wall Cleaning",
      DC: "Deck Cleaning",
    };

    return names[service] || service;
  }

  private getBuildingTypeExpectations(
    buildingType: string,
  ): Array<{ category: MeasurementCategory; label: string; common: boolean }> {
    const expectations: Record<
      string,
      Array<{ category: MeasurementCategory; label: string; common: boolean }>
    > = {
      office: [
        { category: "glass_windows", label: "Office windows", common: true },
        { category: "facade_concrete", label: "Concrete facade", common: true },
        {
          category: "glass_storefront",
          label: "Lobby storefront",
          common: true,
        },
      ],
      retail: [
        {
          category: "glass_storefront",
          label: "Storefront glass",
          common: true,
        },
        { category: "flat_surface", label: "Sidewalk area", common: true },
        { category: "facade_brick", label: "Brick facade", common: false },
      ],
      parking_garage: [
        {
          category: "parking_deck",
          label: "Parking deck levels",
          common: true,
        },
        { category: "parking_spaces", label: "Parking spaces", common: true },
        {
          category: "facade_concrete",
          label: "Concrete structure",
          common: true,
        },
      ],
    };

    return expectations[buildingType.toLowerCase()] || [];
  }

  private getServiceCategoryMapping(): Record<string, MeasurementCategory[]> {
    // Use a static map for better performance
    if (!this.serviceCategoryMap) {
      this.serviceCategoryMap = {
        WC: ["glass_windows", "glass_doors", "glass_storefront"],
        GR: ["glass_windows", "glass_doors", "glass_storefront"],
        BWP: [
          "facade_brick",
          "facade_concrete",
          "facade_metal",
          "facade_stone",
        ],
        BWS: [
          "facade_brick",
          "facade_concrete",
          "facade_metal",
          "facade_stone",
        ],
        HBW: ["facade_concrete", "facade_metal", "facade_stone"],
        PWF: ["flat_surface"],
        HFS: ["flat_surface"],
        PC: ["parking_spaces", "parking_deck"],
        PWP: ["parking_deck", "parking_spaces"],
        IW: ["inner_wall"],
        DC: ["ceiling"],
      };
    }
    return this.serviceCategoryMap;
  }

  private serviceCategoryMap?: Record<string, MeasurementCategory[]>;
}

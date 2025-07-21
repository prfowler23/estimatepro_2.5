import {
  MeasurementEntry,
  MeasurementCategory,
} from "@/lib/types/measurements";

export interface Suggestion {
  category: MeasurementCategory;
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  template?: {
    width: number;
    height: number;
    quantity: number;
    length?: number;
  };
  reason?: string;
}

export interface Template {
  category: MeasurementCategory;
  label: string;
  requiredFor: string[];
  defaultValues: {
    width: number;
    height: number;
    quantity: number;
    length?: number;
  };
}

export class TakeoffSuggestionsEngine {
  getSuggestionsForBuildingType(
    buildingType: string,
    services: string[],
    existingMeasurements: MeasurementEntry[],
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Building type specific suggestions
    const templates = this.getBuildingTemplates(buildingType);

    templates.forEach((template) => {
      const isRequired = services.some((service) =>
        template.requiredFor.includes(service),
      );

      if (isRequired) {
        const exists = existingMeasurements.some(
          (m) => m.category === template.category,
        );

        if (!exists) {
          suggestions.push({
            category: template.category,
            message: `Add ${template.label} measurements for ${services.join(", ")}`,
            priority: "high",
            template: template.defaultValues,
            reason: `Required for selected services: ${services.filter((s) => template.requiredFor.includes(s)).join(", ")}`,
          });
        }
      }
    });

    // Service-specific validations
    this.addServiceSpecificSuggestions(
      services,
      existingMeasurements,
      suggestions,
    );

    // Quality checks and completeness suggestions
    this.addQualityCheckSuggestions(existingMeasurements, suggestions);

    // Efficiency suggestions
    this.addEfficiencySuggestions(existingMeasurements, suggestions);

    return suggestions.sort(
      (a, b) =>
        this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority),
    );
  }

  private addServiceSpecificSuggestions(
    services: string[],
    existingMeasurements: MeasurementEntry[],
    suggestions: Suggestion[],
  ): void {
    // Window Cleaning / Glass Restoration
    if (services.includes("WC") || services.includes("GR")) {
      const windowCount = existingMeasurements.filter(
        (m) => m.category === "glass_windows",
      ).length;

      if (windowCount === 0) {
        suggestions.push({
          category: "glass_windows",
          message:
            "Window measurements required for Window Cleaning/Glass Restoration",
          priority: "critical",
          template: { width: 4, height: 6, quantity: 1 },
          reason: "Cannot estimate window cleaning without window measurements",
        });
      }

      const doorCount = existingMeasurements.filter(
        (m) => m.category === "glass_doors",
      ).length;

      if (doorCount === 0) {
        suggestions.push({
          category: "glass_doors",
          message:
            "Consider adding glass door measurements if building has glass entrances",
          priority: "medium",
          template: { width: 6, height: 8, quantity: 2 },
        });
      }
    }

    // Pressure Washing
    if (
      services.includes("BWP") ||
      services.includes("BWS") ||
      services.includes("HBW")
    ) {
      const facadeArea = existingMeasurements
        .filter((m) => m.category.startsWith("facade_"))
        .reduce((sum, m) => sum + m.total, 0);

      if (facadeArea === 0) {
        suggestions.push({
          category: "facade_brick",
          message:
            "Facade measurements required for Building Washing/Pressure Washing",
          priority: "critical",
          template: { width: 50, height: 40, quantity: 1 },
          reason:
            "Cannot estimate pressure washing without facade area measurements",
        });
      }
    }

    // Flat Surface Cleaning
    if (services.includes("PWF") || services.includes("HFS")) {
      const flatSurfaceArea = existingMeasurements
        .filter((m) => m.category === "flat_surface")
        .reduce((sum, m) => sum + m.total, 0);

      if (flatSurfaceArea === 0) {
        suggestions.push({
          category: "flat_surface",
          message:
            "Flat surface measurements required for sidewalk/plaza cleaning",
          priority: "critical",
          template: { width: 20, height: 100, quantity: 1 },
          reason:
            "Cannot estimate flat surface cleaning without area measurements",
        });
      }
    }

    // Parking Cleaning
    if (services.includes("PC") || services.includes("PWP")) {
      const parkingMeasurements = existingMeasurements.filter((m) =>
        m.category.startsWith("parking_"),
      );

      if (parkingMeasurements.length === 0) {
        suggestions.push({
          category: "parking_spaces",
          message:
            "Parking measurements required for parking cleaning services",
          priority: "critical",
          template: { width: 9, height: 18, quantity: 50 },
          reason:
            "Cannot estimate parking cleaning without space or deck measurements",
        });
      }
    }

    // Interior Wall Cleaning
    if (services.includes("IW")) {
      const innerWallArea = existingMeasurements
        .filter((m) => m.category === "inner_wall")
        .reduce((sum, m) => sum + m.total, 0);

      if (innerWallArea === 0) {
        suggestions.push({
          category: "inner_wall",
          message:
            "Interior wall measurements required for inner wall cleaning",
          priority: "critical",
          template: { width: 20, height: 10, quantity: 1 },
          reason:
            "Cannot estimate interior wall cleaning without wall area measurements",
        });
      }
    }

    // Deck Cleaning
    if (services.includes("DC")) {
      const ceilingArea = existingMeasurements
        .filter((m) => m.category === "ceiling")
        .reduce((sum, m) => sum + m.total, 0);

      if (ceilingArea === 0) {
        suggestions.push({
          category: "ceiling",
          message:
            "Ceiling/deck measurements required for deck cleaning service",
          priority: "critical",
          template: { width: 30, height: 40, quantity: 1 },
          reason:
            "Cannot estimate deck cleaning without ceiling/deck area measurements",
        });
      }
    }
  }

  private addQualityCheckSuggestions(
    existingMeasurements: MeasurementEntry[],
    suggestions: Suggestion[],
  ): void {
    // Check for measurements with zero dimensions
    const zeroMeasurements = existingMeasurements.filter(
      (m) => m.width === 0 || m.height === 0 || m.total === 0,
    );

    if (zeroMeasurements.length > 0) {
      suggestions.push({
        category: zeroMeasurements[0].category,
        message: `${zeroMeasurements.length} measurement(s) have zero dimensions - please review`,
        priority: "high",
        reason:
          "Zero-dimension measurements will result in inaccurate estimates",
      });
    }

    // Check for missing descriptions
    const missingDescriptions = existingMeasurements.filter(
      (m) => !m.description || m.description.trim() === "",
    );

    if (missingDescriptions.length > 0) {
      suggestions.push({
        category: missingDescriptions[0].category,
        message: `${missingDescriptions.length} measurement(s) missing descriptions`,
        priority: "medium",
        reason: "Descriptions help with estimate clarity and invoicing",
      });
    }

    // Check for missing locations
    const missingLocations = existingMeasurements.filter(
      (m) => !m.location || m.location.trim() === "",
    );

    if (missingLocations.length > 0) {
      suggestions.push({
        category: missingLocations[0].category,
        message: `${missingLocations.length} measurement(s) missing location details`,
        priority: "low",
        reason: "Location details help with project planning and execution",
      });
    }
  }

  private addEfficiencySuggestions(
    existingMeasurements: MeasurementEntry[],
    suggestions: Suggestion[],
  ): void {
    // Suggest consolidating similar measurements
    const categoryGroups = existingMeasurements.reduce(
      (groups, measurement) => {
        if (!groups[measurement.category]) {
          groups[measurement.category] = [];
        }
        groups[measurement.category].push(measurement);
        return groups;
      },
      {} as Record<string, MeasurementEntry[]>,
    );

    Object.entries(categoryGroups).forEach(([category, measurements]) => {
      if (measurements.length > 10) {
        suggestions.push({
          category: category as MeasurementCategory,
          message: `Consider consolidating ${measurements.length} ${category} measurements for efficiency`,
          priority: "low",
          reason:
            "Too many small measurements can slow down estimation and invoicing",
        });
      }
    });

    // Suggest adding footprint measurements for large buildings
    const totalFacadeArea = existingMeasurements
      .filter((m) => m.category.startsWith("facade_"))
      .reduce((sum, m) => sum + m.total, 0);

    const hasFootprint = existingMeasurements.some(
      (m) => m.category === "footprint",
    );

    if (totalFacadeArea > 10000 && !hasFootprint) {
      suggestions.push({
        category: "footprint",
        message:
          "Consider adding building footprint measurement for large building projects",
        priority: "medium",
        template: { width: 100, height: 150, quantity: 1 },
        reason:
          "Building footprint helps with project planning and equipment staging",
      });
    }
  }

  private getBuildingTemplates(buildingType: string): Template[] {
    const templates: Record<string, Template[]> = {
      office: [
        {
          category: "glass_windows",
          label: "Office Windows",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 4, height: 6, quantity: 20 },
        },
        {
          category: "facade_concrete",
          label: "Concrete Facades",
          requiredFor: ["BWP", "BWS", "HBW"],
          defaultValues: { width: 50, height: 40, quantity: 4 },
        },
        {
          category: "glass_storefront",
          label: "Lobby Storefront",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 20, height: 12, quantity: 1 },
        },
      ],
      retail: [
        {
          category: "glass_storefront",
          label: "Storefront Glass",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 12, height: 10, quantity: 3 },
        },
        {
          category: "flat_surface",
          label: "Sidewalk Area",
          requiredFor: ["PWF", "HFS"],
          defaultValues: { width: 15, height: 200, quantity: 1 },
        },
        {
          category: "facade_brick",
          label: "Brick Facades",
          requiredFor: ["BWP", "BWS", "HBW"],
          defaultValues: { width: 40, height: 20, quantity: 1 },
        },
      ],
      parking_garage: [
        {
          category: "parking_deck",
          label: "Parking Deck Levels",
          requiredFor: ["PC", "PWP"],
          defaultValues: { width: 200, height: 300, quantity: 3 },
        },
        {
          category: "parking_spaces",
          label: "Parking Spaces",
          requiredFor: ["PC", "PWP"],
          defaultValues: { width: 9, height: 18, quantity: 150 },
        },
        {
          category: "facade_concrete",
          label: "Concrete Structure",
          requiredFor: ["BWP", "BWS"],
          defaultValues: { width: 60, height: 30, quantity: 6 },
        },
      ],
      hospital: [
        {
          category: "glass_windows",
          label: "Hospital Windows",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 5, height: 7, quantity: 50 },
        },
        {
          category: "facade_concrete",
          label: "Medical Facility Facade",
          requiredFor: ["BWP", "BWS", "HBW"],
          defaultValues: { width: 80, height: 50, quantity: 4 },
        },
        {
          category: "inner_wall",
          label: "Interior Hospital Walls",
          requiredFor: ["IW"],
          defaultValues: { width: 30, height: 12, quantity: 10 },
        },
      ],
      warehouse: [
        {
          category: "facade_metal",
          label: "Metal Siding",
          requiredFor: ["BWP", "BWS", "HBW"],
          defaultValues: { width: 100, height: 25, quantity: 4 },
        },
        {
          category: "flat_surface",
          label: "Loading Dock Area",
          requiredFor: ["PWF", "HFS"],
          defaultValues: { width: 50, height: 100, quantity: 1 },
        },
        {
          category: "glass_windows",
          label: "Office Windows",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 4, height: 4, quantity: 5 },
        },
      ],
      school: [
        {
          category: "glass_windows",
          label: "Classroom Windows",
          requiredFor: ["WC", "GR"],
          defaultValues: { width: 6, height: 8, quantity: 30 },
        },
        {
          category: "facade_brick",
          label: "School Building Facade",
          requiredFor: ["BWP", "BWS", "HBW"],
          defaultValues: { width: 60, height: 30, quantity: 4 },
        },
        {
          category: "flat_surface",
          label: "Playground/Walkways",
          requiredFor: ["PWF", "HFS"],
          defaultValues: { width: 40, height: 150, quantity: 1 },
        },
      ],
    };

    return templates[buildingType.toLowerCase()] || templates["office"];
  }

  private getPriorityWeight(priority: Suggestion["priority"]): number {
    switch (priority) {
      case "critical":
        return 1;
      case "high":
        return 2;
      case "medium":
        return 3;
      case "low":
        return 4;
      default:
        return 5;
    }
  }

  // Get suggestions based on photo analysis results
  getPhotoAnalysisSuggestions(
    photoAnalysis: any,
    existingMeasurements: MeasurementEntry[],
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (photoAnalysis.detectedFeatures) {
      const { windows, doors, materials } = photoAnalysis.detectedFeatures;

      // Window suggestions
      if (windows && windows.count > 0) {
        const existingWindows = existingMeasurements.filter(
          (m) => m.category === "glass_windows",
        ).length;
        if (existingWindows < windows.count) {
          suggestions.push({
            category: "glass_windows",
            message: `Photo analysis detected ${windows.count} windows, but only ${existingWindows} measured`,
            priority: "high",
            template: {
              width: windows.avgWidth || 4,
              height: windows.avgHeight || 6,
              quantity: windows.count - existingWindows,
            },
          });
        }
      }

      // Door suggestions
      if (doors && doors.count > 0) {
        const existingDoors = existingMeasurements.filter(
          (m) => m.category === "glass_doors",
        ).length;
        if (existingDoors < doors.count) {
          suggestions.push({
            category: "glass_doors",
            message: `Photo analysis detected ${doors.count} doors, consider adding measurements`,
            priority: "medium",
            template: {
              width: doors.avgWidth || 3,
              height: doors.avgHeight || 7,
              quantity: doors.count - existingDoors,
            },
          });
        }
      }

      // Material suggestions
      if (materials) {
        materials.forEach((material: any) => {
          const category = this.getMaterialCategory(material.type);
          const existingMaterial = existingMeasurements.some(
            (m) => m.category === category,
          );

          if (!existingMaterial && material.confidence > 0.7) {
            suggestions.push({
              category,
              message: `Photo analysis detected ${material.type} material - consider adding measurements`,
              priority: "medium",
              template: {
                width: material.estimatedWidth || 20,
                height: material.estimatedHeight || 15,
                quantity: 1,
              },
            });
          }
        });
      }
    }

    return suggestions;
  }

  private getMaterialCategory(materialType: string): MeasurementCategory {
    const type = materialType.toLowerCase();
    if (type.includes("brick")) return "facade_brick";
    if (type.includes("concrete")) return "facade_concrete";
    if (type.includes("metal")) return "facade_metal";
    if (type.includes("stone")) return "facade_stone";
    return "facade_concrete";
  }
}

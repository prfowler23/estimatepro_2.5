import { PhotoAnalysisResult } from "../types/photo-analysis";

export function getFileType(
  file: File,
): "photo" | "video" | "area_map" | "measurement_screenshot" | "plan" {
  const fileName = file.name.toLowerCase();

  // Check filename patterns first for specific types
  if (fileName.includes("map")) return "area_map";
  if (fileName.includes("measurement")) return "measurement_screenshot";
  if (fileName.includes("blueprint") || fileName.includes("plan"))
    return "plan";

  // Then check MIME types for general categories
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "photo";
  if (file.type === "application/pdf") return "plan";

  // Default fallback
  return "photo";
}

export function calculateTotalWindowArea(
  windows: Array<{ width: number; height: number }>,
): number {
  return windows.reduce((sum, w) => sum + w.width * w.height, 0);
}

export function aggregateAnalysisResults(analyses: PhotoAnalysisResult[]): {
  totalWindows: number;
  totalWindowArea: number;
  materials: Record<string, number>;
  allHazards: string[];
  allDamage: string[];
  overallSeverity: "low" | "medium" | "high";
} {
  let totalWindows = 0;
  let totalWindowArea = 0;
  const materials: Record<string, number> = {};
  const allHazards: string[] = [];
  const allDamage: string[] = [];
  const severityLevels: string[] = [];

  analyses.forEach((analysis) => {
    // Aggregate window data
    if (analysis.windows) {
      totalWindows += analysis.windows.count;
      totalWindowArea += analysis.windows.totalArea;
    }

    // Aggregate material data
    if (analysis.materials?.breakdown) {
      Object.entries(analysis.materials.breakdown).forEach(
        ([material, percentage]) => {
          materials[material] = (materials[material] || 0) + percentage;
        },
      );
    }

    // Collect all hazards
    if (analysis.safety?.hazards) {
      allHazards.push(...analysis.safety.hazards);
    }

    // Collect all damage
    if (analysis.damage) {
      if (analysis.damage.staining) allDamage.push(...analysis.damage.staining);
      if (analysis.damage.oxidation)
        allDamage.push(...analysis.damage.oxidation);
      if (analysis.damage.damage) allDamage.push(...analysis.damage.damage);

      if (analysis.damage.severity) {
        severityLevels.push(analysis.damage.severity);
      }
    }
  });

  // Average out material percentages
  const analysisCount = analyses.length;
  if (analysisCount > 0) {
    Object.keys(materials).forEach((material) => {
      materials[material] = Math.round(materials[material] / analysisCount);
    });
  }

  // Determine overall severity
  const severityWeights = { low: 1, medium: 2, high: 3 };
  const avgSeverity =
    severityLevels.reduce((sum, level) => {
      return (
        sum + (severityWeights[level as keyof typeof severityWeights] || 1)
      );
    }, 0) / severityLevels.length;

  let overallSeverity: "low" | "medium" | "high" = "low";
  if (avgSeverity >= 2.5) overallSeverity = "high";
  else if (avgSeverity >= 1.5) overallSeverity = "medium";

  return {
    totalWindows,
    totalWindowArea,
    materials,
    allHazards: [...new Set(allHazards)], // Remove duplicates
    allDamage: [...new Set(allDamage)], // Remove duplicates
    overallSeverity,
  };
}

export function formatAnalysisForDisplay(analysis: PhotoAnalysisResult): {
  summary: string;
  highlights: string[];
  warnings: string[];
} {
  const highlights: string[] = [];
  const warnings: string[] = [];
  let summary = "";

  // Generate summary
  const parts: string[] = [];

  if (analysis.windows) {
    parts.push(`${analysis.windows.count} windows detected`);
    highlights.push(
      `Window area: ${analysis.windows.totalArea.toLocaleString()} sq ft`,
    );

    if (analysis.windows.gridPattern) {
      highlights.push(`Grid pattern: ${analysis.windows.gridPattern}`);
    }
  }

  if (analysis.materials) {
    const dominantMaterial = Object.entries(analysis.materials.breakdown).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (dominantMaterial) {
      parts.push(`${dominantMaterial[1]}% ${dominantMaterial[0]}`);
    }

    if (analysis.materials.cleaningDifficulty > 7) {
      warnings.push(
        `High cleaning difficulty (${analysis.materials.cleaningDifficulty}/10)`,
      );
    }

    if (analysis.materials.specialCoatings?.length) {
      highlights.push(
        `Special coatings: ${analysis.materials.specialCoatings.join(", ")}`,
      );
    }
  }

  if (analysis.measurements) {
    parts.push(`${analysis.measurements.stories} stories`);
    highlights.push(
      `Building: ${analysis.measurements.buildingHeight}' H × ${analysis.measurements.facadeWidth}' W`,
    );

    if (analysis.measurements.confidence < 0.7) {
      warnings.push(
        "Measurement confidence is low - manual verification recommended",
      );
    }
  }

  if (analysis.damage) {
    if (analysis.damage.severity === "high") {
      warnings.push("High severity damage detected");
    } else if (analysis.damage.severity === "medium") {
      warnings.push("Moderate damage detected");
    }

    if (analysis.damage.staining.length > 0) {
      warnings.push(`Staining: ${analysis.damage.staining.join(", ")}`);
    }

    if (analysis.damage.oxidation.length > 0) {
      warnings.push(`Oxidation: ${analysis.damage.oxidation.join(", ")}`);
    }
  }

  if (analysis.safety) {
    if (analysis.safety.riskLevel === "high") {
      warnings.push("High safety risk identified");
    } else if (analysis.safety.riskLevel === "medium") {
      warnings.push("Moderate safety concerns");
    }

    if (analysis.safety.hazards.length > 0) {
      warnings.push(`Safety hazards: ${analysis.safety.hazards.join(", ")}`);
    }

    if (analysis.safety.requirements.length > 0) {
      highlights.push(`Required: ${analysis.safety.requirements.join(", ")}`);
    }
  }

  summary = parts.length > 0 ? parts.join(", ") : "Analysis completed";

  return {
    summary,
    highlights,
    warnings,
  };
}

// Additional utility functions

export function getConfidenceLevel(
  confidence: number,
): "low" | "medium" | "high" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

export function getMaterialTypeIcon(material: string): string {
  const iconMap: Record<string, string> = {
    brick: "🧱",
    glass: "🪟",
    concrete: "🏗️",
    metal: "⚙️",
    stone: "🪨",
    wood: "🪵",
  };
  return iconMap[material.toLowerCase()] || "🏢";
}

export function getSeverityColor(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "low":
      return "text-green-600";
    case "medium":
      return "text-yellow-600";
    case "high":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

export function getRiskLevelBadgeClass(
  riskLevel: "low" | "medium" | "high",
): string {
  switch (riskLevel) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function validateAnalysisData(analysis: PhotoAnalysisResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate windows data
  if (analysis.windows) {
    if (analysis.windows.count < 0) {
      errors.push("Window count cannot be negative");
    }
    if (analysis.windows.totalArea < 0) {
      errors.push("Window area cannot be negative");
    }
    if (analysis.windows.confidence < 0 || analysis.windows.confidence > 1) {
      errors.push("Window confidence must be between 0 and 1");
    }
    if (analysis.windows.confidence < 0.5) {
      warnings.push("Low confidence in window detection");
    }
  }

  // Validate materials data
  if (analysis.materials) {
    const totalPercentage = Object.values(analysis.materials.breakdown).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (Math.abs(totalPercentage - 100) > 5) {
      warnings.push("Material percentages do not sum to 100%");
    }

    if (
      analysis.materials.cleaningDifficulty < 1 ||
      analysis.materials.cleaningDifficulty > 10
    ) {
      errors.push("Cleaning difficulty must be between 1 and 10");
    }
  }

  // Validate measurements data
  if (analysis.measurements) {
    if (analysis.measurements.buildingHeight <= 0) {
      errors.push("Building height must be positive");
    }
    if (analysis.measurements.facadeWidth <= 0) {
      errors.push("Facade width must be positive");
    }
    if (analysis.measurements.stories < 1) {
      errors.push("Building must have at least 1 story");
    }
    if (analysis.measurements.confidence < 0.3) {
      warnings.push(
        "Very low confidence in measurements - manual verification required",
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

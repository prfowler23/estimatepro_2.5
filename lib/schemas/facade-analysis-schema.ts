import { z } from "zod";
import {
  BUILDING_TYPES,
  COMPLEXITY_LEVELS,
  CONDITION_LEVELS,
  IMAGE_TYPES,
  VIEW_ANGLES,
  CONSTRAINTS,
  ERROR_MESSAGES,
} from "./constants";
import {
  boundedNumber,
  percentage,
  positiveNumber,
  nonNegativeNumber,
} from "./utils";

/**
 * Facade Analysis Schema Definitions
 * For AI-powered building facade analysis and measurement
 */

// Use shared building types from constants
export const buildingTypeSchema = z.enum(
  BUILDING_TYPES as [string, ...string[]],
);

export const facadeComplexitySchema = z.enum(
  COMPLEXITY_LEVELS as [string, ...string[]],
);

export const imageTypeSchema = z.enum(IMAGE_TYPES as [string, ...string[]]);

export const viewAngleSchema = z.enum(VIEW_ANGLES as [string, ...string[]]);

/**
 * Schema for facade material composition
 */
export const facadeMaterialSchema = z.object({
  id: z.string().describe("Unique material identifier"),
  type: z
    .string()
    .min(1)
    .describe("Material type (e.g., glass, concrete, brick)"),
  coverage_percentage: percentage("Material coverage must be 0-100%").describe(
    "Percentage of facade covered by this material",
  ),
  condition: z
    .enum(CONDITION_LEVELS as [string, ...string[]])
    .describe("Current condition of the material"),
  notes: z
    .string()
    .max(CONSTRAINTS.MAX_NOTES_LENGTH)
    .optional()
    .describe("Additional notes about the material"),
});

/**
 * Schema for creating a new facade analysis
 */
export const createFacadeAnalysisSchema = z.object({
  estimate_id: z
    .string()
    .uuid(ERROR_MESSAGES.INVALID_UUID)
    .describe("Associated estimate ID"),
  building_name: z
    .string()
    .max(200)
    .optional()
    .describe("Building name or identifier"),
  building_type: buildingTypeSchema
    .default("commercial")
    .describe("Type of building for analysis"),
  location: z
    .string()
    .max(500)
    .optional()
    .describe("Building location description"),
  notes: z
    .string()
    .max(CONSTRAINTS.MAX_NOTES_LENGTH)
    .optional()
    .describe("Initial analysis notes"),
  building_address: z
    .string()
    .max(500)
    .optional()
    .describe("Full building address"),
  building_height_stories: boundedNumber(
    CONSTRAINTS.MIN_STORIES,
    CONSTRAINTS.MAX_STORIES,
  )
    .optional()
    .describe("Building height in stories"),
  building_height_feet: boundedNumber(
    CONSTRAINTS.MIN_HEIGHT_FEET,
    CONSTRAINTS.MAX_HEIGHT_FEET,
  )
    .optional()
    .describe("Building height in feet"),
});

/**
 * Schema for updating facade analysis results
 */
export const updateFacadeAnalysisSchema = z
  .object({
    building_address: z.string().max(500).optional(),
    building_type: buildingTypeSchema.optional(),
    building_height_stories: boundedNumber(
      CONSTRAINTS.MIN_STORIES,
      CONSTRAINTS.MAX_STORIES,
    ).optional(),
    building_height_feet: boundedNumber(
      CONSTRAINTS.MIN_HEIGHT_FEET,
      CONSTRAINTS.MAX_HEIGHT_FEET,
    ).optional(),

    // Measurements with validation
    total_facade_sqft: positiveNumber("Total facade area must be positive")
      .max(CONSTRAINTS.MAX_FACADE_AREA)
      .optional()
      .describe("Total facade surface area"),
    total_glass_sqft: positiveNumber("Glass area must be positive")
      .max(CONSTRAINTS.MAX_GLASS_AREA)
      .optional()
      .describe("Total glass surface area"),
    net_facade_sqft: positiveNumber("Net facade area must be positive")
      .max(CONSTRAINTS.MAX_FACADE_AREA)
      .optional()
      .describe("Net facade area excluding openings"),
    glass_to_facade_ratio: percentage("Ratio must be between 0-100%")
      .optional()
      .describe("Glass to facade percentage"),

    // Material Breakdown
    materials: z
      .array(facadeMaterialSchema)
      .max(20, "Maximum 20 different materials allowed")
      .optional()
      .describe("Facade material composition"),
    facade_complexity: facadeComplexitySchema.optional(),

    // Ground Surfaces with constraints
    sidewalk_sqft: nonNegativeNumber("Sidewalk area cannot be negative")
      .max(CONSTRAINTS.MAX_AREA)
      .optional(),
    covered_walkway_sqft: nonNegativeNumber("Walkway area cannot be negative")
      .max(CONSTRAINTS.MAX_AREA)
      .optional(),
    parking_spaces: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .optional()
      .describe("Number of parking spaces"),
    parking_sqft: nonNegativeNumber("Parking area cannot be negative")
      .max(CONSTRAINTS.MAX_AREA)
      .optional(),
    loading_dock_sqft: nonNegativeNumber("Loading dock area cannot be negative")
      .max(CONSTRAINTS.MAX_AREA)
      .optional(),

    // Analysis Metadata
    confidence_level: percentage("Confidence level must be 0-100%")
      .optional()
      .describe("AI confidence in analysis results"),
    validation_notes: z
      .string()
      .max(CONSTRAINTS.MAX_NOTES_LENGTH)
      .optional()
      .describe("Manual validation notes"),
    manual_adjustments: z
      .record(z.any())
      .optional()
      .describe("Manual adjustments to AI results"),

    // Status Flags
    requires_field_verification: z
      .boolean()
      .optional()
      .describe("Whether field verification is needed"),
    has_covered_areas: z
      .boolean()
      .optional()
      .describe("Presence of covered/protected areas"),
    is_historic_building: z
      .boolean()
      .optional()
      .describe("Historic designation requiring special care"),
  })
  .refine(
    (data) => {
      // Validate that glass area doesn't exceed total facade area
      if (data.total_glass_sqft && data.total_facade_sqft) {
        return data.total_glass_sqft <= data.total_facade_sqft;
      }
      return true;
    },
    {
      message: "Glass area cannot exceed total facade area",
      path: ["total_glass_sqft"],
    },
  )
  .refine(
    (data) => {
      // Validate material percentages sum to 100% or less
      if (data.materials && data.materials.length > 0) {
        const totalPercentage = data.materials.reduce(
          (sum, mat) => sum + mat.coverage_percentage,
          0,
        );
        return totalPercentage <= 100;
      }
      return true;
    },
    {
      message: "Material coverage percentages cannot exceed 100%",
      path: ["materials"],
    },
  );

/**
 * Schema for facade analysis image data
 */
export const facadeAnalysisImageSchema = z.object({
  facade_analysis_id: z
    .string()
    .uuid(ERROR_MESSAGES.INVALID_UUID)
    .describe("Parent facade analysis ID"),
  image_url: z
    .string()
    .url(ERROR_MESSAGES.INVALID_URL)
    .describe("Image storage URL"),
  image_type: imageTypeSchema.describe("Type of image capture"),
  view_angle: viewAngleSchema.describe("Camera view angle"),

  // AI Analysis Results
  ai_analysis_results: z
    .object({
      detected_features: z
        .array(z.string().max(100))
        .max(50, "Maximum 50 features")
        .optional()
        .describe("Detected architectural features"),
      material_analysis: z
        .record(z.any())
        .optional()
        .describe("Material detection results"),
      damage_assessment: z
        .record(z.any())
        .optional()
        .describe("Damage and wear assessment"),
      accessibility_analysis: z
        .record(z.any())
        .optional()
        .describe("Accessibility evaluation"),
    })
    .optional()
    .describe("AI analysis results structure"),

  // Detected Elements with Bounds
  detected_elements: z
    .array(
      z.object({
        type: z
          .string()
          .min(1)
          .max(50)
          .describe("Element type (window, door, etc.)"),
        confidence: percentage("Confidence must be 0-100%").describe(
          "Detection confidence score",
        ),
        bounds: z
          .object({
            x: z.number().min(0).describe("X coordinate"),
            y: z.number().min(0).describe("Y coordinate"),
            width: positiveNumber("Width must be positive"),
            height: positiveNumber("Height must be positive"),
          })
          .optional()
          .describe("Bounding box coordinates"),
      }),
    )
    .max(500, "Maximum 500 detected elements")
    .optional()
    .describe("Individual detected elements"),

  // Confidence Scores
  confidence_scores: z
    .object({
      overall: percentage("Overall confidence must be 0-100%").describe(
        "Overall analysis confidence",
      ),
      materials: percentage()
        .optional()
        .describe("Material detection confidence"),
      measurements: percentage()
        .optional()
        .describe("Measurement accuracy confidence"),
      condition: percentage()
        .optional()
        .describe("Condition assessment confidence"),
    })
    .optional()
    .describe("Confidence scores by category"),

  metadata: z.record(z.any()).optional().describe("Additional image metadata"),
});

/**
 * Schema for AI facade analysis request
 */
export const facadeAnalysisAIRequestSchema = z.object({
  images: z
    .array(
      z.object({
        url: z
          .string()
          .url(ERROR_MESSAGES.INVALID_URL)
          .describe("Image URL for analysis"),
        type: imageTypeSchema.describe("Image capture type"),
        view_angle: viewAngleSchema.describe("Image view angle"),
      }),
    )
    .min(1, ERROR_MESSAGES.AT_LEAST_ONE)
    .max(
      CONSTRAINTS.MAX_PHOTOS,
      `Maximum ${CONSTRAINTS.MAX_PHOTOS} images allowed`,
    )
    .describe("Images for analysis"),

  building_type: buildingTypeSchema
    .optional()
    .describe("Building type hint for AI"),

  additional_context: z
    .string()
    .max(CONSTRAINTS.MAX_CONTEXT_LENGTH, ERROR_MESSAGES.CONTENT_TOO_LONG)
    .optional()
    .describe("Additional context for analysis"),

  analysis_focus: z
    .array(z.enum(["measurements", "materials", "condition", "accessibility"]))
    .max(4, "All focus areas selected")
    .optional()
    .describe("Specific areas to focus analysis on"),
});

/**
 * TypeScript type exports for facade analysis schemas
 */
export type CreateFacadeAnalysisSchema = z.infer<
  typeof createFacadeAnalysisSchema
>;
export type UpdateFacadeAnalysisSchema = z.infer<
  typeof updateFacadeAnalysisSchema
>;
export type FacadeAnalysisImageSchema = z.infer<
  typeof facadeAnalysisImageSchema
>;
export type FacadeAnalysisAIRequestSchema = z.infer<
  typeof facadeAnalysisAIRequestSchema
>;
export type FacadeMaterial = z.infer<typeof facadeMaterialSchema>;

/**
 * Validation helpers for facade analysis
 */
export function validateFacadeAnalysis(data: UpdateFacadeAnalysisSchema): {
  valid: boolean;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // Check if measurements are consistent
  if (data.total_facade_sqft && data.net_facade_sqft) {
    if (data.net_facade_sqft > data.total_facade_sqft) {
      warnings.push("Net facade area should not exceed total facade area");
    }
  }

  // Validate glass to facade ratio
  if (
    data.glass_to_facade_ratio &&
    data.total_glass_sqft &&
    data.total_facade_sqft
  ) {
    const calculatedRatio =
      (data.total_glass_sqft / data.total_facade_sqft) * 100;
    if (Math.abs(calculatedRatio - data.glass_to_facade_ratio) > 5) {
      warnings.push("Glass-to-facade ratio doesn't match calculated value");
    }
  }

  // Check for required field verification
  if (data.confidence_level && data.confidence_level < 70) {
    warnings.push("Low confidence level - field verification recommended");
  }

  return {
    valid: warnings.length === 0,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

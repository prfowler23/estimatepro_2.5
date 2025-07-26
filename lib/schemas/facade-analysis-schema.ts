import { z } from "zod";

export const buildingTypeSchema = z.enum([
  "office",
  "retail",
  "residential",
  "industrial",
  "mixed-use",
  "institutional",
]);

export const facadeComplexitySchema = z.enum(["simple", "moderate", "complex"]);

export const imageTypeSchema = z.enum([
  "aerial",
  "ground",
  "drone",
  "satellite",
]);

export const viewAngleSchema = z.enum([
  "front",
  "rear",
  "left",
  "right",
  "oblique",
  "top",
]);

export const facadeMaterialSchema = z.object({
  id: z.string(),
  type: z.string(),
  coverage_percentage: z.number().min(0).max(100),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  notes: z.string().optional(),
});

export const createFacadeAnalysisSchema = z.object({
  estimate_id: z.string().uuid(),
  building_name: z.string().optional(),
  building_type: z
    .enum([
      "commercial",
      "residential",
      "industrial",
      "mixed_use",
      "institutional",
      "healthcare",
      "educational",
      "hospitality",
      "retail",
    ])
    .default("commercial"),
  location: z.string().optional(),
  notes: z.string().optional(),
  building_address: z.string().optional(),
  building_height_stories: z.number().int().positive().optional(),
  building_height_feet: z.number().positive().optional(),
});

export const updateFacadeAnalysisSchema = z.object({
  building_address: z.string().optional(),
  building_type: buildingTypeSchema.optional(),
  building_height_stories: z.number().int().positive().optional(),
  building_height_feet: z.number().positive().optional(),

  // Measurements
  total_facade_sqft: z.number().positive().optional(),
  total_glass_sqft: z.number().positive().optional(),
  net_facade_sqft: z.number().positive().optional(),
  glass_to_facade_ratio: z.number().min(0).max(100).optional(),

  // Material Breakdown
  materials: z.array(facadeMaterialSchema).optional(),
  facade_complexity: facadeComplexitySchema.optional(),

  // Ground Surfaces
  sidewalk_sqft: z.number().min(0).optional(),
  covered_walkway_sqft: z.number().min(0).optional(),
  parking_spaces: z.number().int().min(0).optional(),
  parking_sqft: z.number().min(0).optional(),
  loading_dock_sqft: z.number().min(0).optional(),

  // Analysis Metadata
  confidence_level: z.number().min(0).max(100).optional(),
  validation_notes: z.string().optional(),
  manual_adjustments: z.record(z.any()).optional(),

  // Flags
  requires_field_verification: z.boolean().optional(),
  has_covered_areas: z.boolean().optional(),
  is_historic_building: z.boolean().optional(),
});

export const facadeAnalysisImageSchema = z.object({
  facade_analysis_id: z.string().uuid(),
  image_url: z.string().url(),
  image_type: imageTypeSchema,
  view_angle: viewAngleSchema,

  ai_analysis_results: z
    .object({
      detected_features: z.array(z.string()).optional(),
      material_analysis: z.record(z.any()).optional(),
      damage_assessment: z.record(z.any()).optional(),
      accessibility_analysis: z.record(z.any()).optional(),
    })
    .optional(),

  detected_elements: z
    .array(
      z.object({
        type: z.string(),
        confidence: z.number().min(0).max(100),
        bounds: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
      }),
    )
    .optional(),

  confidence_scores: z
    .object({
      overall: z.number().min(0).max(100),
      materials: z.number().min(0).max(100).optional(),
      measurements: z.number().min(0).max(100).optional(),
      condition: z.number().min(0).max(100).optional(),
    })
    .optional(),

  metadata: z.record(z.any()).optional(),
});

export const facadeAnalysisAIRequestSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string().url(),
        type: imageTypeSchema,
        view_angle: viewAngleSchema,
      }),
    )
    .min(1)
    .max(10),
  building_type: buildingTypeSchema.optional(),
  additional_context: z.string().max(2000).optional(),
  analysis_focus: z
    .array(z.enum(["measurements", "materials", "condition", "accessibility"]))
    .optional(),
});

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

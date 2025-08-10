import { z } from "zod";
import {
  LOCATIONS,
  CONSTRAINTS,
  DEFAULTS,
  ERROR_MESSAGES,
  SURFACE_TYPES,
  SERVICE_LEVELS,
  CONDITION_LEVELS,
  COMPLEXITY_LEVELS,
  SEVERITY_LEVELS,
} from "./constants";
import { boundedNumber } from "./utils";

/**
 * Base schema shared by all building services
 * Includes common fields for location, crew configuration, and work schedule
 */
export const baseServiceSchema = z.object({
  location: z.enum(LOCATIONS).default("raleigh"),
  crewSize: boundedNumber(
    CONSTRAINTS.MIN_CREW_SIZE,
    CONSTRAINTS.MAX_CREW_SIZE,
  ).default(DEFAULTS.CREW_SIZE),
  shiftLength: boundedNumber(
    CONSTRAINTS.MIN_SHIFT_LENGTH,
    CONSTRAINTS.MAX_SHIFT_LENGTH,
  ).default(DEFAULTS.SHIFT_LENGTH),
  workWeek: boundedNumber(
    CONSTRAINTS.MIN_WORK_WEEK,
    CONSTRAINTS.MAX_WORK_WEEK,
  ).default(DEFAULTS.WORK_WEEK),
});

/**
 * Glass Restoration Service Schema
 * For professional glass restoration and treatment services
 */
export const glassRestorationSchema = baseServiceSchema.extend({
  glassArea: boundedNumber(
    CONSTRAINTS.MIN_AREA,
    CONSTRAINTS.MAX_GLASS_AREA,
  ).describe("Total glass area in square feet"),
  facadeArea: boundedNumber(CONSTRAINTS.MIN_AREA, CONSTRAINTS.MAX_FACADE_AREA)
    .optional()
    .describe("Total facade area if different from glass area"),
  numberOfDrops: boundedNumber(1, 50)
    .default(DEFAULTS.NUMBER_OF_DROPS)
    .describe("Number of rope drops required"),
  buildingHeightStories: boundedNumber(
    CONSTRAINTS.MIN_STORIES,
    CONSTRAINTS.MAX_STORIES,
  )
    .default(DEFAULTS.BUILDING_HEIGHT_STORIES)
    .describe("Building height in stories"),
});

/**
 * Window Cleaning Service Schema
 * For routine and specialized window cleaning services
 */
export const windowCleaningSchema = baseServiceSchema.extend({
  glassArea: boundedNumber(
    CONSTRAINTS.MIN_AREA,
    CONSTRAINTS.MAX_GLASS_AREA,
  ).describe("Total glass area to be cleaned"),
  buildingHeightStories: boundedNumber(
    CONSTRAINTS.MIN_STORIES,
    CONSTRAINTS.MAX_STORIES,
  )
    .default(DEFAULTS.BUILDING_HEIGHT_STORIES)
    .describe("Building height for access planning"),
  numberOfDrops: boundedNumber(1, 50)
    .default(DEFAULTS.NUMBER_OF_DROPS)
    .describe("Number of rope access points"),
  hasRoofAnchors: z
    .boolean()
    .default(false)
    .describe("Whether roof anchors are available"),
});

/**
 * Pressure Washing Service Schema
 * For high-pressure cleaning of building exteriors and hardscapes
 */
export const pressureWashingSchema = baseServiceSchema
  .extend({
    facadeArea: boundedNumber(
      CONSTRAINTS.MIN_AREA,
      CONSTRAINTS.MAX_GLASS_AREA,
    ).describe("Total facade area to be pressure washed"),
    surfaceType: z
      .enum(SURFACE_TYPES.PRESSURE_WASHING)
      .default("regular")
      .describe("Surface complexity for time estimation"),
    flatSurfaceArea: boundedNumber(0, CONSTRAINTS.MAX_GLASS_AREA)
      .optional()
      .describe("Additional flat surface area"),
    includesHardscapes: z
      .boolean()
      .default(false)
      .describe("Whether service includes hardscape cleaning"),
    hardscapeArea: boundedNumber(0, CONSTRAINTS.MAX_GLASS_AREA)
      .optional()
      .describe("Hardscape area if included"),
    buildingHeightStories: boundedNumber(
      CONSTRAINTS.MIN_STORIES,
      CONSTRAINTS.MAX_STORIES,
    ).default(DEFAULTS.BUILDING_HEIGHT_STORIES),
    numberOfDrops: boundedNumber(1, 50).default(DEFAULTS.NUMBER_OF_DROPS),
  })
  .refine(
    (data) => !data.includesHardscapes || data.hardscapeArea !== undefined,
    {
      message: ERROR_MESSAGES.CONDITIONAL_REQUIRED("hardscapes are included"),
      path: ["hardscapeArea"],
    },
  );

// Pressure Wash & Seal
export const pressureWashSealSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(100000),
  surfaceMaterial: z.enum(["brick", "concrete", "mixed"]).default("brick"),
  sealerType: z.enum(["standard", "premium"]).default("standard"),
  numberOfCoats: z.number().min(1).max(3).default(1),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
});

// Final Clean
export const finalCleanSchema = baseServiceSchema.extend({
  glassArea: z.number().min(1).max(100000),
  includesInterior: z.boolean().default(false),
  postConstruction: z.boolean().default(false),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
});

// Frame Restoration
export const frameRestorationSchema = baseServiceSchema.extend({
  numberOfFrames: z.number().min(1).max(10000),
  frameCondition: z.enum(["good", "fair", "poor"]).default("fair"),
  requiresGlassRestoration: z.boolean().default(false),
});

// High Dusting
export const highDustingSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(100000),
  surfaceComplexity: z
    .enum(["simple", "moderate", "complex"])
    .default("moderate"),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
  includesFans: z.boolean().default(false),
  includesFixtures: z.boolean().default(false),
});

/**
 * Soft Washing Service Schema
 * For low-pressure chemical cleaning of delicate surfaces
 */
export const softWashingSchema = baseServiceSchema
  .extend({
    facadeArea: boundedNumber(
      CONSTRAINTS.MIN_AREA,
      CONSTRAINTS.MAX_GLASS_AREA,
    ).describe("Total facade area to be soft washed"),
    surfaceMaterial: z
      .enum(SURFACE_TYPES.SOFT_WASHING)
      .default("vinyl")
      .describe("Primary surface material"),
    contaminationLevel: z
      .enum(SEVERITY_LEVELS.slice(0, 3) as [string, ...string[]])
      .default("moderate")
      .describe("Level of biological growth or staining"),
    buildingHeightStories: boundedNumber(
      CONSTRAINTS.MIN_STORIES,
      CONSTRAINTS.MAX_STORIES,
    ).default(DEFAULTS.BUILDING_HEIGHT_STORIES),
    numberOfDrops: boundedNumber(1, 50).default(DEFAULTS.NUMBER_OF_DROPS),
    includesRoof: z
      .boolean()
      .default(false)
      .describe("Whether roof cleaning is included"),
    roofArea: boundedNumber(0, CONSTRAINTS.MAX_GLASS_AREA)
      .optional()
      .describe("Roof area if included"),
  })
  .refine((data) => !data.includesRoof || data.roofArea !== undefined, {
    message: ERROR_MESSAGES.CONDITIONAL_REQUIRED("roof cleaning is included"),
    path: ["roofArea"],
  });

/**
 * Parking Deck Service Schema
 * For cleaning and maintenance of parking structures
 */
export const parkingDeckSchema = baseServiceSchema
  .extend({
    numberOfSpaces: boundedNumber(1, 10000)
      .optional()
      .describe("Number of parking spaces"),
    totalArea: boundedNumber(CONSTRAINTS.MIN_AREA, CONSTRAINTS.MAX_AREA)
      .optional()
      .describe("Total deck area in square feet"),
    deckLevel: z
      .enum(SURFACE_TYPES.PARKING_DECK)
      .default("ground")
      .describe("Parking deck type/location"),
    serviceType: z
      .enum(SERVICE_LEVELS.PARKING_DECK)
      .default("sweep_and_wash")
      .describe("Type of cleaning service"),
    hasOilStains: z
      .boolean()
      .default(false)
      .describe("Presence of oil stains requiring treatment"),
    drainageComplexity: z
      .enum(COMPLEXITY_LEVELS.slice(0, 2) as [string, ...string[]])
      .default("simple")
      .describe("Drainage system complexity"),
  })
  .refine(
    (data) => data.numberOfSpaces !== undefined || data.totalArea !== undefined,
    {
      message: "Either number of spaces or total area must be provided",
      path: ["numberOfSpaces"],
    },
  );

/**
 * Granite Reconditioning Service Schema
 * For restoration and maintenance of granite surfaces
 */
export const graniteReconditioningSchema = baseServiceSchema
  .extend({
    area: boundedNumber(CONSTRAINTS.MIN_AREA, 50000).describe(
      "Total granite surface area",
    ),
    graniteCondition: z
      .enum(CONDITION_LEVELS.slice(1) as [string, ...string[]])
      .default("fair")
      .describe("Current condition of granite"),
    serviceLevel: z
      .enum(SERVICE_LEVELS.GRANITE)
      .default("clean_and_seal")
      .describe("Level of reconditioning service"),
    includesPolishing: z
      .boolean()
      .default(false)
      .describe("Whether diamond polishing is included"),
    edgeWork: z
      .boolean()
      .default(false)
      .describe("Whether edge detail work is required"),
    edgeLinearFeet: boundedNumber(0, 10000)
      .optional()
      .describe("Linear feet of edge work if required"),
  })
  .refine((data) => !data.edgeWork || data.edgeLinearFeet !== undefined, {
    message: ERROR_MESSAGES.CONDITIONAL_REQUIRED("edge work is included"),
    path: ["edgeLinearFeet"],
  });

/**
 * Biofilm Removal Service Schema
 * For specialized removal of biological growth and contamination
 */
export const biofilmRemovalSchema = baseServiceSchema.extend({
  area: boundedNumber(
    CONSTRAINTS.MIN_AREA,
    CONSTRAINTS.MAX_GLASS_AREA,
  ).describe("Total area affected by biofilm"),
  biofilmSeverity: z
    .enum(SEVERITY_LEVELS.slice(0, 3) as [string, ...string[]])
    .default("moderate")
    .describe("Severity of biofilm contamination"),
  surfaceType: z
    .enum(SURFACE_TYPES.BIOFILM)
    .default("concrete")
    .describe("Primary surface material affected"),
  buildingHeightStories: boundedNumber(
    CONSTRAINTS.MIN_STORIES,
    CONSTRAINTS.MAX_STORIES,
  ).default(DEFAULTS.BUILDING_HEIGHT_STORIES),
  numberOfDrops: boundedNumber(1, 50).default(DEFAULTS.NUMBER_OF_DROPS),
  requiresSealing: z
    .boolean()
    .default(false)
    .describe("Whether post-treatment sealing is required"),
  hasWaterFeatures: z
    .boolean()
    .default(false)
    .describe("Presence of water features requiring special treatment"),
});

// Type exports
export type GlassRestorationFormData = z.infer<typeof glassRestorationSchema>;
export type WindowCleaningFormData = z.infer<typeof windowCleaningSchema>;
export type PressureWashingFormData = z.infer<typeof pressureWashingSchema>;
export type PressureWashSealFormData = z.infer<typeof pressureWashSealSchema>;
export type FinalCleanFormData = z.infer<typeof finalCleanSchema>;
export type FrameRestorationFormData = z.infer<typeof frameRestorationSchema>;
export type HighDustingFormData = z.infer<typeof highDustingSchema>;
export type SoftWashingFormData = z.infer<typeof softWashingSchema>;
export type ParkingDeckFormData = z.infer<typeof parkingDeckSchema>;
export type GraniteReconditioningFormData = z.infer<
  typeof graniteReconditioningSchema
>;
export type BiofilmRemovalFormData = z.infer<typeof biofilmRemovalSchema>;

/**
 * Additional validation helpers for complex business rules
 * These supplement the built-in Zod refinements for edge cases
 */

/**
 * Validate that service configuration is feasible
 */
export function validateServiceFeasibility(
  data: any,
  serviceType: string,
): { success: boolean; warnings?: string[] } {
  const warnings: string[] = [];

  // Check crew size vs area ratio
  if (data.area && data.crewSize) {
    const areaPerCrew = data.area / data.crewSize;
    if (areaPerCrew > 5000) {
      warnings.push("Large area per crew member may extend completion time");
    }
  }

  // Check height vs equipment requirements
  if (data.buildingHeightStories > 5 && !data.hasRoofAnchors) {
    warnings.push(
      "Buildings over 5 stories typically require roof anchors for safety",
    );
  }

  return {
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Calculate estimated completion time based on service parameters
 */
export function estimateCompletionTime(
  area: number,
  crewSize: number,
  shiftLength: number,
  complexity: "simple" | "moderate" | "complex" = "moderate",
): number {
  const baseRate = {
    simple: 500, // sq ft per person per hour
    moderate: 350,
    complex: 200,
  };

  const ratePerHour = baseRate[complexity] * crewSize;
  const totalHours = area / ratePerHour;
  const daysRequired = Math.ceil(totalHours / shiftLength);

  return daysRequired;
}

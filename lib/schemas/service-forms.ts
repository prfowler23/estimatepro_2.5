import { z } from 'zod'

// Base schema shared by all services
export const baseServiceSchema = z.object({
  location: z.enum(['raleigh', 'charlotte', 'greensboro']).default('raleigh'),
  crewSize: z.number().min(1).max(10).default(2),
  shiftLength: z.number().min(4).max(12).default(8),
  workWeek: z.number().min(3).max(7).default(5),
})

// Glass Restoration
export const glassRestorationSchema = baseServiceSchema.extend({
  glassArea: z.number().min(1).max(100000),
  facadeArea: z.number().min(1).max(200000).optional(),
  numberOfDrops: z.number().min(1).max(50).default(1),
  buildingHeightStories: z.number().min(1).max(100).default(1),
})

// Window Cleaning
export const windowCleaningSchema = baseServiceSchema.extend({
  glassArea: z.number().min(1).max(100000),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
  hasRoofAnchors: z.boolean().default(false),
})

// Pressure Washing
export const pressureWashingSchema = baseServiceSchema.extend({
  facadeArea: z.number().min(1).max(100000),
  surfaceType: z.enum(['regular', 'ornate', 'mixed']).default('regular'),
  flatSurfaceArea: z.number().min(0).max(100000).optional(),
  includesHardscapes: z.boolean().default(false),
  hardscapeArea: z.number().min(0).max(100000).optional(),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
})

// Pressure Wash & Seal
export const pressureWashSealSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(100000),
  surfaceMaterial: z.enum(['brick', 'concrete', 'mixed']).default('brick'),
  sealerType: z.enum(['standard', 'premium']).default('standard'),
  numberOfCoats: z.number().min(1).max(3).default(1),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
})

// Final Clean
export const finalCleanSchema = baseServiceSchema.extend({
  glassArea: z.number().min(1).max(100000),
  includesInterior: z.boolean().default(false),
  postConstruction: z.boolean().default(false),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
})

// Frame Restoration
export const frameRestorationSchema = baseServiceSchema.extend({
  numberOfFrames: z.number().min(1).max(10000),
  frameCondition: z.enum(['good', 'fair', 'poor']).default('fair'),
  requiresGlassRestoration: z.boolean().default(false),
})

// High Dusting
export const highDustingSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(100000),
  surfaceComplexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
  includesFans: z.boolean().default(false),
  includesFixtures: z.boolean().default(false),
})

// Soft Washing
export const softWashingSchema = baseServiceSchema.extend({
  facadeArea: z.number().min(1).max(100000),
  surfaceMaterial: z.enum(['vinyl', 'stucco', 'wood', 'composite', 'mixed']).default('vinyl'),
  contaminationLevel: z.enum(['light', 'moderate', 'heavy']).default('moderate'),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
  includesRoof: z.boolean().default(false),
  roofArea: z.number().min(0).max(100000).optional(),
})

// Parking Deck
export const parkingDeckSchema = baseServiceSchema.extend({
  numberOfSpaces: z.number().min(1).max(10000).optional(),
  totalArea: z.number().min(1).max(1000000).optional(),
  deckLevel: z.enum(['ground', 'elevated', 'underground']).default('ground'),
  serviceType: z.enum(['sweep_only', 'wash_only', 'sweep_and_wash']).default('sweep_and_wash'),
  hasOilStains: z.boolean().default(false),
  drainageComplexity: z.enum(['simple', 'complex']).default('simple'),
})

// Granite Reconditioning
export const graniteReconditioningSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(50000),
  graniteCondition: z.enum(['good', 'fair', 'poor']).default('fair'),
  serviceLevel: z.enum(['clean_only', 'clean_and_seal', 'restore_and_seal']).default('clean_and_seal'),
  includesPolishing: z.boolean().default(false),
  edgeWork: z.boolean().default(false),
  edgeLinearFeet: z.number().min(0).max(10000).optional(),
})

// Biofilm Removal
export const biofilmRemovalSchema = baseServiceSchema.extend({
  area: z.number().min(1).max(100000),
  biofilmSeverity: z.enum(['light', 'moderate', 'severe']).default('moderate'),
  surfaceType: z.enum(['concrete', 'stone', 'metal', 'glass', 'mixed']).default('concrete'),
  buildingHeightStories: z.number().min(1).max(100).default(1),
  numberOfDrops: z.number().min(1).max(50).default(1),
  requiresSealing: z.boolean().default(false),
  hasWaterFeatures: z.boolean().default(false),
})

// Type exports
export type GlassRestorationFormData = z.infer<typeof glassRestorationSchema>
export type WindowCleaningFormData = z.infer<typeof windowCleaningSchema>
export type PressureWashingFormData = z.infer<typeof pressureWashingSchema>
export type PressureWashSealFormData = z.infer<typeof pressureWashSealSchema>
export type FinalCleanFormData = z.infer<typeof finalCleanSchema>
export type FrameRestorationFormData = z.infer<typeof frameRestorationSchema>
export type HighDustingFormData = z.infer<typeof highDustingSchema>
export type SoftWashingFormData = z.infer<typeof softWashingSchema>
export type ParkingDeckFormData = z.infer<typeof parkingDeckSchema>
export type GraniteReconditioningFormData = z.infer<typeof graniteReconditioningSchema>
export type BiofilmRemovalFormData = z.infer<typeof biofilmRemovalSchema>

// Validation with cross-field dependencies
export const validatePressureWashing = (data: PressureWashingFormData) => {
  if (data.includesHardscapes && !data.hardscapeArea) {
    return { error: 'Hardscape area required when hardscapes are included' }
  }
  return { success: true }
}

export const validateSoftWashing = (data: SoftWashingFormData) => {
  if (data.includesRoof && !data.roofArea) {
    return { error: 'Roof area required when roof cleaning is included' }
  }
  return { success: true }
}

export const validateParkingDeck = (data: ParkingDeckFormData) => {
  if (!data.numberOfSpaces && !data.totalArea) {
    return { error: 'Either number of spaces or total area must be provided' }
  }
  return { success: true }
}

export const validateGraniteReconditioning = (data: GraniteReconditioningFormData) => {
  if (data.edgeWork && !data.edgeLinearFeet) {
    return { error: 'Edge linear feet required when edge work is included' }
  }
  return { success: true }
}
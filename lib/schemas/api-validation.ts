import { z } from 'zod';

// Common validation schemas
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const emailSchema = z.string().email('Invalid email format');
export const positiveNumberSchema = z.number().positive('Must be a positive number');
export const optionalStringSchema = z.string().optional();
export const requiredStringSchema = z.string().min(1, 'This field is required');

// Customer validation
export const customerSchema = z.object({
  name: requiredStringSchema,
  company: optionalStringSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: requiredStringSchema,
});

// Building validation
export const buildingSchema = z.object({
  name: requiredStringSchema,
  address: requiredStringSchema,
  type: z.enum(['office', 'retail', 'warehouse', 'medical', 'educational', 'industrial', 'residential', 'mixed-use']),
  heightStories: z.number().min(1).max(100),
  heightFeet: z.number().min(1).max(1000).optional(),
  size: z.number().positive().optional(),
});

// Service validation
export const serviceSchema = z.object({
  serviceType: z.enum([
    'window-cleaning',
    'pressure-washing', 
    'soft-washing',
    'biofilm-removal',
    'glass-restoration',
    'frame-restoration',
    'high-dusting',
    'final-clean',
    'granite-reconditioning',
    'pressure-wash-seal',
    'parking-deck'
  ]),
  area: positiveNumberSchema,
  glassArea: positiveNumberSchema.optional(),
  price: positiveNumberSchema,
  laborHours: positiveNumberSchema,
  setupHours: positiveNumberSchema.optional(),
  rigHours: positiveNumberSchema.optional(),
  totalHours: positiveNumberSchema,
  crewSize: z.number().min(1).max(20),
  equipmentType: optionalStringSchema,
  equipmentDays: positiveNumberSchema.optional(),
  equipmentCost: positiveNumberSchema.optional(),
});

// Estimate validation
export const estimateSchema = z.object({
  customer: customerSchema,
  building: buildingSchema,
  services: z.array(serviceSchema).min(1, 'At least one service is required'),
  totalPrice: positiveNumberSchema,
  notes: optionalStringSchema,
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).default('draft'),
});

// API-specific validation schemas

// Contact info extraction
export const contactExtractionSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  contactMethod: z.enum(['email', 'phone', 'meeting', 'walkin', 'other']).default('other'),
});

// Photo analysis
export const photoAnalysisSchema = z.object({
  photos: z.array(z.any()).min(1, 'At least one photo is required').max(10, 'Maximum 10 photos allowed'),
});

// Estimation flow
export const estimationFlowSchema = z.object({
  id: z.string().uuid().optional(),
  step: z.enum(['initial-contact', 'scope-details', 'files-photos', 'area-of-work', 'takeoff', 'duration', 'expenses', 'pricing', 'summary']),
  data: z.record(z.any()),
  userId: z.string().uuid(),
});

// Analytics request
export const analyticsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
});

// Guided flow data validation
export const guidedFlowDataSchema = z.object({
  initialContact: z.object({
    contactMethod: z.string(),
    contactDate: z.string().datetime().optional(),
    initialNotes: optionalStringSchema,
    aiExtractedData: z.any().optional(),
  }).optional(),
  
  scopeDetails: z.object({
    selectedServices: z.array(z.string()),
    serviceDependencies: z.any().optional(),
  }).optional(),
  
  filesPhotos: z.object({
    uploadedFiles: z.array(z.any()),
    aiAnalysisResults: z.any().optional(),
  }).optional(),
  
  areaOfWork: z.object({
    workAreas: z.array(z.any()),
    measurements: z.any().optional(),
  }).optional(),
  
  takeoff: z.object({
    takeoffData: z.any(),
  }).optional(),
  
  duration: z.object({
    estimatedDuration: positiveNumberSchema,
    weatherAnalysis: z.any().optional(),
  }).optional(),
  
  expenses: z.object({
    equipmentCosts: z.any(),
    materialCosts: z.any(),
  }).optional(),
  
  pricing: z.object({
    pricingCalculations: z.any(),
    manualOverrides: z.any().optional(),
  }).optional(),
  
  summary: z.object({
    finalEstimate: z.any(),
    proposalGenerated: z.boolean().default(false),
  }).optional(),
});

// Request validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errorMessages.join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
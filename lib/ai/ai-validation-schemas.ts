import { z } from "zod";

// Common validation schemas
export const serviceCodeSchema = z.enum([
  "PW", // pressure-washing
  "PWS", // pressure-wash-seal
  "WC", // window-cleaning
  "GR", // glass-restoration
  "FR", // frame-restoration
  "HD", // high-dusting
  "SW", // soft-washing
  "PD", // parking-deck
  "GRC", // granite-reconditioning
  "FC", // final-clean
  "BF", // biofilm-removal
]);

export const urgencyLevelSchema = z.enum(["urgent", "normal", "flexible"]);

export const flexibilityLevelSchema = z.enum(["none", "some", "flexible"]);

export const budgetFlexibilitySchema = z.enum(["tight", "normal", "flexible"]);

export const buildingTypeSchema = z.enum([
  "office",
  "retail",
  "industrial",
  "residential",
  "hospital",
  "school",
  "warehouse",
  "hotel",
  "restaurant",
  "mixed-use",
]);

// Customer validation schema
export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(100),
  company: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .or(z.literal("")),
  role: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
});

// Requirements validation schema
export const requirementsSchema = z.object({
  services: z
    .array(serviceCodeSchema)
    .min(1, "At least one service must be specified"),
  buildingType: z.string().min(1, "Building type is required"),
  location: z.string().max(500),
  buildingSize: z.string().max(100),
  floors: z.number().int().min(1).max(200),
  specialRequirements: z.array(z.string().max(200)).default([]),
});

// Timeline validation schema
export const timelineSchema = z.object({
  requestedDate: z.string().max(50),
  deadline: z.string().max(50),
  urgency: urgencyLevelSchema,
  flexibility: flexibilityLevelSchema,
});

// Budget validation schema
export const budgetSchema = z.object({
  range: z.string().max(100),
  statedAmount: z.string().max(50),
  constraints: z.array(z.string().max(200)).default([]),
  approved: z.boolean(),
  flexibility: budgetFlexibilitySchema,
});

// Decision makers validation schema
export const decisionMakersSchema = z.object({
  primaryContact: z.string().max(100),
  approvers: z.array(z.string().max(100)).default([]),
  influencers: z.array(z.string().max(100)).default([]),
  roles: z.record(z.string().max(100)).default({}),
});

// Main extracted data validation schema
export const extractedDataSchema = z.object({
  customer: customerSchema,
  requirements: requirementsSchema,
  timeline: timelineSchema,
  budget: budgetSchema,
  decisionMakers: decisionMakersSchema,
  redFlags: z.array(z.string().max(200)).default([]),
  urgencyScore: z.number().min(1).max(10),
  confidence: z.number().min(0).max(1),
});

// Content extraction input schemas
export const contentExtractionSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(50000, "Content too large"),
  type: z.enum([
    "email",
    "meeting",
    "phone",
    "walkin",
    "pdf",
    "rfp",
    "contract",
    "plans",
  ]),
  userId: z.string().optional(),
});

// Image OCR input schema
export const imageOCRSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  imageType: z.enum(["document", "sign", "form", "note"]),
  userId: z.string().optional(),
});

// Auto-estimate request schema
export const autoEstimateRequestSchema = z.object({
  extractedData: extractedDataSchema,
  buildingPhotos: z.array(z.string().url()).optional(),
  competitorEstimates: z.array(z.string().max(10000)).optional(),
  customPricing: z
    .record(
      z.object({
        baseRate: z.number().positive(),
        setupTime: z.number().positive(),
        laborRate: z.number().positive(),
        equipmentDaily: z.number().positive(),
      }),
    )
    .optional(),
  overrides: z
    .object({
      markup: z.number().min(0).max(500).optional(),
      urgencyMultiplier: z.number().min(0.5).max(3).optional(),
      riskMultiplier: z.number().min(0.5).max(3).optional(),
    })
    .optional(),
  userId: z.string().optional(),
});

// Photo analysis input schema
export const photoAnalysisSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  analysisType: z.enum([
    "material_quantities",
    "item_count",
    "3d_reconstruction",
    "before_after",
  ]),
  userId: z.string().optional(),
});

// 3D reconstruction schema
export const threeDReconstructionSchema = z.object({
  imageUrls: z
    .array(z.string().url())
    .min(2, "At least 2 images required for 3D reconstruction")
    .max(10),
  userId: z.string().optional(),
});

// Before/after comparison schema
export const beforeAfterComparisonSchema = z.object({
  beforeImageUrl: z.string().url("Invalid before image URL"),
  afterImageUrl: z.string().url("Invalid after image URL"),
  userId: z.string().optional(),
});

// Follow-up automation schemas
export const followUpRequestSchema = z.object({
  extractedData: extractedDataSchema,
  quote: z
    .object({
      id: z.string(),
      summary: z.object({
        totalPrice: z.number().positive(),
        totalTime: z.number().positive(),
        totalArea: z.number().positive(),
        serviceCount: z.number().positive(),
        complexityScore: z.number().min(1).max(10),
      }),
    })
    .optional(),
  previousInteractions: z
    .array(
      z.object({
        type: z.enum(["email", "call", "meeting", "quote_sent"]),
        date: z.string(),
        summary: z.string().max(1000),
        response: z.string().max(1000).optional(),
      }),
    )
    .optional(),
  customerBehavior: z
    .object({
      emailOpenRate: z.number().min(0).max(1).optional(),
      websiteVisits: z.number().min(0).optional(),
      quotesRequested: z.number().min(0).optional(),
      averageResponseTime: z.number().min(0).optional(),
    })
    .optional(),
  userId: z.string().optional(),
});

export const emailGenerationSchema = z.object({
  extractedData: extractedDataSchema,
  emailType: z.enum([
    "initial",
    "reminder",
    "value_add",
    "objection_handling",
    "final",
  ]),
  previousEmails: z.array(z.string().max(5000)).optional(),
  userId: z.string().optional(),
});

export const callScriptSchema = z.object({
  extractedData: extractedDataSchema,
  callType: z.enum(["initial", "follow_up", "objection_handling", "closing"]),
  userId: z.string().optional(),
});

// Competitive intelligence schema
export const competitiveIntelligenceSchema = z.object({
  competitorContent: z
    .string()
    .min(1, "Competitor content cannot be empty")
    .max(20000),
  userId: z.string().optional(),
});

// Risk assessment schema
export const riskAssessmentSchema = z.object({
  extractedData: extractedDataSchema,
  projectContext: z.string().max(2000).optional(),
  userId: z.string().optional(),
});

// Configuration schemas
export const aiConfigSchema = z.object({
  openaiApiKey: z.string().min(1, "OpenAI API key is required"),
  defaultModel: z.string().default("gpt-4"),
  visionModel: z.string().default("gpt-4o"),
  maxTokens: z.number().int().min(100).max(4000).default(2000),
  temperature: z.number().min(0).max(2).default(0.1),
  retryAttempts: z.number().int().min(1).max(10).default(3),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(20),
  enableCaching: z.boolean().default(true),
  enableLogging: z.boolean().default(true),
});

// Response validation schemas
export const aiAnalysisResultSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  analysisType: z.string(),
  confidence: z.number().min(0).max(1),
  findings: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
  processedAt: z.date(),
  processingTime: z.number().min(0),
});

export const competitiveAnalysisResponseSchema = z.object({
  extraction: extractedDataSchema,
  competitive: z.object({
    competitors: z.array(z.string()),
    pricingStrategy: z.string(),
    serviceOfferings: z.array(z.string()),
    strengthsWeaknesses: z.array(z.string()),
    marketRates: z.record(z.string()),
    differentiators: z.array(z.string()),
    threats: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
});

export const riskAssessmentResponseSchema = z.object({
  riskScore: z.number().min(1).max(10),
  riskFactors: z.array(
    z.object({
      category: z.string(),
      risk: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      mitigation: z.string(),
    }),
  ),
  recommendations: z.array(z.string()),
  pricing_adjustments: z.record(z.number()),
});

// Utility function to safely validate data
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        "Input validation failed: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        error.errors,
      );
    }
    throw error;
  }
}

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, "") // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(input: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeString(input).toLowerCase();
  return emailRegex.test(sanitized) ? sanitized : "";
}

export function sanitizePhone(input: string): string {
  return input.replace(/[^\d\+\-\(\)\s]/g, "").substring(0, 20);
}

export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
    return url.toString();
  } catch {
    return "";
  }
}

// Import ValidationError from error handler
import { ValidationError } from "./ai-error-handler";

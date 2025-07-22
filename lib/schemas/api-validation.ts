import { z } from "zod";
import {
  InitialContactData,
  ScopeDetailsData,
  FilesPhotosData,
  AreaOfWorkData,
  TakeoffStepData,
  DurationStepData,
  ExpensesStepData,
  PricingStepData,
  SummaryStepData,
} from "@/lib/types/estimate-types";

// Common validation schemas
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format");
export const emailSchema = z.string().email("Invalid email format");
export const positiveNumberSchema = z
  .number()
  .positive("Must be a positive number");
export const optionalStringSchema = z.string().optional();
export const requiredStringSchema = z.string().min(1, "This field is required");

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
  type: z.enum([
    "office",
    "retail",
    "warehouse",
    "medical",
    "educational",
    "industrial",
    "residential",
    "mixed-use",
  ]),
  heightStories: z.number().min(1).max(100),
  heightFeet: z.number().min(1).max(1000).optional(),
  size: z.number().positive().optional(),
});

// Service validation
export const serviceSchema = z.object({
  serviceType: z.enum([
    "window-cleaning",
    "pressure-washing",
    "soft-washing",
    "biofilm-removal",
    "glass-restoration",
    "frame-restoration",
    "high-dusting",
    "final-clean",
    "granite-reconditioning",
    "pressure-wash-seal",
    "parking-deck",
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
  services: z.array(serviceSchema).min(1, "At least one service is required"),
  totalPrice: positiveNumberSchema,
  notes: optionalStringSchema,
  status: z.enum(["draft", "sent", "approved", "rejected"]).default("draft"),
});

// API-specific validation schemas

// Contact info extraction
export const contactExtractionSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content too long"),
  contactMethod: z
    .enum(["email", "phone", "meeting", "walkin", "other"])
    .optional(),
});

// Photo analysis
export const uploadedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().positive(),
  type: z.string(),
  url: z.string().url(),
  lastModified: z.number().optional(),
});

export const photoAnalysisSchema = z.object({
  photos: z
    .array(uploadedFileSchema)
    .min(1, "At least one photo is required")
    .max(10, "Maximum 10 photos allowed"),
});

// Guided flow data validation
export const guidedFlowDataSchema = z.object({
  initialContact: z
    .object({
      contactMethod: z.string(),
      contactDate: z.string().datetime().optional(),
      initialNotes: optionalStringSchema,
      aiExtractedData: z
        .object({
          customer: z.object({
            name: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            company: z.string().optional(),
          }),
          services: z.array(z.string()),
          buildingDetails: z
            .object({
              type: z.string().optional(),
              size: z.string().optional(),
              floors: z.number().optional(),
            })
            .optional(),
          confidence: z.number().min(0).max(1),
        })
        .optional(),
    })
    .optional(),

  scopeDetails: z
    .object({
      selectedServices: z.array(z.string()),
      serviceDependencies: z
        .array(
          z.object({
            service: z.string(),
            dependsOn: z.array(z.string()),
            required: z.boolean().default(false),
          }),
        )
        .optional(),
      serviceOrder: z.array(z.string()).optional(),
      autoAddedServices: z.array(z.string()).optional(),
      overrides: z
        .record(
          z.object({
            price: z.number().optional(),
            reason: z.string().optional(),
          }),
        )
        .optional(),
      scopeNotes: z.string().optional(),
      accessRestrictions: z.array(z.string()).optional(),
      specialRequirements: z.array(z.string()).optional(),
    })
    .optional(),

  filesPhotos: z
    .object({
      uploadedFiles: z.array(uploadedFileSchema),
      aiAnalysisResults: z
        .array(
          z.object({
            id: z.string(),
            fileId: z.string(),
            analysisType: z.enum(["facade", "material", "damage", "general"]),
            confidence: z.number().min(0).max(1),
            findings: z.record(z.union([z.string(), z.number(), z.boolean()])),
            processedAt: z.string().datetime(),
          }),
        )
        .optional(),
      analysisComplete: z.boolean().optional(),
      summary: z
        .object({
          totalFiles: z.number(),
          analysisComplete: z.boolean(),
          keyFindings: z.array(z.string()),
          recommendedServices: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),

  areaOfWork: z
    .object({
      workAreas: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum([
            "interior",
            "exterior",
            "rooftop",
            "basement",
            "parking",
          ]),
          area: z.number().positive(),
          services: z.array(z.string()),
          accessType: z.enum(["ground", "ladder", "lift", "rope"]).optional(),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        }),
      ),
      measurements: z
        .array(
          z.object({
            id: z.string(),
            areaId: z.string(),
            type: z.enum(["length", "width", "height", "area", "count"]),
            value: z.number().positive(),
            unit: z.enum(["ft", "sqft", "count"]),
            notes: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),

  takeoff: z
    .object({
      takeoffData: z.object({
        totalArea: z.number().positive(),
        serviceAreas: z.record(z.number().positive()),
        specialtyItems: z.array(
          z.object({
            type: z.string(),
            quantity: z.number().positive(),
            unit: z.string(),
          }),
        ),
        accessEquipment: z.array(z.string()),
        notes: z.string().optional(),
      }),
    })
    .optional(),

  duration: z
    .object({
      estimatedDuration: positiveNumberSchema,
      weatherAnalysis: z
        .object({
          location: z.string(),
          seasonality: z.object({
            bestMonths: z.array(z.string()),
            worstMonths: z.array(z.string()),
          }),
          weatherRisks: z.array(
            z.object({
              type: z.enum(["rain", "wind", "temperature", "humidity"]),
              impact: z.enum(["low", "medium", "high"]),
              mitigation: z.string(),
            }),
          ),
          timeAdjustments: z.record(z.number()),
        })
        .optional(),
      serviceDurations: z
        .record(
          z.object({
            baseHours: z.number().positive(),
            setupHours: z.number().nonnegative(),
            crewSize: z.number().positive(),
            efficiency: z.number().positive().default(1),
          }),
        )
        .optional(),
      timeline: z
        .object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
          phases: z.array(
            z.object({
              name: z.string(),
              startDate: z.string().datetime(),
              endDate: z.string().datetime(),
              services: z.array(z.string()),
            }),
          ),
        })
        .optional(),
      manualOverrides: z.record(z.number()).optional(),
      projectStartDate: z.string().optional(),
    })
    .optional(),

  expenses: z
    .object({
      equipmentCosts: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["rental", "purchase", "maintenance"]),
          dailyRate: z.number().positive(),
          daysNeeded: z.number().positive(),
          totalCost: z.number().positive(),
          vendor: z.string().optional(),
        }),
      ),
      materialCosts: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          category: z.enum(["chemical", "supply", "safety", "disposal"]),
          quantity: z.number().positive(),
          unit: z.string(),
          unitCost: z.number().positive(),
          totalCost: z.number().positive(),
          vendor: z.string().optional(),
        }),
      ),
      laborCosts: z
        .object({
          totalHours: z.number().positive(),
          hourlyRate: z.number().positive(),
          overtimeHours: z.number().nonnegative().default(0),
          overtimeRate: z.number().positive().optional(),
          totalCost: z.number().positive(),
        })
        .optional(),
      otherCosts: z
        .array(
          z.object({
            description: z.string(),
            amount: z.number().positive(),
            category: z.enum(["permit", "insurance", "travel", "misc"]),
          }),
        )
        .optional(),
      totalCosts: z
        .object({
          labor: z.number().nonnegative(),
          materials: z.number().nonnegative(),
          equipment: z.number().nonnegative(),
          other: z.number().nonnegative(),
          subtotal: z.number().nonnegative(),
          tax: z.number().nonnegative(),
          total: z.number().positive(),
        })
        .optional(),
      margins: z
        .object({
          laborMargin: z.number().min(0).max(500).default(20),
          materialMargin: z.number().min(0).max(500).default(15),
          equipmentMargin: z.number().min(0).max(500).default(10),
          overheadRate: z.number().min(0).max(100).default(15),
        })
        .optional(),
    })
    .optional(),

  pricing: z
    .object({
      pricingCalculations: z.object({
        basePrice: z.number().positive(),
        adjustments: z.array(
          z.object({
            type: z.enum(["risk", "complexity", "urgency", "competitive"]),
            factor: z.number(),
            amount: z.number(),
            reason: z.string(),
          }),
        ),
        finalPrice: z.number().positive(),
        margin: z.number().min(0).max(100),
        profitAmount: z.number(),
      }),
      manualOverrides: z
        .array(
          z.object({
            field: z.string(),
            originalValue: z.union([z.string(), z.number()]),
            newValue: z.union([z.string(), z.number()]),
            reason: z.string(),
            timestamp: z.string().datetime(),
          }),
        )
        .optional(),
      basePrice: z.number().optional(),
      finalPrice: z.number().optional(),
      strategy: z
        .object({
          approach: z.enum(["competitive", "premium", "value", "penetration"]),
          targetMargin: z.number().min(0).max(100),
          competitorBenchmark: z.number().positive().optional(),
          riskTolerance: z.enum(["low", "medium", "high"]),
        })
        .optional(),
      winProbability: z.number().optional(),
      adjustments: z
        .object({
          riskMultiplier: z.number().min(0.5).max(3).default(1),
          complexityMultiplier: z.number().min(0.8).max(2.5).default(1),
          urgencyMultiplier: z.number().min(0.9).max(2).default(1),
          competitiveAdjustment: z.number().min(-50).max(50).default(0),
        })
        .optional(),
      riskFactors: z
        .array(
          z.object({
            category: z.enum([
              "weather",
              "access",
              "safety",
              "client",
              "technical",
            ]),
            risk: z.string(),
            probability: z.enum(["low", "medium", "high"]),
            impact: z.enum(["low", "medium", "high"]),
            mitigation: z.string(),
            costImpact: z.number().optional(),
          }),
        )
        .optional(),
      confidence: z.number().optional(),
    })
    .optional(),

  summary: z
    .object({
      finalEstimate: z.object({
        totalPrice: z.number().positive(),
        totalTime: z.number().positive(),
        serviceBreakdown: z.record(
          z.object({
            price: z.number().positive(),
            time: z.number().positive(),
            area: z.number().positive(),
          }),
        ),
        terms: z.object({
          paymentTerms: z.string(),
          warranty: z.string(),
          validUntil: z.string().datetime(),
        }),
        notes: z.string().optional(),
        createdAt: z.string().datetime(),
      }),
      proposalGenerated: z.boolean().default(false),
    })
    .optional(),
});

// Estimation flow - updated to match new database schema
export const estimationFlowSchema = z.object({
  id: z.string().uuid().optional(),
  estimate_id: z.string().uuid().optional(), // Can be UUID or will be converted from temp ID
  user_id: z.string().uuid().optional(), // Will be set from auth context
  step: z.enum([
    "initial-contact",
    "scope-details",
    "files-photos",
    "area-of-work",
    "takeoff",
    "duration",
    "expenses",
    "pricing",
    "summary",
  ]),
  data: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(), // Legacy field
  flow_data: guidedFlowDataSchema.optional(), // New centralized data field
  status: z
    .enum(["draft", "in-progress", "completed", "abandoned"])
    .default("draft"),
  current_step: z.number().min(1).max(9).default(1),
  version: z.number().min(1).default(1),
});

// Auto-save specific schema for handling temporary estimate IDs
export const autoSaveSchema = z.object({
  estimate_id: z.string().min(1, "Estimate ID is required"), // Can be temp ID or UUID
  user_id: z.string().uuid().optional(), // Will be set from auth context
  flow_data: guidedFlowDataSchema,
  current_step: z.number().min(1).max(9).default(1),
  step: z.enum([
    "initial-contact",
    "scope-details",
    "files-photos",
    "area-of-work",
    "takeoff",
    "duration",
    "expenses",
    "pricing",
    "summary",
  ]),
  version: z.number().min(1).optional(),
  device_info: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

// Analytics request
export const analyticsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.string()).optional(),
  filters: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional(),
});

// Request validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      return { success: false, error: errorMessages.join(", ") };
    }
    return { success: false, error: "Validation failed" };
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

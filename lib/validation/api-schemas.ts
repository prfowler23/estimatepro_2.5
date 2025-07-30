import { z } from "zod";

/**
 * Common Zod schemas for API validation
 */

// Base schemas for common types
export const uuidSchema = z.string().uuid("Invalid UUID format");
export const emailSchema = z.string().email("Invalid email format");
export const urlSchema = z.string().url("Invalid URL format");
export const dateStringSchema = z.string().datetime("Invalid date format");

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Common request body schemas
export const idParamSchema = z.object({
  id: uuidSchema,
});

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string().regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+$/),
  size: z
    .number()
    .positive()
    .max(50 * 1024 * 1024), // 50MB max
});

// AI request schemas
export const aiAnalysisRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.record(z.unknown()).optional(),
  model: z.enum(["gpt-4", "gpt-4-vision-preview", "gpt-3.5-turbo"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().max(4000).optional(),
});

// Contact information schema
export const contactInfoSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema.optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/)
    .optional(),
  company: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
});

// Estimate schemas
export const estimateCreateSchema = z.object({
  customer_id: uuidSchema.optional(),
  customer_name: z.string().min(1).max(255),
  customer_email: emailSchema.optional(),
  customer_phone: z.string().max(20).optional(),
  property_address: z.string().min(1).max(500),
  status: z
    .enum(["draft", "sent", "accepted", "rejected", "expired"])
    .default("draft"),
  valid_until: dateStringSchema.optional(),
  notes: z.string().max(5000).optional(),
  services: z
    .array(
      z.object({
        service_type: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        quantity: z.number().positive(),
        unit_price: z.number().nonnegative(),
        total_price: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export const estimateUpdateSchema = estimateCreateSchema.partial();

// Analytics event schema
export const analyticsEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  event_type: z.enum([
    "page_view",
    "user_action",
    "system_event",
    "error",
    "performance",
  ]),
  properties: z.record(z.unknown()).optional(),
  user_id: uuidSchema.optional(),
  session_id: z.string().optional(),
  timestamp: dateStringSchema.optional(),
});

// Weather request schema
export const weatherRequestSchema = z.object({
  address: z.string().min(1).max(500),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  units: z.enum(["metric", "imperial"]).default("imperial"),
});

// Webhook schemas
export const webhookCreateSchema = z.object({
  url: urlSchema,
  events: z.array(z.string()).min(1),
  secret: z.string().min(32).optional(),
  active: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
});

export const webhookUpdateSchema = webhookCreateSchema.partial();

// Drone operation schemas
export const droneOperationSchema = z.object({
  operation_type: z.enum(["inspection", "mapping", "surveillance", "delivery"]),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    altitude: z.number().min(0).max(400), // FAA limit
  }),
  duration: z.number().positive().max(3600), // seconds
  drone_id: z.string().optional(),
  pilot_id: uuidSchema.optional(),
});

// Helper function to validate request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { data: validated, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return { data: null, error: errors };
    }
    return { data: null, error: "Invalid request body" };
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
): { data: T | null; error: string | null } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validated = schema.parse(params);
    return { data: validated, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return { data: null, error: errors };
    }
    return { data: null, error: "Invalid query parameters" };
  }
}

// Helper function to validate route params
export function validateRouteParams<T>(
  params: any,
  schema: z.ZodSchema<T>,
): { data: T | null; error: string | null } {
  try {
    const validated = schema.parse(params);
    return { data: validated, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return { data: null, error: errors };
    }
    return { data: null, error: "Invalid route parameters" };
  }
}

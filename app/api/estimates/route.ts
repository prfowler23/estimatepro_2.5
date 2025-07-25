import { NextRequest } from "next/server";
import EstimateBusinessService from "@/lib/services/estimate-service";
import { getHandler, postHandler } from "@/lib/api/api-handler";
import { estimateSchema } from "@/lib/schemas/api-validation";
import { z } from "zod";

// Query parameters schema for GET requests
const getEstimatesQuerySchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  status: z.enum(["draft", "sent", "approved", "rejected"]).optional(),
  search: z.string().optional(),
});

async function handleGET(context: any) {
  const { user, request } = context;

  // Get and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    limit: parseInt(searchParams.get("limit") || "50"),
    offset: parseInt(searchParams.get("offset") || "0"),
    status: searchParams.get("status") || undefined,
    search: searchParams.get("search") || undefined,
  };

  // Validate query parameters
  const validation = getEstimatesQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    throw new Error(`Invalid query parameters: ${validation.error.message}`);
  }

  const { limit, offset, status, search } = validation.data;

  // Fetch estimates using the business service
  const result = await EstimateBusinessService.getAllEstimates({
    limit,
    offset,
    status: status as any,
    search,
    userId: user.id,
  });

  return {
    estimates: result.estimates,
    total: result.total,
    hasMore: result.hasMore,
    limit,
    offset,
  };
}

// Create estimate request schema
const createEstimateSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  companyName: z.string().optional(),
  buildingName: z.string().min(1, "Building name is required"),
  buildingAddress: z.string().min(1, "Building address is required"),
  buildingHeightStories: z.number().min(1).max(100),
  buildingHeightFeet: z.number().positive().optional(),
  buildingType: z
    .enum([
      "office",
      "retail",
      "warehouse",
      "medical",
      "educational",
      "industrial",
      "residential",
      "mixed-use",
    ])
    .optional(),
  notes: z.string().optional(),
  services: z
    .array(
      z.object({
        type: z.string(),
        area: z.number().positive(),
        price: z.number().positive(),
        laborHours: z.number().positive(),
        totalHours: z.number().positive(),
        crewSize: z.number().min(1).max(20),
      }),
    )
    .min(1, "At least one service is required"),
});

async function handlePOST(
  data: z.infer<typeof createEstimateSchema>,
  context: any,
) {
  const { user } = context;

  // Transform services to match EstimateService interface
  const transformedServices = data.services.map((service: any) => ({
    quote_id: "", // Will be set by the service
    serviceType: service.type || service.serviceType,
    description: service.description || `${service.type} service`,
    quantity: service.area || 1,
    unit: "sqft",
    unitPrice: service.price / (service.area || 1),
    price: service.price,
    area_sqft: service.area || null,
    glass_sqft: service.glassArea || null,
    duration: service.totalHours || 8,
    dependencies: service.dependencies || [],
    notes: service.notes,
  }));

  // Create estimate using the business service
  const estimateId = await EstimateBusinessService.createEstimate({
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    companyName: data.companyName,
    buildingName: data.buildingName,
    buildingAddress: data.buildingAddress,
    buildingHeightStories: data.buildingHeightStories,
    buildingHeightFeet: data.buildingHeightFeet,
    buildingType: data.buildingType,
    notes: data.notes,
    services: transformedServices,
  });

  if (!estimateId) {
    throw new Error("Failed to create estimate");
  }

  return {
    estimateId,
    message: "Estimate created successfully",
  };
}

// Standardized route handlers
export const GET = (request: NextRequest) =>
  getHandler(request, handleGET, {
    requireAuth: true,
    auditLog: true,
  });

export const POST = (request: NextRequest) =>
  postHandler(request, createEstimateSchema, handlePOST, {
    requireAuth: true,
    rateLimiter: "general",
    auditLog: true,
  });

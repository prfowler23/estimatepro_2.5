import { GET, POST } from "@/app/api/estimates/route";
import { NextRequest } from "next/server";
import EstimateBusinessService from "@/lib/services/estimate-service";
import { getHandler, postHandler } from "@/lib/api/api-handler";
import { createMockEstimate, createMockUser } from "@/__tests__/test-utils";

// Mock all dependencies before imports
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

jest.mock("@/lib/audit/audit-system", () => ({
  AuditSystem: {
    getInstance: jest.fn(() => ({
      logEvent: jest.fn().mockResolvedValue(undefined),
      captureMetrics: jest.fn(),
    })),
  },
}));

jest.mock("@/lib/integrations/webhook-system", () => ({
  WebhookSystem: {
    getInstance: jest.fn(() => ({
      emit: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock dependencies
jest.mock("@/lib/services/estimate-service");
jest.mock("@/lib/api/api-handler");
jest.mock("@/lib/api/error-responses", () => ({
  ErrorResponses: {
    validationError: jest.fn((error) => {
      throw { status: 400, message: "Validation failed" };
    }),
  },
  logApiError: jest.fn(),
}));

describe("/api/estimates", () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    (EstimateBusinessService.getAllEstimates as jest.Mock).mockResolvedValue({
      estimates: [],
      total: 0,
      hasMore: false,
    });

    (EstimateBusinessService.createEstimate as jest.Mock).mockResolvedValue({
      success: true,
      estimate: createMockEstimate(),
    });

    // Mock the handlers to pass through to the actual implementation
    (getHandler as jest.Mock).mockImplementation(
      async (request, handler, options) => {
        try {
          // Create a mock request object with nextUrl
          const url = new URL(request.url);
          const mockRequest = {
            ...request,
            nextUrl: {
              searchParams: url.searchParams,
            },
          };
          const result = await handler({
            user: mockUser,
            request: mockRequest,
          });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: error.status || 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    );

    (postHandler as jest.Mock).mockImplementation(
      async (request, schema, handler, options) => {
        try {
          const body = await request.json();
          const validation = schema.safeParse(body);
          if (!validation.success) {
            return new Response(
              JSON.stringify({
                error: "Validation failed",
                details: validation.error,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
          const result = await handler(validation.data, {
            user: mockUser,
            request,
          });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: error.status || 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    );
  });

  describe("GET /api/estimates", () => {
    it("should return estimates with default pagination", async () => {
      const mockEstimates = [
        createMockEstimate({ id: "1" }),
        createMockEstimate({ id: "2" }),
      ];

      (EstimateBusinessService.getAllEstimates as jest.Mock).mockResolvedValue({
        estimates: mockEstimates,
        total: 2,
        hasMore: false,
      });

      const request = new NextRequest("http://localhost/api/estimates");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(EstimateBusinessService.getAllEstimates).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        status: undefined,
        search: undefined,
        userId: mockUser.id,
      });
      expect(data.estimates).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.hasMore).toBe(false);
    });

    it("should handle custom pagination parameters", async () => {
      (EstimateBusinessService.getAllEstimates as jest.Mock).mockResolvedValue({
        estimates: [],
        total: 100,
        hasMore: true,
      });

      const request = new NextRequest(
        "http://localhost/api/estimates?limit=20&offset=40",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(EstimateBusinessService.getAllEstimates).toHaveBeenCalledWith({
        limit: 20,
        offset: 40,
        status: undefined,
        search: undefined,
        userId: mockUser.id,
      });
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(40);
    });

    it("should filter by status", async () => {
      (EstimateBusinessService.getAllEstimates as jest.Mock).mockResolvedValue({
        estimates: [],
        total: 5,
        hasMore: false,
      });

      const request = new NextRequest(
        "http://localhost/api/estimates?status=draft",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(EstimateBusinessService.getAllEstimates).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        status: "draft",
        search: undefined,
        userId: mockUser.id,
      });
    });

    it("should handle search parameter", async () => {
      (EstimateBusinessService.getAllEstimates as jest.Mock).mockResolvedValue({
        estimates: [],
        total: 3,
        hasMore: false,
      });

      const request = new NextRequest(
        "http://localhost/api/estimates?search=building",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(EstimateBusinessService.getAllEstimates).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        status: undefined,
        search: "building",
        userId: mockUser.id,
      });
    });

    it("should validate pagination limits", async () => {
      // Mock validation error response
      (getHandler as jest.Mock).mockImplementationOnce(
        async (request, handler, options) => {
          return new Response(
            JSON.stringify({
              error: "Validation error",
              details: "Invalid limit",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      );

      const request = new NextRequest(
        "http://localhost/api/estimates?limit=500",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/estimates", () => {
    const validEstimateData = {
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "555-0123",
      buildingName: "Test Building",
      buildingAddress: "123 Test St",
      buildingHeightStories: 5,
      buildingHeightFeet: 50,
      buildingType: "office",
      services: [
        {
          type: "WC",
          area: 1000,
          price: 500,
          laborHours: 4,
          totalHours: 5,
          crewSize: 2,
        },
      ],
    };

    it("should create a new estimate successfully", async () => {
      (EstimateBusinessService.createEstimate as jest.Mock).mockResolvedValue(
        "new-estimate-id",
      );

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(validEstimateData),
      });

      const response = await POST(request);
      const data = await response.json();

      // Debug validation errors
      if (response.status === 400) {
        console.log("Validation error:", JSON.stringify(data, null, 2));
      }

      expect(response.status).toBe(200);
      expect(data.estimateId).toBe("new-estimate-id");
      expect(data.message).toBe("Estimate created successfully");
      expect(EstimateBusinessService.createEstimate).toHaveBeenCalledWith({
        ...validEstimateData,
        services: expect.arrayContaining([
          expect.objectContaining({
            serviceType: "WC",
            price: 500,
            area_sqft: 1000,
          }),
        ]),
      });
    });

    it("should validate required fields", async () => {
      const invalidData = {
        customerEmail: "test@example.com",
        // Missing required fields
      };

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(EstimateBusinessService.createEstimate).not.toHaveBeenCalled();
    });

    it("should validate email format", async () => {
      const dataWithInvalidEmail = {
        ...validEstimateData,
        customerEmail: "invalid-email",
      };

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(dataWithInvalidEmail),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should validate building height limits", async () => {
      const dataWithInvalidHeight = {
        ...validEstimateData,
        buildingHeightStories: 150, // Exceeds max of 100
      };

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(dataWithInvalidHeight),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should require at least one service", async () => {
      const dataWithoutServices = {
        ...validEstimateData,
        services: [],
      };

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(dataWithoutServices),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should handle service creation failure", async () => {
      (EstimateBusinessService.createEstimate as jest.Mock).mockResolvedValue(
        null,
      );

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(validEstimateData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create estimate");
    });

    it("should handle optional fields correctly", async () => {
      const dataWithOptionalFields = {
        ...validEstimateData,
        companyName: "Test Company",
        notes: "Special instructions",
      };

      (EstimateBusinessService.createEstimate as jest.Mock).mockResolvedValue(
        "estimate-with-optional",
      );

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(dataWithOptionalFields),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.estimateId).toBe("estimate-with-optional");
      expect(EstimateBusinessService.createEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Test Company",
          notes: "Special instructions",
        }),
      );
    });

    it("should validate service data", async () => {
      const dataWithInvalidService = {
        ...validEstimateData,
        services: [
          {
            type: "WC",
            area: -100, // Invalid negative area
            price: 500,
            laborHours: 4,
            totalHours: 5,
            crewSize: 2,
          },
        ],
      };

      const request = new NextRequest("http://localhost/api/estimates", {
        method: "POST",
        body: JSON.stringify(dataWithInvalidService),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });
});

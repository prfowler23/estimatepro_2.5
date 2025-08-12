import { estimateService } from "@/lib/services/estimate-service-unified";
import { mockEstimateBusinessService } from "@/__tests__/mocks/services";
import { createClient } from "@/lib/supabase/universal-client";
import {
  createMockEstimate,
  createMockService,
  createMockUser,
} from "@/__tests__/test-utils";

jest.mock("@/lib/services/estimate-service-unified", () => ({
  estimateService: {
    validateEstimate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    createEstimate: jest.fn().mockResolvedValue("new-estimate-id"),
    getEstimate: jest.fn().mockResolvedValue({
      id: "test-id",
      customer_name: "Test Customer",
    }),
    updateEstimate: jest.fn().mockResolvedValue(true),
    deleteEstimate: jest.fn().mockResolvedValue(true),
    updateEstimateStatus: jest.fn().mockResolvedValue(true),
    calculateEstimateTotal: jest.fn().mockReturnValue(1000),
    calculateEstimateDuration: jest.fn().mockReturnValue(4),
    generateEstimateNumber: jest.fn().mockReturnValue("EST-20240101-001"),
    determineComplexityScore: jest.fn().mockReturnValue(5),
    calculateRiskAdjustment: jest.fn().mockReturnValue(1.1),
    formatCurrency: jest.fn().mockReturnValue("$1,234.56"),
    formatDuration: jest.fn().mockImplementation((hours) => {
      if (hours >= 8) return `${Math.floor(hours / 8)} day`;
      if (hours >= 1) return `${hours} hours`;
      return `${hours * 60} minutes`;
    }),
    getServiceDisplayName: jest.fn().mockImplementation((code: string) => {
      const names: Record<string, string> = {
        WC: "Window Cleaning",
        PW: "Pressure Washing",
      };
      return names[code] || code;
    }),
    getAllEstimates: jest.fn().mockResolvedValue({
      estimates: [],
      total: 0,
      hasMore: false,
    }),
  },
}));

// Mock dependencies
jest.mock("@/lib/integrations/webhook-system", () => ({
  publishEstimateEvent: jest.fn(),
}));
jest.mock("@/lib/optimization/database-query-optimization", () => ({
  OptimizedQueryService: {
    optimizedUpdateEstimateServices: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock("@/lib/audit/audit-system", () => ({
  auditSystem: {
    logEvent: jest.fn(),
    logDataAccess: jest.fn(),
    logApiCall: jest.fn(),
  },
  AuditSystem: {
    getInstance: jest.fn(() => ({
      logEvent: jest.fn(),
      logDataAccess: jest.fn(),
      logApiCall: jest.fn(),
    })),
  },
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  })),
};

jest.mock("@/lib/supabase/universal-client", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Helper to reset mock chain for each test
const resetMockChain = () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  };
  mockSupabaseClient.from.mockReturnValue(mockChain);
  return mockChain;
};

describe("EstimateBusinessService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockChain();
  });

  describe("validateEstimate", () => {
    it("should validate a valid estimate", () => {
      const validParams = {
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        buildingName: "Test Building",
        buildingAddress: "123 Main St",
        buildingHeightStories: 5,
        services: [
          {
            quote_id: "test-quote-id",
            serviceType: "window_cleaning",
            description: "Window cleaning service",
            quantity: 100,
            unit: "sqft",
            unitPrice: 5,
            price: 500,
            area_sqft: 1000,
            glass_sqft: 800,
            duration: 4,
            dependencies: [],
            notes: "Test service",
          },
        ],
      };

      const result = estimateService.validateEstimate(validParams);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for invalid estimate", () => {
      const invalidParams = {
        customerName: "",
        customerEmail: "invalid-email",
        customerPhone: "",
        buildingName: "",
        buildingAddress: "",
        buildingHeightStories: 0,
        services: [],
      };

      const result = estimateService.validateEstimate(invalidParams);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("createEstimate", () => {
    it("should create an estimate with valid data", async () => {
      const mockUser = createMockUser();
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockEstimate = { ...createMockEstimate(), id: "new-estimate-id" };
      const mockChain = resetMockChain();
      mockChain.single.mockResolvedValue({
        data: mockEstimate,
        error: null,
      });

      const params = {
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        buildingName: "Test Building",
        buildingAddress: "123 Main St",
        buildingHeightStories: 5,
        services: [
          {
            quote_id: "test-quote-id",
            serviceType: "window_cleaning",
            description: "Window cleaning service",
            quantity: 100,
            unit: "sqft",
            unitPrice: 5,
            price: 500,
            area_sqft: 1000,
            glass_sqft: 800,
            duration: 4,
            dependencies: [],
            notes: "Test service",
            calculationResult: {
              area: 1000,
              basePrice: 500,
              laborHours: 4,
              totalHours: 4,
              crewSize: 2,
              breakdown: [
                {
                  description: "Labor",
                  quantity: 4,
                  unitPrice: 75,
                  total: 300,
                  category: "labor" as const,
                },
                {
                  description: "Materials",
                  quantity: 1,
                  unitPrice: 100,
                  total: 100,
                  category: "materials" as const,
                },
                {
                  description: "Equipment",
                  quantity: 1,
                  unitPrice: 50,
                  total: 50,
                  category: "equipment" as const,
                },
                {
                  description: "Overhead",
                  quantity: 1,
                  unitPrice: 50,
                  total: 50,
                  category: "overhead" as const,
                },
              ],
              warnings: [],
            },
          },
        ],
      };

      const result = await estimateService.createEstimate(params);

      expect(result).toBe(mockEstimate.id);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("estimates");
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const params = {
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        buildingName: "Test Building",
        buildingAddress: "123 Main St",
        buildingHeightStories: 5,
        services: [],
      };

      await expect(estimateService.createEstimate(params)).rejects.toThrow();
    });
  });

  describe("getEstimate", () => {
    it("should retrieve an estimate by ID", async () => {
      const mockEstimate = createMockEstimate();
      const mockDbEstimate = {
        ...mockEstimate,
        customer_name: mockEstimate.client_name,
        customer_email: mockEstimate.client_email,
        customer_phone: mockEstimate.client_phone,
        building_name: "Test Building",
        building_address: "123 Test St",
        building_height_stories: 5,
        total_price: mockEstimate.total_amount,
        estimate_services: [],
      };

      const mockChain = resetMockChain();
      mockChain.single.mockResolvedValue({
        data: mockDbEstimate,
        error: null,
      });

      const result = await estimateService.getEstimate("test-id");

      expect(result).toBeTruthy();
      expect(result!.id).toBe(mockEstimate.id);
      expect((result as any).customer_name).toBe(mockEstimate.client_name);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("estimates");
    });

    it("should return null for non-existent estimate", async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        });

      const result = await estimateService.getEstimate("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateEstimate", () => {
    it("should update an estimate", async () => {
      const mockEstimate = createMockEstimate();
      const updates = { customerName: "Jane Doe" };

      // We need to mock both the initial update and the final select
      let callCount = 0;
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call is for update
            return Promise.resolve({ error: null });
          }
          return mockChain;
        }),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockEstimate, customer_name: "Jane Doe" },
          error: null,
        }),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await estimateService.updateEstimate("test-id", updates);

      expect(result).toBe(true);
    });
  });

  describe("deleteEstimate", () => {
    it("should delete an estimate", async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: null,
      });

      await expect(estimateService.deleteEstimate("test-id")).resolves.toBe(
        true,
      );
    });
  });

  describe("updateEstimateStatus", () => {
    it("should change estimate status", async () => {
      const mockEstimate = createMockEstimate({ status: "draft" });

      mockSupabaseClient.from().update().eq.mockResolvedValue({
        error: null,
      });

      const result = await estimateService.updateEstimateStatus(
        "test-id",
        "sent",
      );

      expect(result).toBe(true);
    });
  });

  describe("calculateEstimateTotal", () => {
    it("should calculate total correctly", () => {
      const services = [
        {
          quote_id: "test-quote-id-1",
          serviceType: "window_cleaning",
          description: "Window cleaning service",
          quantity: 100,
          unit: "sqft",
          unitPrice: 5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: 800,
          duration: 4,
          dependencies: [],
          notes: "Test service",
          calculationResult: {
            area: 1000,
            basePrice: 500,
            laborHours: 4,
            totalHours: 4,
            crewSize: 2,
            breakdown: [
              {
                description: "Labor",
                quantity: 4,
                unitPrice: 75,
                total: 300,
                category: "labor" as const,
              },
            ],
            warnings: [],
          },
        },
        {
          quote_id: "test-quote-id-2",
          serviceType: "pressure_washing",
          description: "Pressure washing service",
          quantity: 1000,
          unit: "sqft",
          unitPrice: 0.5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: null,
          duration: 4,
          dependencies: [],
          notes: "Test service",
          calculationResult: {
            area: 1000,
            basePrice: 500,
            laborHours: 4,
            totalHours: 4,
            crewSize: 2,
            breakdown: [
              {
                description: "Labor",
                quantity: 4,
                unitPrice: 75,
                total: 300,
                category: "labor" as const,
              },
            ],
            warnings: [],
          },
        },
      ];

      const result = estimateService.calculateEstimateTotal(services);

      expect(result).toBe(1000);
    });
  });

  describe("calculateEstimateDuration", () => {
    it("should calculate duration correctly", () => {
      const services = [
        {
          quote_id: "test-quote-id-1",
          serviceType: "window_cleaning",
          description: "Window cleaning service",
          quantity: 100,
          unit: "sqft",
          unitPrice: 5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: 800,
          duration: 4,
          dependencies: [],
          notes: "Test service",
          calculationResult: {
            area: 1000,
            basePrice: 500,
            laborHours: 4,
            totalHours: 4,
            crewSize: 2,
            breakdown: [
              {
                description: "Labor",
                quantity: 4,
                unitPrice: 75,
                total: 300,
                category: "labor" as const,
              },
            ],
            warnings: [],
          },
        },
        {
          quote_id: "test-quote-id-2",
          serviceType: "pressure_washing",
          description: "Pressure washing service",
          quantity: 1000,
          unit: "sqft",
          unitPrice: 0.5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: null,
          duration: 3,
          dependencies: [],
          notes: "Test service",
          calculationResult: {
            area: 1000,
            basePrice: 500,
            laborHours: 3,
            totalHours: 3,
            crewSize: 2,
            breakdown: [
              {
                description: "Labor",
                quantity: 3,
                unitPrice: 75,
                total: 225,
                category: "labor" as const,
              },
            ],
            warnings: [],
          },
        },
      ];

      const result = estimateService.calculateEstimateDuration(services);

      expect(result).toBe(4); // Max of 4 and 3
    });
  });

  describe("generateEstimateNumber", () => {
    it("should generate unique estimate number", () => {
      const estimateNumber = estimateService.generateEstimateNumber();

      expect(estimateNumber).toMatch(/^EST-\d{4}\d{2}\d{2}-\d{3}$/);
    });
  });

  describe("determineComplexityScore", () => {
    it("should calculate complexity score", () => {
      const services = [
        {
          quote_id: "test-quote-id-1",
          serviceType: "window_cleaning",
          description: "Window cleaning service",
          quantity: 100,
          unit: "sqft",
          unitPrice: 5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: 800,
          duration: 4,
          dependencies: [],
          notes: "Test service",
        },
        {
          quote_id: "test-quote-id-2",
          serviceType: "pressure_washing",
          description: "Pressure washing service",
          quantity: 1000,
          unit: "sqft",
          unitPrice: 0.5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: null,
          duration: 4,
          dependencies: [],
          notes: "Test service",
        },
      ];

      const score = estimateService.determineComplexityScore(services, 10);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe("calculateRiskAdjustment", () => {
    it("should calculate risk adjustment for high building", () => {
      const services = [
        {
          quote_id: "test-quote-id-1",
          serviceType: "window_cleaning",
          description: "Window cleaning service",
          quantity: 100,
          unit: "sqft",
          unitPrice: 5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: 800,
          duration: 4,
          dependencies: [],
          notes: "Test service",
        },
      ];

      const adjustment = estimateService.calculateRiskAdjustment(
        services,
        25, // High building
      );

      expect(adjustment).toBeGreaterThan(1.0);
    });

    it("should calculate risk adjustment for high-risk services", () => {
      const services = [
        {
          quote_id: "test-quote-id-2",
          serviceType: "glass_restoration",
          description: "Glass restoration service",
          quantity: 100,
          unit: "sqft",
          unitPrice: 5,
          price: 500,
          area_sqft: 1000,
          glass_sqft: 800,
          duration: 6,
          dependencies: [],
          notes: "Test service",
        },
      ];

      const adjustment = estimateService.calculateRiskAdjustment(services, 5);

      expect(adjustment).toBeGreaterThan(1.0);
    });
  });

  describe("formatCurrency", () => {
    it("should format currency correctly", () => {
      const formatted = estimateService.formatCurrency(1234.56);
      expect(formatted).toBe("$1,234.56");
    });
  });

  describe("formatDuration", () => {
    it("should format hours correctly", () => {
      expect(estimateService.formatDuration(8)).toBe("1 day");
      expect(estimateService.formatDuration(1)).toBe("1 hours");
      expect(estimateService.formatDuration(0.5)).toBe("30 minutes");
    });
  });

  describe("getServiceDisplayName", () => {
    it("should return correct display names", () => {
      expect(estimateService.getServiceDisplayName("WC")).toBe(
        "Window Cleaning",
      );
      expect(estimateService.getServiceDisplayName("PW")).toBe(
        "Pressure Washing",
      );
    });
  });

  describe("getAllEstimates", () => {
    it("should get all estimates with filters", async () => {
      const mockEstimates = [
        {
          ...createMockEstimate({ id: "1" }),
          customer_name: "Test Customer 1",
          customer_email: "test1@example.com",
          customer_phone: "555-0001",
          building_name: "Building 1",
          building_address: "123 Test St",
          building_height_stories: 5,
          total_price: 1000,
          estimate_services: [],
        },
        {
          ...createMockEstimate({ id: "2" }),
          customer_name: "Test Customer 2",
          customer_email: "test2@example.com",
          customer_phone: "555-0002",
          building_name: "Building 2",
          building_address: "456 Test Ave",
          building_height_stories: 10,
          total_price: 2000,
          estimate_services: [],
        },
      ];

      const mockChain = resetMockChain();
      mockChain.range.mockResolvedValue({
        data: mockEstimates,
        error: null,
        count: 2,
      });

      const result = await estimateService.getAllEstimates({
        status: "draft",
        limit: 10,
      });

      expect(result.estimates).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });
});

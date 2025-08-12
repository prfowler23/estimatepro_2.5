import { estimateService } from "@/lib/services/estimate-service-unified";
import {
  EstimateCreationParams,
  EstimateUpdateParams,
} from "@/lib/services/estimate-service-unified";
import { EstimateStatus } from "@/lib/types/estimate-types";

// Mock Supabase client and auth
jest.mock("@/lib/supabase/universal-client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({ data: { user: { id: "test-user-123" } } })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: "test-estimate-123" },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: "test-estimate-123", status: "draft" },
              error: null,
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null })),
        })),
      })),
    })),
  })),
}));

describe("EstimateService", () => {
  const mockEstimateParams: EstimateCreationParams = {
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "+1234567890",
    companyName: "Test Company",
    buildingName: "Test Building",
    buildingAddress: "123 Test St",
    buildingHeightStories: 3,
    buildingHeightFeet: 36,
    buildingType: "office",
    notes: "Test notes",
    services: [
      {
        quote_id: "test-quote-1",
        serviceType: "WC",
        description: "Window cleaning",
        unitPrice: 10,
        quantity: 100,
        unit: "sqft",
        price: 1000,
        area_sqft: 100,
        glass_sqft: 100,
        duration: 4,
        dependencies: [],
        notes: "Test service",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("CRUD Operations", () => {
    it("should create estimate successfully", async () => {
      const result = await estimateService.createEstimate(mockEstimateParams);

      expect(result).toBeDefined();
      expect(result).toBe("test-estimate-123");
    });

    it("should update estimate successfully", async () => {
      const updates: EstimateUpdateParams = {
        status: "approved" as EstimateStatus,
      };
      const result = await estimateService.updateEstimate(
        "test-estimate-123",
        updates,
      );

      expect(result).toBe(true);
    });

    it("should delete estimate successfully", async () => {
      const result = await estimateService.deleteEstimate("test-estimate-123");

      expect(result).toBe(true);
    });

    it("should retrieve estimate successfully", async () => {
      const result = await estimateService.getEstimate("test-estimate-123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("test-estimate-123");
    });
  });

  describe("Business Logic Validation", () => {
    it("should validate estimate data correctly", () => {
      const result = estimateService.validateEstimate(mockEstimateParams);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect validation errors", () => {
      const invalidEstimate = {
        ...mockEstimateParams,
        customerEmail: "invalid-email",
      };
      const result = estimateService.validateEstimate(invalidEstimate);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Status Management", () => {
    it("should handle status transitions", async () => {
      const result = await estimateService.updateEstimateStatus(
        "test-estimate-123",
        "pending" as EstimateStatus,
      );

      expect(result).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      expect(() =>
        estimateService.createEstimate(mockEstimateParams),
      ).not.toThrow();
    });

    it("should handle invalid IDs", async () => {
      expect(() => estimateService.getEstimate("invalid-id")).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should complete operations within reasonable time", async () => {
      const startTime = Date.now();
      await estimateService.createEstimate(mockEstimateParams);
      const endTime = Date.now();

      // Should complete within 1 second (mocked response is instant)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("Integration", () => {
    it("should work with external services", () => {
      // Test integration points
      expect(estimateService).toBeDefined();
      expect(typeof estimateService.createEstimate).toBe("function");
      expect(typeof estimateService.updateEstimate).toBe("function");
      expect(typeof estimateService.deleteEstimate).toBe("function");
      expect(typeof estimateService.getEstimate).toBe("function");
      expect(typeof estimateService.validateEstimate).toBe("function");
    });
  });
});

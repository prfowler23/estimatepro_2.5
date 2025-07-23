// Basic Real-time Pricing Tests
// Simple tests to verify core functionality works

import { RealTimePricingService } from "@/lib/services/real-time-pricing-service";
import { CrossStepValidationService } from "@/lib/services/cross-step-validation-service";
import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";

// Mock the calculator service with minimal implementation
jest.mock("@/lib/services/calculator-service", () => ({
  CalculatorService: {
    calculateService: jest.fn(() => ({
      area: 1000,
      basePrice: 2500,
      laborHours: 50,
      totalHours: 50,
      crewSize: 2,
      breakdown: [],
      warnings: [],
    })),
    getServiceDisplayName: jest.fn((serviceType: ServiceType) => serviceType),
  },
}));

describe("Real-time Pricing Basic Tests", () => {
  let pricingService: RealTimePricingService;
  let validationService: CrossStepValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    pricingService = RealTimePricingService.getInstance();
    validationService = CrossStepValidationService.getInstance();
  });

  afterEach(() => {
    pricingService.cleanup();
    validationService.cleanup();
  });

  describe("Basic Pricing Calculation", () => {
    it("should calculate pricing for window cleaning service", () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          workAreas: [],
          totalArea: 2000,
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result).toBeDefined();
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.serviceBreakdown).toHaveLength(1);
      expect(result.serviceBreakdown[0].serviceType).toBe("WC");
    });

    it("should handle multiple services", () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC", "PW"],
        },
        areaOfWork: {
          workAreas: [],
          totalArea: 3000,
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result.serviceBreakdown).toHaveLength(2);
      expect(result.serviceBreakdown.some((s) => s.serviceType === "WC")).toBe(
        true,
      );
      expect(result.serviceBreakdown.some((s) => s.serviceType === "PW")).toBe(
        true,
      );
    });

    it("should provide confidence scores", () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          workAreas: [],
          totalArea: 1500,
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result.confidence).toBeOneOf(["high", "medium", "low"]);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe("Validation Integration", () => {
    it("should validate basic flow data", () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          workAreas: [],
          totalArea: 1000,
        },
      };

      const result = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("Service Subscriptions", () => {
    it("should allow subscribing to pricing updates", async () => {
      const estimateId = "test-subscription";
      let updateReceived = false;

      const unsubscribe = pricingService.subscribe(estimateId, () => {
        updateReceived = true;
      });

      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          workAreas: [],
          totalArea: 1000,
        },
      };

      pricingService.updatePricing(flowData, estimateId);

      // Wait for async update
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updateReceived).toBe(true);

      unsubscribe();
    });
  });

  describe("Error Handling", () => {
    it("should handle empty flow data gracefully", () => {
      const flowData: GuidedFlowData = {};

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBe("low");
      expect(result.missingData.length).toBeGreaterThan(0);
    });

    it("should handle invalid service types", () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: [], // Empty services
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result.serviceBreakdown).toHaveLength(0);
      expect(result.missingData).toContain("No services selected");
    });
  });
});

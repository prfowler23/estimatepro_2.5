// Real-time Pricing Integration Tests
// Tests the complete real-time pricing system across all calculator services

import {
  RealTimePricingService,
  RealTimePricingResult,
} from "@/lib/services/real-time-pricing-service";
import {
  CrossStepValidationService,
  CrossStepValidationResult,
} from "@/lib/services/cross-step-validation-service";
import { DependencyTrackingService } from "@/lib/services/dependency-tracking-service";
import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";

// Mock the calculator service
jest.mock("@/lib/services/calculator-service", () => ({
  CalculatorService: {
    calculateService: jest.fn((params) => ({
      area: params.formData.area || 1000,
      basePrice: params.formData.area * 2.5 || 2500,
      laborHours: params.formData.area * 0.05 || 50,
      totalHours: params.formData.area * 0.05 || 50,
      crewSize: 2,
      breakdown: [
        {
          description: "Labor",
          quantity: 50,
          unitPrice: 25,
          total: 1250,
          category: "labor" as const,
        },
        {
          description: "Materials",
          quantity: 1,
          unitPrice: 500,
          total: 500,
          category: "materials" as const,
        },
      ],
      warnings: [],
    })),
    getServiceDisplayName: jest.fn((serviceType: ServiceType) => {
      const names: Record<ServiceType, string> = {
        WC: "Window Cleaning",
        PW: "Pressure Washing",
        SW: "Soft Washing",
        BF: "Biofilm Removal",
        GR: "Glass Restoration",
        FR: "Frame Restoration",
        HD: "High Dusting",
        FC: "Final Clean",
        GRC: "Granite Reconditioning",
        PWS: "Pressure Wash & Seal",
        PD: "Parking Deck Cleaning",
        BR: "Biofilm Removal",
        GC: "Granite Cleaning",
      };
      return names[serviceType] || serviceType;
    }),
  },
}));

describe("Real-time Pricing Integration", () => {
  let pricingService: RealTimePricingService;
  let validationService: CrossStepValidationService;
  let dependencyService: DependencyTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get fresh service instances
    pricingService = RealTimePricingService.getInstance({
      enableLiveUpdates: true,
      updateInterval: 100, // Fast updates for testing
    });

    validationService = CrossStepValidationService.getInstance({
      enableRealTimeValidation: true,
      validationInterval: 100,
    });

    dependencyService = DependencyTrackingService.getInstance({
      enableAutoPopulation: true,
      enableRecalculation: true,
      enableValidation: true,
      debounceMs: 50,
    });
  });

  afterEach(() => {
    pricingService.cleanup();
    validationService.cleanup();
    dependencyService.cleanup();
  });

  describe("Service Calculation Integration", () => {
    it("should calculate pricing for all supported services", async () => {
      const services: ServiceType[] = ["WC", "PW", "SW", "BF", "GR"];

      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: services,
        },
        areaOfWork: {
          measurements: {
            totalArea: 5000,
          },
          buildingDetails: {
            height: 30,
            stories: 3,
          },
        },
        takeoff: {
          measurements: {
            WC: { area: 4000 },
            PW: { area: 5000 },
            SW: { area: 3000 },
            BF: { area: 1000 },
            GR: { area: 500 },
          },
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result).toBeDefined();
      expect(result.serviceBreakdown).toHaveLength(5);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalHours).toBeGreaterThan(0);
      expect(result.totalArea).toBeGreaterThan(0);

      // Verify each service is calculated
      services.forEach((service) => {
        const serviceBreakdown = result.serviceBreakdown.find(
          (s) => s.serviceType === service,
        );
        expect(serviceBreakdown).toBeDefined();
        expect(serviceBreakdown!.basePrice).toBeGreaterThan(0);
        expect(serviceBreakdown!.hours).toBeGreaterThan(0);
      });
    });

    it("should handle missing service areas gracefully", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC", "PW"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 3000,
          },
        },
        // No takeoff measurements - should use total area
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(result.serviceBreakdown).toHaveLength(2);
      expect(result.missingData).toContain("No services selected"); // Should be empty now
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings about missing takeoff
    });
  });

  describe("Dependency Tracking", () => {
    it("should trigger recalculations when services change", async () => {
      const estimateId = "test-estimate-deps";
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 2000,
          },
        },
      };

      // Subscribe to pricing updates
      const pricingUpdates: RealTimePricingResult[] = [];
      const unsubscribe = pricingService.subscribe(estimateId, (result) => {
        pricingUpdates.push(result);
      });

      // Process initial data
      dependencyService.processDataChange(
        estimateId,
        "scope-details",
        "selectedServices",
        ["WC"],
        flowData,
        true,
      );

      // Wait for updates
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have triggered pricing update
      expect(pricingUpdates.length).toBeGreaterThan(0);

      // Change services
      const updatedFlowData = {
        ...flowData,
        scopeDetails: {
          selectedServices: ["WC", "PW"],
        },
      };

      dependencyService.processDataChange(
        estimateId,
        "scope-details",
        "selectedServices",
        ["WC", "PW"],
        updatedFlowData,
        true,
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have triggered another update
      expect(pricingUpdates.length).toBeGreaterThan(1);

      unsubscribe();
    });

    it("should validate cross-step consistency", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 1000,
          },
        },
        takeoff: {
          measurements: {
            WC: { area: 1500 }, // Area exceeds total - should trigger validation error
          },
        },
      };

      const result = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.id.includes("area-exceeds-total")),
      ).toBe(true);
    });
  });

  describe("Cross-Step Validation Integration", () => {
    it("should identify service area inconsistencies", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC", "PW"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 2000,
          },
        },
        takeoff: {
          measurements: {
            WC: { area: 1800 }, // OK
            // PW missing - should trigger warning
          },
        },
      };

      const result = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(
        result.warnings.some((w) => w.id.includes("missing-service-area-PW")),
      ).toBe(true);
    });

    it("should validate duration feasibility", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC", "GR"], // Complex services
        },
        areaOfWork: {
          measurements: {
            totalArea: 10000, // Large area
          },
        },
        duration: {
          timeline: {
            estimatedHours: 2, // Too short for large complex job
          },
          crew: {
            size: 2,
          },
        },
      };

      const result = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(result.warnings.some((w) => w.id === "duration-too-short")).toBe(
        true,
      );
    });

    it("should detect equipment access issues", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          buildingDetails: {
            height: 40, // High building
          },
        },
        takeoff: {
          equipment: {
            access: "ladder", // Inadequate for height
          },
        },
      };

      const result = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(result.errors.some((e) => e.id === "inadequate-access")).toBe(
        true,
      );
    });
  });

  describe("Real-time Updates", () => {
    it("should update pricing when area changes", async () => {
      const estimateId = "test-estimate-updates";
      let latestResult: RealTimePricingResult | null = null;

      const unsubscribe = pricingService.subscribe(estimateId, (result) => {
        latestResult = result;
      });

      // Initial calculation
      let flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 1000,
          },
        },
      };

      pricingService.updatePricing(flowData, estimateId);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const initialCost = latestResult?.totalCost || 0;
      expect(initialCost).toBeGreaterThan(0);

      // Double the area
      flowData = {
        ...flowData,
        areaOfWork: {
          measurements: {
            totalArea: 2000,
          },
        },
      };

      pricingService.updatePricing(flowData, estimateId);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updatedCost = latestResult?.totalCost || 0;
      expect(updatedCost).toBeGreaterThan(initialCost);
      expect(updatedCost / initialCost).toBeCloseTo(2, 0.5); // Roughly double

      unsubscribe();
    });

    it("should apply risk adjustments for high buildings", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 1000,
          },
          buildingDetails: {
            height: 60, // High building - should trigger risk premium
          },
        },
      };

      const result = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(
        result.adjustments.some(
          (adj) =>
            adj.type === "risk" && adj.description.includes("High building"),
        ),
      ).toBe(true);
    });

    it("should handle multiple simultaneous updates", async () => {
      const estimateId = "test-estimate-concurrent";
      const updates: RealTimePricingResult[] = [];

      const unsubscribe = pricingService.subscribe(estimateId, (result) => {
        updates.push(result);
      });

      const baseFlowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC", "PW"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 1000,
          },
        },
      };

      // Trigger multiple rapid updates
      for (let i = 1; i <= 5; i++) {
        const flowData = {
          ...baseFlowData,
          areaOfWork: {
            measurements: {
              totalArea: 1000 * i,
            },
          },
        };

        pricingService.updatePricing(flowData, estimateId);
      }

      // Wait for debounced updates
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should have processed the updates (debounced)
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1].totalArea).toBe(5000); // Final area

      unsubscribe();
    });
  });

  describe("Confidence Scoring", () => {
    it("should provide high confidence for complete data", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        areaOfWork: {
          measurements: {
            totalArea: 2000,
          },
          buildingDetails: {
            height: 25,
            stories: 2,
          },
        },
        takeoff: {
          measurements: {
            WC: { area: 1800 },
          },
        },
        duration: {
          timeline: {
            estimatedHours: 40,
          },
        },
      };

      const pricingResult = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );
      const validationResult = validationService.validateCrossStepData(
        flowData,
        "test-estimate",
      );

      expect(pricingResult.confidence).toBe("high");
      expect(validationResult.confidence).toBe("high");
      expect(pricingResult.missingData).toHaveLength(0);
    });

    it("should provide low confidence for incomplete data", async () => {
      const flowData: GuidedFlowData = {
        scopeDetails: {
          selectedServices: ["WC"],
        },
        // Missing area data - should lower confidence
      };

      const pricingResult = pricingService.calculateRealTimePricing(
        flowData,
        "test-estimate",
      );

      expect(pricingResult.confidence).toBe("low");
      expect(pricingResult.missingData.length).toBeGreaterThan(0);
    });
  });
});

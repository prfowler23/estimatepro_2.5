import { RealTimePricingService } from "@/lib/services/real-time-pricing-service";
import { CalculatorService } from "@/lib/services/calculator-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

// Mock dependencies
jest.mock("@/lib/services/calculator-service");

describe("RealTimePricingService", () => {
  let pricingService: RealTimePricingService;
  let mockCalculatorService: jest.Mocked<typeof CalculatorService>;

  beforeEach(() => {
    // Reset the singleton instance
    (RealTimePricingService as any).instance = null;

    // Mock CalculatorService static methods
    mockCalculatorService = CalculatorService as jest.Mocked<
      typeof CalculatorService
    >;

    // Mock the calculateService method with default return value
    mockCalculatorService.calculateService = jest.fn().mockReturnValue({
      basePrice: 1000,
      totalHours: 8,
      area: 1000,
      confidence: "high" as const,
      laborCost: 500,
      materialCost: 300,
      equipmentCost: 200,
    });

    // Mock getServiceDisplayName
    mockCalculatorService.getServiceDisplayName = jest.fn((serviceType) => {
      const names: Record<string, string> = {
        window_cleaning: "Window Cleaning",
        pressure_washing: "Pressure Washing",
        soft_washing: "Soft Washing",
      };
      return names[serviceType] || serviceType;
    });

    pricingService = RealTimePricingService.getInstance();
    jest.clearAllMocks();
  });

  describe("calculateRealTimePricing", () => {
    it("should calculate pricing for guided flow data", () => {
      const mockFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
          serviceType: "window-cleaning",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          buildingHeightFeet: 50,
          totalSqft: 5000,
          glassArea: 2000,
          windowCount: 100,
        },
        pricing: {
          selectedServices: ["window_cleaning"],
          pricePerSqft: 1.5,
          totalPrice: 7500,
          margin: 0.3,
          serviceBreakdown: [],
        },
      };

      const result = pricingService.calculateRealTimePricing(
        mockFlowData as GuidedFlowData,
      );

      expect(result).toHaveProperty("totalCost");
      expect(result).toHaveProperty("totalHours");
      expect(result).toHaveProperty("totalArea");
      expect(result).toHaveProperty("serviceBreakdown");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("lastUpdated");
    });

    it("should handle missing data gracefully", () => {
      const incompleteFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
        },
      };

      const result = pricingService.calculateRealTimePricing(
        incompleteFlowData as GuidedFlowData,
      );

      expect(result.confidence).toBe("low");
      expect(result.missingData.length).toBeGreaterThan(0);
      expect(result.totalCost).toBe(0);
    });

    it("should cache results when estimateId is provided", () => {
      const mockFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
          serviceType: "window-cleaning",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          totalSqft: 5000,
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
      };

      const estimateId = "test-estimate-123";
      const result = pricingService.calculateRealTimePricing(
        mockFlowData as GuidedFlowData,
        estimateId,
      );

      // Verify result is cached
      const cachedResults = (pricingService as any).lastResults;
      expect(cachedResults.has(estimateId)).toBe(true);
      expect(cachedResults.get(estimateId)).toEqual(result);
    });
  });

  describe("subscribe", () => {
    it("should subscribe to pricing updates", () => {
      const mockCallback = jest.fn();
      const estimateId = "test-estimate-123";

      const unsubscribe = pricingService.subscribe(estimateId, mockCallback);

      expect(typeof unsubscribe).toBe("function");

      // Verify listener was added
      const listeners = (pricingService as any).listeners;
      expect(listeners.has(estimateId)).toBe(true);
      expect(listeners.get(estimateId)).toContain(mockCallback);
    });

    it("should handle multiple subscribers", () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const estimateId = "test-estimate-123";

      pricingService.subscribe(estimateId, mockCallback1);
      pricingService.subscribe(estimateId, mockCallback2);

      const listeners = (pricingService as any).listeners.get(estimateId);
      expect(listeners).toHaveLength(2);
      expect(listeners).toContain(mockCallback1);
      expect(listeners).toContain(mockCallback2);
    });

    it("should unsubscribe correctly", () => {
      const mockCallback = jest.fn();
      const estimateId = "test-estimate-123";

      const unsubscribe = pricingService.subscribe(estimateId, mockCallback);
      unsubscribe();

      const listeners = (pricingService as any).listeners;
      expect(listeners.has(estimateId)).toBe(false);
    });
  });

  describe("updatePricing", () => {
    it("should trigger updates with debouncing", (done) => {
      const mockCallback = jest.fn();
      const estimateId = "test-estimate-123";
      const mockFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
          serviceType: "window-cleaning",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          totalSqft: 5000,
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
        pricing: {
          selectedServices: ["window_cleaning"],
          pricePerSqft: 1.5,
          totalPrice: 7500,
          margin: 0.3,
          serviceBreakdown: [],
        },
      };

      pricingService.subscribe(estimateId, mockCallback);

      // Trigger multiple updates rapidly
      pricingService.updatePricing(
        mockFlowData as GuidedFlowData,
        estimateId,
        "areaOfWork",
      );
      pricingService.updatePricing(
        mockFlowData as GuidedFlowData,
        estimateId,
        "areaOfWork",
      );
      pricingService.updatePricing(
        mockFlowData as GuidedFlowData,
        estimateId,
        "areaOfWork",
      );

      // Wait for debounce delay (1000ms default) + a bit extra
      setTimeout(() => {
        // Should only be called once due to debouncing
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            totalCost: expect.any(Number),
            totalHours: expect.any(Number),
            totalArea: expect.any(Number),
            serviceBreakdown: expect.any(Array),
            confidence: expect.any(String),
            lastUpdated: expect.any(Date),
          }),
        );
        done();
      }, 1100);
    });

    it("should not update when live updates are disabled", () => {
      // Create instance with live updates disabled
      (RealTimePricingService as any).instance = null;
      const service = RealTimePricingService.getInstance({
        enableLiveUpdates: false,
      });

      const mockCallback = jest.fn();
      const estimateId = "test-estimate-123";
      const mockFlowData = {} as GuidedFlowData;

      service.subscribe(estimateId, mockCallback);
      service.updatePricing(mockFlowData, estimateId);

      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("dependency tracking", () => {
    it("should identify affected steps when dependencies change", () => {
      const mockFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 10, // Changed height
          totalSqft: 5000,
        },
      };

      // The service tracks dependencies internally
      const dependencies = (pricingService as any).dependencies;
      expect(dependencies.has("area-of-work")).toBe(true);

      const areaOfWorkDeps = dependencies.get("area-of-work");
      expect(areaOfWorkDeps).toBeDefined();
      expect(
        areaOfWorkDeps.some((dep: any) => dep.affects.includes("pricing")),
      ).toBe(true);
    });
  });

  describe("confidence scoring", () => {
    it("should provide high confidence for complete data", () => {
      const completeFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
          serviceType: "window-cleaning",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          buildingHeightFeet: 50,
          totalSqft: 5000,
          glassArea: 2000,
          windowCount: 100,
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
        scopeDetails: {
          selectedServices: ["window_cleaning"], // Changed from 'services' to 'selectedServices'
          frequency: "monthly",
          specialRequirements: [],
        },
        pricing: {
          selectedServices: ["window_cleaning"],
          pricePerSqft: 1.5,
          totalPrice: 7500,
          margin: 0.3,
          serviceBreakdown: [],
        },
        duration: {
          estimatedHours: 8,
          crewSize: 2,
          timeline: {
            estimatedHours: 8, // Add estimatedHours to timeline as well
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      };

      const result = pricingService.calculateRealTimePricing(
        completeFlowData as GuidedFlowData,
      );

      expect(result.confidence).toBe("high");
      expect(result.missingData).toHaveLength(0);
    });

    it("should provide medium confidence for partial data", () => {
      const partialFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          totalSqft: 5000,
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
        scopeDetails: {
          selectedServices: ["window_cleaning"],
        },
        pricing: {
          selectedServices: ["window_cleaning"],
          pricePerSqft: 1.5,
          totalPrice: 7500,
          margin: 0.3,
          serviceBreakdown: [],
        },
        // Missing duration - this should trigger "medium" confidence
      };

      const result = pricingService.calculateRealTimePricing(
        partialFlowData as GuidedFlowData,
      );

      expect(result.confidence).toBe("medium");
      expect(result.missingData.length).toBeGreaterThan(0);
    });

    it("should provide low confidence for minimal data", () => {
      const minimalFlowData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
        },
      };

      const result = pricingService.calculateRealTimePricing(
        minimalFlowData as GuidedFlowData,
      );

      expect(result.confidence).toBe("low");
      expect(result.missingData.length).toBeGreaterThan(2);
    });
  });

  describe("pricing adjustments", () => {
    it("should apply risk adjustments for high buildings", () => {
      const highBuildingData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
          serviceType: "window-cleaning",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 25, // High building
          totalSqft: 5000,
          windowCount: 500,
          buildingDetails: {
            height: 250, // 25 stories * 10 feet per story
          },
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
        scopeDetails: {
          selectedServices: ["window_cleaning"],
        },
        pricing: {
          selectedServices: ["window_cleaning"],
          pricePerSqft: 1.5,
          totalPrice: 7500,
          margin: 0.3,
          serviceBreakdown: [],
        },
      };

      const result = pricingService.calculateRealTimePricing(
        highBuildingData as GuidedFlowData,
      );

      // Should have risk adjustment
      const riskAdjustment = result.adjustments.find(
        (adj) => adj.type === "risk",
      );
      expect(riskAdjustment).toBeDefined();
      expect(riskAdjustment?.value).toBeGreaterThan(0);
    });

    it("should handle multiple services", () => {
      const multiServiceData: Partial<GuidedFlowData> = {
        projectSetup: {
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "555-0123",
          buildingType: "office",
        },
        areaOfWork: {
          buildingName: "Test Building",
          buildingAddress: "123 Test St",
          buildingHeightStories: 5,
          totalSqft: 5000,
          measurements: [
            { type: "area", value: 5000, unit: "sqft", label: "Total Area" },
          ],
        },
        scopeDetails: {
          selectedServices: [
            "window_cleaning",
            "pressure_washing",
            "soft_washing",
          ], // Changed from 'services' to 'selectedServices'
          frequency: "monthly",
          specialRequirements: [],
        },
        pricing: {
          selectedServices: [
            "window_cleaning",
            "pressure_washing",
            "soft_washing",
          ],
          pricePerSqft: 1.5,
          totalPrice: 15000,
          margin: 0.3,
          serviceBreakdown: [],
        },
      };

      const result = pricingService.calculateRealTimePricing(
        multiServiceData as GuidedFlowData,
      );

      // Should have breakdown for all services
      expect(result.serviceBreakdown).toHaveLength(3);
      expect(result.totalCost).toBeGreaterThan(0);
    });
  });
});

/**
 * @jest-environment jsdom
 */

import { CrossStepPopulationService } from "@/lib/services/cross-step-population-service";
import { GuidedFlowData, ServiceType } from "@/lib/types/estimate-types";

describe("CrossStepPopulationService", () => {
  const mockFlowData: GuidedFlowData = {
    initialContact: {
      contactMethod: "email",
      initialNotes: "Test email content",
      aiExtractedData: {
        customer: {
          name: "John Doe",
          company: "Test Corp",
          email: "john@test.com",
          phone: "555-1234",
          address: "123 Test St",
        },
        requirements: {
          services: ["window cleaning", "pressure washing"],
          buildingType: "office",
          buildingSize: "50,000 sq ft",
          floors: 5,
          timeline: "2 weeks",
          budget: "under $10,000",
        },
        urgencyScore: 0.6,
        confidence: 0.8,
        extractionDate: new Date().toISOString(),
      },
    },
  };

  describe("populateFromExtractedData", () => {
    it("should successfully populate scope details from extracted data", async () => {
      const { updatedFlowData, result } =
        await CrossStepPopulationService.populateFromExtractedData(
          mockFlowData,
        );

      expect(result.success).toBe(true);
      expect(result.populatedSteps).toContain("Scope Details");
      expect(result.confidence).toBeGreaterThan(0);

      // Verify scope details were populated
      expect(updatedFlowData.scopeDetails?.selectedServices).toBeDefined();
      expect(
        updatedFlowData.scopeDetails?.selectedServices.length,
      ).toBeGreaterThan(0);
      expect(updatedFlowData.scopeDetails?.autoPopulated).toBe(true);
      expect(updatedFlowData.scopeDetails?.scopeNotes).toContain(
        "Auto-generated from initial contact",
      );
    });

    it("should populate area of work from building data", async () => {
      const { updatedFlowData, result } =
        await CrossStepPopulationService.populateFromExtractedData(
          mockFlowData,
        );

      expect(result.populatedSteps).toContain("Area of Work");
      expect(updatedFlowData.areaOfWork?.totalSquareFeet).toBeGreaterThan(0);
      expect(updatedFlowData.areaOfWork?.workAreas).toBeDefined();
      expect(updatedFlowData.areaOfWork?.autoPopulated).toBe(true);
    });

    it("should populate duration estimates", async () => {
      const { updatedFlowData, result } =
        await CrossStepPopulationService.populateFromExtractedData(
          mockFlowData,
        );

      expect(result.populatedSteps).toContain("Duration");
      expect(updatedFlowData.duration?.estimatedDuration?.days).toBeGreaterThan(
        0,
      );
      expect(
        updatedFlowData.duration?.estimatedDuration?.hours,
      ).toBeGreaterThan(0);
      expect(updatedFlowData.duration?.autoPopulated).toBe(true);
    });

    it("should handle missing extracted data gracefully", async () => {
      const emptyFlowData: GuidedFlowData = {};

      const { updatedFlowData, result } =
        await CrossStepPopulationService.populateFromExtractedData(
          emptyFlowData,
        );

      expect(result.success).toBe(false);
      expect(result.populatedSteps).toHaveLength(0);
      expect(result.warnings).toContain(
        "No extracted data available for auto-population",
      );
    });
  });

  describe("suggestServicesFromBuilding", () => {
    it("should suggest appropriate services for office building", async () => {
      const suggestions =
        await CrossStepPopulationService.suggestServicesFromBuilding(
          "office",
          "50,000 sq ft",
          5,
          ["window cleaning"],
        );

      expect(suggestions).toContain("WC");
      expect(suggestions).toContain("PW");
      expect(suggestions).toContain("HD"); // High dusting for office buildings
    });

    it("should suggest services based on building size", async () => {
      const smallBuildingSuggestions =
        await CrossStepPopulationService.suggestServicesFromBuilding(
          "office",
          "10,000 sq ft",
          2,
        );

      const largeBuildingSuggestions =
        await CrossStepPopulationService.suggestServicesFromBuilding(
          "office",
          "150,000 sq ft",
          15,
        );

      expect(largeBuildingSuggestions.length).toBeGreaterThan(
        smallBuildingSuggestions.length,
      );
    });

    it("should suggest floor-specific services", async () => {
      const highRiseSuggestions =
        await CrossStepPopulationService.suggestServicesFromBuilding(
          "office",
          "100,000 sq ft",
          15,
        );

      expect(highRiseSuggestions).toContain("HD"); // High dusting for multi-story
    });
  });

  describe("shouldTriggerAutoPopulation", () => {
    it("should trigger when new extracted data is available", () => {
      const previousData: GuidedFlowData = {};
      const newData = mockFlowData;

      const shouldTrigger =
        CrossStepPopulationService.shouldTriggerAutoPopulation(
          previousData,
          newData,
        );

      expect(shouldTrigger).toBe(true);
    });

    it("should trigger when extracted data changes", () => {
      const previousData = mockFlowData;
      const newData = {
        ...mockFlowData,
        initialContact: {
          ...mockFlowData.initialContact!,
          aiExtractedData: {
            ...mockFlowData.initialContact!.aiExtractedData!,
            requirements: {
              ...mockFlowData.initialContact!.aiExtractedData!.requirements,
              buildingType: "retail", // Changed from office
            },
          },
        },
      };

      const shouldTrigger =
        CrossStepPopulationService.shouldTriggerAutoPopulation(
          previousData,
          newData,
        );

      expect(shouldTrigger).toBe(true);
    });

    it("should not trigger when data is unchanged", () => {
      const shouldTrigger =
        CrossStepPopulationService.shouldTriggerAutoPopulation(
          mockFlowData,
          mockFlowData,
        );

      expect(shouldTrigger).toBe(false);
    });
  });

  describe("service mapping", () => {
    it("should map extracted services to service types correctly", () => {
      // This tests the private mapExtractedServices function indirectly
      // through the populateFromExtractedData function
      const testData = {
        ...mockFlowData,
        initialContact: {
          ...mockFlowData.initialContact!,
          aiExtractedData: {
            ...mockFlowData.initialContact!.aiExtractedData!,
            requirements: {
              ...mockFlowData.initialContact!.aiExtractedData!.requirements,
              services: ["window cleaning", "pressure washing", "high dusting"],
            },
          },
        },
      };

      return CrossStepPopulationService.populateFromExtractedData(
        testData,
      ).then(({ updatedFlowData }) => {
        const selectedServices =
          updatedFlowData.scopeDetails?.selectedServices || [];
        expect(selectedServices).toContain("WC"); // Window cleaning
        expect(selectedServices).toContain("PW"); // Pressure washing
        expect(selectedServices).toContain("HD"); // High dusting
      });
    });
  });
});

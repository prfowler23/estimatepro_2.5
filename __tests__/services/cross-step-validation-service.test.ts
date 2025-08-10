import { CrossStepValidationService } from "@/lib/services/cross-step-validation-service";
import { UnifiedRealTimePricingService } from "@/lib/services/real-time-pricing-service-unified";
import { GuidedFlowData } from "@/lib/types/estimate-types";

// Mock RealTimePricingService
jest.mock("@/lib/services/real-time-pricing-service-unified");

describe("CrossStepValidationService", () => {
  let validationService: CrossStepValidationService;
  let mockPricingService: jest.Mocked<UnifiedRealTimePricingService>;

  const mockGuidedFlowData: GuidedFlowData = {
    userId: "test-user-123",
    initialContact: {
      contactMethod: "email" as const,
      contactDate: new Date().toISOString(),
      initialNotes: "Test contact",
      aiExtractedData: {
        customer: {
          name: "Test Customer",
          email: "test@example.com",
          phone: "+1234567890",
          company: "Test Company",
        },
        requirements: {
          services: ["window-cleaning"],
          buildingType: "office",
          buildingSize: "medium",
          floors: 2,
          timeline: "2-weeks",
          budget: "$5000-$10000",
          location: "123 Test St",
          specialRequirements: [],
        },
        timeline: {
          requestedDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          urgency: "normal" as const,
          flexibility: "some" as const,
        },
        urgencyScore: 5,
        confidence: 0.85,
        extractionDate: new Date().toISOString(),
      },
    },
  };

  beforeEach(() => {
    mockPricingService = {
      calculateRealTimePricing: jest.fn().mockReturnValue({
        totalCost: 5000,
        confidence: "high" as const,
        missingData: [],
        breakdown: [],
        metadata: {},
      }),
      subscribeToChanges: jest.fn(),
      unsubscribeFromChanges: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    validationService = new CrossStepValidationService(
      {
        enableRealTimeValidation: true,
        enableAutoFix: false,
        validationInterval: 1000,
        priorityThreshold: "medium",
      },
      mockPricingService,
    );
  });

  afterEach(() => {
    validationService.cleanup();
    jest.clearAllMocks();
  });

  describe("Basic Validation", () => {
    test("should validate required fields", () => {
      const result = validationService.validateStep(
        "initial-contact",
        mockGuidedFlowData,
      );

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBe("high");
    });

    test("should detect missing required fields", () => {
      const invalidData = {
        ...mockGuidedFlowData,
        initialContact: {
          ...mockGuidedFlowData.initialContact!,
          aiExtractedData: {
            ...mockGuidedFlowData.initialContact!.aiExtractedData!,
            customer: {
              ...mockGuidedFlowData.initialContact!.aiExtractedData!.customer,
              name: "",
              email: "",
            },
          },
        },
      };

      const result = validationService.validateStep(
        "initial-contact",
        invalidData,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => error.field.includes("name"))).toBe(
        true,
      );
      expect(result.errors.some((error) => error.field.includes("email"))).toBe(
        true,
      );
    });

    test("should validate email format", () => {
      const invalidData = {
        ...mockGuidedFlowData,
        initialContact: {
          ...mockGuidedFlowData.initialContact!,
          aiExtractedData: {
            ...mockGuidedFlowData.initialContact!.aiExtractedData!,
            customer: {
              ...mockGuidedFlowData.initialContact!.aiExtractedData!.customer,
              email: "invalid-email",
            },
          },
        },
      };

      const result = validationService.validateStep(
        "initial-contact",
        invalidData,
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.field.includes("email") && error.type === "invalid",
        ),
      ).toBe(true);
    });
  });

  describe("Cross-Step Dependencies", () => {
    test("should validate dependencies between steps", () => {
      const measurementsData = {
        ...mockGuidedFlowData,
        areaOfWork: {
          workAreas: [],
          measurements: [
            {
              id: "1",
              workAreaId: "area1",
              type: "area" as const,
              value: 1000,
              unit: "sqft",
              accuracy: 0.95,
              method: "manual" as const,
              takenAt: new Date(),
            },
          ],
          totalArea: 1000,
          buildingDetails: {
            height: 24,
            floors: 2,
            type: "concrete",
          },
        },
      };

      const result =
        validationService.validateCrossStepDependencies(measurementsData);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    test("should detect measurement inconsistencies", () => {
      const inconsistentData = {
        ...mockGuidedFlowData,
        areaOfWork: {
          workAreas: [],
          buildingDetails: {
            height: 50,
            floors: 1,
            type: "concrete",
          },
          measurements: [
            {
              id: "1",
              workAreaId: "area1",
              type: "area" as const,
              value: 10000, // Too large for 1-story
              unit: "sqft",
              accuracy: 0.95,
              method: "manual" as const,
              takenAt: new Date(),
            },
          ],
          totalArea: 10000,
        },
      };

      const result =
        validationService.validateCrossStepDependencies(inconsistentData);

      expect(
        result.warnings.some((warning) => warning.type === "inconsistency"),
      ).toBe(true);
    });
  });

  describe("Real-Time Validation", () => {
    test("should enable real-time validation", () => {
      const listener = jest.fn();
      validationService.subscribe("test-session", listener);

      validationService.startRealTimeValidation(
        "test-session",
        mockGuidedFlowData,
      );

      expect(validationService.isValidating).toBe(true);
    });

    test("should stop real-time validation", () => {
      validationService.startRealTimeValidation(
        "test-session",
        mockGuidedFlowData,
      );
      validationService.stopRealTimeValidation("test-session");

      expect(validationService.isValidating).toBe(false);
    });

    test("should notify listeners of validation changes", (done) => {
      const listener = jest.fn((result) => {
        expect(result).toBeDefined();
        expect(result.isValid).toBeDefined();
        done();
      });

      validationService.subscribe("test-session", listener);
      validationService.notifyValidationChange(
        "test-session",
        mockGuidedFlowData,
      );
    });
  });

  describe("Performance and Configuration", () => {
    test("should respect validation interval", async () => {
      const fastService = new CrossStepValidationService({
        validationInterval: 100,
      });

      const listener = jest.fn();
      fastService.subscribe("test-session", listener);
      fastService.startRealTimeValidation("test-session", mockGuidedFlowData);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(listener).toHaveBeenCalled();
      fastService.cleanup();
    });

    test("should handle disabled auto-fix", () => {
      const noAutoFixService = new CrossStepValidationService({
        enableAutoFix: false,
      });

      const result = noAutoFixService.validateStep(
        "initial-contact",
        mockGuidedFlowData,
      );

      expect(result.suggestions.every((s) => !s.suggestedValue)).toBe(true);
      noAutoFixService.cleanup();
    });

    test("should filter by priority threshold", () => {
      const highPriorityService = new CrossStepValidationService({
        priorityThreshold: "high",
      });

      const result = highPriorityService.validateStep(
        "initial-contact",
        mockGuidedFlowData,
      );

      expect(result.warnings.every((w) => w.severity === "high")).toBe(true);
      highPriorityService.cleanup();
    });
  });

  describe("Validation Rules", () => {
    test("should register custom validation rules", () => {
      const customRule = {
        id: "custom-rule",
        name: "Custom Rule",
        description: "Test rule",
        dependsOn: ["initial-contact"],
        validator: jest.fn(() => ({
          isValid: true,
          warnings: [],
          errors: [],
          suggestions: [],
          blockedSteps: [],
          confidence: "high" as const,
          lastValidated: new Date(),
        })),
        priority: "medium" as const,
      };

      validationService.addValidationRule(customRule);
      const result = validationService.validateStep(
        "initial-contact",
        mockGuidedFlowData,
      );

      expect(customRule.validator).toHaveBeenCalled();
    });

    test("should remove validation rules", () => {
      const customRule = {
        id: "removable-rule",
        name: "Removable Rule",
        description: "Test rule",
        dependsOn: ["initial-contact"],
        validator: jest.fn(() => ({
          isValid: true,
          warnings: [],
          errors: [],
          suggestions: [],
          blockedSteps: [],
          confidence: "high" as const,
          lastValidated: new Date(),
        })),
        priority: "medium" as const,
      };

      validationService.addValidationRule(customRule);
      validationService.removeValidationRule("removable-rule");

      validationService.validateStep("initial-contact", mockGuidedFlowData);
      expect(customRule.validator).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("should handle validation errors gracefully", () => {
      const faultyRule = {
        id: "faulty-rule",
        name: "Faulty Rule",
        description: "Test rule that throws",
        dependsOn: ["initial-contact"],
        validator: jest.fn(() => {
          throw new Error("Validation error");
        }),
        priority: "medium" as const,
      };

      validationService.addValidationRule(faultyRule);

      expect(() => {
        validationService.validateStep("initial-contact", mockGuidedFlowData);
      }).not.toThrow();
    });

    test("should cleanup resources properly", () => {
      validationService.startRealTimeValidation(
        "test-session",
        mockGuidedFlowData,
      );
      const cleanupSpy = jest.spyOn(validationService, "cleanup");

      validationService.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(validationService.isValidating).toBe(false);
    });
  });
});

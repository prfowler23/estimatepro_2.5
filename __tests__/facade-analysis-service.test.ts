import { facadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { AIService } from "@/lib/services/ai-service";
import { aiCache } from "@/lib/ai/ai-cache";

jest.mock("@/lib/services/ai-service");
jest.mock("@/lib/ai/ai-cache");
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: "test-id", estimate_id: "test-estimate-id" },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: "test-id", estimate_id: "test-estimate-id" },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe("FacadeAnalysisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeImage", () => {
    it("should use cached result if available", async () => {
      const cachedResult = {
        windows_detected: 50,
        facade_area: 10000,
        glass_area: 4000,
        materials_identified: [],
        height_estimation: { stories: 10, feet: 120, confidence: 0.95 },
        covered_areas_detected: false,
        processing_time_ms: 1000,
      };

      (aiCache.get as jest.Mock).mockResolvedValue(cachedResult);

      const result = await facadeAnalysisService.analyzeImage(
        "test-url",
        "ground",
        "front",
      );

      expect(result).toEqual(cachedResult);
      expect(AIService.analyzeFacadeComprehensive).not.toHaveBeenCalled();
    });

    it("should call AI service when no cache exists", async () => {
      const aiResult = {
        windowCount: 50,
        facadeArea: 10000,
        glassArea: 4000,
        materials: ["brick", "glass"],
        buildingStories: 10,
        buildingHeight: 120,
        hasCoveredAreas: false,
        confidence: 0.95,
        processingTime: 1500,
      };

      (aiCache.get as jest.Mock).mockResolvedValue(null);
      (AIService.analyzeFacadeComprehensive as jest.Mock).mockResolvedValue(
        aiResult,
      );

      const result = await facadeAnalysisService.analyzeImage(
        "test-url",
        "ground",
        "front",
      );

      expect(AIService.analyzeFacadeComprehensive).toHaveBeenCalledWith(
        "test-url",
        "commercial",
      );
      expect(aiCache.set).toHaveBeenCalled();
      expect(result.windows_detected).toBe(50);
      expect(result.facade_area).toBe(10000);
    });
  });

  describe("calculateMeasurements", () => {
    it("should calculate measurements correctly", async () => {
      const analysis = {
        total_facade_sqft: 10000,
        total_glass_sqft: 4000,
        building_type: "office" as const,
      };

      const result =
        await facadeAnalysisService.calculateMeasurements(analysis);

      expect(result.measurements.net_facade_sqft).toBe(6000);
      expect(result.measurements.glass_to_facade_ratio).toBe(40);
      expect(result.validation.passed).toBe(true);
      expect(result.validation.warnings).toHaveLength(0);
    });

    it("should generate error for excessive glass ratio", async () => {
      const analysis = {
        total_facade_sqft: 10000,
        total_glass_sqft: 9500,
        building_type: "office" as const,
      };

      const result =
        await facadeAnalysisService.calculateMeasurements(analysis);

      expect(result.measurements.glass_to_facade_ratio).toBe(95);
      expect(result.validation.passed).toBe(false);
      expect(result.validation.errors).toContain(
        "Glass area exceeds 90% of facade - requires manual verification",
      );
    });

    it("should generate warning for high glass percentage", async () => {
      const analysis = {
        total_facade_sqft: 10000,
        total_glass_sqft: 8500,
        building_type: "office" as const,
      };

      const result =
        await facadeAnalysisService.calculateMeasurements(analysis);

      expect(result.validation.passed).toBe(true);
      expect(result.validation.warnings).toContain(
        "High glass percentage detected - verify curtain wall system",
      );
    });

    it("should validate height consistency", async () => {
      const analysis = {
        total_facade_sqft: 10000,
        total_glass_sqft: 4000,
        building_height_stories: 10,
        building_height_feet: 200, // Too high for 10 stories
        building_type: "office" as const,
      };

      const result =
        await facadeAnalysisService.calculateMeasurements(analysis);

      expect(result.validation.warnings).toContainEqual(
        expect.stringContaining("Height mismatch"),
      );
    });
  });

  describe("combineAnalysisResults", () => {
    it("should combine multiple image analysis results", async () => {
      const results = [
        {
          windows_detected: 25,
          facade_area: 5000,
          glass_area: 2000,
          materials_identified: [
            {
              type: "brick",
              coverage_percentage: 60,
              condition: "good" as const,
              id: "1",
            },
          ],
          height_estimation: { stories: 10, feet: 120, confidence: 0.9 },
          covered_areas_detected: false,
          processing_time_ms: 1000,
        },
        {
          windows_detected: 25,
          facade_area: 5000,
          glass_area: 2000,
          materials_identified: [
            {
              type: "brick",
              coverage_percentage: 50,
              condition: "good" as const,
              id: "2",
            },
            {
              type: "metal",
              coverage_percentage: 30,
              condition: "excellent" as const,
              id: "3",
            },
          ],
          height_estimation: { stories: 10, feet: 120, confidence: 0.95 },
          covered_areas_detected: false,
          processing_time_ms: 1000,
        },
      ];

      const buildingInfo = {
        building_type: "commercial",
        building_address: "123 Main St",
      };

      const result = await facadeAnalysisService.combineAnalysisResults(
        results,
        buildingInfo,
      );

      expect(result.total_facade_sqft).toBe(10000);
      expect(result.total_glass_sqft).toBe(4000);
      expect(result.confidence_level).toBe(93); // Average of 90 and 95
      expect(result.materials).toHaveLength(2); // Brick and metal
      expect(result.facade_complexity).toBe("moderate"); // 2 materials
    });

    it("should determine complexity based on materials and glass ratio", async () => {
      const results = [
        {
          windows_detected: 100,
          facade_area: 10000,
          glass_area: 8000,
          materials_identified: [
            {
              type: "glass",
              coverage_percentage: 80,
              condition: "excellent" as const,
              id: "1",
            },
            {
              type: "metal",
              coverage_percentage: 20,
              condition: "good" as const,
              id: "2",
            },
          ],
          height_estimation: { stories: 20, feet: 240, confidence: 0.95 },
          covered_areas_detected: false,
          processing_time_ms: 1000,
        },
      ];

      const buildingInfo = {
        building_type: "commercial",
        building_address: "456 Tower St",
      };

      const result = await facadeAnalysisService.combineAnalysisResults(
        results,
        buildingInfo,
      );

      expect(result.glass_to_facade_ratio).toBe(80);
      expect(result.facade_complexity).toBe("complex"); // High glass ratio
    });
  });

  describe("generateServiceRecommendations", () => {
    it("should recommend window cleaning for glass areas", async () => {
      const analysis = {
        id: "test-id",
        estimate_id: "test-estimate",
        created_by: "test-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        building_type: "office" as const,
        total_facade_sqft: 10000,
        total_glass_sqft: 4000,
        net_facade_sqft: 6000,
        glass_to_facade_ratio: 40,
        confidence_level: 90,
        building_height_stories: 10,
        facade_complexity: "moderate" as const,
      };

      const result =
        await facadeAnalysisService.generateServiceRecommendations(analysis);

      const windowCleaning = result.recommended_services.find(
        (s) => s.service === "window_cleaning",
      );
      expect(windowCleaning).toBeDefined();
      expect(windowCleaning?.estimated_sqft).toBe(4000);
    });

    it("should recommend appropriate equipment based on height", async () => {
      const shortBuilding = {
        id: "test-id",
        estimate_id: "test-estimate",
        created_by: "test-user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        building_type: "office" as const,
        total_facade_sqft: 5000,
        total_glass_sqft: 2000,
        net_facade_sqft: 3000,
        glass_to_facade_ratio: 40,
        confidence_level: 90,
        building_height_stories: 3,
        facade_complexity: "simple" as const,
      };

      const result =
        await facadeAnalysisService.generateServiceRecommendations(
          shortBuilding,
        );

      const equipment = result.equipment_requirements.find(
        (e) => e.type === "26_scissor_lift",
      );
      expect(equipment).toBeDefined();
      expect(equipment?.reason).toContain("≤4 stories");
    });
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFacadeAnalysis } from "@/hooks/use-facade-analysis-enhanced";
import { facadeAnalysisService } from "@/lib/services/facade-analysis-service";

jest.mock("@/lib/services/facade-analysis-service");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useFacadeAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("should load existing analysis when estimateId is provided", async () => {
    const mockAnalysis = {
      id: "analysis-123",
      estimate_id: "estimate-123",
      total_facade_sqft: 10000,
      total_glass_sqft: 4000,
      confidence_level: 90,
    };

    (facadeAnalysisService.getByEstimateId as jest.Mock).mockResolvedValue(
      mockAnalysis,
    );

    const { result } = renderHook(
      () => useFacadeAnalysis({ estimateId: "estimate-123" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.analysis).toEqual(mockAnalysis);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should analyze multiple images and track progress", async () => {
    const images = [
      { url: "image1.jpg", type: "ground", view_angle: "front" },
      { url: "image2.jpg", type: "aerial", view_angle: "top" },
    ];

    const mockResult1 = {
      windows_detected: 25,
      facade_area: 5000,
      glass_area: 2000,
      materials_identified: [],
      height_estimation: { stories: 10, feet: 120, confidence: 0.9 },
      covered_areas_detected: false,
      processing_time_ms: 1000,
    };

    const mockResult2 = {
      windows_detected: 25,
      facade_area: 5000,
      glass_area: 2000,
      materials_identified: [],
      height_estimation: { stories: 10, feet: 120, confidence: 0.95 },
      covered_areas_detected: false,
      processing_time_ms: 1000,
    };

    const mockCombinedAnalysis = {
      total_facade_sqft: 10000,
      total_glass_sqft: 4000,
      confidence_level: 92,
      materials: [],
    };

    (facadeAnalysisService.analyzeImage as jest.Mock)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2);
    (
      facadeAnalysisService.combineAnalysisResults as jest.Mock
    ).mockResolvedValue(mockCombinedAnalysis);

    const { result } = renderHook(() => useFacadeAnalysis(), { wrapper });

    result.current.analyzeImages({
      images,
      building_info: { building_type: "commercial" },
    });

    // Check initial progress
    expect(result.current.progress).toBe(0);

    // Wait for analysis to complete
    await waitFor(() => {
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.results).toEqual(mockCombinedAnalysis);
    });

    // Verify both images were analyzed
    expect(facadeAnalysisService.analyzeImage).toHaveBeenCalledTimes(2);
    expect(facadeAnalysisService.combineAnalysisResults).toHaveBeenCalledWith(
      [mockResult1, mockResult2],
      { building_type: "commercial" },
    );
  });

  it("should calculate measurements from analysis data", async () => {
    const analysisData = {
      total_facade_sqft: 10000,
      total_glass_sqft: 4000,
    };

    const mockMeasurements = {
      measurements: {
        total_facade_sqft: 10000,
        total_glass_sqft: 4000,
        net_facade_sqft: 6000,
        glass_to_facade_ratio: 40,
      },
      validation: {
        passed: true,
        warnings: [],
        errors: [],
      },
    };

    (
      facadeAnalysisService.calculateMeasurements as jest.Mock
    ).mockResolvedValue(mockMeasurements);

    const { result } = renderHook(() => useFacadeAnalysis(), { wrapper });

    const measurements =
      await result.current.calculateMeasurements(analysisData);

    expect(measurements).toEqual(mockMeasurements);
    expect(facadeAnalysisService.calculateMeasurements).toHaveBeenCalledWith(
      analysisData,
    );
  });

  it("should generate service recommendations", async () => {
    const analysisData = {
      id: "analysis-123",
      total_facade_sqft: 10000,
      total_glass_sqft: 4000,
      building_height_stories: 5,
    };

    const mockRecommendations = {
      recommended_services: [
        {
          service: "window_cleaning",
          reason: "166 windows detected",
          estimated_sqft: 4000,
          confidence: 90,
        },
      ],
      equipment_requirements: [
        {
          type: "45_boom_lift",
          reason: "Building height 5-6 stories",
          duration_days: 3,
        },
      ],
    };

    (
      facadeAnalysisService.generateServiceRecommendations as jest.Mock
    ).mockResolvedValue(mockRecommendations);

    const { result } = renderHook(() => useFacadeAnalysis(), { wrapper });

    const recommendations =
      await result.current.generateRecommendations(analysisData);

    expect(recommendations).toEqual(mockRecommendations);
    expect(
      facadeAnalysisService.generateServiceRecommendations,
    ).toHaveBeenCalledWith(analysisData);
  });

  it("should handle analysis errors gracefully", async () => {
    const error = new Error("Analysis failed");
    (facadeAnalysisService.analyzeImage as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useFacadeAnalysis(), { wrapper });

    result.current.analyzeImages({
      images: [{ url: "image.jpg", type: "ground", view_angle: "front" }],
      building_info: {},
    });

    await waitFor(() => {
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.results).toBeUndefined();
    });
  });
});

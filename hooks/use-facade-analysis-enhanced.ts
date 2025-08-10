import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { useToast } from "@/components/ui/use-toast";

interface UseFacadeAnalysisOptions {
  estimateId?: string;
  autoLoad?: boolean;
}

export function useFacadeAnalysis(options: UseFacadeAnalysisOptions = {}) {
  const { estimateId, autoLoad = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  // Query for existing analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["facade-analysis", estimateId],
    queryFn: async () => {
      if (!estimateId) return null;
      return facadeAnalysisService.getByEstimateId(estimateId);
    },
    enabled: autoLoad && !!estimateId,
  });

  // Mutation for analyzing images
  const analyzeMutation = useMutation({
    mutationFn: async (data: {
      images: Array<{ url: string; type: string; view_angle: string }>;
      building_info: any;
    }) => {
      setProgress(0);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      try {
        // Analyze each image
        const results = await Promise.all(
          data.images.map((img) =>
            facadeAnalysisService.analyzeImage(
              img.url,
              img.type,
              img.view_angle,
            ),
          ),
        );

        // Combine results
        const combinedAnalysis =
          await facadeAnalysisService.combineAnalysisResults(
            results,
            data.building_info,
          );

        clearInterval(progressInterval);
        setProgress(100);

        return combinedAnalysis;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facade-analysis"] });
      toast({
        title: "Analysis complete",
        description: `Confidence level: ${data.confidence_level}%`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Calculate measurements
  const calculateMeasurements = useCallback(async (analysisData: any) => {
    return facadeAnalysisService.calculateMeasurements(analysisData);
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback(async (analysisData: any) => {
    return facadeAnalysisService.generateServiceRecommendations(analysisData);
  }, []);

  return {
    analysis,
    isLoading,
    isAnalyzing: analyzeMutation.isPending,
    progress,
    analyzeImages: analyzeMutation.mutate,
    calculateMeasurements,
    generateRecommendations,
    results: analyzeMutation.data,
  };
}

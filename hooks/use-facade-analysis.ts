import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FacadeAnalysis,
  FacadeAnalysisImage,
  CreateFacadeAnalysisInput,
  UpdateFacadeAnalysisInput,
} from "@/lib/types/facade-analysis-types";
import { facadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { useToast } from "@/hooks/use-toast";

interface FacadeAnalysisWithImages {
  analysis: FacadeAnalysis;
  images: FacadeAnalysisImage[];
  measurements?: {
    totalFacadeSqft: number;
    totalGlassSqft: number;
    avgConfidence: number;
    materialBreakdown: Record<string, number>;
  };
}

interface UseFacadeAnalysisOptions {
  estimateId?: string;
  autoLoad?: boolean;
}

export function useFacadeAnalysis(analysisId?: string) {
  const queryClient = useQueryClient();

  // Fetch facade analysis with images
  const { data, isLoading, error } = useQuery<FacadeAnalysisWithImages>({
    queryKey: ["facade-analysis", analysisId],
    queryFn: async () => {
      if (!analysisId) throw new Error("No analysis ID provided");

      const response = await fetch(`/api/facade-analysis/${analysisId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch facade analysis");
      }
      return response.json();
    },
    enabled: !!analysisId,
  });

  // Create facade analysis
  const createAnalysis = useMutation({
    mutationFn: async (input: CreateFacadeAnalysisInput) => {
      const response = await fetch("/api/facade-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create analysis");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facade-analyses"] });
    },
  });

  // Update facade analysis
  const updateAnalysis = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFacadeAnalysisInput;
    }) => {
      const response = await fetch(`/api/facade-analysis/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update analysis");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["facade-analysis", variables.id],
      });
    },
  });

  // Delete facade analysis
  const deleteAnalysis = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/facade-analysis/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete analysis");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facade-analyses"] });
    },
  });

  // Run AI analysis
  const runAIAnalysis = useMutation({
    mutationFn: async ({
      id,
      additionalContext,
      analysisFocus,
    }: {
      id: string;
      additionalContext?: string;
      analysisFocus?: string[];
    }) => {
      const response = await fetch(`/api/facade-analysis/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additional_context: additionalContext,
          analysis_focus: analysisFocus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to run AI analysis");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["facade-analysis", variables.id],
      });
      toast({
        title: "AI Analysis Complete",
        description: "Facade measurements and materials have been analyzed",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description:
          error instanceof Error ? error.message : "Failed to analyze facade",
        variant: "destructive",
      });
    },
  });

  // Upload image
  const uploadImage = useMutation({
    mutationFn: async ({
      analysisId,
      file,
      imageUrl,
      imageType,
      viewAngle,
    }: {
      analysisId: string;
      file?: File;
      imageUrl?: string;
      imageType: string;
      viewAngle: string;
    }) => {
      const formData = new FormData();
      if (file) {
        formData.append("image", file);
      } else if (imageUrl) {
        formData.append("imageUrl", imageUrl);
      }
      formData.append("imageType", imageType);
      formData.append("viewAngle", viewAngle);

      const response = await fetch(
        `/api/facade-analysis/${analysisId}/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["facade-analysis", variables.analysisId],
      });
      toast({
        title: "Image Uploaded",
        description: "The image has been added to the analysis",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  return {
    analysis: data?.analysis,
    images: data?.images || [],
    measurements: data?.measurements,
    isLoading,
    error,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    runAIAnalysis,
    uploadImage,
  };
}

export function useFacadeAnalysesByEstimate(estimateId?: string) {
  const { data, isLoading, error } = useQuery<FacadeAnalysisWithImages>({
    queryKey: ["facade-analysis-by-estimate", estimateId],
    queryFn: async () => {
      if (!estimateId) throw new Error("No estimate ID provided");

      const response = await fetch(
        `/api/facade-analysis?estimate_id=${estimateId}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch facade analysis");
      }

      return response.json();
    },
    enabled: !!estimateId,
  });

  return {
    analysis: data?.analysis,
    images: data?.images || [],
    isLoading,
    error,
    hasAnalysis: !!data?.analysis,
  };
}

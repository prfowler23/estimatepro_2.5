"use client";

import { useState } from "react";
import { FacadeAnalysis } from "@/lib/types/facade-analysis-types";

interface AnalyzeImagesInput {
  building_address: string;
  building_type: string;
  images: Array<{
    url: string;
    type: string;
    view_angle: string;
  }>;
  has_covered_areas?: boolean;
  is_historic?: boolean;
}

export function useFacadeAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Partial<FacadeAnalysis> | null>(null);

  const analyzeImages = async (
    input: AnalyzeImagesInput,
  ): Promise<Partial<FacadeAnalysis>> => {
    setIsAnalyzing(true);
    setProgress(0);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate progress updates
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Call the facade analysis API for each image
      const analysisPromises = input.images.map(async (image) => {
        const response = await fetch("/api/ai/facade-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: image.url,
            imageType: image.type,
            viewAngle: image.view_angle,
            existingAnalysis: {
              building_type: input.building_type,
              building_address: input.building_address,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to analyze image");
        }

        return response.json();
      });

      const imageAnalyses = await Promise.all(analysisPromises);

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(100);

      // Combine results from all images
      const combinedResults: Partial<FacadeAnalysis> = {
        building_address: input.building_address,
        building_type: input.building_type as any,
        has_covered_areas: input.has_covered_areas || false,
        is_historic_building: input.is_historic || false,

        // Aggregate measurements from all analyses
        total_facade_sqft: imageAnalyses.reduce(
          (sum, analysis) =>
            sum + (analysis.result?.material_analysis?.total_facade_sqft || 0),
          0,
        ),
        total_glass_sqft: imageAnalyses.reduce(
          (sum, analysis) =>
            sum + (analysis.result?.window_analysis?.total_glass_sqft || 0),
          0,
        ),
        building_height_feet: Math.max(
          ...imageAnalyses.map(
            (a) => a.result?.height_analysis?.estimated_height_feet || 0,
          ),
        ),
        building_height_stories: Math.max(
          ...imageAnalyses.map(
            (a) => a.result?.height_analysis?.stories_count || 0,
          ),
        ),

        // Combine materials from all analyses
        materials: imageAnalyses.flatMap((analysis) =>
          (analysis.result?.material_analysis?.materials || []).map(
            (mat: any) => ({
              type: mat.type,
              percentage: mat.percentage,
              sqft: mat.sqft,
              location: mat.location,
              confidence: mat.confidence,
            }),
          ),
        ),

        // Calculate derived values
        confidence_level: Math.round(
          imageAnalyses.reduce(
            (sum, a) =>
              sum + (a.result?.quality_factors?.overall_confidence || 0),
            0,
          ) / imageAnalyses.length,
        ),

        // Collect validation warnings
        validation_warnings: imageAnalyses.flatMap(
          (a) => a.result?.quality_factors?.verification_reasons || [],
        ),

        // Mock service recommendations
        recommended_services: [
          {
            service: "Window Cleaning",
            reason: "Regular maintenance for glass surfaces",
            estimated_sqft: imageAnalyses.reduce(
              (sum, analysis) =>
                sum + (analysis.result?.window_analysis?.total_glass_sqft || 0),
              0,
            ),
            confidence: 95,
          },
          {
            service: "Pressure Washing",
            reason: "Facade cleaning for non-glass surfaces",
            estimated_sqft: imageAnalyses.reduce(
              (sum, analysis) =>
                sum +
                ((analysis.result?.material_analysis?.total_facade_sqft || 0) -
                  (analysis.result?.window_analysis?.total_glass_sqft || 0)),
              0,
            ),
            confidence: 90,
          },
        ],

        executive_summary: `Building analysis complete. Analyzed ${input.images.length} images with an average confidence of ${Math.round(
          imageAnalyses.reduce(
            (sum, a) =>
              sum + (a.result?.quality_factors?.overall_confidence || 0),
            0,
          ) / imageAnalyses.length,
        )}%. The building has approximately ${Math.round(
          imageAnalyses.reduce(
            (sum, analysis) =>
              sum +
              (analysis.result?.material_analysis?.total_facade_sqft || 0),
            0,
          ),
        ).toLocaleString()} sq ft of facade area.`,
      };

      // Calculate derived fields
      combinedResults.net_facade_sqft =
        (combinedResults.total_facade_sqft || 0) -
        (combinedResults.total_glass_sqft || 0);
      combinedResults.glass_to_facade_ratio = combinedResults.total_facade_sqft
        ? ((combinedResults.total_glass_sqft || 0) /
            combinedResults.total_facade_sqft) *
          100
        : 0;

      setResults(combinedResults);
      return combinedResults;
    } catch (error) {
      // Clean up interval on error
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(0);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeImages,
    isAnalyzing,
    progress,
    results,
  };
}

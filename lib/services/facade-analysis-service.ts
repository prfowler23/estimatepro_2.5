import { createClient } from "@/lib/supabase/universal-client";
import {
  FacadeAnalysis,
  FacadeAnalysisImage,
  AIAnalysisResult,
} from "@/lib/types/facade-analysis-types";
import { AIService } from "./ai-service";
import { aiCache } from "@/lib/ai/ai-cache";

export class FacadeAnalysisService {
  // Simplified analyze method for AI tool integration
  async analyzeImageSimple(
    imageUrl: string,
    analysisType: "facade" | "general" | "measurement" = "facade",
    userId?: string,
  ): Promise<any> {
    try {
      // Map analysis types to appropriate methods
      if (analysisType === "facade") {
        const result = await AIService.analyzeFacadeComprehensive(
          imageUrl,
          "commercial",
        );
        return {
          success: true,
          type: "facade",
          ...result,
        };
      } else if (analysisType === "general" || analysisType === "measurement") {
        const result = await AIService.analyzeBuilding({
          imageUrl,
          analysisType:
            analysisType === "measurement" ? "measurement" : "building",
        });
        return {
          success: true,
          type: analysisType,
          ...result,
        };
      }
    } catch (error) {
      throw new Error(
        `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async createAnalysis(
    estimateId: string,
    userId: string,
  ): Promise<FacadeAnalysis> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("facade_analyses")
      .insert({
        estimate_id: estimateId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAnalysis(
    id: string,
    updates: Partial<FacadeAnalysis>,
    userId: string,
  ): Promise<FacadeAnalysis> {
    const supabase = createClient();

    // Check if analysis exists and user has access
    const { data: existing, error: existingError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (existingError || !existing) {
      throw new Error("Facade analysis not found or access denied");
    }

    // Update the analysis
    const { data, error } = await supabase
      .from("facade_analyses")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAnalysis(id: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Check if analysis exists and user has access
    const { data: existing, error: existingError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (existingError || !existing) {
      throw new Error("Facade analysis not found or access denied");
    }

    // Delete the analysis (cascade will handle images)
    const { error } = await supabase
      .from("facade_analyses")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async getImages(
    analysisId: string,
    userId: string,
  ): Promise<FacadeAnalysisImage[]> {
    const supabase = createClient();

    // Check if analysis exists and user has access
    const { data: analysis, error: analysisError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", analysisId)
      .eq("created_by", userId)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Facade analysis not found or access denied");
    }

    // Get images
    const { data, error } = await supabase
      .from("facade_analysis_images")
      .select("*")
      .eq("facade_analysis_id", analysisId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async analyzeImage(
    imageUrl: string,
    imageType: "aerial" | "ground" | "drone" | "satellite",
    viewAngle: string,
  ): Promise<AIAnalysisResult> {
    // Check cache first
    const cacheKey = `facade-analysis:${imageUrl}`;
    const cached = await aiCache.get(cacheKey);
    if (cached) return cached as AIAnalysisResult;

    // Use AI service for analysis
    const result = await AIService.analyzeFacadeComprehensive(
      imageUrl,
      imageType === "ground" ? "commercial" : "aerial",
    );

    // Transform result to AIAnalysisResult format
    const aiAnalysisResult: AIAnalysisResult = {
      windows_detected: result.windowCount || 0,
      facade_area: result.facadeArea || 0,
      glass_area: result.glassArea || 0,
      materials_identified: result.materials || [],
      height_estimation: {
        stories: result.buildingStories || 0,
        feet: result.buildingHeight || 0,
        confidence: result.confidence || 0.8,
      },
      covered_areas_detected: result.hasCoveredAreas || false,
      processing_time_ms: result.processingTime || 1000,
    };

    // Cache the result
    await aiCache.set(cacheKey, aiAnalysisResult, 3600); // 1 hour cache

    return aiAnalysisResult;
  }

  async calculateMeasurements(analysis: Partial<FacadeAnalysis>): Promise<{
    measurements: {
      total_facade_sqft: number;
      total_glass_sqft: number;
      net_facade_sqft: number;
      glass_to_facade_ratio: number;
    };
    validation: {
      passed: boolean;
      warnings: string[];
      errors: string[];
    };
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Calculate measurements
    const total_facade_sqft = analysis.total_facade_sqft || 0;
    const total_glass_sqft = analysis.total_glass_sqft || 0;
    const net_facade_sqft = total_facade_sqft - total_glass_sqft;
    const glass_to_facade_ratio =
      total_facade_sqft > 0 ? (total_glass_sqft / total_facade_sqft) * 100 : 0;

    // Validation
    if (glass_to_facade_ratio > 90) {
      errors.push(
        "Glass area exceeds 90% of facade - requires manual verification",
      );
    } else if (glass_to_facade_ratio > 80) {
      warnings.push(
        "High glass percentage detected - verify curtain wall system",
      );
    }

    if (glass_to_facade_ratio < 10 && analysis.building_type !== "industrial") {
      warnings.push("Low glass percentage - verify window detection accuracy");
    }

    // Height validation
    if (analysis.building_height_stories && analysis.building_height_feet) {
      const expectedHeight = analysis.building_height_stories * 12;
      const actualHeight = analysis.building_height_feet;
      const variance = Math.abs(expectedHeight - actualHeight) / expectedHeight;

      if (variance > 0.25) {
        warnings.push(
          `Height mismatch: ${analysis.building_height_stories} stories typically = ${expectedHeight}±${expectedHeight * 0.1} feet`,
        );
      }
    }

    return {
      measurements: {
        total_facade_sqft,
        total_glass_sqft,
        net_facade_sqft,
        glass_to_facade_ratio,
      },
      validation: {
        passed: errors.length === 0,
        warnings,
        errors,
      },
    };
  }

  async generateServiceRecommendations(analysis: FacadeAnalysis): Promise<{
    recommended_services: Array<{
      service: string;
      reason: string;
      estimated_sqft: number;
      confidence: number;
    }>;
    equipment_requirements: Array<{
      type: string;
      reason: string;
      duration_days: number;
    }>;
  }> {
    const recommendations = [];
    const equipment = [];

    // Window cleaning recommendation
    if (analysis.total_glass_sqft > 0) {
      recommendations.push({
        service: "window_cleaning",
        reason: `${Math.round(analysis.total_glass_sqft / 24)} windows detected`,
        estimated_sqft: analysis.total_glass_sqft,
        confidence: analysis.confidence_level,
      });
    }

    // Pressure washing recommendation
    if (analysis.net_facade_sqft > 0) {
      const complexity =
        analysis.facade_complexity === "complex" ? "ornate" : "regular";
      recommendations.push({
        service: "pressure_wash_facade",
        reason: `${analysis.net_facade_sqft.toFixed(0)} sq ft of ${complexity} facade`,
        estimated_sqft: analysis.net_facade_sqft,
        confidence: analysis.confidence_level,
      });
    }

    // Equipment based on height
    if (analysis.building_height_stories <= 4) {
      equipment.push({
        type: "26_scissor_lift",
        reason: "Building height ≤4 stories",
        duration_days: Math.ceil(analysis.total_facade_sqft / 5000),
      });
    } else if (analysis.building_height_stories <= 6) {
      equipment.push({
        type: "45_boom_lift",
        reason: "Building height 5-6 stories",
        duration_days: Math.ceil(analysis.total_facade_sqft / 4000),
      });
    }

    return {
      recommended_services: recommendations,
      equipment_requirements: equipment,
    };
  }

  async getByEstimateId(estimateId: string): Promise<FacadeAnalysis | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("estimate_id", estimateId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  }

  async combineAnalysisResults(
    results: AIAnalysisResult[],
    buildingInfo: any,
  ): Promise<Partial<FacadeAnalysis>> {
    // Aggregate results from multiple images
    const combinedResult: Partial<FacadeAnalysis> = {
      building_type: buildingInfo.building_type,
      building_address: buildingInfo.building_address,
      building_height_stories: 0,
      building_height_feet: 0,
      total_facade_sqft: 0,
      total_glass_sqft: 0,
      confidence_level: 0,
      materials: [],
    };

    // Combine measurements
    let totalConfidence = 0;
    for (const result of results) {
      combinedResult.total_facade_sqft! += result.facade_area || 0;
      combinedResult.total_glass_sqft! += result.glass_area || 0;

      // Use maximum height from all analyses
      if (result.height_estimation) {
        combinedResult.building_height_stories = Math.max(
          combinedResult.building_height_stories!,
          result.height_estimation.stories,
        );
        combinedResult.building_height_feet = Math.max(
          combinedResult.building_height_feet!,
          result.height_estimation.feet,
        );
        totalConfidence += result.height_estimation.confidence;
      }

      // Merge materials
      if (result.materials_identified) {
        for (const material of result.materials_identified) {
          const existing = combinedResult.materials!.find(
            (m) => m.type === material.type,
          );
          if (existing) {
            existing.coverage_percentage =
              (existing.coverage_percentage + material.coverage_percentage) / 2;
          } else {
            combinedResult.materials!.push(material);
          }
        }
      }
    }

    // Calculate average confidence
    combinedResult.confidence_level = Math.round(
      (totalConfidence / results.length) * 100,
    );

    // Calculate derived measurements
    combinedResult.net_facade_sqft =
      combinedResult.total_facade_sqft! - combinedResult.total_glass_sqft!;
    combinedResult.glass_to_facade_ratio =
      combinedResult.total_facade_sqft! > 0
        ? (combinedResult.total_glass_sqft! /
            combinedResult.total_facade_sqft!) *
          100
        : 0;

    // Determine complexity based on materials and geometry
    const materialCount = combinedResult.materials!.length;
    if (materialCount > 4 || combinedResult.glass_to_facade_ratio! > 70) {
      combinedResult.facade_complexity = "complex";
    } else if (materialCount > 2) {
      combinedResult.facade_complexity = "moderate";
    } else {
      combinedResult.facade_complexity = "simple";
    }

    return combinedResult;
  }
}

export const facadeAnalysisService = new FacadeAnalysisService();

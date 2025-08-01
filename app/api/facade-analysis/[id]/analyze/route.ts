import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { facadeAnalysisAIRequestSchema } from "@/lib/schemas/facade-analysis-schema";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import OpenAI from "openai";
import { aiResponseCache } from "@/lib/ai/ai-response-cache";
import { validateAIRequest } from "@/lib/ai/ai-security";
import { FacadeAnalysisAIResponse } from "@/lib/types/facade-analysis-types";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// POST /api/facade-analysis/[id]/analyze - Run AI analysis on facade images
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new FacadeAnalysisService();

    // Check if analysis exists and user has access
    const { data: analysis, error: analysisError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    // Get all images for the analysis
    const { data: images, error: imagesError } = await supabase
      .from("facade_analysis_images")
      .select("*")
      .eq("facade_analysis_id", id);

    if (imagesError || !images || images.length === 0) {
      return NextResponse.json(
        { error: "No images found for analysis" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Prepare AI request
    const aiRequest = {
      images: images.map((img) => ({
        url: img.image_url,
        type: img.image_type,
        view_angle: img.view_angle,
      })),
      building_type: body.building_type || analysis.building_type,
      additional_context: body.additional_context,
      analysis_focus: body.analysis_focus || [
        "measurements",
        "materials",
        "condition",
      ],
    };

    // Validate AI request
    const validatedRequest = facadeAnalysisAIRequestSchema.parse(aiRequest);

    // Security validation
    try {
      await validateAIRequest(validatedRequest);
    } catch (error) {
      return NextResponse.json(
        { error: "Security validation failed" },
        { status: 400 },
      );
    }

    // Check cache
    const cacheKey = `facade-analysis-${id}-${JSON.stringify(validatedRequest)}`;
    const cachedResponse = await aiResponseCache.get<FacadeAnalysisAIResponse>(
      "facade_analysis",
      cacheKey,
    );
    if (cachedResponse) {
      logger.info("Using cached AI response for facade analysis");
      return NextResponse.json(cachedResponse);
    }

    // Prepare system prompt
    const systemPrompt = `You are an expert building facade analyst specializing in commercial building assessment. Analyze the provided images to extract detailed measurements, material composition, and condition assessment.

Your analysis should include:
1. Accurate square footage calculations for facade and glass areas
2. Material identification with coverage percentages
3. Complexity assessment (simple/moderate/complex)
4. Ground surface measurements where visible
5. Condition assessment and maintenance recommendations

Provide measurements in square feet and percentages as decimal numbers.`;

    // Prepare user prompt
    const userPrompt = `Analyze these ${images.length} building facade images.
Building type: ${validatedRequest.building_type || "commercial"}
${validatedRequest.additional_context ? `Additional context: ${validatedRequest.additional_context}` : ""}

Focus areas: ${validatedRequest.analysis_focus?.join(", ")}

Provide detailed analysis including:
- Total facade square footage
- Total glass square footage
- Glass-to-facade ratio
- Material breakdown with percentages
- Facade complexity rating
- Ground surfaces (sidewalk, parking, loading areas) if visible
- Key recommendations`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            ...validatedRequest.images.map((img) => ({
              type: "image_url" as const,
              image_url: { url: img.url },
            })),
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const aiAnalysis = JSON.parse(
      completion.choices[0].message.content || "{}",
    );

    // Process AI response into our format
    const analysisResponse: FacadeAnalysisAIResponse = {
      success: true,
      analysis: {
        measurements: {
          total_facade_sqft: aiAnalysis.total_facade_sqft || 0,
          total_glass_sqft: aiAnalysis.total_glass_sqft || 0,
          glass_to_facade_ratio: aiAnalysis.glass_to_facade_ratio || 0,
          confidence: aiAnalysis.measurement_confidence || 85,
        },
        materials: aiAnalysis.materials || [],
        complexity: aiAnalysis.complexity || "moderate",
        ground_surfaces: aiAnalysis.ground_surfaces || {},
        recommendations: aiAnalysis.recommendations || [],
        confidence_level: aiAnalysis.overall_confidence || 85,
      },
    };

    // Update facade analysis with AI results
    const { error: updateError } = await supabase
      .from("facade_analyses")
      .update({
        total_facade_sqft:
          analysisResponse.analysis.measurements.total_facade_sqft,
        total_glass_sqft:
          analysisResponse.analysis.measurements.total_glass_sqft,
        glass_to_facade_ratio:
          analysisResponse.analysis.measurements.glass_to_facade_ratio,
        materials: analysisResponse.analysis.materials,
        facade_complexity: analysisResponse.analysis.complexity,
        sidewalk_sqft:
          analysisResponse.analysis.ground_surfaces?.sidewalk_sqft || 0,
        parking_sqft:
          analysisResponse.analysis.ground_surfaces?.parking_sqft || 0,
        loading_dock_sqft:
          analysisResponse.analysis.ground_surfaces?.loading_dock_sqft || 0,
        confidence_level: analysisResponse.analysis.confidence_level,
        ai_model_version: "gpt-4-vision-v8.0",
        requires_field_verification:
          analysisResponse.analysis.confidence_level < 80,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      logger.error("Failed to update facade analysis:", updateError);
    }

    // Update each image with AI results
    for (const image of images) {
      const { error: imageUpdateError } = await supabase
        .from("facade_analysis_images")
        .update({
          ai_analysis_results: {
            detected_features: aiAnalysis.detected_features || [],
            material_analysis: aiAnalysis.material_details || {},
            detected_elements: aiAnalysis.detected_elements || [],
            confidence: {
              overall: analysisResponse.analysis.confidence_level,
              materials: aiAnalysis.material_confidence || 85,
              measurements: aiAnalysis.measurement_confidence || 85,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", image.id);

      if (imageUpdateError) {
        logger.error("Failed to update image analysis:", imageUpdateError);
      }
    }

    // Cache the response
    await aiResponseCache.set(
      "facade_analysis",
      cacheKey,
      analysisResponse,
      3600,
    ); // 1 hour cache

    return NextResponse.json(analysisResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error in POST /api/facade-analysis/[id]/analyze:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to analyze facade",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

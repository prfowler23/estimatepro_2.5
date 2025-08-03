import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth/server";
import { z } from "zod";
import { FACADE_ANALYSIS_PROMPTS } from "@/lib/ai/prompts/facade-analysis-prompts";
import { validateAIInput, sanitizeAIResponse } from "@/lib/ai/ai-security";
import { aiResponseCache } from "@/lib/ai/ai-response-cache";
import { openai } from "@/lib/ai/openai";
import { getAIConfig } from "@/lib/ai/ai-config";
import { withRateLimit, trackAIUsage } from "@/lib/ai/rate-limiter";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";

const requestSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.enum(["aerial", "ground", "drone", "satellite"]),
  viewAngle: z.enum(["front", "rear", "left", "right", "oblique", "top"]),
  existingAnalysis: z
    .object({
      building_type: z.string().optional(),
      building_address: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  let session: any = null;

  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const authResult = await supabase.auth.getSession();
    session = authResult.data.session;

    if (!session) {
      return ErrorResponses.unauthorized();
    }

    // Check rate limit
    const rateLimitResult = await withRateLimit(
      "ai.facade-analysis",
      request,
      session.user.id,
    );

    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded(
        rateLimitResult.headers?.["Retry-After"]
          ? parseInt(rateLimitResult.headers["Retry-After"])
          : undefined,
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Validate AI input
    const validation = await validateAIInput(validatedData);
    if (!validation.isValid) {
      return ErrorResponses.badRequest("Invalid input", validation.error);
    }

    // Check cache
    const cacheKey = `facade:${validatedData.imageUrl}:${validatedData.imageType}:${validatedData.viewAngle}`;
    const cached = await aiResponseCache.getCachedPhotoAnalysis(
      validatedData.imageUrl,
      `facade-${validatedData.imageType}-${validatedData.viewAngle}`,
    );
    if (cached) {
      return NextResponse.json({
        result: cached,
        cached: true,
      });
    }

    // Call OpenAI Vision API
    // Get AI configuration
    const aiConfigManager = getAIConfig();
    const config = aiConfigManager.getAIConfig();

    const response = await openai.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert building estimator with 20+ years of experience in facade analysis and measurement extraction.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: FACADE_ANALYSIS_PROMPTS.analyzeBuilding(
                validatedData.imageType,
                validatedData.viewAngle,
              ),
            },
            {
              type: "image_url",
              image_url: {
                url: validatedData.imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    });

    // Parse and validate response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from AI");
    }

    // Sanitize response
    const sanitized = await sanitizeAIResponse(result);

    // Cache the result
    await aiResponseCache.cachePhotoAnalysis(
      validatedData.imageUrl,
      `facade-${validatedData.imageType}-${validatedData.viewAngle}`,
      {
        buildingType: validatedData.existingAnalysis?.building_type,
        materials: sanitized.material_analysis?.materials || [],
        dimensions: {
          height: sanitized.height_analysis?.estimated_height_feet || 0,
          width: sanitized.material_analysis?.total_facade_sqft || 0,
        },
        condition: sanitized.material_analysis?.facade_complexity || "unknown",
        recommendations: [],
        confidence: sanitized.quality_factors?.overall_confidence || 0,
        analysisType: `facade-${validatedData.imageType}`,
      },
    );

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: session.user.id,
      event_type: "facade_analysis",
      event_data: {
        image_type: validatedData.imageType,
        view_angle: validatedData.viewAngle,
        confidence: sanitized.quality_factors?.overall_confidence,
        processing_time_ms: 0, // Would need to track start time separately
      },
    });

    // Track AI usage
    const estimatedTokens = 1500; // Vision models use ~1.5k tokens per image analysis
    await trackAIUsage(
      session.user.id,
      "ai.facade-analysis",
      config.visionModel,
      estimatedTokens,
      true,
    );

    return NextResponse.json(
      {
        result: sanitized,
        cached: false,
      },
      {
        headers: rateLimitResult.headers,
      },
    );
  } catch (error) {
    console.error("Facade analysis error:", error);

    // Track failed usage - check session and user exist
    if (session?.user?.id) {
      await trackAIUsage(
        session.user.id,
        "ai.facade-analysis",
        "gpt-4-vision-preview",
        0,
        false,
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (error instanceof z.ZodError) {
      return ErrorResponses.validationError(error);
    }

    logApiError(error, {
      endpoint: "/api/ai/facade-analysis",
      method: "POST",
      userId: session?.user?.id,
    });

    return ErrorResponses.aiServiceError(
      "Failed to analyze image",
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}

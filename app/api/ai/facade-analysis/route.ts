import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { z } from "zod";
import { FACADE_ANALYSIS_PROMPTS } from "@/lib/ai/prompts/facade-analysis-prompts";
import { validateAIInput, sanitizeAIResponse } from "@/lib/ai/ai-security";
import { aiResponseCache } from "@/lib/ai/ai-response-cache";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Validate AI input
    const validation = await validateAIInput(validatedData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.errors,
        },
        { status: 400 },
      );
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
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
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
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent measurements
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

    return NextResponse.json({
      result: sanitized,
      cached: false,
    });
  } catch (error) {
    console.error("Facade analysis error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

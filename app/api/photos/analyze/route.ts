import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { photoService } from "@/lib/services/photo-service";
import { z } from "zod";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";

// Validation schema for analysis request
const analyzeSchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(1).max(20),
  analysis_types: z
    .array(
      z.enum([
        "comprehensive",
        "material_quantities",
        "item_counts",
        "3d_reconstruction",
        "before_after_comparison",
      ]),
    )
    .default(["comprehensive"]),
  stream_progress: z.boolean().default(false),
});

const compareSchema = z.object({
  before_photo_id: z.string().uuid(),
  after_photo_id: z.string().uuid(),
});

const analyze3DSchema = z.object({
  photo_ids: z.array(z.string().uuid()).min(2).max(10),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || undefined);
    }

    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded();
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return ErrorResponses.badRequest("Action is required");
    }

    let result;

    switch (action) {
      case "analyze":
        const { photo_ids, analysis_types, stream_progress } =
          analyzeSchema.parse(body);

        if (stream_progress) {
          // For streaming responses, we'll use Server-Sent Events
          // For now, return regular response but could be enhanced
          result = await photoService.analyzePhotos(
            photo_ids,
            analysis_types,
            (progress) => {
              console.log("Analysis progress:", progress);
              // In a real implementation, you'd stream this to the client
            },
          );
        } else {
          result = await photoService.analyzePhotos(photo_ids, analysis_types);
        }
        break;

      case "compare_before_after":
        const { before_photo_id, after_photo_id } = compareSchema.parse(body);
        result = await photoService.compareBeforeAfter(
          before_photo_id,
          after_photo_id,
        );
        break;

      case "3d_analysis":
        const { photo_ids: photoIds3D } = analyze3DSchema.parse(body);
        result = await photoService.batchAnalyze3D(photoIds3D);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      processedAt: new Date().toISOString(),
      count: Array.isArray(result) ? result.length : 1,
    });
  } catch (error) {
    console.error("Photo analysis error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Photo not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (
        error.message.includes("At least") &&
        error.message.includes("required")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message.includes("OpenAI") || error.message.includes("AI")) {
        return NextResponse.json(
          {
            error:
              "AI analysis service is currently unavailable. Please try again later.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to analyze photos" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photo_id");

    if (!photoId) {
      return NextResponse.json(
        { error: "photo_id is required" },
        { status: 400 },
      );
    }

    // Get analysis results for photo
    const analysisResults = await photoService.getPhotoAnalysis(photoId);

    return NextResponse.json({
      success: true,
      photo_id: photoId,
      analysis_results: analysisResults,
      count: analysisResults.length,
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis results" },
      { status: 500 },
    );
  }
}

// Provide API documentation
export async function OPTIONS() {
  return NextResponse.json({
    message: "Photo Analysis API",
    methods: ["POST", "GET"],
    endpoints: {
      "POST /api/photos/analyze": {
        description: "Analyze uploaded photos with AI",
        actions: {
          analyze: {
            description: "Run comprehensive or specific analysis on photos",
            required_fields: ["photo_ids"],
            optional_fields: ["analysis_types", "stream_progress"],
            analysis_types: [
              "comprehensive",
              "material_quantities",
              "item_counts",
            ],
            max_photos: 20,
          },
          compare_before_after: {
            description: "Compare before and after photos",
            required_fields: ["before_photo_id", "after_photo_id"],
          },
          "3d_analysis": {
            description: "Perform 3D reconstruction analysis",
            required_fields: ["photo_ids"],
            min_photos: 2,
            max_photos: 10,
          },
        },
      },
      "GET /api/photos/analyze": {
        description: "Get analysis results for a photo",
        required_params: ["photo_id"],
      },
    },
    rate_limits: {
      analyze: "10 requests per minute per user",
      get_results: "60 requests per minute per user",
    },
    supported_formats: ["JPEG", "PNG", "WebP", "HEIC"],
    max_file_size: "50MB",
    features: [
      "Window detection and counting",
      "Material classification and analysis",
      "Building measurements and dimensions",
      "Damage assessment and condition analysis",
      "Safety hazard identification",
      "Quantity estimation for cleaning services",
      "3D building reconstruction from multiple angles",
      "Before/after comparison analysis",
      "Progress tracking for batch processing",
    ],
  });
}

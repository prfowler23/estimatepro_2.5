import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import {
  estimateMaterialQuantities,
  countDetailedItems,
  analyze3DReconstruction,
  compareBeforeAfter,
} from "../../../../lib/ai/photo-analysis";

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 },
      );
    }

    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { action, imageUrl, imageUrls, beforeImageUrl, afterImageUrl } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action type is required" },
        { status: 400 },
      );
    }

    let result;

    switch (action) {
      case "estimate_quantities":
        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL is required for quantity estimation" },
            { status: 400 },
          );
        }
        result = await estimateMaterialQuantities(imageUrl);
        break;

      case "count_items":
        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL is required for item counting" },
            { status: 400 },
          );
        }
        result = await countDetailedItems(imageUrl);
        break;

      case "3d_reconstruction":
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length < 2) {
          return NextResponse.json(
            {
              error: "At least 2 image URLs are required for 3D reconstruction",
            },
            { status: 400 },
          );
        }
        result = await analyze3DReconstruction(imageUrls);
        break;

      case "before_after_comparison":
        if (!beforeImageUrl || !afterImageUrl) {
          return NextResponse.json(
            { error: "Both before and after image URLs are required" },
            { status: 400 },
          );
        }
        result = await compareBeforeAfter(beforeImageUrl, afterImageUrl);
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
    });
  } catch (error) {
    console.error("Enhanced photo analysis error:", error);
    return NextResponse.json(
      { error: "Failed to process enhanced photo analysis request" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Enhanced photo analysis endpoint",
    methods: ["POST"],
    supported_actions: {
      estimate_quantities: {
        description: "Estimate material quantities and cleaning requirements",
        required_fields: ["imageUrl"],
        output: "Material breakdown with areas, cleaning hours, and complexity",
      },
      count_items: {
        description:
          "Count detailed building elements (windows, doors, fixtures)",
        required_fields: ["imageUrl"],
        output: "Detailed count of all visible building elements",
      },
      "3d_reconstruction": {
        description: "Analyze multiple images for 3D building understanding",
        required_fields: ["imageUrls (minimum 2)"],
        output: "3D dimensions, surface areas, and accessibility analysis",
      },
      before_after_comparison: {
        description: "Compare before and after images for quality assessment",
        required_fields: ["beforeImageUrl", "afterImageUrl"],
        output: "Quality assessment, improvement scoring, and recommendations",
      },
    },
    use_cases: [
      "Accurate material quantity estimation for pricing",
      "Detailed element counting for comprehensive quotes",
      "3D building analysis for complex projects",
      "Quality control and progress tracking",
      "Before/after documentation for customers",
    ],
  });
}

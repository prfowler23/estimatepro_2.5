import { NextRequest, NextResponse } from "next/server";
import { aiService } from "../../../../lib/services/ai-service";
import { securityScanner } from "../../../../lib/ai/ai-security";

export async function POST(request: NextRequest) {
  let imageUrl: string = "";
  let buildingType: string = "commercial";

  try {
    const body = await request.json();
    ({ imageUrl, buildingType = "commercial" } = body);

    // Validate inputs
    const validation = securityScanner.validateUrl(imageUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || "Invalid image URL" },
        { status: 400 },
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 },
      );
    }

    // Perform comprehensive facade analysis
    const result = await aiService.analyzeFacadeComprehensive(
      imageUrl,
      buildingType,
    );

    return NextResponse.json({
      success: true,
      result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { apiError } = await import("../../../../lib/utils/logger");
    apiError(error instanceof Error ? error : new Error(String(error)), {
      action: "analyze-facade",
      imageUrl: typeof imageUrl !== "undefined" ? imageUrl : "unknown",
      buildingType:
        typeof buildingType !== "undefined" ? buildingType : "unknown",
    });
    return NextResponse.json(
      { error: "Failed to analyze facade" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Facade analysis endpoint",
    methods: ["POST"],
    description:
      "Comprehensive building facade analysis for cleaning estimation",
    required_fields: ["imageUrl"],
    optional_fields: ["buildingType"],
    supported_building_types: ["commercial", "residential", "industrial"],
    output: {
      windows: "Count, area, and cleaning requirements",
      materials: "Material breakdown and condition assessment",
      damage: "Staining, damage, and repair requirements",
      safety: "Safety hazards and equipment needs",
      measurements: "Building dimensions and square footage",
      recommendations: "Service recommendations and pricing factors",
    },
  });
}

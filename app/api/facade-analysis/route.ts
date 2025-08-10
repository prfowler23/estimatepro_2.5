import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { createFacadeAnalysisSchema } from "@/lib/schemas/facade-analysis-schema";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

// GET /api/facade-analysis - List facade analyses
// GET /api/facade-analysis?estimate_id=xyz - Get by estimate ID
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const estimateId = searchParams.get("estimate_id");

    const service = new FacadeAnalysisService();

    if (estimateId) {
      // Get facade analysis for specific estimate
      const analysis = await service.getByEstimateId(estimateId);

      if (!analysis) {
        return NextResponse.json(
          { error: "Facade analysis not found" },
          { status: 404 },
        );
      }

      // Get associated images
      const { data: images } = await supabase
        .from("facade_analysis_images")
        .select("*")
        .eq("facade_analysis_id", analysis.id);

      return NextResponse.json({
        analysis,
        images: images || [],
      });
    }

    // List all facade analyses for the user
    const { data, error } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching facade analyses:", error);
      return NextResponse.json(
        { error: "Failed to fetch analyses" },
        { status: 500 },
      );
    }

    return NextResponse.json({ analyses: data });
  } catch (error) {
    logger.error("Error in GET /api/facade-analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/facade-analysis - Create a new facade analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = createFacadeAnalysisSchema.parse(body);

    const service = new FacadeAnalysisService();
    const analysis = await service.createAnalysis(
      validatedData.estimate_id,
      user.id,
    );

    return NextResponse.json({ analysis }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error in POST /api/facade-analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

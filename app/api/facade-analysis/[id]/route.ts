import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { updateFacadeAnalysisSchema } from "@/lib/schemas/facade-analysis-schema";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/facade-analysis/[id] - Get a specific facade analysis
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new FacadeAnalysisService(supabase, user.id);
    const analysis = await service.getFacadeAnalysis(params.id);

    if (!analysis) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    // Get associated images
    const images = await service.getImages(analysis.id);

    // Get aggregated measurements
    const measurements = await service.calculateAggregatedMeasurements(
      analysis.id,
    );

    return NextResponse.json({
      analysis,
      images,
      measurements,
    });
  } catch (error) {
    logger.error("Error in GET /api/facade-analysis/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/facade-analysis/[id] - Update a facade analysis
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validatedData = updateFacadeAnalysisSchema.parse(body);

    const service = new FacadeAnalysisService(supabase, user.id);

    // Check if analysis exists and user has access
    const existing = await service.getFacadeAnalysis(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    const updatedAnalysis = await service.updateFacadeAnalysis(
      params.id,
      validatedData,
    );

    return NextResponse.json({ analysis: updatedAnalysis });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error in PATCH /api/facade-analysis/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/facade-analysis/[id] - Delete a facade analysis
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new FacadeAnalysisService(supabase, user.id);

    // Check if analysis exists and user has access
    const existing = await service.getFacadeAnalysis(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    await service.deleteFacadeAnalysis(params.id);

    return NextResponse.json({
      message: "Facade analysis deleted successfully",
    });
  } catch (error) {
    logger.error("Error in DELETE /api/facade-analysis/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

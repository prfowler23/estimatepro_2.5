import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { updateFacadeAnalysisSchema } from "@/lib/schemas/facade-analysis-schema";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/facade-analysis/[id] - Get a specific facade analysis
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get facade analysis by ID - check if it exists and get data
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

    // Get associated images using service
    const images = await service.getImages(id, user.id);

    // Calculate measurements
    const measurements = await service.calculateMeasurements(analysis);

    return NextResponse.json({
      analysis,
      images: images || [],
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
    const { id } = await params;
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

    const service = new FacadeAnalysisService();

    // Update the analysis using service
    const updatedAnalysis = await service.updateAnalysis(
      id,
      validatedData,
      user.id,
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
    const { id } = await params;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new FacadeAnalysisService();

    // Delete the analysis using service
    await service.deleteAnalysis(id, user.id);

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

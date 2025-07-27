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

    // Get facade analysis by ID
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

    // Get associated images
    const { data: images, error: imagesError } = await supabase
      .from("facade_analysis_images")
      .select("*")
      .eq("facade_analysis_id", id);

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

    // Check if analysis exists and user has access
    const { data: existing, error: existingError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    // Update the analysis
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("facade_analyses")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

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

    // Check if analysis exists and user has access
    const { data: existing, error: existingError } = await supabase
      .from("facade_analyses")
      .select("*")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    // Delete the analysis (cascade will handle images)
    const { error: deleteError } = await supabase
      .from("facade_analyses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

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

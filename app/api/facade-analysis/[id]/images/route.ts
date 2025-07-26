import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
  params: {
    id: string;
  };
}

const uploadImageSchema = z
  .object({
    image: z.instanceof(File).optional(),
    imageUrl: z.string().url().optional(),
    imageType: z.enum(["aerial", "ground", "drone", "satellite"]),
    viewAngle: z.enum(["front", "rear", "left", "right", "oblique", "top"]),
  })
  .refine((data) => data.image || data.imageUrl, {
    message: "Either image file or imageUrl must be provided",
  });

// GET /api/facade-analysis/[id]/images - Get all images for a facade analysis
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

    // Check if analysis exists and user has access
    const analysis = await service.getFacadeAnalysis(params.id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    const images = await service.getImages(params.id);

    return NextResponse.json({ images });
  } catch (error) {
    logger.error("Error in GET /api/facade-analysis/[id]/images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/facade-analysis/[id]/images - Add image to facade analysis
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const analysis = await service.getFacadeAnalysis(params.id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Facade analysis not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;
    const imageType = formData.get("imageType") as string;
    const viewAngle = formData.get("viewAngle") as string;

    // Validate input
    const validatedData = uploadImageSchema.parse({
      image,
      imageUrl,
      imageType,
      viewAngle,
    });

    let finalImageUrl = validatedData.imageUrl;

    // If an image file was uploaded, upload it to Supabase Storage
    if (validatedData.image) {
      const fileExt = validatedData.image.name.split(".").pop();
      const fileName = `facade-analysis/${params.id}/${uuidv4()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("estimate-photos")
        .upload(fileName, validatedData.image);

      if (uploadError) {
        logger.error("Error uploading image:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("estimate-photos")
        .getPublicUrl(fileName);

      finalImageUrl = urlData.publicUrl;
    }

    if (!finalImageUrl) {
      return NextResponse.json(
        { error: "No image URL available" },
        { status: 400 },
      );
    }

    // Add image to facade analysis
    const facadeImage = await service.addImage(
      params.id,
      finalImageUrl,
      validatedData.imageType,
      validatedData.viewAngle,
    );

    return NextResponse.json({ image: facadeImage }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error in POST /api/facade-analysis/[id]/images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

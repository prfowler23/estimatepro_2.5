import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { photoService } from "@/lib/services/photo-service";
import { z } from "zod";

// Validation schema for upload request
const uploadSchema = z.object({
  estimate_id: z.string().uuid().optional(),
  compress: z.boolean().default(true),
  max_size_mb: z.number().min(1).max(50).default(10),
});

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

    // Parse form data
    const formData = await request.formData();

    // Extract options from form data
    const estimateId = (formData.get("estimate_id") as string) || undefined;
    const compress = formData.get("compress") === "true";
    const maxSizeMB = parseInt(formData.get("max_size_mb") as string) || 10;

    // Validate options
    const validatedOptions = uploadSchema.parse({
      estimate_id: estimateId,
      compress,
      max_size_mb: maxSizeMB,
    });

    // Extract files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("photo") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No photos provided" },
        { status: 400 },
      );
    }

    // Validate file count (max 20 photos per upload)
    if (files.length > 20) {
      return NextResponse.json(
        { error: "Too many files. Maximum 20 photos per upload." },
        { status: 400 },
      );
    }

    // Upload photos
    const uploadedPhotos = await photoService.uploadPhotos(files, user.id, {
      estimateId: validatedOptions.estimate_id,
      compress: validatedOptions.compress,
      maxSizeMB: validatedOptions.max_size_mb,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedPhotos.length} photos`,
      photos: uploadedPhotos,
      count: uploadedPhotos.length,
    });
  } catch (error) {
    console.error("Photo upload error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (
        error.message.includes("File too large") ||
        error.message.includes("Invalid file type")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (
        error.message.includes("Database") ||
        error.message.includes("Storage")
      ) {
        return NextResponse.json(
          { error: "Failed to save photos. Please try again." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to upload photos" },
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
    const estimateId = searchParams.get("estimate_id");

    if (!estimateId) {
      return NextResponse.json(
        { error: "estimate_id is required" },
        { status: 400 },
      );
    }

    // Get photos for estimate
    const photos = await photoService.getPhotosForEstimate(estimateId);

    return NextResponse.json({
      success: true,
      photos,
      count: photos.length,
    });
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Delete photo
    await photoService.deletePhoto(photoId);

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 },
    );
  }
}

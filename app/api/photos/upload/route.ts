import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { photoService } from "@/lib/services/photo-service";
import { z } from "zod";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";

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
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    // Apply rate limiting
    const rateLimitResult = await generalRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return ErrorResponses.rateLimitExceeded();
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
      return ErrorResponses.badRequest("No photos provided");
    }

    // Validate file count (max 20 photos per upload)
    if (files.length > 20) {
      return ErrorResponses.badRequest(
        "Too many files. Maximum 20 photos per upload.",
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
    // Handle specific error types
    if (error instanceof Error) {
      if (
        error.message.includes("File too large") ||
        error.message.includes("Invalid file type")
      ) {
        return ErrorResponses.badRequest(error.message);
      }

      if (
        error.message.includes("Database") ||
        error.message.includes("Storage")
      ) {
        logApiError(error, {
          endpoint: "/api/photos/upload",
          method: "POST",
          userId: user.id,
        });
        return ErrorResponses.databaseError("Save photos");
      }
    }

    logApiError(error, {
      endpoint: "/api/photos/upload",
      method: "POST",
      userId: user.id,
    });
    return ErrorResponses.internalError("Failed to upload photos");
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
    }

    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get("estimate_id");

    if (!estimateId) {
      return ErrorResponses.badRequest("estimate_id is required");
    }

    // Get photos for estimate
    const photos = await photoService.getPhotosForEstimate(estimateId);

    return NextResponse.json({
      success: true,
      photos,
      count: photos.length,
    });
  } catch (error) {
    logApiError(error, {
      endpoint: "/api/photos/upload",
      method: "GET",
    });
    return ErrorResponses.internalError("Failed to fetch photos");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return ErrorResponses.unauthorized(authError || "Unauthorized");
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

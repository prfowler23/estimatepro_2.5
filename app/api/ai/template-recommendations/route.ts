import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { authenticateRequest } from "@/lib/auth/server";
import { AIService } from "@/lib/services/ai-service";
import { z } from "zod";
import { ErrorResponses, logApiError } from "@/lib/api/error-responses";
import { generalRateLimiter } from "@/lib/utils/rate-limit";

// Validation schema
const recommendationSchema = z.object({
  buildingType: z.string().optional(),
  services: z.array(z.string()).optional(),
  constraints: z.record(z.any()).optional(),
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = recommendationSchema.parse(body);

    // Generate recommendations using AI service
    const recommendations =
      await AIService.generateTemplateRecommendations(validatedData);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest("Invalid request data", error.issues);
    }

    logApiError(error, {
      endpoint: "/api/ai/template-recommendations",
      method: "POST",
      userId: user?.id,
    });

    return ErrorResponses.internalError("Failed to generate recommendations");
  }
}

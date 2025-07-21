import { NextRequest, NextResponse } from "next/server";
import {
  generateAutoEstimate,
  AutoEstimateRequest,
} from "../../../../lib/ai/auto-estimate-generator";
import {
  AIError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  QuotaExceededError,
  ContentFilterError,
} from "../../../../lib/ai/ai-error-handler";
import { withAIRateLimit } from "../../../../lib/middleware/rate-limit-middleware";

async function handlePOST(request: NextRequest) {
  try {
    const body: AutoEstimateRequest = await request.json();

    // Extract user ID from headers or auth context
    const userId = request.headers.get("x-user-id") || undefined;

    // Generate auto-estimate with enhanced error handling
    const result = await generateAutoEstimate(body, userId);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auto-estimate generation error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.message,
          validationErrors: error.validationErrors,
        },
        { status: 400 },
      );
    }

    if (error instanceof RateLimitError) {
      const retryAfter = error.retryAfter || 60;
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": retryAfter.toString() },
        },
      );
    }

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
        },
        { status: 401 },
      );
    }

    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          success: false,
          error: "API quota exceeded",
        },
        { status: 429 },
      );
    }

    if (error instanceof ContentFilterError) {
      return NextResponse.json(
        {
          success: false,
          error: "Content filtered by safety system",
        },
        { status: 400 },
      );
    }

    if (error instanceof AIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode },
      );
    }

    // Generic error fallback
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate auto-estimate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handleGET() {
  return NextResponse.json({
    message: "Auto-estimate generation endpoint",
    methods: ["POST"],
    required_fields: [
      "extractedData.customer",
      "extractedData.requirements.services",
      "extractedData.requirements.buildingType",
    ],
    optional_fields: [
      "buildingPhotos",
      "competitorQuotes",
      "customPricing",
      "overrides",
    ],
  });
}

// Apply rate limiting to the route handlers
export const POST = withAIRateLimit(handlePOST);
export const GET = withAIRateLimit(handleGET);

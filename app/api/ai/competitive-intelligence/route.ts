import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { extractCompetitiveIntelligence } from "../../../../lib/ai/extraction";
import { validateRequestBody } from "@/lib/validation/api-schemas";
import { ErrorResponses } from "@/lib/api/error-responses";

// Zod schema for competitive intelligence request
const competitiveIntelligenceSchema = z.object({
  competitorContent: z.string().min(1).max(50000, "Content too large"),
  options: z
    .object({
      focusAreas: z
        .array(
          z.enum([
            "pricing",
            "services",
            "strengths",
            "weaknesses",
            "opportunities",
          ]),
        )
        .optional(),
      compareToOwnPricing: z.boolean().optional(),
    })
    .optional(),
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

    // Validate request body with Zod
    const { data: body, error: validationError } = await validateRequestBody(
      request,
      competitiveIntelligenceSchema,
    );

    if (validationError || !body) {
      return ErrorResponses.badRequest(validationError || "Invalid request");
    }

    const { competitorContent } = body;

    // Extract competitive intelligence
    const analysis = await extractCompetitiveIntelligence(competitorContent);

    return NextResponse.json({
      success: true,
      analysis,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Competitive intelligence error:", error);
    return NextResponse.json(
      { error: "Failed to analyze competitive intelligence" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Competitive intelligence analysis endpoint",
    methods: ["POST"],
    required_fields: ["competitorContent"],
    description:
      "Analyze competitor quotes and proposals for market intelligence",
    output_fields: [
      "extraction: standard project data extraction",
      "competitive.competitors: list of competitor companies",
      "competitive.pricingStrategy: observed pricing approach",
      "competitive.serviceOfferings: services they offer",
      "competitive.strengthsWeaknesses: competitive advantages/disadvantages",
      "competitive.marketRates: service pricing ranges observed",
      "competitive.differentiators: unique selling points",
      "competitive.threats: competitive threats identified",
      "competitive.opportunities: market gaps identified",
    ],
  });
}

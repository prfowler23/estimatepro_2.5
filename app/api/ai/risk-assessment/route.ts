import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth/server";
import { generalRateLimiter } from "@/lib/utils/rate-limit";
import { performRiskAssessment } from "../../../../lib/ai/extraction";
import { ExtractedData } from "../../../../lib/ai/extraction";
import { validateRequestBody } from "@/lib/validation/api-schemas";
import { ErrorResponses } from "@/lib/api/error-responses";

// Zod schema for risk assessment request
const extractedDataSchema = z.object({
  customer: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
  }),
  requirements: z.object({
    description: z.string().optional(),
    services: z.array(z.string()).optional(),
    specialRequests: z.array(z.string()).optional(),
    constraints: z.string().optional(),
  }),
  building: z
    .object({
      type: z.string().optional(),
      size: z.string().optional(),
      floors: z.number().optional(),
      windows: z.number().optional(),
      materials: z.array(z.string()).optional(),
    })
    .optional(),
  timeline: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      flexibility: z.string().optional(),
      urgency: z.string().optional(),
    })
    .optional(),
});

const riskAssessmentRequestSchema = z.object({
  extractedData: extractedDataSchema,
  projectContext: z.string().max(5000).optional(),
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
      riskAssessmentRequestSchema,
    );

    if (validationError || !body) {
      return ErrorResponses.badRequest(validationError || "Invalid request");
    }

    const { extractedData, projectContext } = body;

    // Perform risk assessment
    const riskAssessment = await performRiskAssessment(
      extractedData as ExtractedData,
      projectContext,
    );

    return NextResponse.json({
      success: true,
      riskAssessment,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Risk assessment error:", error);
    return NextResponse.json(
      { error: "Failed to perform risk assessment" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Project risk assessment endpoint",
    methods: ["POST"],
    required_fields: ["extractedData"],
    optional_fields: ["projectContext"],
    description:
      "Analyze project data for potential risks and provide mitigation strategies",
    output_fields: [
      "riskScore: overall risk rating (1-10)",
      "riskFactors: detailed risk analysis by category",
      "recommendations: strategic recommendations",
      "pricing_adjustments: suggested service pricing multipliers",
    ],
    risk_categories: [
      "timeline: scheduling and deadline risks",
      "budget: financial and payment risks",
      "technical: complexity and skill risks",
      "safety: worker and site safety risks",
      "weather: environmental condition risks",
      "access: site access and logistics risks",
      "regulatory: compliance and permit risks",
      "customer: client-related risks",
    ],
  });
}

// Data Quality API
// Provides data quality assessment and cleansing capabilities

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DataQualityService } from "@/lib/services/data-quality-service";
import { z } from "zod";

// Request validation schema
const DataQualityRequestSchema = z.object({
  action: z.enum(["assess", "cleanse"]),
  dataSource: z.enum([
    "estimates",
    "estimate_services",
    "estimate_flows",
    "analytics_events",
  ]),
  qualityDimensions: z
    .array(
      z.enum([
        "completeness",
        "accuracy",
        "consistency",
        "timeliness",
        "validity",
        "uniqueness",
      ]),
    )
    .optional(),
  timeRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  threshold: z.number().min(0).max(100).optional(),
  dryRun: z.boolean().default(true),
  rules: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          "fill_missing",
          "standardize_format",
          "remove_duplicates",
          "update_stale_data",
        ]),
        field: z.string(),
        condition: z.string(),
        action: z.string(),
        priority: z.number(),
        estimatedImpact: z.number(),
      }),
    )
    .optional(),
});

async function handlePOST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = DataQualityRequestSchema.parse(body);

    const dataQualityService = new DataQualityService();

    if (validatedParams.action === "assess") {
      // Perform data quality assessment
      const assessment = await dataQualityService.assessDataQuality({
        dataSource: validatedParams.dataSource,
        qualityDimensions: validatedParams.qualityDimensions || [
          "completeness",
          "accuracy",
          "consistency",
        ],
        timeRange: validatedParams.timeRange,
        threshold: validatedParams.threshold || 85,
      });

      return NextResponse.json({
        success: true,
        action: "assess",
        data: assessment,
        timestamp: new Date().toISOString(),
      });
    } else if (validatedParams.action === "cleanse") {
      // Execute data cleansing
      if (!validatedParams.rules || validatedParams.rules.length === 0) {
        return NextResponse.json(
          { error: "Cleansing rules are required for cleanse action" },
          { status: 400 },
        );
      }

      const cleansingResult = await dataQualityService.executeDataCleansing(
        validatedParams.rules,
        validatedParams.dryRun,
      );

      return NextResponse.json({
        success: true,
        action: "cleanse",
        data: cleansingResult,
        dryRun: validatedParams.dryRun,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid action specified" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Data quality API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Data quality request failed",
      },
      { status: 500 },
    );
  }
}

async function handleGET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataSource = searchParams.get("dataSource");

    if (!dataSource) {
      return NextResponse.json(
        { error: "dataSource parameter is required" },
        { status: 400 },
      );
    }

    const dataQualityService = new DataQualityService();

    // Quick assessment with default parameters
    const quickAssessment = await dataQualityService.assessDataQuality({
      dataSource: dataSource as any,
      qualityDimensions: ["completeness", "accuracy"],
      threshold: 85,
    });

    return NextResponse.json({
      success: true,
      action: "quick_assess",
      data: {
        overallScore: quickAssessment.overallScore,
        complianceStatus: quickAssessment.complianceStatus,
        totalRecords: quickAssessment.totalRecords,
        criticalIssues: quickAssessment.qualityIssues.filter(
          (issue) => issue.severity === "critical" || issue.severity === "high",
        ).length,
        recommendations: quickAssessment.recommendations.slice(0, 3),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Data quality API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Data quality request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;
export const POST = handlePOST;

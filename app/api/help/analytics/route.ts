// Help Analytics API
// Tracks help system interactions and effectiveness metrics

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  helpAnalyticsCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
  invalidateServerCache,
} from "@/lib/utils/server-cache";
import { getOptimizedHelpAnalytics } from "@/lib/utils/database-query-optimization";

// Request validation schema
const HelpAnalyticsRequestSchema = z.object({
  workflowId: z.string().uuid(),
  helpId: z.string(),
  interaction: z.enum(["helpful", "not_helpful", "dismissed"]),
  context: z.object({
    helpContent: z.string(),
    context: z.string(),
  }),
});

async function recordHelpInteraction(
  supabase: any,
  workflowId: string,
  helpId: string,
  interaction: string,
  context: any,
): Promise<void> {
  const { error } = await supabase.from("help_analytics").insert({
    id: crypto.randomUUID(),
    workflow_id: workflowId,
    help_id: helpId,
    interaction_type: interaction,
    help_content: context.helpContent,
    context_info: context.context,
    created_at: new Date().toISOString(),
    user_id: (await supabase.auth.getUser()).data?.user?.id,
  });

  if (error) {
    throw new Error(`Failed to record help interaction: ${error.message}`);
  }
}

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

    // Rate limiting check
    const userKey = `help-analytics-${user.id}`;
    if (!rateLimiters.helpAnalytics.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validatedData = HelpAnalyticsRequestSchema.parse(body);

    await recordHelpInteraction(
      supabase,
      validatedData.workflowId,
      validatedData.helpId,
      validatedData.interaction,
      validatedData.context,
    );

    // Invalidate related cache entries
    invalidateServerCache.helpAnalytics(validatedData.workflowId);

    return NextResponse.json({
      success: true,
      message: "Help interaction recorded successfully",
      recorded_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Help Analytics API error:", error);

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
            : "Help analytics request failed",
      },
      { status: 500 },
    );
  }
}

// Cached analytics fetch function using optimized queries
const getHelpAnalytics = serverCached(
  helpAnalyticsCache,
  (workflowId: string | null, timeframe: string) =>
    getServerCacheKey.helpAnalytics(workflowId || "all", timeframe),
  15 * 60 * 1000, // 15 minutes TTL
)(async function _getHelpAnalytics(
  supabase: any,
  workflowId: string | null,
  timeframe: string,
) {
  // Use optimized query with selective columns and database aggregation
  const result = await getOptimizedHelpAnalytics(
    supabase,
    workflowId,
    timeframe,
    {
      useSelectiveColumns: true,
      useAggregation: true,
      limit: 1000,
    },
  );

  return result.data;
});

// GET endpoint for retrieving help analytics
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

    // Rate limiting check for GET requests
    const userKey = `help-analytics-get-${user.id}`;
    if (!rateLimiters.helpAnalytics.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const timeframe = searchParams.get("timeframe") || "30d";

    const result = await getHelpAnalytics(supabase, workflowId, timeframe);

    return NextResponse.json({
      success: true,
      ...result,
      generated_at: new Date().toISOString(),
      cached: true,
    });
  } catch (error) {
    console.error("Help Analytics GET API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Help analytics request failed",
      },
      { status: 500 },
    );
  }
}

export const POST = handlePOST;
export const GET = handleGET;

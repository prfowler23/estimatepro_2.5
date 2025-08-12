// Collaboration History API
// Provides detailed change history and collaboration metrics

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  collaborationCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
} from "@/lib/utils/server-cache";
import { getOptimizedCollaborationHistory } from "@/lib/utils/database-query-optimization";

// Request validation schema
const HistoryRequestSchema = z.object({
  estimateId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  changeType: z
    .enum(["create", "update", "delete", "status_change", "comment"])
    .optional(),
  includeMetrics: z.boolean().default(false),
});

interface ChangeEvent {
  id: string;
  estimate_id: string;
  user_id: string;
  change_type: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  description: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface CollaborationMetrics {
  total_changes: number;
  unique_contributors: number;
  most_active_user: {
    user_id: string;
    user_name: string;
    change_count: number;
  };
  change_types_breakdown: Record<string, number>;
  daily_activity: Array<{
    date: string;
    change_count: number;
  }>;
}

async function fetchChangeHistory(
  supabase: any,
  params: z.infer<typeof HistoryRequestSchema>,
): Promise<ChangeEvent[]> {
  let query = supabase
    .from("collaboration_history")
    .select(
      `
      id,
      estimate_id,
      user_id,
      change_type,
      field_name,
      old_value,
      new_value,
      description,
      created_at,
      profiles:user_id (
        full_name,
        email
      )
    `,
    )
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.estimateId) {
    query = query.eq("estimate_id", params.estimateId);
  }

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params.changeType) {
    query = query.eq("change_type", params.changeType);
  }

  if (params.startDate) {
    query = query.gte("created_at", params.startDate);
  }

  if (params.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch change history: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    estimate_id: item.estimate_id,
    user_id: item.user_id,
    change_type: item.change_type,
    field_name: item.field_name,
    old_value: item.old_value,
    new_value: item.new_value,
    description: item.description,
    created_at: item.created_at,
    user_name: item.profiles?.full_name || "Unknown User",
    user_email: item.profiles?.email || "",
  }));
}

async function calculateMetrics(
  supabase: any,
  params: z.infer<typeof HistoryRequestSchema>,
): Promise<CollaborationMetrics> {
  let baseQuery = supabase
    .from("collaboration_history")
    .select("user_id, change_type, created_at, profiles:user_id (full_name)");

  if (params.estimateId) {
    baseQuery = baseQuery.eq("estimate_id", params.estimateId);
  }

  if (params.startDate) {
    baseQuery = baseQuery.gte("created_at", params.startDate);
  }

  if (params.endDate) {
    baseQuery = baseQuery.lte("created_at", params.endDate);
  }

  const { data, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to calculate metrics: ${error.message}`);
  }

  const changes = data || [];
  const userCounts: Record<string, { name: string; count: number }> = {};
  const changeTypeCounts: Record<string, number> = {};
  const dailyActivity: Record<string, number> = {};

  changes.forEach((change: any) => {
    // Count by user
    if (!userCounts[change.user_id]) {
      userCounts[change.user_id] = {
        name: change.profiles?.full_name || "Unknown User",
        count: 0,
      };
    }
    userCounts[change.user_id].count++;

    // Count by change type
    changeTypeCounts[change.change_type] =
      (changeTypeCounts[change.change_type] || 0) + 1;

    // Count by day
    const date = new Date(change.created_at).toISOString().split("T")[0];
    dailyActivity[date] = (dailyActivity[date] || 0) + 1;
  });

  // Find most active user
  const mostActiveUser = Object.entries(userCounts).sort(
    ([, a], [, b]) => b.count - a.count,
  )[0];

  return {
    total_changes: changes.length,
    unique_contributors: Object.keys(userCounts).length,
    most_active_user: mostActiveUser
      ? {
          user_id: mostActiveUser[0],
          user_name: mostActiveUser[1].name,
          change_count: mostActiveUser[1].count,
        }
      : {
          user_id: "",
          user_name: "None",
          change_count: 0,
        },
    change_types_breakdown: changeTypeCounts,
    daily_activity: Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, change_count: count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Cached collaboration history fetch function using optimized queries
const getCachedCollaborationHistory = serverCached(
  collaborationCache,
  (
    supabase: any,
    estimateId: string,
    userId: string,
    days: number,
    includeMetrics: boolean,
  ) => getServerCacheKey.collaboration(estimateId || userId || "all", days),
  10 * 60 * 1000, // 10 minutes TTL
)(async function _getCachedCollaborationHistory(
  supabase: any,
  estimateId: string,
  userId: string,
  days: number,
  includeMetrics: boolean,
) {
  // Use optimized query with selective columns and efficient pagination
  const result = await getOptimizedCollaborationHistory(
    supabase,
    estimateId || "",
    userId || "",
    days,
    includeMetrics,
    {
      useSelectiveColumns: true,
      limit: 100,
      offset: 0,
    },
  );

  return result.data;
});

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

    // Rate limiting check
    const userKey = `collaboration-history-${user.id}`;
    if (!rateLimiters.collaboration.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get("estimateId") || "";
    const userId = searchParams.get("userId") || "";
    const days = parseInt(searchParams.get("days") || "30");
    const includeMetrics = searchParams.get("includeMetrics") === "true";

    // Use cached function for common queries (last 30 days)
    if (
      days <= 30 &&
      !searchParams.get("changeType") &&
      !searchParams.get("startDate")
    ) {
      const result = await getCachedCollaborationHistory(
        supabase,
        estimateId,
        userId,
        days,
        includeMetrics,
      );

      return NextResponse.json({
        success: true,
        data: result.history,
        metrics: result.metrics,
        pagination: {
          limit: 100,
          offset: 0,
          has_more: result.history.length === 100,
        },
        generated_at: new Date().toISOString(),
        cached: true,
      });
    }

    // Fallback to non-cached for complex queries
    const rawParams = {
      estimateId: searchParams.get("estimateId"),
      userId: searchParams.get("userId"),
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      changeType: searchParams.get("changeType"),
      includeMetrics,
    };

    const validatedParams = HistoryRequestSchema.parse(rawParams);

    const [history, metrics] = await Promise.all([
      fetchChangeHistory(supabase, validatedParams),
      validatedParams.includeMetrics
        ? calculateMetrics(supabase, validatedParams)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      data: history,
      metrics,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: history.length === validatedParams.limit,
      },
      generated_at: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("Collaboration History API error:", error);

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
            : "Collaboration history request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = handleGET;

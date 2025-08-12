// Issue Reporting API
// Handles bug reports, feature requests, and user feedback

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  issueReportCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
  invalidateServerCache,
} from "@/lib/utils/server-cache";

// Request validation schema
const IssueReportSchema = z.object({
  type: z.enum(["bug", "feature_request", "feedback", "support"]),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  category: z.string().optional(),
  steps_to_reproduce: z.string().optional(),
  expected_behavior: z.string().optional(),
  actual_behavior: z.string().optional(),
  browser_info: z
    .object({
      userAgent: z.string(),
      url: z.string(),
      timestamp: z.string(),
    })
    .optional(),
  attachments: z.array(z.string()).optional(),
});

async function createIssueReport(
  supabase: any,
  userId: string,
  issueData: z.infer<typeof IssueReportSchema>,
): Promise<string> {
  const { data, error } = await supabase
    .from("issue_reports")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      type: issueData.type,
      title: issueData.title,
      description: issueData.description,
      priority: issueData.priority,
      category: issueData.category,
      steps_to_reproduce: issueData.steps_to_reproduce,
      expected_behavior: issueData.expected_behavior,
      actual_behavior: issueData.actual_behavior,
      browser_info: issueData.browser_info,
      attachments: issueData.attachments || [],
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create issue report: ${error.message}`);
  }

  return data.id;
}

async function notifySupport(
  issueId: string,
  issueData: z.infer<typeof IssueReportSchema>,
) {
  // In a real implementation, this would send notifications to support team
  // via email, Slack, or other channels
  try {
    console.log(`New ${issueData.type} report created:`, {
      id: issueId,
      title: issueData.title,
      priority: issueData.priority,
    });

    // TODO: Implement actual notification system
    // - Send email to support team
    // - Create Slack notification
    // - Update dashboard metrics
  } catch (error) {
    console.warn("Failed to notify support team:", error);
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
    const userKey = `issue-report-${user.id}`;
    if (!rateLimiters.issueReport.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validatedData = IssueReportSchema.parse(body);

    const issueId = await createIssueReport(supabase, user.id, validatedData);

    // Invalidate related cache entries
    invalidateServerCache.issueReport(user.id);

    // Notify support team (async, don't wait)
    notifySupport(issueId, validatedData).catch(console.error);

    return NextResponse.json({
      success: true,
      issueId,
      message: "Issue report submitted successfully",
      expectedResponse: getExpectedResponseTime(validatedData.priority),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Issue Report API error:", error);

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
        error: error instanceof Error ? error.message : "Issue report failed",
      },
      { status: 500 },
    );
  }
}

// Cached issue reports fetch function
const getCachedIssueReports = serverCached(
  issueReportCache,
  (
    supabase: any,
    userId: string,
    type: string,
    status: string,
    limit: number,
  ) => getServerCacheKey.issueReport(userId, type, status),
  60 * 60 * 1000, // 1 hour TTL
)(async function _getCachedIssueReports(
  supabase: any,
  userId: string,
  type: string,
  status: string,
  limit: number,
) {
  let query = supabase
    .from("issue_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (type && type !== "all") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch issue reports: ${error.message}`);
  }

  return data || [];
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

    // Rate limiting check for GET requests
    const userKey = `issue-report-get-${user.id}`;
    if (!rateLimiters.issueReport.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "20");

    const data = await getCachedIssueReports(
      supabase,
      user.id,
      type,
      status,
      limit,
    );

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      generated_at: new Date().toISOString(),
      cached: true,
    });
  } catch (error) {
    console.error("Issue Report GET API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch issues",
      },
      { status: 500 },
    );
  }
}

function getExpectedResponseTime(priority: string): string {
  switch (priority) {
    case "critical":
      return "Within 2 hours";
    case "high":
      return "Within 1 business day";
    case "medium":
      return "Within 3 business days";
    case "low":
      return "Within 1 week";
    default:
      return "Within 3 business days";
  }
}

export const POST = handlePOST;
export const GET = handleGET;

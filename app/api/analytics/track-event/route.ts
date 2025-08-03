// Analytics Event Tracking API
// Handles user interaction tracking for analytics and insights

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  analyticsEventCache,
  getServerCacheKey,
  serverCached,
  rateLimiters,
  invalidateServerCache,
} from "@/lib/utils/server-cache";
import { getOptimizedEventMetrics } from "@/lib/utils/database-query-optimization";

// Request validation schema
const TrackEventRequestSchema = z.object({
  event_name: z.string().min(1).max(100),
  properties: z.record(z.any()).optional(),
  session_id: z.string().optional(),
  page_url: z.string().url().optional(),
  user_agent: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Standard event properties schema
const EventPropertiesSchema = z
  .object({
    customer: z.string().optional(),
    value: z.number().optional(),
    services: z.number().optional(),
    format: z.string().optional(),
    tracking: z.boolean().optional(),
    duration: z.number().optional(),
    source: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough(); // Allow additional properties

async function trackAnalyticsEvent(
  supabase: any,
  userId: string,
  eventData: z.infer<typeof TrackEventRequestSchema>,
): Promise<string> {
  // Validate event properties if provided
  const validatedProperties = eventData.properties
    ? EventPropertiesSchema.parse(eventData.properties)
    : {};

  const eventId = crypto.randomUUID();

  const { error } = await supabase.from("analytics_events").insert({
    id: eventId,
    user_id: userId,
    event_name: eventData.event_name,
    properties: validatedProperties,
    session_id: eventData.session_id || `session-${Date.now()}`,
    page_url: eventData.page_url,
    user_agent: eventData.user_agent,
    timestamp: eventData.timestamp || new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to track analytics event: ${error.message}`);
  }

  return eventId;
}

async function getEventMetrics(
  supabase: any,
  userId?: string,
  eventName?: string,
  days: number = 30,
) {
  // Use optimized query with selective columns and single-pass aggregation
  const result = await getOptimizedEventMetrics(
    supabase,
    userId,
    eventName,
    days,
    {
      useSelectiveColumns: true,
      limit: 1000,
    },
  );

  return result.data;
}

async function handlePOST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check - analytics events have higher limits
    const userKey = `analytics-event-${user.id}`;
    if (!rateLimiters.analyticsEvent.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validatedData = TrackEventRequestSchema.parse(body);

    const eventId = await trackAnalyticsEvent(supabase, user.id, validatedData);

    // Invalidate related cache entries
    invalidateServerCache.analyticsEvent(user.id);

    return NextResponse.json({
      success: true,
      event_id: eventId,
      event_name: validatedData.event_name,
      tracked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics Track Event API error:", error);

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
        error: error instanceof Error ? error.message : "Event tracking failed",
      },
      { status: 500 },
    );
  }
}

// Cached event metrics function
const getCachedEventMetrics = serverCached(
  analyticsEventCache,
  (userId: string | undefined, eventName: string | undefined, days: number) =>
    getServerCacheKey.analyticsEvent(userId || "all", eventName, days),
  5 * 60 * 1000, // 5 minutes TTL
)(async function _getCachedEventMetrics(
  supabase: any,
  userId: string | undefined,
  eventName: string | undefined,
  days: number,
) {
  return await getEventMetrics(supabase, userId, eventName, days);
});

async function handleGET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check for GET requests
    const userKey = `analytics-event-get-${user.id}`;
    if (!rateLimiters.analyticsEvent.isAllowed(userKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get("event_name");
    const days = parseInt(searchParams.get("days") || "30");
    const includeOthers = searchParams.get("include_others") === "true";

    const metrics = await getCachedEventMetrics(
      supabase,
      includeOthers ? undefined : user.id,
      eventName || undefined,
      days,
    );

    return NextResponse.json({
      success: true,
      data: metrics,
      generated_at: new Date().toISOString(),
      cached: true,
    });
  } catch (error) {
    console.error("Analytics Track Event GET API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch metrics",
      },
      { status: 500 },
    );
  }
}

export const POST = handlePOST;
export const GET = handleGET;

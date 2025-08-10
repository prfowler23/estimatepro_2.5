// Performance Entries API
// Provides access to performance tracking entries

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  performanceMonitor,
  PerformanceEntry,
} from "@/lib/performance/performance-monitor";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to performance metrics
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("time_range") || "1h";
    const limit = parseInt(searchParams.get("limit") || "100");
    const type = searchParams.get("type") as
      | PerformanceEntry["type"]
      | undefined;
    const userId = searchParams.get("user_id");

    // Calculate time range
    const now = Date.now();
    const ranges: Record<string, number> = {
      "1h": now - 60 * 60 * 1000,
      "24h": now - 24 * 60 * 60 * 1000,
      "7d": now - 7 * 24 * 60 * 60 * 1000,
      "30d": now - 30 * 24 * 60 * 60 * 1000,
    };

    const startTime = ranges[timeRange] || ranges["1h"];

    // Get performance entries with filters
    const entries = performanceMonitor.getEntries({
      type,
      userId: userId || undefined,
      since: startTime,
      limit,
    });

    // Calculate summary statistics
    const summary = {
      totalEntries: entries.length,
      successRate:
        entries.length > 0
          ? entries.filter((e) => e.success).length / entries.length
          : 0,
      averageDuration:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + e.duration, 0) / entries.length
          : 0,
      byType: entries.reduce(
        (acc, entry) => {
          if (!acc[entry.type]) {
            acc[entry.type] = {
              count: 0,
              totalDuration: 0,
              errors: 0,
            };
          }
          acc[entry.type].count++;
          acc[entry.type].totalDuration += entry.duration;
          if (!entry.success) {
            acc[entry.type].errors++;
          }
          return acc;
        },
        {} as Record<
          string,
          { count: number; totalDuration: number; errors: number }
        >,
      ),
    };

    // Calculate average duration for each type
    Object.keys(summary.byType).forEach((key) => {
      const typeData = summary.byType[key];
      (typeData as any).avgDuration = typeData.totalDuration / typeData.count;
      (typeData as any).errorRate = typeData.errors / typeData.count;
    });

    return NextResponse.json({
      entries,
      summary,
      timeRange,
      timestamp: now,
    });
  } catch (error) {
    console.error("Error fetching performance entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance entries" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to performance metrics (admin only)
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clear performance entries
    performanceMonitor.clear();

    return NextResponse.json({
      message: "Performance entries cleared successfully",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error clearing performance entries:", error);
    return NextResponse.json(
      { error: "Failed to clear performance entries" },
      { status: 500 },
    );
  }
}

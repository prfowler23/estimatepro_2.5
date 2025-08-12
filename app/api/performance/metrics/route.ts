// Performance Metrics API
// Provides real-time performance metrics and monitoring data

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { performanceMonitor } from "@/lib/performance/performance-monitor";
import { cacheManager } from "@/lib/cache/cache-manager";

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
    const includeCache = searchParams.get("include_cache") === "true";

    // Calculate time range
    const now = Date.now();
    const ranges = {
      "1h": now - 60 * 60 * 1000,
      "24h": now - 24 * 60 * 60 * 1000,
      "7d": now - 7 * 24 * 60 * 60 * 1000,
      "30d": now - 30 * 24 * 60 * 60 * 1000,
    };

    const startTime = ranges[timeRange as keyof typeof ranges] || ranges["1h"];

    // Get performance metrics
    const metrics = performanceMonitor.getMetrics();

    // Get performance entries for the time range
    const entries = performanceMonitor.getEntries({
      since: startTime,
      limit: 1000,
    });

    // Get cache metrics if requested
    let cacheMetrics = null;
    if (includeCache) {
      cacheMetrics = cacheManager.getMetrics();
    }

    // Calculate additional metrics
    const typeBreakdown = entries.reduce(
      (acc, entry) => {
        if (!acc[entry.type]) {
          acc[entry.type] = {
            count: 0,
            totalDuration: 0,
            errorCount: 0,
            avgDuration: 0,
            errorRate: 0,
          };
        }

        acc[entry.type].count++;
        acc[entry.type].totalDuration += entry.duration;

        if (!entry.success) {
          acc[entry.type].errorCount++;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    // Calculate averages
    Object.keys(typeBreakdown).forEach((type) => {
      const data = typeBreakdown[type];
      data.avgDuration = data.totalDuration / data.count;
      data.errorRate = data.errorCount / data.count;
      delete data.totalDuration;
      delete data.errorCount;
    });

    // Get slowest operations
    const slowestOperations = entries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map((entry) => ({
        name: entry.name,
        type: entry.type,
        duration: entry.duration,
        timestamp: entry.timestamp,
        success: entry.success,
      }));

    // Get most frequent operations
    const operationCounts = entries.reduce(
      (acc, entry) => {
        acc[entry.name] = (acc[entry.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostFrequentOperations = Object.entries(operationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate time-based metrics
    const timeSlots = 20; // Divide time range into 20 slots
    const slotDuration = (now - startTime) / timeSlots;
    const timeBasedMetrics = Array.from({ length: timeSlots }, (_, i) => {
      const slotStart = startTime + i * slotDuration;
      const slotEnd = slotStart + slotDuration;

      const slotEntries = entries.filter(
        (entry) => entry.timestamp >= slotStart && entry.timestamp < slotEnd,
      );

      const avgDuration =
        slotEntries.length > 0
          ? slotEntries.reduce((sum, entry) => sum + entry.duration, 0) /
            slotEntries.length
          : 0;

      const errorRate =
        slotEntries.length > 0
          ? slotEntries.filter((entry) => !entry.success).length /
            slotEntries.length
          : 0;

      return {
        timestamp: slotStart,
        requestCount: slotEntries.length,
        avgDuration,
        errorRate,
      };
    });

    const response = {
      metrics: {
        ...metrics,
        timeRange,
        totalEntries: entries.length,
      },
      breakdown: typeBreakdown,
      slowestOperations,
      mostFrequentOperations,
      timeBasedMetrics,
      cacheMetrics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { action, ...params } = body;

    if (action === "clear_metrics") {
      // Clear performance metrics (admin only)
      const isAdmin = user.user_metadata?.role === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      performanceMonitor.clear();

      return NextResponse.json({
        message: "Performance metrics cleared successfully",
      });
    } else if (action === "record_entry") {
      // Record a custom performance entry
      const { name, type, duration, success = true, error, metadata } = params;

      if (!name || !type || duration === undefined) {
        return NextResponse.json(
          { error: "Missing required fields: name, type, duration" },
          { status: 400 },
        );
      }

      performanceMonitor.recordEntry({
        name,
        type,
        duration,
        timestamp: Date.now(),
        success,
        error,
        userId: user.id,
        metadata,
      });

      return NextResponse.json({
        message: "Performance entry recorded successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling performance metrics request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

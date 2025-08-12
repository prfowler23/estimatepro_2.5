// Performance Cache API
// Manages cache performance metrics and operations

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Check if user has access to cache metrics
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get cache metrics
    const metrics = cacheManager.getMetrics();

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error fetching cache metrics:", error);
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

    // Check if user has admin access
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    if (action === "clear_cache") {
      // Clear all cache
      await cacheManager.clear();

      return NextResponse.json({
        message: "Cache cleared successfully",
      });
    } else if (action === "warm_cache") {
      const { user_id } = params;

      if (!user_id) {
        return NextResponse.json(
          { error: "Missing required parameter: user_id" },
          { status: 400 },
        );
      }

      // Warm cache for user
      await cacheManager.warmCache(user_id);

      return NextResponse.json({
        message: "Cache warmed successfully",
      });
    } else if (action === "invalidate_pattern") {
      const { pattern } = params;

      if (!pattern) {
        return NextResponse.json(
          { error: "Missing required parameter: pattern" },
          { status: 400 },
        );
      }

      // Invalidate cache by pattern
      await cacheManager.invalidateByPattern(pattern);

      return NextResponse.json({
        message: "Cache invalidated successfully",
      });
    } else if (action === "invalidate_tags") {
      const { tags } = params;

      if (!tags || !Array.isArray(tags)) {
        return NextResponse.json(
          { error: "Missing required parameter: tags (array)" },
          { status: 400 },
        );
      }

      // Invalidate cache by tags
      await cacheManager.invalidateByTags(tags);

      return NextResponse.json({
        message: "Cache invalidated successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action parameter" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling cache request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

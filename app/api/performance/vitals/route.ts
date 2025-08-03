import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get("hours") || "24");
    const metric = searchParams.get("metric");

    // Calculate time range
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Build query
    let query = supabase
      .from("web_vitals")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (metric) {
      query = query.eq("metric_name", metric);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error("Failed to fetch web vitals:", error);
      return NextResponse.json(
        { error: "Failed to fetch web vitals" },
        { status: 500 },
      );
    }

    // Transform data for frontend
    const vitals = (data || []).map((row: any) => ({
      name: row.metric_name,
      value: row.value,
      rating: row.rating,
      timestamp: new Date(row.created_at).getTime(),
      id: row.metric_id,
      navigationType: row.navigation_type,
    }));

    return NextResponse.json({ data: vitals });
  } catch (error) {
    console.error("Web vitals endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

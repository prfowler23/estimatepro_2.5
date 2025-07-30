import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Schema for web vitals data
const webVitalSchema = z.object({
  name: z.enum(["CLS", "FCP", "LCP", "TTFB", "INP", "FID"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  delta: z.number().optional(),
  id: z.string(),
  navigationType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.text();
    const data = JSON.parse(body);
    const validated = webVitalSchema.parse(data);

    // In development, just log the metrics
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Web Vital ${validated.name}:`, validated);
      return NextResponse.json({ success: true });
    }

    // In production, you could store these metrics
    try {
      const supabase = createAdminClient();

      // Check if web_vitals table exists before inserting
      // For now, we'll just acknowledge receipt
      console.log(`[Analytics] Received ${validated.name} metric:`, validated);

      // Uncomment when web_vitals table is created:
      // await supabase.from("web_vitals").insert({
      //   metric_name: validated.name,
      //   value: validated.value,
      //   rating: validated.rating,
      //   delta: validated.delta,
      //   metric_id: validated.id,
      //   navigation_type: validated.navigationType,
      //   user_agent: request.headers.get("user-agent"),
      //   created_at: new Date().toISOString(),
      // });
    } catch (dbError) {
      // Log error but don't fail the request
      console.error("Failed to store web vital:", dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Web vitals endpoint error:", error);

    // Return success even on error to prevent client-side errors
    return NextResponse.json({ success: true });
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

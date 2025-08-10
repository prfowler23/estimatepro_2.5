import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for preload metrics data
const preloadMetricsSchema = z.object({
  route: z.string(),
  loadTime: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
  timestamp: z.number(),
  userAgent: z.string().optional(),
  connectionType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.text();
    const data = JSON.parse(body);
    const validated = preloadMetricsSchema.parse(data);

    // In development, just log the metrics
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Analytics] Preload Metric for ${validated.route}:`,
        validated,
      );
      return NextResponse.json({ success: true });
    }

    // In production, you could store these metrics
    console.log(`[Analytics] Route preload metric:`, validated);

    return NextResponse.json({
      success: true,
      message: "Preload metrics received",
    });
  } catch (error) {
    console.error("Error processing preload metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid metrics data",
      },
      { status: 400 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

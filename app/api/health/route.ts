import { NextRequest, NextResponse } from "next/server";

/**
 * Public health check endpoint - returns minimal information
 * For detailed health information, use /api/health/secure (requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    // Quick database connectivity check
    let dbStatus = "healthy";
    try {
      const { createClient } = await import("@/lib/supabase/universal-client");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        dbStatus = "unhealthy";
      }
    } catch {
      dbStatus = "unhealthy";
    }

    // Basic health response - no sensitive information
    const response = {
      status: dbStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    return NextResponse.json(response, {
      status: dbStatus === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    // Return minimal error information
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const { createClient } = await import("@/lib/supabase/universal-client");
    const supabase = createClient();
    await supabase.from("profiles").select("id").limit(1);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}

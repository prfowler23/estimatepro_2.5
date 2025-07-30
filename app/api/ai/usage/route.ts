import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/server";
import { AIRateLimiter } from "@/lib/ai/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const rateLimiter = AIRateLimiter.getInstance();
    const searchParams = request.nextUrl.searchParams;

    // Get time range if provided
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    let timeRange: { start: Date; end: Date } | undefined;
    if (startParam && endParam) {
      timeRange = {
        start: new Date(startParam),
        end: new Date(endParam),
      };
    }

    // Get usage data
    const usage = await rateLimiter.getUserUsage(user.id, timeRange);
    const quota = await rateLimiter.getUserQuota(user.id);

    return new Response(
      JSON.stringify({
        usage,
        quota,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Reset quota endpoint (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { action, targetUserId, type } = await request.json();

    // Check if user is admin (implement your own admin check)
    // For now, we'll allow users to reset their own quota
    if (targetUserId && targetUserId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const rateLimiter = AIRateLimiter.getInstance();

    switch (action) {
      case "reset":
        if (!type || (type !== "daily" && type !== "monthly")) {
          return new Response(JSON.stringify({ error: "Invalid reset type" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        await rateLimiter.resetUserQuota(targetUserId || user.id, type);

        return new Response(
          JSON.stringify({
            message: `${type} quota reset successfully`,
            userId: targetUserId || user.id,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );

      default:
        return new Response("Invalid action", { status: 400 });
    }
  } catch (error) {
    console.error("Error processing usage action:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

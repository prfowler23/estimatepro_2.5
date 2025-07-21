import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, rateLimitConfigs } from "@/lib/utils/rate-limiter";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session to ensure latest state
  await supabase.auth.getSession();

  // Apply global rate limiting to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    let rateLimitConfig = rateLimitConfigs.api;

    // Use more restrictive limits for specific route types
    if (request.nextUrl.pathname.startsWith("/api/ai/")) {
      rateLimitConfig = rateLimitConfigs.ai;
    } else if (request.nextUrl.pathname.includes("/auth/")) {
      rateLimitConfig = rateLimitConfigs.auth;
    } else if (
      request.method === "POST" ||
      request.method === "PUT" ||
      request.method === "DELETE" ||
      request.method === "PATCH"
    ) {
      rateLimitConfig = rateLimitConfigs.write;
    }

    const limiter = rateLimit(rateLimitConfig);
    const rateLimitResult = await limiter(request);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    // Add rate limit headers to successful requests
    res.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    res.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    res.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());
  }

  // Get session from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Debug logging for auth issues
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("🔍 Middleware dashboard access:", {
      path: request.nextUrl.pathname,
      hasSession: !!session,
      userId: session?.user?.id || "none",
      userEmail: session?.user?.email || "none",
    });
  }

  // Protect API routes that require authentication
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Public API routes that don't require authentication
    const publicRoutes = [
      "/api/health",
      "/api/ai/", // AI routes handle their own authentication
    ];

    const isPublicRoute = publicRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route),
    );

    if (!isPublicRoute && !session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  // Protect pages that require authentication
  const protectedRoutes = [
    "/quotes",
    "/calculator",
    "/analytics",
    "/estimates",
    "/dashboard",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedRoute && !session) {
    // In development, be more lenient to avoid redirect loops during testing
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🚧 Development mode: Allowing access without session to",
        request.nextUrl.pathname,
      );
      // Add a header to indicate this was allowed in development
      res.headers.set("X-Dev-Auth-Bypass", "true");
      return res;
    }

    // Redirect to login page
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

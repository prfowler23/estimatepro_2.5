import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";

function validateEnvironmentVariables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    supabaseUrl.includes("your-project-id") ||
    supabaseUrl === "your-supabase-url-goes-here"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not properly configured. Please update your .env.local file with your actual Supabase project URL.",
    );
  }

  if (
    !supabaseKey ||
    supabaseKey.includes("your-actual-anon-key") ||
    supabaseKey === "your-supabase-anon-key-goes-here"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not properly configured. Please update your .env.local file with your actual Supabase anon key.",
    );
  }

  try {
    // Validate URL format
    new URL(supabaseUrl);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${supabaseUrl}`,
    );
  }
}

export async function middleware(request: NextRequest) {
  try {
    validateEnvironmentVariables();

    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });

    // Refresh session to ensure latest state
    await supabase.auth.getSession();

    // Apply global rate limiting to API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const rateLimitResponse = await rateLimit(request);

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      // Rate limit headers are set by the rateLimit function
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
  } catch (error) {
    console.error("Middleware error:", error);

    // Return a helpful error response for environment configuration issues
    if (
      error instanceof Error &&
      error.message.includes("NEXT_PUBLIC_SUPABASE")
    ) {
      return NextResponse.json(
        {
          error: "Configuration Error",
          message: error.message,
          hint: "Please check your .env.local file and ensure all Supabase environment variables are properly configured.",
        },
        { status: 500 },
      );
    }

    // For other errors, return a generic error response
    return NextResponse.json(
      { error: "Middleware error occurred" },
      { status: 500 },
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (hot module replacement)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     * - static assets and build files
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr|_next|favicon.ico|public|api|sw.js|manifest.json|robots.txt).*)",
  ],
};

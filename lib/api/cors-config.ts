import { NextRequest } from "next/server";

// CORS configuration
export const CORS_CONFIG = {
  // Allowed origins - configure based on environment
  getAllowedOrigins: (): string[] => {
    const env = process.env.NODE_ENV;

    if (env === "development") {
      return [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
      ];
    }

    // Production origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

    // Add default production domains if not specified
    if (allowedOrigins.length === 0) {
      allowedOrigins.push(
        "https://estimatepro.com",
        "https://www.estimatepro.com",
        "https://app.estimatepro.com",
      );
    }

    return allowedOrigins;
  },

  // Allowed methods
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],

  // Allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "X-Request-ID",
  ],

  // Exposed headers (accessible to client)
  exposedHeaders: [
    "X-Request-ID",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],

  // Allow credentials
  credentials: true,

  // Max age for preflight cache (24 hours)
  maxAge: 86400,
};

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowedOrigins = CORS_CONFIG.getAllowedOrigins();

  const headers: Record<string, string> = {};

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (process.env.NODE_ENV === "development") {
    // In development, be more permissive but log warnings
    console.warn(`CORS: Origin ${origin} not in allowed list`);
    headers["Access-Control-Allow-Origin"] = origin || "*";
  } else {
    // In production, use the first allowed origin as default
    headers["Access-Control-Allow-Origin"] = allowedOrigins[0] || "";
  }

  // Add other CORS headers
  headers["Access-Control-Allow-Methods"] = CORS_CONFIG.methods.join(", ");
  headers["Access-Control-Allow-Headers"] =
    CORS_CONFIG.allowedHeaders.join(", ");
  headers["Access-Control-Expose-Headers"] =
    CORS_CONFIG.exposedHeaders.join(", ");
  headers["Access-Control-Max-Age"] = String(CORS_CONFIG.maxAge);

  if (CORS_CONFIG.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  // Add Vary header to prevent caching issues
  headers["Vary"] = "Origin";

  return headers;
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCorsPreflightRequest(request: NextRequest): Response {
  const headers = getCorsHeaders(request);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Validate origin for WebSocket connections
 */
export function validateWebSocketOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = CORS_CONFIG.getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(
  response: Response,
  request: NextRequest,
): Response {
  const corsHeaders = getCorsHeaders(request);

  // Clone the response and add headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

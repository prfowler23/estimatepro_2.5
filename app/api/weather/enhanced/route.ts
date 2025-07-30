// Enhanced Weather API Endpoint - Modularized version
import { withAuditLogging } from "@/lib/audit/audit-middleware";
import { withAutoRateLimit } from "@/lib/middleware/rate-limit-middleware";
import { handleGET } from "./handlers/get-weather";
import { handlePOST } from "./handlers/post-weather";

// Export wrapped handlers with audit logging and rate limiting
export const GET = withAuditLogging(withAutoRateLimit(handleGET), {
  logLevel: "all",
  sensitiveRoutes: ["/api/weather/enhanced"],
});

export const POST = withAuditLogging(withAutoRateLimit(handlePOST), {
  logLevel: "all",
  sensitiveRoutes: ["/api/weather/enhanced"],
});

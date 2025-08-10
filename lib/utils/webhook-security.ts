import crypto from "crypto";
import {
  WebhookPayload,
  WebhookSecurityConfig,
} from "@/lib/types/webhook-types";

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string | object,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256",
): string {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const signature = crypto
    .createHmac(algorithm, secret)
    .update(payloadString, "utf8")
    .digest("hex");
  return `${algorithm}=${signature}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | object,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const [algorithm, receivedSignature] = signature.split("=");
  if (!algorithm || !receivedSignature) {
    return false;
  }

  const expectedSignature = generateWebhookSignature(
    payload,
    secret,
    algorithm as any,
  );
  const [, expectedHash] = expectedSignature.split("=");

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Validate IP address against whitelist
 */
export function validateIPWhitelist(
  ipAddress: string,
  whitelist: string[],
): boolean {
  if (!whitelist || whitelist.length === 0) {
    return true; // No whitelist means all IPs are allowed
  }

  return whitelist.some((allowedIP) => {
    // Support CIDR notation in the future
    if (allowedIP.includes("/")) {
      // TODO: Implement CIDR range checking
      return false;
    }
    return allowedIP === ipAddress;
  });
}

/**
 * Rate limiting check (should be used with a cache/store)
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export class WebhookRateLimiter {
  private requests: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(
    private maxRequestsPerMinute: number = 100,
    private maxRequestsPerHour: number = 1000,
  ) {}

  check(identifier: string): RateLimitResult {
    const now = new Date();
    const minuteKey = `${identifier}:minute`;
    const hourKey = `${identifier}:hour`;

    // Check minute limit
    const minuteData = this.requests.get(minuteKey);
    const minuteResetAt = new Date(now.getTime() + 60000);

    if (minuteData && minuteData.resetAt > now) {
      if (minuteData.count >= this.maxRequestsPerMinute) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: minuteData.resetAt,
        };
      }
      minuteData.count++;
    } else {
      this.requests.set(minuteKey, { count: 1, resetAt: minuteResetAt });
    }

    // Check hour limit
    const hourData = this.requests.get(hourKey);
    const hourResetAt = new Date(now.getTime() + 3600000);

    if (hourData && hourData.resetAt > now) {
      if (hourData.count >= this.maxRequestsPerHour) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: hourData.resetAt,
        };
      }
      hourData.count++;
    } else {
      this.requests.set(hourKey, { count: 1, resetAt: hourResetAt });
    }

    const currentMinuteCount = this.requests.get(minuteKey)?.count || 0;
    const remaining = this.maxRequestsPerMinute - currentMinuteCount;

    return {
      allowed: true,
      remaining,
      resetAt: minuteResetAt,
    };
  }

  reset(identifier: string): void {
    this.requests.delete(`${identifier}:minute`);
    this.requests.delete(`${identifier}:hour`);
  }
}

/**
 * Sanitize webhook payload to remove sensitive data
 */
export function sanitizeWebhookPayload(
  payload: any,
  sensitiveFields: string[] = [
    "password",
    "token",
    "secret",
    "api_key",
    "credit_card",
  ],
): any {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

  function sanitizeObject(obj: any): any {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  }

  return sanitizeObject(sanitized);
}

/**
 * Validate webhook URL
 */
export function validateWebhookURL(url: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const parsed = new URL(url);

    // Ensure HTTPS
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Webhook URL must use HTTPS" };
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return { valid: false, error: "Webhook URL cannot be a local address" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Create webhook headers with security features
 */
export function createWebhookHeaders(
  webhookId: string,
  event: string,
  signature?: string,
  customHeaders?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "EstimatePro-Webhook/1.0",
    "X-Webhook-Id": webhookId,
    "X-Webhook-Event": event,
    "X-Webhook-Timestamp": new Date().toISOString(),
    "X-Request-Id": crypto.randomUUID(),
  };

  if (signature) {
    headers["X-Webhook-Signature"] = signature;
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  return headers;
}

/**
 * Exponential backoff calculator for retries
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelaySeconds: number = 5,
  maxDelaySeconds: number = 300,
): number {
  const delay = Math.min(
    baseDelaySeconds * Math.pow(2, attemptNumber - 1),
    maxDelaySeconds,
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;

  return Math.floor(delay + jitter) * 1000; // Convert to milliseconds
}

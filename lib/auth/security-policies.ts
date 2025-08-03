/**
 * Authentication Security Policies
 * Implements rate limiting, password policies, and security validations
 */

import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
}

export interface SecurityValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Default password policy
const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // 90 days
};

// Default rate limiting configuration
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
};

/**
 * Validate password against security policy
 */
export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Length check
  if (password.length < policy.minLength) {
    errors.push(
      `Password must be at least ${policy.minLength} characters long`,
    );
  }

  // Uppercase check
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Lowercase check
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Numbers check
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Special characters check
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Common password patterns (warnings)
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      warnings.push("Password appears to use a common pattern");
      break;
    }
  }

  // Sequential characters warning
  if (/(.)\1{2,}/.test(password)) {
    warnings.push("Avoid repeating the same character multiple times");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if user is rate limited for login attempts
 */
export async function checkRateLimit(
  identifier: string, // email or IP address
  action: "login" | "password_reset" | "signup" = "login",
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
  resetTime?: Date;
}> {
  const supabaseServer = createClient();
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - config.windowMinutes * 60 * 1000,
  );

  try {
    // Get recent attempts
    const { data: attempts, error } = await supabaseServer
      .from("auth_rate_limits")
      .select("*")
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("attempted_at", windowStart.toISOString())
      .order("attempted_at", { ascending: false });

    if (error) {
      console.error("Rate limit check error:", error);
      // Allow request if we can't check rate limits
      return { allowed: true, remainingAttempts: config.maxAttempts };
    }

    const recentAttempts = attempts || [];
    const failedAttempts = recentAttempts.filter((attempt) => !attempt.success);

    // Check if user is currently locked out
    const latestFailedAttempt = failedAttempts[0];
    if (latestFailedAttempt && failedAttempts.length >= config.maxAttempts) {
      const lockoutUntil = new Date(
        new Date(latestFailedAttempt.attempted_at).getTime() +
          config.lockoutMinutes * 60 * 1000,
      );

      if (now < lockoutUntil) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutUntil,
          resetTime: lockoutUntil,
        };
      }
    }

    const remainingAttempts = Math.max(
      0,
      config.maxAttempts - failedAttempts.length,
    );
    const resetTime = new Date(
      windowStart.getTime() + config.windowMinutes * 60 * 1000,
    );

    return {
      allowed: remainingAttempts > 0,
      remainingAttempts,
      resetTime,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Allow request if we can't check rate limits
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }
}

/**
 * Record authentication attempt for rate limiting
 */
export async function recordAuthAttempt(
  identifier: string,
  action: "login" | "password_reset" | "signup",
  success: boolean,
  metadata?: Record<string, any>,
): Promise<void> {
  const supabaseServer = createClient();

  try {
    const { error } = await supabaseServer.from("auth_rate_limits").insert({
      identifier,
      action,
      success,
      attempted_at: new Date().toISOString(),
      metadata: metadata || {},
    });

    if (error) {
      console.error("Failed to record auth attempt:", error);
    }

    // Clean up old records (older than 24 hours)
    const cleanupTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await supabaseServer
      .from("auth_rate_limits")
      .delete()
      .lt("attempted_at", cleanupTime.toISOString());
  } catch (error) {
    console.error("Failed to record auth attempt:", error);
  }
}

/**
 * Validate email format and check for suspicious patterns
 */
export function validateEmailSecurity(email: string): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\+.*\+/, // Multiple plus signs
    /\.{2,}/, // Multiple consecutive dots
    /@.*@/, // Multiple @ symbols
    /[<>]/, // HTML brackets
    /javascript:/i, // JavaScript protocol
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      errors.push("Email contains suspicious characters");
      break;
    }
  }

  // Temporary/disposable email domains (basic check)
  const disposableDomains = [
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "temp-mail.org",
    "throwaway.email",
  ];

  const domain = email.toLowerCase().split("@")[1];
  if (disposableDomains.includes(domain)) {
    warnings.push("Email appears to be from a temporary email service");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate secure session configuration
 */
export function getSecureSessionConfig() {
  return {
    maxAge: 24 * 60 * 60, // 24 hours
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
  };
}

/**
 * Check if password needs to be updated based on age policy
 */
export async function checkPasswordAge(
  userId: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): Promise<{
  needsUpdate: boolean;
  daysSinceUpdate: number;
  daysUntilExpiry: number;
}> {
  const supabaseServer = createClient();

  try {
    const { data: user, error } = await supabaseServer
      .from("auth.users")
      .select("password_updated_at")
      .eq("id", userId)
      .single();

    if (error || !user?.password_updated_at) {
      // If we can't determine password age, assume it needs update
      return {
        needsUpdate: true,
        daysSinceUpdate: policy.maxAge,
        daysUntilExpiry: 0,
      };
    }

    const passwordUpdatedAt = new Date(user.password_updated_at);
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - passwordUpdatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUntilExpiry = policy.maxAge - daysSinceUpdate;

    return {
      needsUpdate: daysSinceUpdate >= policy.maxAge,
      daysSinceUpdate,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
    };
  } catch (error) {
    console.error("Failed to check password age:", error);
    return {
      needsUpdate: false,
      daysSinceUpdate: 0,
      daysUntilExpiry: policy.maxAge,
    };
  }
}

/**
 * Generate security headers for authentication responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}

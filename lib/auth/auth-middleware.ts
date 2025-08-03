/**
 * Enhanced Authentication Middleware
 * Integrates 2FA, rate limiting, and security policies
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  recordAuthAttempt,
  validatePasswordPolicy,
  validateEmailSecurity,
  getSecurityHeaders,
} from "./security-policies";
import { is2FAEnabled, verify2FAToken } from "./two-factor-auth";

export interface AuthenticationResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresTwoFactor?: boolean;
  rateLimited?: boolean;
  lockoutUntil?: Date;
}

/**
 * Enhanced login with security features
 */
export async function authenticateWithSecurity(
  email: string,
  password: string,
  twoFactorCode?: string,
  ipAddress?: string,
): Promise<AuthenticationResult> {
  const identifier = email.toLowerCase();

  try {
    // 1. Check rate limiting
    const rateLimitCheck = await checkRateLimit(identifier, "login");
    if (!rateLimitCheck.allowed) {
      await recordAuthAttempt(identifier, "login", false, {
        reason: "rate_limited",
        ip_address: ipAddress,
      });

      return {
        success: false,
        error: rateLimitCheck.lockoutUntil
          ? `Account temporarily locked. Try again after ${rateLimitCheck.lockoutUntil.toLocaleTimeString()}`
          : `Too many attempts. ${rateLimitCheck.remainingAttempts} remaining.`,
        rateLimited: true,
        lockoutUntil: rateLimitCheck.lockoutUntil,
      };
    }

    // 2. Validate email format
    const emailValidation = validateEmailSecurity(email);
    if (!emailValidation.valid) {
      await recordAuthAttempt(identifier, "login", false, {
        reason: "invalid_email",
        errors: emailValidation.errors,
      });

      return {
        success: false,
        error: "Invalid email format",
      };
    }

    // 3. Attempt authentication with Supabase
    const supabaseServer = createClient();
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      await recordAuthAttempt(identifier, "login", false, {
        reason: "invalid_credentials",
        error: error?.message,
        ip_address: ipAddress,
      });

      return {
        success: false,
        error: error?.message || "Authentication failed",
      };
    }

    // 4. Check if 2FA is enabled
    const requires2FA = await is2FAEnabled(data.user.id);
    if (requires2FA) {
      if (!twoFactorCode) {
        // 2FA required but not provided
        return {
          success: false,
          requiresTwoFactor: true,
          error: "Two-factor authentication required",
        };
      }

      // Verify 2FA code
      const twoFactorResult = await verify2FAToken(data.user.id, twoFactorCode);
      if (!twoFactorResult.success) {
        await recordAuthAttempt(identifier, "login", false, {
          reason: "invalid_2fa",
          error: twoFactorResult.error,
          ip_address: ipAddress,
        });

        return {
          success: false,
          error: twoFactorResult.error || "Invalid two-factor code",
          requiresTwoFactor: true,
        };
      }
    }

    // 5. Success - record successful attempt
    await recordAuthAttempt(identifier, "login", true, {
      user_id: data.user.id,
      ip_address: ipAddress,
      two_factor_used: requires2FA,
    });

    // 6. Create session record
    await createSessionRecord(
      data.user.id,
      data.session?.access_token,
      ipAddress,
    );

    // 7. Log security event
    await logSecurityEvent(data.user.id, "login_success", "low", {
      ip_address: ipAddress,
      two_factor_used: requires2FA,
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error: any) {
    console.error("Authentication error:", error);

    await recordAuthAttempt(identifier, "login", false, {
      reason: "system_error",
      error: error.message,
    });

    return {
      success: false,
      error: "System error during authentication",
    };
  }
}

/**
 * Enhanced registration with security validation
 */
export async function registerWithSecurity(
  email: string,
  password: string,
  fullName: string,
  companyName?: string,
  ipAddress?: string,
): Promise<AuthenticationResult> {
  const identifier = email.toLowerCase();

  try {
    // 1. Check rate limiting for signup
    const rateLimitCheck = await checkRateLimit(identifier, "signup");
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: "Too many registration attempts. Please try again later.",
        rateLimited: true,
      };
    }

    // 2. Validate email
    const emailValidation = validateEmailSecurity(email);
    if (!emailValidation.valid) {
      await recordAuthAttempt(identifier, "signup", false, {
        reason: "invalid_email",
        errors: emailValidation.errors,
      });

      return {
        success: false,
        error: emailValidation.errors.join(", "),
      };
    }

    // 3. Validate password policy
    const passwordValidation = validatePasswordPolicy(password);
    if (!passwordValidation.valid) {
      await recordAuthAttempt(identifier, "signup", false, {
        reason: "weak_password",
        errors: passwordValidation.errors,
      });

      return {
        success: false,
        error: passwordValidation.errors.join(", "),
      };
    }

    // 4. Attempt registration
    const supabaseServer = createClient();
    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName || "",
        },
      },
    });

    if (error) {
      await recordAuthAttempt(identifier, "signup", false, {
        reason: "registration_failed",
        error: error.message,
        ip_address: ipAddress,
      });

      return {
        success: false,
        error: error.message,
      };
    }

    // 5. Success
    await recordAuthAttempt(identifier, "signup", true, {
      user_id: data.user?.id,
      ip_address: ipAddress,
    });

    if (data.user) {
      await logSecurityEvent(data.user.id, "account_created", "low", {
        ip_address: ipAddress,
        email: email,
      });
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error: any) {
    console.error("Registration error:", error);

    await recordAuthAttempt(identifier, "signup", false, {
      reason: "system_error",
      error: error.message,
    });

    return {
      success: false,
      error: "System error during registration",
    };
  }
}

/**
 * Password reset with rate limiting
 */
export async function requestPasswordResetWithSecurity(
  email: string,
  ipAddress?: string,
): Promise<{ success: boolean; error?: string }> {
  const identifier = email.toLowerCase();

  try {
    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(identifier, "password_reset");
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: "Too many password reset attempts. Please try again later.",
      };
    }

    // Validate email
    const emailValidation = validateEmailSecurity(email);
    if (!emailValidation.valid) {
      await recordAuthAttempt(identifier, "password_reset", false, {
        reason: "invalid_email",
        errors: emailValidation.errors,
      });

      return {
        success: false,
        error: "Invalid email format",
      };
    }

    const supabaseServer = createClient();
    const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    });

    const success = !error;
    await recordAuthAttempt(identifier, "password_reset", success, {
      ip_address: ipAddress,
      error: error?.message,
    });

    if (success) {
      // Don't reveal if user exists for security
      return { success: true };
    } else {
      return {
        success: false,
        error: error?.message || "Failed to send reset email",
      };
    }
  } catch (error: any) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error: "System error during password reset",
    };
  }
}

/**
 * Create session record for tracking
 */
async function createSessionRecord(
  userId: string,
  sessionToken?: string,
  ipAddress?: string,
): Promise<void> {
  if (!sessionToken) return;

  try {
    const supabaseServer = createClient();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await supabaseServer.from("user_sessions").insert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      is_active: true,
    });
  } catch (error) {
    console.error("Failed to create session record:", error);
  }
}

/**
 * Log security event
 */
async function logSecurityEvent(
  userId: string,
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    const supabaseServer = createClient();

    await supabaseServer.from("auth_security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity,
      description: getEventDescription(eventType),
      metadata,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Get human-readable description for security events
 */
function getEventDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    login_success: "User successfully logged in",
    login_failed: "Failed login attempt",
    account_created: "New user account created",
    password_reset_requested: "Password reset requested",
    two_factor_enabled: "Two-factor authentication enabled",
    two_factor_disabled: "Two-factor authentication disabled",
    suspicious_activity: "Suspicious activity detected",
  };

  return descriptions[eventType] || `Security event: ${eventType}`;
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withAuthSecurity(handler: any) {
  return async (req: NextRequest) => {
    const response = await handler(req);

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

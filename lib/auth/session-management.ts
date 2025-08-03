/**
 * Session Management Service
 * Handles session timeout, concurrent session limits, and active session tracking
 */

import { createClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase/client";

export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  warningBeforeTimeoutMinutes: number;
  extendSessionOnActivity: boolean;
  maxIdleTimeMinutes: number;
}

export interface SessionInfo {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionInfo;
  error?: string;
  requiresRefresh?: boolean;
  timeUntilExpiry?: number;
  warningThreshold?: boolean;
}

// Default session configuration
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxConcurrentSessions: 3,
  sessionTimeoutMinutes: 24 * 60, // 24 hours
  warningBeforeTimeoutMinutes: 15, // 15 minutes
  extendSessionOnActivity: true,
  maxIdleTimeMinutes: 60, // 1 hour
};

/**
 * Create a new session record
 */
export async function createSession(
  userId: string,
  sessionToken: string,
  ipAddress?: string,
  userAgent?: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const supabaseServer = createClient();

  try {
    // Check concurrent session limit
    const { data: activeSessions, error: checkError } = await supabaseServer
      .from("user_sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (checkError) {
      console.error("Failed to check active sessions:", checkError);
      return { success: false, error: "Failed to validate session limits" };
    }

    // Remove oldest sessions if limit exceeded
    if (
      activeSessions &&
      activeSessions.length >= config.maxConcurrentSessions
    ) {
      const sessionsToRemove = activeSessions.slice(
        config.maxConcurrentSessions - 1,
      );
      const sessionIdsToRemove = sessionsToRemove.map((s) => s.id);

      await supabaseServer
        .from("user_sessions")
        .update({ is_active: false })
        .in("id", sessionIdsToRemove);
    }

    // Create new session
    const expiresAt = new Date(
      Date.now() + config.sessionTimeoutMinutes * 60 * 1000,
    );
    const { data: newSession, error: createError } = await supabaseServer
      .from("user_sessions")
      .insert({
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true,
        last_activity: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Failed to create session:", createError);
      return { success: false, error: "Failed to create session" };
    }

    return { success: true, sessionId: newSession.id };
  } catch (error: any) {
    console.error("Session creation error:", error);
    return { success: false, error: "System error during session creation" };
  }
}

/**
 * Validate and refresh session if needed
 */
export async function validateSession(
  sessionToken: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): Promise<SessionValidationResult> {
  const supabaseServer = createClient();

  try {
    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .single();

    if (error || !session) {
      return { valid: false, error: "Session not found" };
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity);

    // Check if session has expired
    if (now > expiresAt) {
      await invalidateSession(sessionToken);
      return { valid: false, error: "Session expired" };
    }

    // Check idle timeout
    const idleTime = now.getTime() - lastActivity.getTime();
    const maxIdleTime = config.maxIdleTimeMinutes * 60 * 1000;

    if (idleTime > maxIdleTime) {
      await invalidateSession(sessionToken);
      return { valid: false, error: "Session idle timeout" };
    }

    // Calculate time until expiry
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const warningThreshold = config.warningBeforeTimeoutMinutes * 60 * 1000;
    const warningNeeded = timeUntilExpiry <= warningThreshold;

    // Update last activity if configured
    if (config.extendSessionOnActivity) {
      await updateSessionActivity(sessionToken);
    }

    const sessionInfo: SessionInfo = {
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: expiresAt,
      lastActivity: lastActivity,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isActive: session.is_active,
      createdAt: new Date(session.created_at),
    };

    return {
      valid: true,
      session: sessionInfo,
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000), // in seconds
      warningThreshold: warningNeeded,
      requiresRefresh: warningNeeded,
    };
  } catch (error: any) {
    console.error("Session validation error:", error);
    return { valid: false, error: "System error during session validation" };
  }
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(
  sessionToken: string,
): Promise<void> {
  const supabaseServer = createClient();

  try {
    await supabaseServer
      .from("user_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("session_token", sessionToken)
      .eq("is_active", true);
  } catch (error) {
    console.error("Failed to update session activity:", error);
  }
}

/**
 * Extend session expiry time
 */
export async function extendSession(
  sessionToken: string,
  additionalMinutes: number = DEFAULT_SESSION_CONFIG.sessionTimeoutMinutes,
): Promise<{ success: boolean; newExpiryTime?: Date; error?: string }> {
  const supabaseServer = createClient();

  try {
    const newExpiryTime = new Date(Date.now() + additionalMinutes * 60 * 1000);

    const { error } = await supabaseServer
      .from("user_sessions")
      .update({
        expires_at: newExpiryTime.toISOString(),
        last_activity: new Date().toISOString(),
      })
      .eq("session_token", sessionToken)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to extend session:", error);
      return { success: false, error: "Failed to extend session" };
    }

    return { success: true, newExpiryTime };
  } catch (error: any) {
    console.error("Session extension error:", error);
    return { success: false, error: "System error during session extension" };
  }
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
  const supabaseServer = createClient();

  try {
    await supabaseServer
      .from("user_sessions")
      .update({ is_active: false })
      .eq("session_token", sessionToken);
  } catch (error) {
    console.error("Failed to invalidate session:", error);
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const supabaseServer = createClient();

  try {
    await supabaseServer
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Failed to invalidate user sessions:", error);
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserActiveSessions(
  userId: string,
): Promise<SessionInfo[]> {
  const supabaseServer = createClient();

  try {
    const { data: sessions, error } = await supabaseServer
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("Failed to get user sessions:", error);
      return [];
    }

    return (sessions || []).map((session) => ({
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: new Date(session.expires_at),
      lastActivity: new Date(session.last_activity),
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isActive: session.is_active,
      createdAt: new Date(session.created_at),
    }));
  } catch (error: any) {
    console.error("Get user sessions error:", error);
    return [];
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabaseServer = createClient();

  try {
    const { count, error } = await supabaseServer
      .from("user_sessions")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    if (error) {
      console.error("Failed to cleanup expired sessions:", error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error("Session cleanup error:", error);
    return 0;
  }
}

/**
 * Get session statistics for a user
 */
export async function getSessionStatistics(userId: string): Promise<{
  activeSessions: number;
  totalSessions: number;
  lastActivity: Date | null;
  oldestActiveSession: Date | null;
}> {
  const supabaseServer = createClient();

  try {
    // Get active sessions count
    const { count: activeCount } = await supabaseServer
      .from("user_sessions")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_active", true);

    // Get total sessions count
    const { count: totalCount } = await supabaseServer
      .from("user_sessions")
      .select("id", { count: "exact" })
      .eq("user_id", userId);

    // Get latest activity
    const { data: latestSession } = await supabaseServer
      .from("user_sessions")
      .select("last_activity")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false })
      .limit(1)
      .single();

    // Get oldest active session
    const { data: oldestSession } = await supabaseServer
      .from("user_sessions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return {
      activeSessions: activeCount || 0,
      totalSessions: totalCount || 0,
      lastActivity: latestSession
        ? new Date(latestSession.last_activity)
        : null,
      oldestActiveSession: oldestSession
        ? new Date(oldestSession.created_at)
        : null,
    };
  } catch (error: any) {
    console.error("Get session statistics error:", error);
    return {
      activeSessions: 0,
      totalSessions: 0,
      lastActivity: null,
      oldestActiveSession: null,
    };
  }
}

/**
 * Client-side session timeout warning hook
 */
export function useSessionTimeout(
  sessionToken: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
) {
  // This would be implemented as a React hook for client-side usage
  // Returns session status, warning state, and extend function
  return {
    isValid: true,
    timeRemaining: 0,
    showWarning: false,
    extendSession: () => {},
    logout: () => {},
  };
}

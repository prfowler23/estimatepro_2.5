/**
 * Enhanced Security Monitoring and RLS Validation System
 *
 * Features:
 * - Real-time security event detection
 * - Automated RLS policy validation
 * - Security metrics and alerting
 * - Threat pattern analysis
 * - Automated security responses
 * - Compliance monitoring
 */

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Security event types
const SecurityEventType = z.enum([
  "unauthorized_access",
  "policy_violation",
  "suspicious_query",
  "rate_limit_exceeded",
  "authentication_failure",
  "data_export_attempt",
  "privilege_escalation",
  "sql_injection_attempt",
  "xss_attempt",
  "brute_force_attempt",
]);

// Security event schema
const SecurityEventSchema = z.object({
  id: z.string(),
  type: SecurityEventType,
  severity: z.enum(["low", "medium", "high", "critical"]),
  timestamp: z.date(),
  userId: z.string().nullable(),
  sessionId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  resourcePath: z.string().nullable(),
  query: z.string().nullable(),
  metadata: z.record(z.unknown()),
  resolved: z.boolean().default(false),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().nullable(),
});

type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// RLS Policy validation result
interface RLSPolicyValidation {
  tableName: string;
  hasRLSEnabled: boolean;
  policies: Array<{
    name: string;
    command: string;
    role: string;
    definition: string;
    withCheck: string | null;
  }>;
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    type: string;
    description: string;
    recommendation: string;
  }>;
  score: number; // 0-100
}

// Security metrics
interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsLast24h: number;
  eventsLast7d: number;
  topAttackers: Array<{ ip: string; count: number }>;
  topTargets: Array<{ resource: string; count: number }>;
  resolutionRate: number;
  avgResolutionTime: number;
  securityScore: number; // 0-100
  lastUpdate: Date;
}

// Security configuration
interface SecurityConfig {
  enableRealTimeMonitoring: boolean;
  enableAutoBlocking: boolean;
  enableRLSValidation: boolean;
  enableThreatAnalysis: boolean;
  rateLimitThreshold: number;
  bruteForceThreshold: number;
  autoBlockDuration: number; // minutes
  alertWebhookUrl?: string;
  slackWebhookUrl?: string;
  notificationEmail?: string;
}

// Threat pattern interface
interface ThreatPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  responseAction: "log" | "block" | "alert";
  enabled: boolean;
}

/**
 * Enhanced Security Monitor with comprehensive threat detection
 */
export class EnhancedSecurityMonitor {
  private events: SecurityEvent[] = [];
  private blockedIps = new Set<string>();
  private rateLimitTracker = new Map<
    string,
    { count: number; lastReset: number }
  >();
  private threatPatterns: ThreatPattern[] = [];
  private supabase: any;
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      enableAutoBlocking: true,
      enableRLSValidation: true,
      enableThreatAnalysis: true,
      rateLimitThreshold: 100,
      bruteForceThreshold: 5,
      autoBlockDuration: 60,
      ...config,
    };

    this.initializeSupabaseClient();
    this.initializeThreatPatterns();
    this.startMonitoring();
  }

  private initializeSupabaseClient(): void {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn(
        "Supabase credentials not found - security monitoring disabled",
      );
      return;
    }

    this.supabase = createClient(url, key);
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        id: "sql_injection_union",
        name: "SQL Injection - UNION Attack",
        pattern: /\bunion\s+(all\s+)?select\b/gi,
        description: "Detects UNION-based SQL injection attempts",
        severity: "critical",
        responseAction: "block",
        enabled: true,
      },
      {
        id: "sql_injection_or",
        name: "SQL Injection - OR 1=1",
        pattern: /\bor\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
        description: "Detects OR-based SQL injection attempts",
        severity: "high",
        responseAction: "block",
        enabled: true,
      },
      {
        id: "xss_script_tag",
        name: "XSS - Script Tag Injection",
        pattern: /<script[^>]*>.*?<\/script>/gi,
        description: "Detects script tag injection attempts",
        severity: "high",
        responseAction: "block",
        enabled: true,
      },
      {
        id: "xss_javascript_protocol",
        name: "XSS - JavaScript Protocol",
        pattern: /javascript\s*:/gi,
        description: "Detects javascript: protocol injection",
        severity: "medium",
        responseAction: "alert",
        enabled: true,
      },
      {
        id: "path_traversal",
        name: "Path Traversal Attack",
        pattern: /\.{2}[\/\\]/g,
        description: "Detects directory traversal attempts",
        severity: "high",
        responseAction: "block",
        enabled: true,
      },
      {
        id: "suspicious_user_agents",
        name: "Suspicious User Agents",
        pattern: /sqlmap|nikto|nmap|masscan|gobuster|dirb|wfuzz/gi,
        description: "Detects known attack tools in User-Agent",
        severity: "medium",
        responseAction: "alert",
        enabled: true,
      },
    ];
  }

  /**
   * Log security event with real-time analysis
   */
  async logSecurityEvent(
    type: z.infer<typeof SecurityEventType>,
    details: {
      severity?: "low" | "medium" | "high" | "critical";
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      resourcePath?: string;
      query?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<string> {
    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: details.severity || "medium",
      timestamp: new Date(),
      userId: details.userId || null,
      sessionId: details.sessionId || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      resourcePath: details.resourcePath || null,
      query: details.query || null,
      metadata: details.metadata || {},
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
    };

    // Validate event
    try {
      SecurityEventSchema.parse(event);
    } catch (error) {
      console.error("Invalid security event:", error);
      return "";
    }

    // Store event
    this.events.push(event);

    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Persist to database if available
    if (this.supabase) {
      try {
        await this.supabase.from("security_events").insert({
          id: event.id,
          type: event.type,
          severity: event.severity,
          timestamp: event.timestamp.toISOString(),
          user_id: event.userId,
          session_id: event.sessionId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          resource_path: event.resourcePath,
          query: event.query,
          metadata: event.metadata,
        });
      } catch (error) {
        console.error("Failed to persist security event:", error);
      }
    }

    // Analyze threat and take action
    await this.analyzeThreatAndRespond(event);

    return event.id;
  }

  /**
   * Analyze incoming request for security threats
   */
  async analyzeRequest(request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    query?: Record<string, string>;
    params?: Record<string, string>;
  }): Promise<{
    allowed: boolean;
    threats: Array<{ pattern: string; severity: string }>;
    securityEventId?: string;
  }> {
    const threats: Array<{ pattern: string; severity: string }> = [];
    const ipAddress =
      request.headers["x-forwarded-for"] ||
      request.headers["x-real-ip"] ||
      "unknown";
    const userAgent = request.headers["user-agent"] || "unknown";

    // Check if IP is blocked
    if (this.blockedIps.has(ipAddress)) {
      const eventId = await this.logSecurityEvent("unauthorized_access", {
        severity: "high",
        ipAddress,
        userAgent,
        resourcePath: request.url,
        metadata: { reason: "blocked_ip", method: request.method },
      });

      return {
        allowed: false,
        threats: [{ pattern: "blocked_ip", severity: "high" }],
        securityEventId: eventId,
      };
    }

    // Check rate limiting
    if (!this.checkRateLimit(ipAddress)) {
      const eventId = await this.logSecurityEvent("rate_limit_exceeded", {
        severity: "medium",
        ipAddress,
        userAgent,
        resourcePath: request.url,
        metadata: { threshold: this.config.rateLimitThreshold },
      });

      return {
        allowed: false,
        threats: [{ pattern: "rate_limit_exceeded", severity: "medium" }],
        securityEventId: eventId,
      };
    }

    // Analyze against threat patterns
    const allContent = [
      request.url,
      request.body || "",
      JSON.stringify(request.query || {}),
      JSON.stringify(request.params || {}),
      userAgent,
    ].join(" ");

    for (const pattern of this.threatPatterns) {
      if (!pattern.enabled) continue;

      if (pattern.pattern.test(allContent)) {
        threats.push({
          pattern: pattern.name,
          severity: pattern.severity,
        });

        // Log security event
        const eventId = await this.logSecurityEvent("suspicious_query", {
          severity: pattern.severity,
          ipAddress,
          userAgent,
          resourcePath: request.url,
          query: request.body,
          metadata: {
            pattern: pattern.id,
            matched_content:
              allContent.match(pattern.pattern)?.[0] || "unknown",
          },
        });

        // Take action based on pattern
        if (pattern.responseAction === "block") {
          if (pattern.severity === "critical" || pattern.severity === "high") {
            this.blockIp(ipAddress, this.config.autoBlockDuration);
          }
          return {
            allowed: false,
            threats,
            securityEventId: eventId,
          };
        }
      }
    }

    return {
      allowed: true,
      threats,
    };
  }

  /**
   * Comprehensive RLS policy validation
   */
  async validateRLSPolicies(): Promise<RLSPolicyValidation[]> {
    if (!this.supabase) {
      throw new Error("Supabase client not initialized");
    }

    const results: RLSPolicyValidation[] = [];

    try {
      // Get all tables in public schema
      const { data: tables, error: tablesError } = await this.supabase.rpc(
        "get_tables_with_rls",
      );

      if (tablesError) {
        console.error("Failed to fetch tables:", tablesError);
        return results;
      }

      for (const table of tables || []) {
        const validation = await this.validateTableRLS(table.table_name);
        results.push(validation);
      }

      return results;
    } catch (error) {
      console.error("RLS validation failed:", error);
      return results;
    }
  }

  /**
   * Validate RLS policies for a specific table
   */
  private async validateTableRLS(
    tableName: string,
  ): Promise<RLSPolicyValidation> {
    const validation: RLSPolicyValidation = {
      tableName,
      hasRLSEnabled: false,
      policies: [],
      issues: [],
      score: 0,
    };

    try {
      // Check if RLS is enabled
      const { data: rlsStatus } = await this.supabase.rpc("check_rls_enabled", {
        table_name: tableName,
      });

      validation.hasRLSEnabled = rlsStatus?.rls_enabled || false;

      if (!validation.hasRLSEnabled) {
        validation.issues.push({
          severity: "critical",
          type: "rls_disabled",
          description: `RLS is disabled for table ${tableName}`,
          recommendation: `Enable RLS: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
        });
      }

      // Get policies for the table
      const { data: policies } = await this.supabase.rpc("get_table_policies", {
        table_name: tableName,
      });

      validation.policies = policies || [];

      // Analyze policies
      this.analyzePolicies(validation);

      // Calculate security score
      validation.score = this.calculateSecurityScore(validation);
    } catch (error) {
      console.error(`RLS validation failed for table ${tableName}:`, error);
      validation.issues.push({
        severity: "high",
        type: "validation_error",
        description: `Failed to validate RLS policies: ${error}`,
        recommendation: "Check database connectivity and permissions",
      });
    }

    return validation;
  }

  private analyzePolicies(validation: RLSPolicyValidation): void {
    const { policies, tableName } = validation;

    // Check for basic CRUD policies
    const commands = new Set(policies.map((p) => p.command));
    const expectedCommands = ["SELECT", "INSERT", "UPDATE", "DELETE"];

    for (const cmd of expectedCommands) {
      if (!commands.has(cmd)) {
        validation.issues.push({
          severity: "medium",
          type: "missing_policy",
          description: `Missing ${cmd} policy for table ${tableName}`,
          recommendation: `Create a ${cmd} policy with appropriate user restrictions`,
        });
      }
    }

    // Check for overly permissive policies
    for (const policy of policies) {
      if (policy.definition === "true" || policy.withCheck === "true") {
        validation.issues.push({
          severity: "high",
          type: "permissive_policy",
          description: `Policy ${policy.name} allows unrestricted access`,
          recommendation: "Add proper user/role restrictions to the policy",
        });
      }

      // Check for user isolation
      if (
        !policy.definition.includes("auth.uid()") &&
        !policy.definition.includes("auth.role()")
      ) {
        validation.issues.push({
          severity: "medium",
          type: "no_user_isolation",
          description: `Policy ${policy.name} doesn't implement user isolation`,
          recommendation: "Add auth.uid() or role-based restrictions",
        });
      }
    }

    // Check for duplicate policies
    const policyNames = policies.map((p) => p.name);
    const duplicates = policyNames.filter(
      (name, index) => policyNames.indexOf(name) !== index,
    );

    if (duplicates.length > 0) {
      validation.issues.push({
        severity: "low",
        type: "duplicate_policies",
        description: `Duplicate policy names found: ${duplicates.join(", ")}`,
        recommendation: "Remove duplicate policies to avoid confusion",
      });
    }
  }

  private calculateSecurityScore(validation: RLSPolicyValidation): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of validation.issues) {
      switch (issue.severity) {
        case "critical":
          score -= 30;
          break;
        case "high":
          score -= 20;
          break;
        case "medium":
          score -= 10;
          break;
        case "low":
          score -= 5;
          break;
      }
    }

    // Bonus for having policies
    if (validation.policies.length > 0) {
      score += Math.min(validation.policies.length * 2, 10);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get comprehensive security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const eventsLast24h = this.events.filter(
      (e) => e.timestamp.getTime() > last24h,
    ).length;
    const eventsLast7d = this.events.filter(
      (e) => e.timestamp.getTime() > last7d,
    ).length;

    // Group events by type
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};

    let resolvedEvents = 0;
    let totalResolutionTime = 0;

    for (const event of this.events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;

      // Count by IP
      if (event.ipAddress) {
        ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
      }

      // Count by resource
      if (event.resourcePath) {
        resourceCounts[event.resourcePath] =
          (resourceCounts[event.resourcePath] || 0) + 1;
      }

      // Resolution metrics
      if (event.resolved && event.resolvedAt) {
        resolvedEvents++;
        totalResolutionTime +=
          event.resolvedAt.getTime() - event.timestamp.getTime();
      }
    }

    // Top attackers (by IP)
    const topAttackers = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Top targets (by resource)
    const topTargets = Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    // Calculate security score
    const criticalEvents = eventsBySeverity["critical"] || 0;
    const highEvents = eventsBySeverity["high"] || 0;
    const securityScore = Math.max(
      0,
      100 - criticalEvents * 10 - highEvents * 5,
    );

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      eventsLast24h,
      eventsLast7d,
      topAttackers,
      topTargets,
      resolutionRate:
        this.events.length > 0
          ? (resolvedEvents / this.events.length) * 100
          : 0,
      avgResolutionTime:
        resolvedEvents > 0 ? totalResolutionTime / resolvedEvents : 0,
      securityScore,
      lastUpdate: new Date(),
    };
  }

  /**
   * Block IP address for specified duration
   */
  private blockIp(ipAddress: string, durationMinutes: number): void {
    this.blockedIps.add(ipAddress);

    // Auto-unblock after duration
    setTimeout(
      () => {
        this.blockedIps.delete(ipAddress);
        console.log(`Auto-unblocked IP: ${ipAddress}`);
      },
      durationMinutes * 60 * 1000,
    );

    console.log(`Blocked IP: ${ipAddress} for ${durationMinutes} minutes`);
  }

  /**
   * Check rate limit for IP address
   */
  private checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    const windowSize = 60 * 1000; // 1 minute window

    const tracker = this.rateLimitTracker.get(ipAddress);

    if (!tracker || now - tracker.lastReset > windowSize) {
      this.rateLimitTracker.set(ipAddress, { count: 1, lastReset: now });
      return true;
    }

    tracker.count++;

    if (tracker.count > this.config.rateLimitThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Analyze threat and respond appropriately
   */
  private async analyzeThreatAndRespond(event: SecurityEvent): Promise<void> {
    // Pattern-based response
    if (event.type === "brute_force_attempt" && event.severity === "high") {
      if (event.ipAddress) {
        this.blockIp(event.ipAddress, this.config.autoBlockDuration);
      }
    }

    // Send alerts for critical events
    if (event.severity === "critical") {
      await this.sendSecurityAlert(event);
    }

    // Auto-resolve certain low-severity events
    if (event.severity === "low" && event.type === "suspicious_query") {
      this.resolveSecurityEvent(
        event.id,
        "system",
        "Auto-resolved low severity event",
      );
    }
  }

  /**
   * Send security alert via configured channels
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    const alertData = {
      title: `🚨 Critical Security Event: ${event.type}`,
      description: `Security event detected at ${event.timestamp.toISOString()}`,
      fields: {
        "Event Type": event.type,
        Severity: event.severity,
        "IP Address": event.ipAddress || "Unknown",
        Resource: event.resourcePath || "Unknown",
        "User ID": event.userId || "Anonymous",
      },
      timestamp: event.timestamp.toISOString(),
    };

    // Send to webhook if configured
    if (this.config.alertWebhookUrl) {
      try {
        await fetch(this.config.alertWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alertData),
        });
      } catch (error) {
        console.error("Failed to send webhook alert:", error);
      }
    }

    // Send to Slack if configured
    if (this.config.slackWebhookUrl) {
      try {
        await fetch(this.config.slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: alertData.title,
            attachments: [
              {
                color: "danger",
                fields: Object.entries(alertData.fields).map(
                  ([title, value]) => ({
                    title,
                    value: String(value),
                    short: true,
                  }),
                ),
              },
            ],
          }),
        });
      } catch (error) {
        console.error("Failed to send Slack alert:", error);
      }
    }
  }

  /**
   * Resolve security event
   */
  resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    notes?: string,
  ): boolean {
    const event = this.events.find((e) => e.id === eventId);

    if (!event) {
      return false;
    }

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;

    if (notes) {
      event.metadata.resolutionNotes = notes;
    }

    // Update in database if available
    if (this.supabase) {
      this.supabase
        .from("security_events")
        .update({
          resolved: true,
          resolved_at: event.resolvedAt.toISOString(),
          resolved_by: resolvedBy,
          metadata: event.metadata,
        })
        .eq("id", eventId)
        .then(() => console.log(`Security event ${eventId} resolved`))
        .catch((error: any) =>
          console.error("Failed to update resolved event:", error),
        );
    }

    return true;
  }

  /**
   * Start real-time monitoring
   */
  private startMonitoring(): void {
    if (!this.config.enableRealTimeMonitoring) return;

    // Periodic cleanup of old events
    setInterval(
      () => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
        this.events = this.events.filter((e) => e.timestamp.getTime() > cutoff);
      },
      60 * 60 * 1000,
    ); // Every hour

    // Periodic RLS validation if enabled
    if (this.config.enableRLSValidation) {
      setInterval(
        async () => {
          try {
            const validations = await this.validateRLSPolicies();
            const issues = validations.flatMap((v) =>
              v.issues.filter((i) => i.severity === "critical"),
            );

            if (issues.length > 0) {
              await this.logSecurityEvent("policy_violation", {
                severity: "high",
                metadata: {
                  type: "rls_validation",
                  criticalIssues: issues.length,
                  issues: issues.slice(0, 5), // Limit to first 5 issues
                },
              });
            }
          } catch (error) {
            console.error("Periodic RLS validation failed:", error);
          }
        },
        6 * 60 * 60 * 1000,
      ); // Every 6 hours
    }

    console.log("🛡️ Enhanced security monitoring started");
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit = 100): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(
    severity: "low" | "medium" | "high" | "critical",
  ): SecurityEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  /**
   * Clear resolved events older than specified days
   */
  clearOldResolvedEvents(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const initialLength = this.events.length;

    this.events = this.events.filter(
      (e) => !e.resolved || e.timestamp.getTime() > cutoff,
    );

    return initialLength - this.events.length;
  }
}

// Singleton instance
let securityMonitorInstance: EnhancedSecurityMonitor | null = null;

/**
 * Get global security monitor instance
 */
export function getSecurityMonitor(
  config?: Partial<SecurityConfig>,
): EnhancedSecurityMonitor {
  if (!securityMonitorInstance) {
    securityMonitorInstance = new EnhancedSecurityMonitor(config);
  }
  return securityMonitorInstance;
}

/**
 * Middleware function for Next.js API routes
 */
export function withSecurityMonitoring(
  handler: (req: any, res: any) => Promise<void>,
) {
  return async (req: any, res: any) => {
    const monitor = getSecurityMonitor();

    // Analyze request for threats
    const analysis = await monitor.analyzeRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: JSON.stringify(req.body),
      query: req.query,
      params: req.params,
    });

    // Block if threats detected
    if (!analysis.allowed) {
      return res.status(403).json({
        error: "Request blocked by security monitor",
        threats: analysis.threats,
        eventId: analysis.securityEventId,
      });
    }

    // Log suspicious activity
    if (analysis.threats.length > 0) {
      console.warn("Suspicious activity detected:", analysis.threats);
    }

    // Continue with original handler
    return handler(req, res);
  };
}

// Export types
export type {
  SecurityEvent,
  SecurityMetrics,
  SecurityConfig,
  RLSPolicyValidation,
  ThreatPattern,
};

// Default export
export default EnhancedSecurityMonitor;

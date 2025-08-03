// Comprehensive Audit Trail and Compliance System
// Tracks all user actions, data changes, and system events for regulatory compliance

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";

// Audit Event Types
export type AuditEventType =
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "estimate_created"
  | "estimate_updated"
  | "estimate_deleted"
  | "estimate_approved"
  | "estimate_rejected"
  | "estimate_sent"
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "integration_created"
  | "integration_updated"
  | "integration_deleted"
  | "integration_sync"
  | "file_uploaded"
  | "file_downloaded"
  | "file_deleted"
  | "ai_analysis_performed"
  | "report_generated"
  | "export_performed"
  | "settings_updated"
  | "backup_created"
  | "backup_restored"
  | "data_purged"
  | "compliance_check"
  | "security_violation"
  | "system_error"
  | "api_access"
  | "webhook_received"
  | "webhook_sent"
  | "permission_granted"
  | "permission_revoked"
  | "session_expired"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "suspicious_activity";

// Audit Severity Levels
export type AuditSeverity = "low" | "medium" | "high" | "critical";

// Compliance Standards
export type ComplianceStandard =
  | "gdpr"
  | "ccpa"
  | "hipaa"
  | "sox"
  | "pci_dss"
  | "iso_27001"
  | "nist"
  | "custom";

// Audit Event Schema
export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  user_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  action: z.string(),
  details: z.record(z.any()).default({}),
  old_values: z.record(z.any()).optional(),
  new_values: z.record(z.any()).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().optional(),
  location: z
    .object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  compliance_tags: z.array(z.string()).default([]),
  retention_period: z.number().optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Audit Configuration Schema
export const AuditConfigSchema = z.object({
  enabled: z.boolean().default(true),
  retention_days: z.number().default(2555), // 7 years default
  auto_purge: z.boolean().default(true),
  compliance_standards: z.array(z.string()).default(["gdpr"]),
  sensitive_fields: z.array(z.string()).default([]),
  encryption_enabled: z.boolean().default(true),
  real_time_alerts: z.boolean().default(true),
  alert_thresholds: z
    .object({
      failed_logins: z.number().default(5),
      suspicious_activity: z.number().default(3),
      data_export_volume: z.number().default(1000),
    })
    .default({}),
  excluded_events: z.array(z.string()).default([]),
  anonymization_rules: z.record(z.string()).default({}),
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;

// Data Change Tracking
export interface DataChange {
  field: string;
  old_value: any;
  new_value: any;
  change_type: "created" | "updated" | "deleted";
  sensitive: boolean;
}

// Compliance Report Interface
export interface ComplianceReport {
  id: string;
  standard: ComplianceStandard;
  period_start: string;
  period_end: string;
  total_events: number;
  events_by_type: Record<string, number>;
  violations: ComplianceViolation[];
  recommendations: string[];
  status: "compliant" | "non_compliant" | "warning";
  generated_at: string;
  generated_by: string;
}

// Compliance Violation Interface
export interface ComplianceViolation {
  id: string;
  standard: ComplianceStandard;
  rule: string;
  severity: AuditSeverity;
  description: string;
  event_ids: string[];
  remediation_required: boolean;
  remediation_steps: string[];
  detected_at: string;
  resolved_at?: string;
}

// Enhanced Audit System Class
export class AuditSystem {
  private static instance: AuditSystem;
  private config: AuditConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): AuditSystem {
    if (!AuditSystem.instance) {
      AuditSystem.instance = new AuditSystem();
    }
    return AuditSystem.instance;
  }

  // Core Audit Logging
  async logEvent(eventData: Partial<AuditEvent>): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    try {
      const event: AuditEvent = {
        id: crypto.randomUUID(),
        event_type: eventData.event_type!,
        severity: eventData.severity || "medium",
        user_id: eventData.user_id,
        session_id: eventData.session_id,
        resource_type: eventData.resource_type,
        resource_id: eventData.resource_id,
        action: eventData.action!,
        details: eventData.details || {},
        old_values: eventData.old_values,
        new_values: eventData.new_values,
        ip_address: eventData.ip_address,
        user_agent: eventData.user_agent,
        location: eventData.location,
        compliance_tags: eventData.compliance_tags || [],
        retention_period:
          eventData.retention_period || this.config.retention_days,
        created_at: new Date().toISOString(),
        expires_at:
          eventData.expires_at ||
          this.calculateExpirationDate(eventData.retention_period),
      };

      // Validate event
      const validatedEvent = AuditEventSchema.parse(event);

      // Apply anonymization if needed
      const anonymizedEvent = this.anonymizeEvent(validatedEvent);

      // Store in database
      const supabase = createClient();
      const { data, error } = await supabase
        .from("audit_events")
        .insert(anonymizedEvent)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to log audit event:", error);
        return "";
      }

      // Check for compliance violations
      await this.checkComplianceViolations(validatedEvent);

      // Trigger real-time alerts if needed
      if (this.config.real_time_alerts) {
        await this.checkAlertThresholds(validatedEvent);
      }

      return data.id;
    } catch (error) {
      console.error("Audit logging failed:", error);
      return "";
    }
  }

  // Convenient logging methods
  async logUserAction(
    userId: string,
    action: string,
    details?: Record<string, any>,
    resourceType?: string,
    resourceId?: string,
  ): Promise<string> {
    return this.logEvent({
      event_type: "user_action",
      severity: "medium",
      user_id: userId,
      action,
      details,
      resource_type: resourceType,
      resource_id: resourceId,
      compliance_tags: ["user_activity"],
    });
  }

  async logDataChange(
    userId: string,
    resourceType: string,
    resourceId: string,
    changes: DataChange[],
    action: "created" | "updated" | "deleted",
  ): Promise<string> {
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    changes.forEach((change) => {
      if (change.change_type === action || action === "updated") {
        oldValues[change.field] = change.old_value;
        newValues[change.field] = change.new_value;
      }
    });

    return this.logEvent({
      event_type: `${resourceType}_${action}`,
      severity: this.determineSeverity(changes),
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      old_values: oldValues,
      new_values: newValues,
      compliance_tags: this.getComplianceTags(changes),
    });
  }

  async logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    details: Record<string, any>,
    userId?: string,
  ): Promise<string> {
    return this.logEvent({
      event_type: eventType,
      severity,
      user_id: userId,
      action: "security_event",
      details,
      compliance_tags: ["security", "incident_response"],
    });
  }

  // Query audit logs
  async queryAuditLogs(params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    eventTypes?: AuditEventType[];
    resourceType?: string;
    resourceId?: string;
    severity?: AuditSeverity[];
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    const supabase = createClient();
    let query = supabase.from("audit_events").select("*");

    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate);
    }

    if (params.userId) {
      query = query.eq("user_id", params.userId);
    }

    if (params.eventTypes && params.eventTypes.length > 0) {
      query = query.in("event_type", params.eventTypes);
    }

    if (params.resourceType) {
      query = query.eq("resource_type", params.resourceType);
    }

    if (params.resourceId) {
      query = query.eq("resource_id", params.resourceId);
    }

    if (params.severity && params.severity.length > 0) {
      query = query.in("severity", params.severity);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1,
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query audit logs: ${error.message}`);
    }

    return data || [];
  }

  // Compliance Reporting
  async generateComplianceReport(
    standard: ComplianceStandard,
    startDate: string,
    endDate: string,
  ): Promise<ComplianceReport> {
    const events = await this.queryAuditLogs({
      startDate,
      endDate,
    });

    const violations = await this.detectComplianceViolations(events, standard);

    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      standard,
      period_start: startDate,
      period_end: endDate,
      total_events: events.length,
      events_by_type: eventsByType,
      violations,
      recommendations: this.generateRecommendations(violations, standard),
      status: violations.length > 0 ? "non_compliant" : "compliant",
      generated_at: new Date().toISOString(),
      generated_by: "system",
    };

    // Store report
    const supabase = createClient();
    await supabase.from("compliance_reports").insert(report);

    return report;
  }

  // Data Retention and Purging
  async purgeExpiredEvents(): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("audit_events")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      throw new Error(`Failed to purge expired events: ${error.message}`);
    }

    const purgedCount = data?.length || 0;

    // Log the purge action
    await this.logEvent({
      event_type: "data_purged",
      severity: "medium",
      action: "automatic_purge",
      details: {
        purged_count: purgedCount,
        reason: "retention_period_expired",
      },
      compliance_tags: ["data_retention", "gdpr"],
    });

    return purgedCount;
  }

  // Privacy and Data Subject Rights
  async exportUserData(userId: string): Promise<any> {
    const events = await this.queryAuditLogs({ userId });

    // Log data export
    await this.logEvent({
      event_type: "export_performed",
      severity: "high",
      user_id: userId,
      action: "data_export",
      details: {
        export_type: "user_audit_data",
        record_count: events.length,
      },
      compliance_tags: ["gdpr", "data_subject_rights"],
    });

    return {
      user_id: userId,
      export_date: new Date().toISOString(),
      audit_events: events,
    };
  }

  async anonymizeUserData(userId: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("audit_events")
      .update({
        user_id: null,
        details: supabase.rpc("anonymize_user_details", {
          user_id: userId,
        }),
      })
      .eq("user_id", userId)
      .select("id");

    if (error) {
      throw new Error(`Failed to anonymize user data: ${error.message}`);
    }

    const anonymizedCount = data?.length || 0;

    // Log anonymization
    await this.logEvent({
      event_type: "data_anonymized",
      severity: "high",
      action: "user_data_anonymization",
      details: {
        anonymized_count: anonymizedCount,
        reason: "gdpr_right_to_be_forgotten",
      },
      compliance_tags: ["gdpr", "data_subject_rights"],
    });

    return anonymizedCount;
  }

  // Private helper methods
  private loadConfiguration(): AuditConfig {
    // Load from environment variables or database
    return {
      enabled: process.env.AUDIT_ENABLED !== "false",
      retention_days: parseInt(process.env.AUDIT_RETENTION_DAYS || "2555"),
      auto_purge: process.env.AUDIT_AUTO_PURGE !== "false",
      compliance_standards: (process.env.COMPLIANCE_STANDARDS || "gdpr").split(
        ",",
      ),
      sensitive_fields: (
        process.env.AUDIT_SENSITIVE_FIELDS || "password,ssn,credit_card"
      ).split(","),
      encryption_enabled: process.env.AUDIT_ENCRYPTION_ENABLED !== "false",
      real_time_alerts: process.env.AUDIT_REAL_TIME_ALERTS !== "false",
      alert_thresholds: {
        failed_logins: parseInt(
          process.env.AUDIT_FAILED_LOGIN_THRESHOLD || "5",
        ),
        suspicious_activity: parseInt(
          process.env.AUDIT_SUSPICIOUS_ACTIVITY_THRESHOLD || "3",
        ),
        data_export_volume: parseInt(
          process.env.AUDIT_DATA_EXPORT_THRESHOLD || "1000",
        ),
      },
      excluded_events: (process.env.AUDIT_EXCLUDED_EVENTS || "")
        .split(",")
        .filter(Boolean),
      anonymization_rules: JSON.parse(
        process.env.AUDIT_ANONYMIZATION_RULES || "{}",
      ),
    };
  }

  private calculateExpirationDate(retentionDays?: number): string {
    const days = retentionDays || this.config.retention_days;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    return expirationDate.toISOString();
  }

  private anonymizeEvent(event: AuditEvent): AuditEvent {
    const anonymized = { ...event };

    // Apply anonymization rules
    for (const [field, rule] of Object.entries(
      this.config.anonymization_rules,
    )) {
      if (anonymized.details && anonymized.details[field]) {
        anonymized.details[field] = this.applyAnonymizationRule(
          anonymized.details[field],
          rule,
        );
      }
    }

    return anonymized;
  }

  private applyAnonymizationRule(value: any, rule: string): any {
    switch (rule) {
      case "hash":
        return this.hashValue(value);
      case "mask":
        return this.maskValue(value);
      case "remove":
        return "[REDACTED]";
      default:
        return value;
    }
  }

  private hashValue(value: any): string {
    // Simple hash implementation (use crypto.subtle in production)
    return btoa(String(value)).substring(0, 8) + "...";
  }

  private maskValue(value: any): string {
    const str = String(value);
    if (str.length <= 4) return "*".repeat(str.length);
    return (
      str.substring(0, 2) +
      "*".repeat(str.length - 4) +
      str.substring(str.length - 2)
    );
  }

  private determineSeverity(changes: DataChange[]): AuditSeverity {
    const hasSensitive = changes.some((change) => change.sensitive);
    const hasMultipleChanges = changes.length > 3;

    if (hasSensitive) return "high";
    if (hasMultipleChanges) return "medium";
    return "low";
  }

  private getComplianceTags(changes: DataChange[]): string[] {
    const tags = ["data_modification"];

    if (changes.some((change) => change.sensitive)) {
      tags.push("sensitive_data", "gdpr");
    }

    return tags;
  }

  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    const violations: ComplianceViolation[] = [];

    // GDPR Compliance Checks
    if (this.config.compliance_standards.includes("gdpr")) {
      violations.push(...this.checkGDPRCompliance(event));
    }

    // CCPA Compliance Checks
    if (this.config.compliance_standards.includes("ccpa")) {
      violations.push(...this.checkCCPACompliance(event));
    }

    // HIPAA Compliance Checks
    if (this.config.compliance_standards.includes("hipaa")) {
      violations.push(...this.checkHIPAACompliance(event));
    }

    // SOX Compliance Checks
    if (this.config.compliance_standards.includes("sox")) {
      violations.push(...this.checkSOXCompliance(event));
    }

    // Store any violations found
    for (const violation of violations) {
      await this.storeComplianceViolation(violation);
    }
  }

  private async checkAlertThresholds(event: AuditEvent): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check failed login attempts
    if (event.event_type === "user_login" && event.details.success === false) {
      const recentFailedLogins = await this.queryAuditLogs({
        startDate: oneHourAgo.toISOString(),
        eventTypes: ["user_login"],
        userId: event.user_id,
      });

      const failedCount = recentFailedLogins.filter(
        (e) => e.details.success === false,
      ).length;

      if (failedCount >= this.config.alert_thresholds.failed_logins) {
        await this.triggerSecurityAlert("excessive_failed_logins", {
          user_id: event.user_id,
          failed_attempts: failedCount,
          time_window: "1_hour",
        });
      }
    }

    // Check for suspicious activity patterns
    if (event.user_id && event.severity === "high") {
      const recentHighSeverityEvents = await this.queryAuditLogs({
        startDate: oneHourAgo.toISOString(),
        userId: event.user_id,
        severity: ["high", "critical"],
      });

      if (
        recentHighSeverityEvents.length >=
        this.config.alert_thresholds.suspicious_activity
      ) {
        await this.triggerSecurityAlert("suspicious_activity_pattern", {
          user_id: event.user_id,
          high_severity_events: recentHighSeverityEvents.length,
          time_window: "1_hour",
        });
      }
    }

    // Check for excessive data export
    if (event.event_type === "export_performed") {
      const recentExports = await this.queryAuditLogs({
        startDate: oneHourAgo.toISOString(),
        eventTypes: ["export_performed"],
        userId: event.user_id,
      });

      const totalExportedRecords = recentExports.reduce(
        (sum, e) => sum + (e.details.record_count || 0),
        0,
      );

      if (
        totalExportedRecords >= this.config.alert_thresholds.data_export_volume
      ) {
        await this.triggerSecurityAlert("excessive_data_export", {
          user_id: event.user_id,
          total_records: totalExportedRecords,
          time_window: "1_hour",
        });
      }
    }
  }

  private async detectComplianceViolations(
    events: AuditEvent[],
    standard: ComplianceStandard,
  ): Promise<ComplianceViolation[]> {
    // Implement compliance violation detection logic
    return [];
  }

  private generateRecommendations(
    violations: ComplianceViolation[],
    standard: ComplianceStandard,
  ): string[] {
    const recommendations: string[] = [];

    if (violations.some((v) => v.rule.includes("access_control"))) {
      recommendations.push("Implement stronger role-based access controls");
      recommendations.push("Review and update user permissions regularly");
    }

    if (violations.some((v) => v.rule.includes("authentication"))) {
      recommendations.push("Enable multi-factor authentication for all users");
      recommendations.push("Implement stronger password policies");
    }

    if (violations.some((v) => v.rule.includes("data_retention"))) {
      recommendations.push("Review and update data retention policies");
      recommendations.push("Implement automated data purging");
    }

    if (violations.some((v) => v.rule.includes("encryption"))) {
      recommendations.push("Enable encryption at rest and in transit");
      recommendations.push(
        "Implement field-level encryption for sensitive data",
      );
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Regular security training for users",
        "Implement automated data classification",
        "Conduct regular security audits",
        "Monitor user activity patterns",
      );
    }

    return recommendations;
  }

  // Compliance checking methods
  private checkGDPRCompliance(event: AuditEvent): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for personal data processing without consent
    if (
      event.event_type.includes("customer") &&
      !event.compliance_tags.includes("consent_verified")
    ) {
      violations.push({
        id: crypto.randomUUID(),
        standard: "gdpr",
        rule: "data_processing_consent",
        severity: "high",
        description: "Personal data processed without verified consent",
        event_ids: [event.id],
        remediation_required: true,
        remediation_steps: [
          "Verify user consent before processing personal data",
          "Implement consent management system",
          "Update privacy notice",
        ],
        detected_at: new Date().toISOString(),
      });
    }

    // Check for data retention violations
    if (event.retention_period && event.retention_period > 2555) {
      // 7 years
      violations.push({
        id: crypto.randomUUID(),
        standard: "gdpr",
        rule: "data_retention_period",
        severity: "medium",
        description: "Data retention period exceeds reasonable limits",
        event_ids: [event.id],
        remediation_required: true,
        remediation_steps: [
          "Review data retention policy",
          "Implement automatic data purging",
          "Update retention periods",
        ],
        detected_at: new Date().toISOString(),
      });
    }

    return violations;
  }

  private checkCCPACompliance(event: AuditEvent): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for data sale without opt-out option
    if (
      event.event_type === "data_shared" &&
      !event.details.opt_out_available
    ) {
      violations.push({
        id: crypto.randomUUID(),
        standard: "ccpa",
        rule: "data_sale_opt_out",
        severity: "high",
        description: "Data shared without opt-out mechanism",
        event_ids: [event.id],
        remediation_required: true,
        remediation_steps: [
          "Implement opt-out mechanism",
          "Update privacy policy",
          "Provide clear notice of data sharing",
        ],
        detected_at: new Date().toISOString(),
      });
    }

    return violations;
  }

  private checkHIPAACompliance(event: AuditEvent): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for healthcare data access without authorization
    if (event.details.contains_phi && !event.details.authorized_access) {
      violations.push({
        id: crypto.randomUUID(),
        standard: "hipaa",
        rule: "phi_unauthorized_access",
        severity: "critical",
        description: "PHI accessed without proper authorization",
        event_ids: [event.id],
        remediation_required: true,
        remediation_steps: [
          "Review access authorization",
          "Implement minimum necessary standard",
          "Audit user access logs",
        ],
        detected_at: new Date().toISOString(),
      });
    }

    return violations;
  }

  private checkSOXCompliance(event: AuditEvent): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for financial data modifications without approval
    if (event.event_type.includes("financial") && !event.details.approved_by) {
      violations.push({
        id: crypto.randomUUID(),
        standard: "sox",
        rule: "financial_data_approval",
        severity: "high",
        description: "Financial data modified without proper approval",
        event_ids: [event.id],
        remediation_required: true,
        remediation_steps: [
          "Implement approval workflow",
          "Review financial data access controls",
          "Update authorization procedures",
        ],
        detected_at: new Date().toISOString(),
      });
    }

    return violations;
  }

  private async storeComplianceViolation(
    violation: ComplianceViolation,
  ): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("compliance_violations")
        .insert(violation);

      if (error) {
        console.error("Failed to store compliance violation:", error);
      }
    } catch (error) {
      console.error("Error storing compliance violation:", error);
    }
  }

  private async triggerSecurityAlert(
    alertType: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      // Log the security alert
      await this.logEvent({
        event_type: "security_violation",
        severity: "critical",
        action: alertType,
        details: {
          alert_type: alertType,
          ...details,
          triggered_at: new Date().toISOString(),
        },
        compliance_tags: ["security_alert", "incident_response"],
      });

      // Store in alerts table
      const supabase = createClient();
      const { error } = await supabase.from("security_alerts").insert({
        id: crypto.randomUUID(),
        alert_type: alertType,
        severity: "critical",
        details,
        created_at: new Date().toISOString(),
        resolved: false,
      });

      if (error) {
        console.error("Failed to store security alert:", error);
      }

      // In production, you might want to send notifications here
      // e.g., email, Slack, PagerDuty, etc.
    } catch (error) {
      console.error("Error triggering security alert:", error);
    }
  }
}

// Note: AuditSystem class is already exported above
// API routes should create instances as needed using AuditSystem.getInstance()

// Audit decorators for automatic logging
export function AuditLog(
  eventType: AuditEventType,
  severity: AuditSeverity = "medium",
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        // Log successful operation
        const audit = AuditSystem.getInstance();
        await audit.logEvent({
          event_type: eventType,
          severity,
          action: propertyKey,
          details: {
            duration_ms: Date.now() - startTime,
            success: true,
            arguments: args.length,
          },
        });

        return result;
      } catch (error) {
        // Log failed operation
        const audit = AuditSystem.getInstance();
        await audit.logEvent({
          event_type: eventType,
          severity: "high",
          action: propertyKey,
          details: {
            duration_ms: Date.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            arguments: args.length,
          },
        });

        throw error;
      }
    };
  };
}

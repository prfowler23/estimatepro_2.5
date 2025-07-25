// useAudit Hook
// React hook for easy integration of audit logging throughout the application

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  auditSystem,
  AuditEventType,
  AuditSeverity,
} from "@/lib/audit/audit-system";
import type { User } from "@supabase/supabase-js";

export interface UseAuditOptions {
  enabled?: boolean;
  autoLogPageViews?: boolean;
  autoLogUserActions?: boolean;
  sessionId?: string;
}

export interface AuditLogParams {
  eventType: AuditEventType;
  action: string;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  complianceTags?: string[];
}

export interface DataChangeParams {
  resourceType: string;
  resourceId: string;
  oldData?: any;
  newData?: any;
  action: "created" | "updated" | "deleted";
}

export const useAudit = (options: UseAuditOptions = {}) => {
  const {
    enabled = true,
    autoLogPageViews = false,
    autoLogUserActions = false,
    sessionId,
  } = options;

  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get current session info
  const getSessionInfo = useCallback(() => {
    return {
      userId: user?.id,
      sessionId: sessionId || crypto.randomUUID(),
      ipAddress: undefined, // Would need to be passed from server or detected
      userAgent:
        typeof window !== "undefined" ? navigator.userAgent : undefined,
    };
  }, [user?.id, sessionId]);

  // Log audit event
  const logEvent = useCallback(
    async (params: AuditLogParams) => {
      if (!enabled) return;

      const sessionInfo = getSessionInfo();

      try {
        const eventId = await auditSystem.logEvent({
          event_type: params.eventType,
          severity: params.severity || "medium",
          user_id: sessionInfo.userId,
          session_id: sessionInfo.sessionId,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          action: params.action,
          details: params.details || {},
          user_agent: sessionInfo.userAgent,
          compliance_tags: params.complianceTags || [],
        });

        return eventId;
      } catch (error) {
        console.error("Failed to log audit event:", error);
        return null;
      }
    },
    [enabled, getSessionInfo],
  );

  // Log user action
  const logUserAction = useCallback(
    async (
      action: string,
      details?: Record<string, any>,
      resourceType?: string,
      resourceId?: string,
    ) => {
      return logEvent({
        eventType: "user_action",
        action,
        details,
        resourceType,
        resourceId,
        complianceTags: ["user_activity"],
      });
    },
    [logEvent],
  );

  // Log data change
  const logDataChange = useCallback(
    async (params: DataChangeParams) => {
      if (!enabled) return;

      const sessionInfo = getSessionInfo();

      try {
        // Calculate changes
        const changes = [];

        if (params.action === "created") {
          if (params.newData) {
            for (const [key, value] of Object.entries(params.newData)) {
              changes.push({
                field: key,
                old_value: null,
                new_value: value,
                change_type: "created",
                sensitive: isSensitiveField(key),
              });
            }
          }
        } else if (params.action === "updated") {
          if (params.oldData && params.newData) {
            for (const [key, newValue] of Object.entries(params.newData)) {
              const oldValue = params.oldData[key];
              if (oldValue !== newValue) {
                changes.push({
                  field: key,
                  old_value: oldValue,
                  new_value: newValue,
                  change_type: "updated",
                  sensitive: isSensitiveField(key),
                });
              }
            }
          }
        } else if (params.action === "deleted") {
          if (params.oldData) {
            for (const [key, value] of Object.entries(params.oldData)) {
              changes.push({
                field: key,
                old_value: value,
                new_value: null,
                change_type: "deleted",
                sensitive: isSensitiveField(key),
              });
            }
          }
        }

        const eventId = await auditSystem.logDataChange(
          sessionInfo.userId!,
          params.resourceType,
          params.resourceId,
          changes,
          params.action,
        );

        return eventId;
      } catch (error) {
        console.error("Failed to log data change:", error);
        return null;
      }
    },
    [enabled, getSessionInfo],
  );

  // Log authentication event
  const logAuthEvent = useCallback(
    async (
      eventType:
        | "user_login"
        | "user_logout"
        | "login_failed"
        | "session_expired",
      details?: Record<string, any>,
    ) => {
      return logEvent({
        eventType,
        action: eventType,
        severity: eventType === "login_failed" ? "high" : "medium",
        details,
        complianceTags: ["authentication", "user_activity"],
      });
    },
    [logEvent],
  );

  // Log security event
  const logSecurityEvent = useCallback(
    async (
      eventType:
        | "security_violation"
        | "suspicious_activity"
        | "permission_denied",
      details: Record<string, any>,
    ) => {
      return logEvent({
        eventType,
        action: eventType,
        severity: "critical",
        details,
        complianceTags: ["security", "incident_response"],
      });
    },
    [logEvent],
  );

  // Log API access
  const logApiAccess = useCallback(
    async (
      method: string,
      endpoint: string,
      statusCode: number,
      details?: Record<string, any>,
    ) => {
      return logEvent({
        eventType: "api_access",
        action: `${method} ${endpoint}`,
        severity: statusCode >= 400 ? "high" : "low",
        details: {
          method,
          endpoint,
          status_code: statusCode,
          ...details,
        },
        complianceTags: ["api_access", "request_logging"],
      });
    },
    [logEvent],
  );

  // Log file operation
  const logFileOperation = useCallback(
    async (
      operation: "uploaded" | "downloaded" | "deleted",
      fileName: string,
      details?: Record<string, any>,
    ) => {
      return logEvent({
        eventType: `file_${operation}`,
        action: `${operation} ${fileName}`,
        severity: operation === "deleted" ? "high" : "medium",
        details: {
          file_name: fileName,
          operation,
          ...details,
        },
        complianceTags: ["file_access", "data_handling"],
      });
    },
    [logEvent],
  );

  // Log AI analysis
  const logAIAnalysis = useCallback(
    async (analysisType: string, details?: Record<string, any>) => {
      return logEvent({
        eventType: "ai_analysis_performed",
        action: `AI analysis: ${analysisType}`,
        severity: "medium",
        details: {
          analysis_type: analysisType,
          ...details,
        },
        complianceTags: ["ai_processing", "data_analysis"],
      });
    },
    [logEvent],
  );

  // Auto-log page views
  useEffect(() => {
    if (!enabled || !autoLogPageViews || typeof window === "undefined") return;

    const logPageView = () => {
      logEvent({
        eventType: "user_action",
        action: `page_view: ${window.location.pathname}`,
        severity: "low",
        details: {
          pathname: window.location.pathname,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        },
        complianceTags: ["page_view", "user_activity"],
      });
    };

    // Log initial page view
    logPageView();

    // Listen for navigation changes (for SPAs)
    const handleNavigation = () => {
      setTimeout(logPageView, 100);
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, [enabled, autoLogPageViews, logEvent]);

  // Auto-log user actions
  useEffect(() => {
    if (!enabled || !autoLogUserActions || typeof window === "undefined")
      return;

    const logUserInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.tagName === "A") {
        logEvent({
          eventType: "user_action",
          action: `${event.type}: ${target.textContent || target.id || "unknown"}`,
          severity: "low",
          details: {
            event_type: event.type,
            target_tag: target.tagName,
            target_id: target.id,
            target_class: target.className,
            target_text: target.textContent?.substring(0, 50),
          },
          complianceTags: ["user_interaction"],
        });
      }
    };

    document.addEventListener("click", logUserInteraction);

    return () => {
      document.removeEventListener("click", logUserInteraction);
    };
  }, [enabled, autoLogUserActions, logEvent]);

  return {
    logEvent,
    logUserAction,
    logDataChange,
    logAuthEvent,
    logSecurityEvent,
    logApiAccess,
    logFileOperation,
    logAIAnalysis,
    enabled,
  };
};

// Helper function to identify sensitive fields
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "credit_card",
    "ssn",
    "phone",
    "email",
    "address",
    "api_key",
    "private_key",
    "access_token",
    "refresh_token",
  ];

  return sensitiveFields.some((field) =>
    fieldName.toLowerCase().includes(field),
  );
}

// Hook for estimate audit logging
export const useEstimateAudit = () => {
  const audit = useAudit();

  const logEstimateCreated = useCallback(
    async (estimateId: string, estimateData: any) => {
      return audit.logDataChange({
        resourceType: "estimate",
        resourceId: estimateId,
        newData: estimateData,
        action: "created",
      });
    },
    [audit],
  );

  const logEstimateUpdated = useCallback(
    async (estimateId: string, oldData: any, newData: any) => {
      return audit.logDataChange({
        resourceType: "estimate",
        resourceId: estimateId,
        oldData,
        newData,
        action: "updated",
      });
    },
    [audit],
  );

  const logEstimateDeleted = useCallback(
    async (estimateId: string, estimateData: any) => {
      return audit.logDataChange({
        resourceType: "estimate",
        resourceId: estimateId,
        oldData: estimateData,
        action: "deleted",
      });
    },
    [audit],
  );

  const logEstimateStatusChange = useCallback(
    async (estimateId: string, oldStatus: string, newStatus: string) => {
      return audit.logEvent({
        eventType:
          newStatus === "approved" ? "estimate_approved" : "estimate_updated",
        action: `Status changed from ${oldStatus} to ${newStatus}`,
        resourceType: "estimate",
        resourceId: estimateId,
        severity: newStatus === "approved" ? "high" : "medium",
        details: {
          old_status: oldStatus,
          new_status: newStatus,
          status_change: true,
        },
        complianceTags: ["estimate_management", "status_change"],
      });
    },
    [audit],
  );

  return {
    ...audit,
    logEstimateCreated,
    logEstimateUpdated,
    logEstimateDeleted,
    logEstimateStatusChange,
  };
};

// Hook for customer audit logging
export const useCustomerAudit = () => {
  const audit = useAudit();

  const logCustomerCreated = useCallback(
    async (customerId: string, customerData: any) => {
      return audit.logDataChange({
        resourceType: "customer",
        resourceId: customerId,
        newData: customerData,
        action: "created",
      });
    },
    [audit],
  );

  const logCustomerUpdated = useCallback(
    async (customerId: string, oldData: any, newData: any) => {
      return audit.logDataChange({
        resourceType: "customer",
        resourceId: customerId,
        oldData,
        newData,
        action: "updated",
      });
    },
    [audit],
  );

  const logCustomerDeleted = useCallback(
    async (customerId: string, customerData: any) => {
      return audit.logDataChange({
        resourceType: "customer",
        resourceId: customerId,
        oldData: customerData,
        action: "deleted",
      });
    },
    [audit],
  );

  return {
    ...audit,
    logCustomerCreated,
    logCustomerUpdated,
    logCustomerDeleted,
  };
};

// React hook for client-side Sentry monitoring integration
// Provides easy-to-use monitoring capabilities for React components

"use client";

import { useEffect, useCallback, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/monitoring/sentry-logger";

export interface MonitoringOptions {
  component?: string;
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
  trackPerformance?: boolean;
  trackErrors?: boolean;
}

export function useSentryMonitoring(options: MonitoringOptions = {}) {
  const {
    component = "UnknownComponent",
    trackPageViews = true,
    trackUserInteractions = false,
    trackPerformance = true,
    trackErrors = true,
  } = options;

  const performanceMarks = useRef<Map<string, number>>(new Map());
  const interactionCount = useRef(0);

  // Track component mount/unmount
  useEffect(() => {
    if (trackPageViews) {
      logger.addBreadcrumb(
        `Component mounted: ${component}`,
        "navigation",
        "info",
        { component },
      );

      // Track page view
      logger.trackBusinessMetric("component_view", 1, "count", {
        component,
      });
    }

    return () => {
      if (trackPageViews) {
        logger.addBreadcrumb(
          `Component unmounted: ${component}`,
          "navigation",
          "info",
          { component },
        );
      }
    };
  }, [component, trackPageViews]);

  // Performance tracking functions
  const startPerformanceMark = useCallback(
    (operation: string) => {
      if (!trackPerformance) return;

      const markKey = `${component}_${operation}`;
      performanceMarks.current.set(markKey, Date.now());

      logger.addBreadcrumb(
        `Performance: Started ${operation}`,
        "performance",
        "info",
        { component, operation },
      );
    },
    [component, trackPerformance],
  );

  const endPerformanceMark = useCallback(
    (operation: string) => {
      if (!trackPerformance) return;

      const markKey = `${component}_${operation}`;
      const startTime = performanceMarks.current.get(markKey);

      if (startTime) {
        const duration = Date.now() - startTime;
        performanceMarks.current.delete(markKey);

        logger.trackPerformance({
          name: `component.${component.toLowerCase()}.${operation}`,
          value: duration,
          unit: "ms",
          tags: {
            component,
            operation,
          },
        });

        logger.addBreadcrumb(
          `Performance: Completed ${operation} in ${duration}ms`,
          "performance",
          "info",
          { component, operation, duration },
        );
      }
    },
    [component, trackPerformance],
  );

  // Error tracking functions
  const logError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      if (!trackErrors) return;

      logger.logComponentError(component, "user_action", error, {
        ...context,
        interaction_count: interactionCount.current,
      });
    },
    [component, trackErrors],
  );

  const logWarning = useCallback(
    (message: string, context?: Record<string, any>) => {
      logger.warn(`${component}: ${message}`, {
        ...context,
        component,
      });
    },
    [component],
  );

  // User interaction tracking
  const trackInteraction = useCallback(
    (action: string, target?: string, value?: number) => {
      if (!trackUserInteractions) return;

      interactionCount.current += 1;

      logger.addBreadcrumb(`User interaction: ${action}`, "user", "info", {
        component,
        action,
        target,
        value,
      });

      logger.trackBusinessMetric("user_interaction", 1, "count", {
        component,
        action,
        target,
      });

      // Track specific interaction value if provided
      if (value !== undefined) {
        logger.trackBusinessMetric(
          `interaction_value_${action}`,
          value,
          "count",
          {
            component,
            action,
            target,
          },
        );
      }
    },
    [component, trackUserInteractions],
  );

  // Click tracking
  const trackClick = useCallback(
    (target: string, context?: Record<string, any>) => {
      trackInteraction("click", target);

      if (context) {
        logger.addBreadcrumb(`Click: ${target}`, "user", "info", {
          component,
          target,
          ...context,
        });
      }
    },
    [component, trackInteraction],
  );

  // Form tracking
  const trackFormSubmit = useCallback(
    (formName: string, success: boolean, errors?: string[]) => {
      trackInteraction("form_submit", formName, success ? 1 : 0);

      logger.trackBusinessMetric("form_submission", 1, "count", {
        component,
        form_name: formName,
        success: success.toString(),
      });

      if (!success && errors?.length) {
        logger.warn(`Form submission failed: ${formName}`, {
          component,
          form_name: formName,
          errors,
        });
      }
    },
    [component, trackInteraction],
  );

  // Search tracking
  const trackSearch = useCallback(
    (query: string, resultsCount: number, context?: Record<string, any>) => {
      trackInteraction("search", "search_query", resultsCount);

      logger.trackBusinessMetric("search_query", 1, "count", {
        component,
        query_length: query.length.toString(),
        results_count: resultsCount.toString(),
      });

      logger.addBreadcrumb(
        `Search: "${query}" (${resultsCount} results)`,
        "user",
        "info",
        { component, query, results_count: resultsCount, ...context },
      );
    },
    [component, trackInteraction],
  );

  // Feature usage tracking
  const trackFeatureUsage = useCallback(
    (feature: string, value?: number, context?: Record<string, any>) => {
      logger.trackBusinessMetric(
        `feature_usage_${feature}`,
        value || 1,
        "count",
        {
          component,
          feature,
          ...context,
        },
      );

      logger.addBreadcrumb(`Feature used: ${feature}`, "user", "info", {
        component,
        feature,
        value,
        ...context,
      });
    },
    [component],
  );

  // API call tracking
  const trackAPICall = useCallback(
    (endpoint: string, method: string, startTime?: number) => {
      const duration = startTime ? Date.now() - startTime : undefined;

      logger.addBreadcrumb(`API Call: ${method} ${endpoint}`, "http", "info", {
        component,
        endpoint,
        method,
        duration,
      });

      if (duration) {
        logger.trackPerformance({
          name: `client_api.${method.toLowerCase()}.${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`,
          value: duration,
          unit: "ms",
          tags: {
            component,
            endpoint,
            method,
          },
        });
      }
    },
    [component],
  );

  // Async operation tracking
  const trackAsyncOperation = useCallback(
    async <T>(operation: string, asyncFn: () => Promise<T>): Promise<T> => {
      startPerformanceMark(operation);

      try {
        const result = await asyncFn();
        endPerformanceMark(operation);

        logger.trackBusinessMetric(`async_operation_${operation}`, 1, "count", {
          component,
          operation,
          success: "true",
        });

        return result;
      } catch (error) {
        endPerformanceMark(operation);

        logger.trackBusinessMetric(`async_operation_${operation}`, 1, "count", {
          component,
          operation,
          success: "false",
        });

        if (error instanceof Error) {
          logError(error, { operation });
        }

        throw error;
      }
    },
    [component, startPerformanceMark, endPerformanceMark, logError],
  );

  // Session tracking
  const trackSessionEvent = useCallback(
    (
      event: "start" | "end" | "timeout" | "resume",
      context?: Record<string, any>,
    ) => {
      logger.trackBusinessMetric(`session_${event}`, 1, "count", {
        component,
        event,
        ...context,
      });

      logger.addBreadcrumb(`Session: ${event}`, "user", "info", {
        component,
        event,
        ...context,
      });
    },
    [component],
  );

  // Custom metric tracking
  const trackCustomMetric = useCallback(
    (
      name: string,
      value: number,
      unit: "ms" | "bytes" | "count" | "percentage" = "count",
      tags?: Record<string, string>,
    ) => {
      logger.trackPerformance({
        name: `custom.${component.toLowerCase()}.${name}`,
        value,
        unit,
        tags: {
          component,
          ...tags,
        },
      });
    },
    [component],
  );

  // Set user context
  const setUserContext = useCallback(
    (userId: string, userData?: Record<string, any>) => {
      logger.setUserContext(userId, userData);

      logger.addBreadcrumb("User context set", "user", "info", {
        component,
        user_id: userId,
      });
    },
    [component],
  );

  // Set custom context
  const setCustomContext = useCallback(
    (key: string, value: any) => {
      Sentry.setContext(key, value);

      logger.addBreadcrumb(`Context set: ${key}`, "custom", "info", {
        component,
        context_key: key,
      });
    },
    [component],
  );

  return {
    // Performance tracking
    startPerformanceMark,
    endPerformanceMark,
    trackAsyncOperation,

    // Error tracking
    logError,
    logWarning,

    // User interaction tracking
    trackInteraction,
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackFeatureUsage,

    // API and external tracking
    trackAPICall,

    // Session tracking
    trackSessionEvent,

    // Custom tracking
    trackCustomMetric,

    // Context management
    setUserContext,
    setCustomContext,

    // Utility
    component,
    interactionCount: interactionCount.current,
  };
}

// Hook for automatic page view tracking
export function usePageTracking(
  pageName: string,
  metadata?: Record<string, any>,
) {
  useEffect(() => {
    // Track page view
    logger.trackBusinessMetric("page_view", 1, "count", {
      page: pageName,
      ...metadata,
    });

    logger.addBreadcrumb(`Page view: ${pageName}`, "navigation", "info", {
      page: pageName,
      ...metadata,
    });

    // Set page context in Sentry
    Sentry.setContext("page", {
      name: pageName,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      ...metadata,
    });

    return () => {
      // Clear page context when component unmounts
      Sentry.setContext("page", null);
    };
  }, [pageName, metadata]);
}

// Hook for automatic user tracking
export function useUserTracking(
  userId?: string,
  userData?: Record<string, any>,
) {
  useEffect(() => {
    if (userId) {
      logger.setUserContext(userId, userData);
    } else {
      logger.clearUserContext();
    }
  }, [userId, userData]);
}

export default useSentryMonitoring;

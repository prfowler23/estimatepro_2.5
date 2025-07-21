// Monitoring Hooks
// React hooks for monitoring system integration

import { useState, useEffect, useCallback, useRef } from "react";

// Monitoring data interfaces
interface SystemMetrics {
  timestamp: number;
  cpu: { usage: number; load: number[] };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { bytesIn: number; bytesOut: number; connectionsActive: number };
  application: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  database: { connections: number; queryTime: number; transactionRate: number };
}

interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "critical";
  lastCheck: number;
  message?: string;
  details?: any;
}

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  resolved?: boolean;
  acknowledgedBy?: string;
}

interface MonitoringData {
  current: SystemMetrics | null;
  history: SystemMetrics[];
  health: {
    checks: HealthCheck[];
    status: {
      status: "healthy" | "warning" | "critical";
      checks: HealthCheck[];
      metrics: SystemMetrics | null;
    };
  };
  performance?: any;
  stats?: any;
}

// Main monitoring hook
export const useMonitoring = (options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  include?: string[];
}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    include = ["current", "history", "health"],
  } = options || {};

  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      if (include.length > 0) {
        params.append("include", include.join(","));
      }

      const response = await fetch(`/api/monitoring/metrics?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch monitoring data",
      );
      console.error("Error fetching monitoring data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [include]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    refresh,
  };
};

// Alerts hook
export const useAlerts = (options?: {
  type?: "active" | "history";
  autoRefresh?: boolean;
  refreshInterval?: number;
  filters?: {
    severity?: string;
    resolved?: boolean;
    hours?: number;
  };
}) => {
  const {
    type = "active",
    autoRefresh = true,
    refreshInterval = 60000,
    filters = {},
  } = options || {};

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      params.append("type", type);

      if (filters.severity) params.append("severity", filters.severity);
      if (filters.resolved !== undefined)
        params.append("resolved", filters.resolved.toString());
      if (filters.hours) params.append("hours", filters.hours.toString());

      const response = await fetch(`/api/monitoring/alerts?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAlerts(result.alerts || []);

      // Fetch stats separately
      const statsResponse = await fetch("/api/monitoring/alerts?type=stats");
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        setStats(statsResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
      console.error("Error fetching alerts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [type, filters]);

  const acknowledgeAlert = useCallback(
    async (alertId: string, acknowledgedBy: string) => {
      try {
        const response = await fetch("/api/monitoring/alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "acknowledge",
            alertId,
            acknowledgedBy,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to acknowledge alert");
        }

        // Refresh alerts
        await fetchAlerts();
        return true;
      } catch (err) {
        console.error("Error acknowledging alert:", err);
        return false;
      }
    },
    [fetchAlerts],
  );

  const resolveAlert = useCallback(
    async (alertId: string, resolvedBy?: string) => {
      try {
        const response = await fetch("/api/monitoring/alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve",
            alertId,
            acknowledgedBy: resolvedBy,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to resolve alert");
        }

        // Refresh alerts
        await fetchAlerts();
        return true;
      } catch (err) {
        console.error("Error resolving alert:", err);
        return false;
      }
    },
    [fetchAlerts],
  );

  const createAlert = useCallback(
    async (alert: {
      type: string;
      severity: "info" | "warning" | "critical";
      message: string;
      details?: any;
    }) => {
      try {
        const response = await fetch("/api/monitoring/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alert),
        });

        if (!response.ok) {
          throw new Error("Failed to create alert");
        }

        const result = await response.json();

        // Refresh alerts
        await fetchAlerts();
        return result.alertId;
      } catch (err) {
        console.error("Error creating alert:", err);
        return null;
      }
    },
    [fetchAlerts],
  );

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAlerts, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchAlerts]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    alerts,
    stats,
    isLoading,
    error,
    acknowledgeAlert,
    resolveAlert,
    createAlert,
    refresh: fetchAlerts,
  };
};

// Configuration hook
export const useMonitoringConfig = () => {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (section?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const params = section ? `?section=${section}` : "";
      const response = await fetch(`/api/monitoring/config${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setConfig(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch configuration",
      );
      console.error("Error fetching config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (section: string, configData: any) => {
      try {
        const response = await fetch("/api/monitoring/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section,
            config: configData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update configuration");
        }

        // Refresh config
        await fetchConfig();
        return true;
      } catch (err) {
        console.error("Error updating config:", err);
        return false;
      }
    },
    [fetchConfig],
  );

  const addAlertRule = useCallback(
    async (rule: any) => {
      try {
        const response = await fetch("/api/monitoring/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_alert_rule",
            data: { rule },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add alert rule");
        }

        // Refresh config
        await fetchConfig();
        return true;
      } catch (err) {
        console.error("Error adding alert rule:", err);
        return false;
      }
    },
    [fetchConfig],
  );

  const removeAlertRule = useCallback(
    async (ruleId: string) => {
      try {
        const response = await fetch(
          `/api/monitoring/config?type=alert_rule&id=${ruleId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to remove alert rule");
        }

        // Refresh config
        await fetchConfig();
        return true;
      } catch (err) {
        console.error("Error removing alert rule:", err);
        return false;
      }
    },
    [fetchConfig],
  );

  const testNotification = useCallback(async (channel: any) => {
    try {
      const response = await fetch("/api/monitoring/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_notification",
          data: { channel },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to test notification");
      }

      return true;
    } catch (err) {
      console.error("Error testing notification:", err);
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    updateConfig,
    addAlertRule,
    removeAlertRule,
    testNotification,
    refresh: fetchConfig,
  };
};

// Real-time monitoring hook with WebSocket support
export const useRealtimeMonitoring = (options?: {
  enabled?: boolean;
  reconnectInterval?: number;
}) => {
  const { enabled = true, reconnectInterval = 5000 } = options || {};

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // Note: WebSocket endpoint would need to be implemented
      // For now, we'll simulate real-time updates with polling
      console.log("Real-time monitoring connection would be established here");
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      console.error("WebSocket connection error:", err);

      // Auto-reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    }
  }, [enabled, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Connection management
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
  };
};

// Performance tracking hook
export const usePerformanceTracking = () => {
  const trackEvent = useCallback(
    async (event: { action: string; duration?: number; metadata?: any }) => {
      try {
        await fetch("/api/monitoring/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "user_action",
            data: event,
          }),
        });
      } catch (err) {
        console.error("Error tracking performance event:", err);
      }
    },
    [],
  );

  const trackError = useCallback(
    async (error: { error: string; context?: any }) => {
      try {
        await fetch("/api/monitoring/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "error",
            data: error,
          }),
        });
      } catch (err) {
        console.error("Error tracking error:", err);
      }
    },
    [],
  );

  const trackPageView = useCallback(
    async (page: string) => {
      try {
        await trackEvent({
          action: "page_view",
          metadata: { page },
        });
      } catch (err) {
        console.error("Error tracking page view:", err);
      }
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackError,
    trackPageView,
  };
};

export default {
  useMonitoring,
  useAlerts,
  useMonitoringConfig,
  useRealtimeMonitoring,
  usePerformanceTracking,
};

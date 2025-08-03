// React Hook for Analytics WebSocket
// Provides real-time analytics data streaming with React integration

import { useEffect, useRef, useState, useCallback } from "react";
import { getAnalyticsWebSocketService } from "@/lib/services/analytics-websocket-service";

interface UseAnalyticsWebSocketOptions {
  metrics: string[];
  filters?: Record<string, any>;
  autoConnect?: boolean;
  reconnectOnError?: boolean;
}

interface WebSocketData {
  type:
    | "metric_update"
    | "quality_update"
    | "prediction_update"
    | "anomaly_alert";
  data: any;
  timestamp?: string;
}

interface UseAnalyticsWebSocketReturn {
  data: WebSocketData[];
  lastMessage: WebSocketData | null;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  error: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  clearData: () => void;
  subscribe: (newMetrics: string[]) => void;
  unsubscribe: () => void;
}

export function useAnalyticsWebSocket(
  options: UseAnalyticsWebSocketOptions,
): UseAnalyticsWebSocketReturn {
  const {
    metrics = [],
    filters,
    autoConnect = true,
    reconnectOnError = true,
  } = options;

  const [data, setData] = useState<WebSocketData[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);

  const wsServiceRef = useRef(getAnalyticsWebSocketService());
  const subscriptionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming messages
  const handleMessage = useCallback((messageData: any) => {
    const newMessage: WebSocketData = {
      type: messageData.type,
      data: messageData.data,
      timestamp: new Date().toISOString(),
    };

    setLastMessage(newMessage);
    setData((prevData) => {
      // Keep only last 100 messages to prevent memory issues
      const newData = [...prevData, newMessage];
      return newData.slice(-100);
    });

    // Clear any error state on successful message
    setError(null);
  }, []);

  // Connection management
  const connect = useCallback(() => {
    try {
      setConnectionStatus("connecting");
      setError(null);

      const wsService = wsServiceRef.current;

      // Check if already connected
      if (wsService.isConnectionOpen()) {
        setConnectionStatus("connected");
        return;
      }

      // Subscribe to metrics
      if (metrics.length > 0) {
        subscriptionIdRef.current = wsService.subscribe(
          metrics,
          handleMessage,
          filters,
        );
        setConnectionStatus("connected");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Connection failed";
      setError(errorMessage);
      setConnectionStatus("error");

      if (reconnectOnError) {
        scheduleReconnect();
      }
    }
  }, [metrics, filters, handleMessage, reconnectOnError]);

  const disconnect = useCallback(() => {
    const wsService = wsServiceRef.current;

    if (subscriptionIdRef.current) {
      wsService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus("disconnected");
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log("Attempting to reconnect analytics WebSocket...");
      connect();
    }, 3000); // Reconnect after 3 seconds
  }, [connect]);

  // Send message (for testing/debugging)
  const sendMessage = useCallback((message: any) => {
    const wsService = wsServiceRef.current;

    if (wsService.isConnectionOpen()) {
      wsService.requestMetrics(message.metrics || [], message.filters);
    } else {
      setError("WebSocket not connected");
    }
  }, []);

  // Clear accumulated data
  const clearData = useCallback(() => {
    setData([]);
    setLastMessage(null);
  }, []);

  // Subscribe to new metrics
  const subscribe = useCallback(
    (newMetrics: string[]) => {
      if (subscriptionIdRef.current) {
        // Unsubscribe from current metrics
        wsServiceRef.current.unsubscribe(subscriptionIdRef.current);
      }

      // Subscribe to new metrics
      subscriptionIdRef.current = wsServiceRef.current.subscribe(
        newMetrics,
        handleMessage,
        filters,
      );
    },
    [handleMessage, filters],
  );

  // Unsubscribe from all metrics
  const unsubscribe = useCallback(() => {
    if (subscriptionIdRef.current) {
      wsServiceRef.current.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && metrics.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, metrics.length]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const wsService = wsServiceRef.current;
      const isOpen = wsService.isConnectionOpen();

      if (!isOpen && connectionStatus === "connected") {
        setConnectionStatus("disconnected");
        if (reconnectOnError) {
          scheduleReconnect();
        }
      }
    };

    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [connectionStatus, reconnectOnError, scheduleReconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [disconnect]);

  const isConnected = connectionStatus === "connected";

  return {
    data,
    lastMessage,
    connectionStatus,
    error,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    clearData,
    subscribe,
    unsubscribe,
  };
}

// Helper hook for specific metric types
export function useRealTimeMetrics(metricNames: string[]) {
  const { data, lastMessage, isConnected, error } = useAnalyticsWebSocket({
    metrics: metricNames,
    autoConnect: true,
  });

  const metrics = data
    .filter((item) => item.type === "metric_update")
    .map((item) => item.data);

  const latestMetrics = metricNames.reduce(
    (acc, metricName) => {
      const latestMetric = metrics.filter((m) => m.metric === metricName).pop();

      if (latestMetric) {
        acc[metricName] = latestMetric;
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  return {
    metrics: latestMetrics,
    allMetrics: metrics,
    lastMetric: lastMessage?.type === "metric_update" ? lastMessage.data : null,
    isConnected,
    error,
  };
}

// Helper hook for data quality updates
export function useDataQualityUpdates() {
  const { data, lastMessage, isConnected, error } = useAnalyticsWebSocket({
    metrics: ["data_quality"],
    autoConnect: true,
  });

  const qualityUpdates = data
    .filter((item) => item.type === "quality_update")
    .map((item) => item.data);

  const latestQuality = qualityUpdates[qualityUpdates.length - 1] || null;

  return {
    latestQuality,
    qualityHistory: qualityUpdates,
    lastUpdate:
      lastMessage?.type === "quality_update" ? lastMessage.data : null,
    isConnected,
    error,
  };
}

// Helper hook for AI prediction updates
export function useAIPredictionUpdates() {
  const { data, lastMessage, isConnected, error } = useAnalyticsWebSocket({
    metrics: ["ai_predictions"],
    autoConnect: true,
  });

  const predictions = data
    .filter((item) => item.type === "prediction_update")
    .map((item) => item.data);

  const latestPrediction = predictions[predictions.length - 1] || null;

  return {
    latestPrediction,
    predictionHistory: predictions,
    lastUpdate:
      lastMessage?.type === "prediction_update" ? lastMessage.data : null,
    isConnected,
    error,
  };
}

// Helper hook for anomaly alerts
export function useAnomalyAlerts() {
  const { data, lastMessage, isConnected, error } = useAnalyticsWebSocket({
    metrics: ["anomalies"],
    autoConnect: true,
  });

  const alerts = data
    .filter((item) => item.type === "anomaly_alert")
    .map((item) => item.data);

  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical" || alert.severity === "high",
  );

  return {
    alerts,
    criticalAlerts,
    latestAlert:
      lastMessage?.type === "anomaly_alert" ? lastMessage.data : null,
    alertCount: alerts.length,
    criticalCount: criticalAlerts.length,
    isConnected,
    error,
  };
}

export default useAnalyticsWebSocket;

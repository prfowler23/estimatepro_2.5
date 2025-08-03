// Analytics WebSocket Service
// Provides real-time data streaming for analytics dashboard

import { z } from "zod";

interface WebSocketMessage {
  type:
    | "metric_update"
    | "quality_update"
    | "prediction_update"
    | "anomaly_alert"
    | "connection_status";
  data: any;
  timestamp: string;
  id: string;
}

interface AnalyticsSubscription {
  id: string;
  metrics: string[];
  callback: (data: any) => void;
  filters?: Record<string, any>;
}

// Message validation schemas
const MetricUpdateSchema = z.object({
  metric: z.string(),
  value: z.number(),
  trend: z.enum(["up", "down", "stable"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

const QualityUpdateSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["compliant", "warning", "non_compliant"]),
  issues: z.number().min(0),
  recommendations: z.array(z.string()),
});

const PredictionUpdateSchema = z.object({
  predictionId: z.string(),
  type: z.string(),
  overallScore: z.number(),
  keyInsights: z.array(z.string()),
  topRecommendations: z.array(z.string()),
  dataQuality: z.number(),
});

const AnomalyAlertSchema = z.object({
  anomalyId: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  message: z.string(),
  detectedAt: z.string(),
  affectedMetrics: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

export class AnalyticsWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, AnalyticsSubscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;

  constructor(private baseUrl: string = "ws://localhost:3000") {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Use secure WebSocket in production
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/analytics/websocket`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("Analytics WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log("Analytics WebSocket closed:", event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();

          // Don't reconnect if closed intentionally
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("Analytics WebSocket error:", error);
          this.isConnected = false;
          reject(error);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached for Analytics WebSocket");
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000); // Max 30 seconds
      console.log(
        `Attempting to reconnect Analytics WebSocket (attempt ${this.reconnectAttempts})`,
      );
      this.connectionPromise = null;
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: "heartbeat",
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
          id: this.generateId(),
        });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Validate message structure
      if (!message.type || !message.data || !message.timestamp) {
        console.warn("Invalid WebSocket message structure:", message);
        return;
      }

      // Process message based on type
      switch (message.type) {
        case "metric_update":
          this.handleMetricUpdate(message.data);
          break;
        case "quality_update":
          this.handleQualityUpdate(message.data);
          break;
        case "prediction_update":
          this.handlePredictionUpdate(message.data);
          break;
        case "anomaly_alert":
          this.handleAnomalyAlert(message.data);
          break;
        case "connection_status":
          this.handleConnectionStatus(message.data);
          break;
        default:
          console.warn("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle metric updates
   */
  private handleMetricUpdate(data: any): void {
    try {
      const validatedData = MetricUpdateSchema.parse(data);

      // Notify relevant subscriptions
      this.subscriptions.forEach((subscription) => {
        if (
          subscription.metrics.includes(validatedData.metric) ||
          subscription.metrics.includes("*")
        ) {
          subscription.callback({
            type: "metric_update",
            data: validatedData,
          });
        }
      });
    } catch (error) {
      console.error("Invalid metric update data:", error);
    }
  }

  /**
   * Handle quality updates
   */
  private handleQualityUpdate(data: any): void {
    try {
      const validatedData = QualityUpdateSchema.parse(data);

      this.subscriptions.forEach((subscription) => {
        if (
          subscription.metrics.includes("data_quality") ||
          subscription.metrics.includes("*")
        ) {
          subscription.callback({
            type: "quality_update",
            data: validatedData,
          });
        }
      });
    } catch (error) {
      console.error("Invalid quality update data:", error);
    }
  }

  /**
   * Handle prediction updates
   */
  private handlePredictionUpdate(data: any): void {
    try {
      const validatedData = PredictionUpdateSchema.parse(data);

      this.subscriptions.forEach((subscription) => {
        if (
          subscription.metrics.includes("ai_predictions") ||
          subscription.metrics.includes("*")
        ) {
          subscription.callback({
            type: "prediction_update",
            data: validatedData,
          });
        }
      });
    } catch (error) {
      console.error("Invalid prediction update data:", error);
    }
  }

  /**
   * Handle anomaly alerts
   */
  private handleAnomalyAlert(data: any): void {
    try {
      const validatedData = AnomalyAlertSchema.parse(data);

      this.subscriptions.forEach((subscription) => {
        if (
          subscription.metrics.includes("anomalies") ||
          subscription.metrics.includes("*")
        ) {
          subscription.callback({
            type: "anomaly_alert",
            data: validatedData,
          });
        }
      });
    } catch (error) {
      console.error("Invalid anomaly alert data:", error);
    }
  }

  /**
   * Handle connection status updates
   */
  private handleConnectionStatus(data: any): void {
    console.log("Connection status update:", data);
  }

  /**
   * Send message through WebSocket
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      if (message.type !== "heartbeat") {
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Subscribe to analytics updates
   */
  public subscribe(
    metrics: string[],
    callback: (data: any) => void,
    filters?: Record<string, any>,
  ): string {
    const subscriptionId = this.generateId();

    const subscription: AnalyticsSubscription = {
      id: subscriptionId,
      metrics,
      callback,
      filters,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription request to server
    this.send({
      type: "subscribe",
      data: {
        subscriptionId,
        metrics,
        filters,
      },
      timestamp: new Date().toISOString(),
      id: this.generateId(),
    } as any);

    return subscriptionId;
  }

  /**
   * Unsubscribe from analytics updates
   */
  public unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);

      // Send unsubscribe request to server
      this.send({
        type: "unsubscribe",
        data: { subscriptionId },
        timestamp: new Date().toISOString(),
        id: this.generateId(),
      } as any);
    }
  }

  /**
   * Request specific metrics
   */
  public requestMetrics(
    metrics: string[],
    filters?: Record<string, any>,
  ): void {
    this.send({
      type: "request_metrics",
      data: { metrics, filters },
      timestamp: new Date().toISOString(),
      id: this.generateId(),
    } as any);
  }

  /**
   * Close WebSocket connection
   */
  public close(): void {
    this.stopHeartbeat();
    this.subscriptions.clear();
    this.messageQueue.length = 0;

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }

    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Get connection status
   */
  public isConnectionOpen(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let analyticsWebSocketService: AnalyticsWebSocketService | null = null;

export function getAnalyticsWebSocketService(): AnalyticsWebSocketService {
  if (!analyticsWebSocketService) {
    analyticsWebSocketService = new AnalyticsWebSocketService();
  }
  return analyticsWebSocketService;
}

export default AnalyticsWebSocketService;

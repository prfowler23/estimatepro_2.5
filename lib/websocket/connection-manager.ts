/**
 * WebSocket Connection Manager
 * Handles connection reliability, auto-reconnection, and health monitoring
 */

import { EventEmitter } from "events";
import { getRealTimeEventSystem } from "./event-system";
import { getRealTimePricingService } from "./enhanced-pricing-service";

export interface ConnectionConfig {
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;
  maxReconnectDelay: number;
  healthCheckInterval: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  debugMode: boolean;
}

export interface ConnectionHealth {
  status: "healthy" | "degraded" | "unhealthy" | "disconnected";
  latency: number;
  lastSeen: Date;
  reconnectAttempts: number;
  uptime: number;
  errorCount: number;
}

export interface ConnectionEvent {
  type: "connected" | "disconnected" | "reconnecting" | "error" | "health";
  data?: any;
  timestamp: Date;
}

export class WebSocketConnectionManager extends EventEmitter {
  private config: ConnectionConfig;
  private health: ConnectionHealth;
  private userId: string | null = null;
  private authToken: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStartTime: Date | null = null;
  private lastReconnectAttempt: Date | null = null;

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();

    this.config = {
      maxReconnectAttempts: 5,
      reconnectBaseDelay: 1000,
      maxReconnectDelay: 30000,
      healthCheckInterval: 10000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      debugMode: false,
      ...config,
    };

    this.health = {
      status: "disconnected",
      latency: 0,
      lastSeen: new Date(),
      reconnectAttempts: 0,
      uptime: 0,
      errorCount: 0,
    };

    this.setupEventListeners();
  }

  private setupEventListeners() {
    const eventSystem = getRealTimeEventSystem();
    const pricingService = getRealTimePricingService();

    // Event system events
    eventSystem.on("connected", () => {
      this.handleConnected();
    });

    eventSystem.on("disconnected", () => {
      this.handleDisconnected();
    });

    eventSystem.on("error", (error) => {
      this.handleError(error);
    });

    // Pricing service events
    pricingService.on("connected", () => {
      this.log("Pricing service connected");
      this.updateHealth("healthy");
    });

    pricingService.on("disconnected", (reason) => {
      this.log(`Pricing service disconnected: ${reason}`);
      this.handleDisconnected();
    });

    pricingService.on("reconnecting", (attempts) => {
      this.log(`Pricing service reconnecting (attempt ${attempts})`);
      this.health.reconnectAttempts = attempts;
      this.updateHealth("degraded");
    });

    pricingService.on("ping", (latency) => {
      this.health.latency = latency;
      this.health.lastSeen = new Date();

      // Update health based on latency
      if (latency < 100) {
        this.updateHealth("healthy");
      } else if (latency < 500) {
        this.updateHealth("degraded");
      } else {
        this.updateHealth("unhealthy");
      }
    });
  }

  async connect(userId: string, authToken: string): Promise<void> {
    this.userId = userId;
    this.authToken = authToken;
    this.connectionStartTime = new Date();

    try {
      this.log(`Attempting to connect user ${userId}`);

      const eventSystem = getRealTimeEventSystem();
      await eventSystem.connect(userId, authToken);

      this.startHealthMonitoring();
      this.startHeartbeat();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.log("Disconnecting...");

    this.clearTimers();

    const eventSystem = getRealTimeEventSystem();
    await eventSystem.disconnect();

    this.updateHealth("disconnected");
    this.emit("disconnected");
  }

  async reconnect(): Promise<void> {
    if (!this.userId || !this.authToken) {
      throw new Error("Cannot reconnect: Missing credentials");
    }

    this.log("Manual reconnection requested");
    await this.disconnect();
    await this.connect(this.userId, this.authToken);
  }

  private handleConnected() {
    this.log("Connection established");
    this.health.reconnectAttempts = 0;
    this.health.errorCount = 0;
    this.updateHealth("healthy");
    this.clearReconnectTimer();
    this.emit("connected");
  }

  private handleDisconnected() {
    this.log("Connection lost");
    this.updateHealth("disconnected");
    this.emit("disconnected");

    if (this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: any) {
    this.log(`Connection error: ${error?.message || error}`);
    this.health.errorCount++;

    if (this.health.errorCount > 3) {
      this.updateHealth("unhealthy");
    }

    this.emit("error", error);
  }

  private shouldReconnect(): boolean {
    return (
      this.userId !== null &&
      this.authToken !== null &&
      this.health.reconnectAttempts < this.config.maxReconnectAttempts
    );
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.calculateReconnectDelay();
    this.lastReconnectAttempt = new Date();

    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.health.reconnectAttempts + 1})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const exponentialDelay =
      this.config.reconnectBaseDelay *
      Math.pow(2, this.health.reconnectAttempts);

    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    return Math.min(exponentialDelay + jitter, this.config.maxReconnectDelay);
  }

  private async attemptReconnect() {
    if (!this.userId || !this.authToken) {
      return;
    }

    this.health.reconnectAttempts++;
    this.updateHealth("degraded");
    this.emit("reconnecting", this.health.reconnectAttempts);

    try {
      this.log(`Reconnect attempt ${this.health.reconnectAttempts}`);
      await this.connect(this.userId, this.authToken);
    } catch (error) {
      this.handleError(error);

      if (this.shouldReconnect()) {
        this.scheduleReconnect();
      } else {
        this.log("Max reconnect attempts reached");
        this.updateHealth("unhealthy");
      }
    }
  }

  private startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private performHealthCheck() {
    const now = new Date();
    const timeSinceLastSeen = now.getTime() - this.health.lastSeen.getTime();

    // Update uptime
    if (this.connectionStartTime) {
      this.health.uptime = now.getTime() - this.connectionStartTime.getTime();
    }

    // Check for stale connection
    if (timeSinceLastSeen > this.config.heartbeatInterval * 2) {
      this.log("Connection appears stale");
      this.updateHealth("unhealthy");

      // Force reconnect if connection is too stale
      if (timeSinceLastSeen > this.config.heartbeatInterval * 3) {
        this.handleDisconnected();
      }
    }

    this.emit("health", this.getHealth());
  }

  private async sendHeartbeat() {
    try {
      const eventSystem = getRealTimeEventSystem();
      if (eventSystem.connected) {
        await eventSystem.emit(
          "system",
          {
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          },
          {
            subtype: "ping",
            priority: "low",
          },
        );
      }
    } catch (error) {
      this.log(
        `Heartbeat failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private updateHealth(status: ConnectionHealth["status"]) {
    if (this.health.status !== status) {
      this.health.status = status;
      this.health.lastSeen = new Date();

      this.log(`Health status changed to: ${status}`);
      this.emit("health", this.getHealth());
    }
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private log(message: string) {
    if (this.config.debugMode) {
      console.log(`[ConnectionManager] ${message}`);
    }
  }

  // Public API
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  isConnected(): boolean {
    const eventSystem = getRealTimeEventSystem();
    return eventSystem.connected && this.health.status !== "disconnected";
  }

  isHealthy(): boolean {
    return this.health.status === "healthy";
  }

  getConnectionStats() {
    return {
      connected: this.isConnected(),
      healthy: this.isHealthy(),
      uptime: this.health.uptime,
      reconnectAttempts: this.health.reconnectAttempts,
      errorCount: this.health.errorCount,
      latency: this.health.latency,
      lastSeen: this.health.lastSeen,
      status: this.health.status,
    };
  }

  // Configuration updates
  updateConfig(updates: Partial<ConnectionConfig>) {
    this.config = { ...this.config, ...updates };

    // Restart timers if intervals changed
    if (updates.healthCheckInterval) {
      this.startHealthMonitoring();
    }

    if (updates.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  // Force health check
  async checkHealth(): Promise<ConnectionHealth> {
    this.performHealthCheck();
    return this.getHealth();
  }
}

// Singleton instance
let connectionManagerInstance: WebSocketConnectionManager | null = null;

export function getConnectionManager(): WebSocketConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new WebSocketConnectionManager({
      debugMode: process.env.NODE_ENV === "development",
    });
  }
  return connectionManagerInstance;
}

export default WebSocketConnectionManager;

/**
 * Enhanced Real-Time Pricing Service
 * Adds optimistic updates, connection resilience, and improved performance
 */

import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";

export interface OptimisticUpdate {
  id: string;
  type: "pricing" | "service" | "total";
  data: any;
  timestamp: string;
  confirmed: boolean;
  rollbackData?: any;
}

export interface PricingUpdateMessage {
  type: string;
  data: any;
  timestamp: string;
  userId: string;
  id: string;
  optimistic?: boolean;
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  lastPing: number;
  reconnectAttempts: number;
}

export class EnhancedRealTimePricingService extends EventEmitter {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = {
    connected: false,
    reconnecting: false,
    error: null,
    lastPing: 0,
    reconnectAttempts: 0,
  };
  private optimisticUpdates = new Map<string, OptimisticUpdate>();
  private roomId: string | null = null;
  private userId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(
    private config = {
      serverUrl:
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      optimisticTimeout: 5000,
    },
  ) {
    super();
    this.setMaxListeners(50); // Support many listeners
  }

  async connect(userId: string, authToken: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.userId = userId;
    this.connectionState.reconnecting = true;

    try {
      this.socket = io(this.config.serverUrl, {
        auth: { token: authToken },
        transports: ["websocket", "polling"],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
      });

      this.setupEventHandlers();
      await this.waitForConnection();

      this.connectionState.connected = true;
      this.connectionState.reconnecting = false;
      this.connectionState.error = null;
      this.connectionState.reconnectAttempts = 0;

      this.startHeartbeat();
      this.emit("connected");
    } catch (error) {
      this.connectionState.reconnecting = false;
      this.connectionState.error =
        error instanceof Error ? error.message : "Connection failed";
      this.emit("error", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.connectionState.connected = true;
      this.connectionState.reconnecting = false;
      this.connectionState.error = null;
      this.emit("connected");
    });

    this.socket.on("disconnect", (reason) => {
      this.connectionState.connected = false;
      this.emit("disconnected", reason);

      if (reason === "io server disconnect") {
        // Server initiated disconnect - don't reconnect automatically
        this.cleanup();
      } else {
        // Connection lost - attempt reconnection
        this.handleReconnection();
      }
    });

    this.socket.on("connect_error", (error) => {
      this.connectionState.error = error.message;
      this.emit("error", error);
      this.handleReconnection();
    });

    this.socket.on("pricing-updated", (message: PricingUpdateMessage) => {
      this.handlePricingUpdate(message);
    });

    this.socket.on("pong", (data) => {
      this.connectionState.lastPing = Date.now() - data.timestamp;
      this.emit("ping", this.connectionState.lastPing);
    });

    this.socket.on("room-joined", (data) => {
      this.emit("room-joined", data);
    });

    this.socket.on("user-joined", (data) => {
      this.emit("user-joined", data);
    });

    this.socket.on("user-left", (data) => {
      this.emit("user-left", data);
    });
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      this.socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private handleReconnection(): void {
    if (
      this.connectionState.reconnectAttempts >= this.config.reconnectAttempts
    ) {
      this.connectionState.error = "Max reconnection attempts exceeded";
      this.emit("error", new Error(this.connectionState.error));
      return;
    }

    this.connectionState.reconnecting = true;
    this.connectionState.reconnectAttempts++;

    const delay =
      this.config.reconnectDelay *
      Math.pow(2, this.connectionState.reconnectAttempts - 1);

    this.reconnectTimeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);

    this.emit("reconnecting", this.connectionState.reconnectAttempts);
  }

  async joinRoom(estimateId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("Not connected to server");
    }

    this.roomId = `estimate_${estimateId}`;
    this.socket.emit("join-room", this.roomId);
  }

  async leaveRoom(): Promise<void> {
    if (!this.socket?.connected || !this.roomId) {
      return;
    }

    this.socket.emit("leave-room", this.roomId);
    this.roomId = null;
  }

  // Optimistic pricing updates
  async updatePricingOptimistic(data: any): Promise<string> {
    const updateId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic update
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: data.type || "pricing",
      data,
      timestamp: new Date().toISOString(),
      confirmed: false,
      rollbackData: this.getCurrentState(data.type),
    };

    // Apply optimistic update immediately
    this.optimisticUpdates.set(updateId, optimisticUpdate);
    this.emit("optimistic-update", optimisticUpdate);

    // Send to server
    if (this.socket?.connected && this.roomId) {
      this.socket.emit("pricing-update", {
        ...data,
        roomId: this.roomId,
        optimisticId: updateId,
      });
    }

    // Set timeout for rollback if not confirmed
    setTimeout(() => {
      this.checkOptimisticUpdate(updateId);
    }, this.config.optimisticTimeout);

    return updateId;
  }

  private handlePricingUpdate(message: PricingUpdateMessage): void {
    // Check if this confirms an optimistic update
    if (message.data.optimisticId) {
      const update = this.optimisticUpdates.get(message.data.optimisticId);
      if (update) {
        update.confirmed = true;
        this.emit("optimistic-confirmed", update);
      }
    }

    this.emit("pricing-update", message);
  }

  private checkOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId);
    if (!update) return;

    if (!update.confirmed) {
      // Rollback optimistic update
      this.emit("optimistic-rollback", {
        update,
        rollbackData: update.rollbackData,
      });
    }

    this.optimisticUpdates.delete(updateId);
  }

  private getCurrentState(type: string): any {
    // This would return the current state for rollback
    // Implementation depends on your state management
    return null;
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
    }, this.config.heartbeatInterval);
  }

  disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.optimisticUpdates.clear();
    this.connectionState.connected = false;
  }

  // Public getters
  get connected(): boolean {
    return this.connectionState.connected;
  }

  get reconnecting(): boolean {
    return this.connectionState.reconnecting;
  }

  get error(): string | null {
    return this.connectionState.error;
  }

  get ping(): number {
    return this.connectionState.lastPing;
  }

  getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values()).filter(
      (u) => !u.confirmed,
    );
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
}

// Singleton instance
let instance: EnhancedRealTimePricingService | null = null;

export function getRealTimePricingService(): EnhancedRealTimePricingService {
  if (!instance) {
    instance = new EnhancedRealTimePricingService();
  }
  return instance;
}

export default EnhancedRealTimePricingService;

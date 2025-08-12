/**
 * Unified Event System for Real-Time Features
 * Provides centralized event management for WebSocket communications
 */

import { EventEmitter } from "events";
import { getRealTimePricingService } from "./enhanced-pricing-service";
import type { RealTimeMessage, SocketUser, OptimisticUpdate } from "./server";

export interface EventSubscription {
  id: string;
  types: string[];
  callback: (event: RealTimeEvent) => void;
  options: EventSubscriptionOptions;
}

export interface EventSubscriptionOptions {
  roomId?: string;
  userId?: string;
  priority?: "low" | "medium" | "high";
  throttleMs?: number;
  persistent?: boolean;
}

export interface RealTimeEvent {
  type: string;
  subtype?: string;
  data: any;
  timestamp: string;
  userId?: string;
  roomId?: string;
  id: string;
  metadata?: {
    optimistic?: boolean;
    priority?: string;
    source?: string;
  };
}

export interface EventSystemStats {
  totalEvents: number;
  activeSubscriptions: number;
  connectedUsers: number;
  eventsPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

class UnifiedEventSystem extends EventEmitter {
  private subscriptions = new Map<string, EventSubscription>();
  private eventQueue: RealTimeEvent[] = [];
  private processingQueue = false;
  private stats: EventSystemStats = {
    totalEvents: 0,
    activeSubscriptions: 0,
    connectedUsers: 0,
    eventsPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
  };
  private throttleMap = new Map<string, number>();
  private connectionState = {
    connected: false,
    reconnecting: false,
    lastPing: 0,
  };

  constructor() {
    super();
    this.setMaxListeners(100); // Support many listeners
    this.startStatsTracking();
    this.setupPricingServiceIntegration();
  }

  private setupPricingServiceIntegration() {
    const pricingService = getRealTimePricingService();

    // Forward pricing service events through unified system
    pricingService.on("connected", () => {
      this.connectionState.connected = true;
      this.emit("system", {
        type: "system",
        subtype: "connected",
        data: { service: "pricing" },
        timestamp: new Date().toISOString(),
        id: this.generateId("system"),
      });
    });

    pricingService.on("disconnected", () => {
      this.connectionState.connected = false;
      this.emit("system", {
        type: "system",
        subtype: "disconnected",
        data: { service: "pricing" },
        timestamp: new Date().toISOString(),
        id: this.generateId("system"),
      });
    });

    pricingService.on("optimistic-update", (update: OptimisticUpdate) => {
      this.emit("pricing", {
        type: "pricing",
        subtype: "optimistic-update",
        data: update,
        timestamp: new Date().toISOString(),
        id: this.generateId("pricing"),
        metadata: { optimistic: true },
      });
    });

    pricingService.on("pricing-update", (message: RealTimeMessage) => {
      this.emit("pricing", {
        type: "pricing",
        subtype: "update",
        data: message.data,
        timestamp: message.timestamp,
        userId: message.userId,
        id: message.id,
      });
    });
  }

  // Connection management
  async connect(userId: string, authToken: string): Promise<void> {
    try {
      const pricingService = getRealTimePricingService();
      await pricingService.connect(userId, authToken);
      this.connectionState.connected = true;
      this.emit("connected");
    } catch (error) {
      this.connectionState.connected = false;
      this.emit("error", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const pricingService = getRealTimePricingService();
    pricingService.disconnect();
    this.connectionState.connected = false;
    this.clearAllSubscriptions();
    this.emit("disconnected");
  }

  get connected(): boolean {
    return this.connectionState.connected;
  }

  // Room management
  async joinRoom(roomId: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to event system");
    }

    const pricingService = getRealTimePricingService();
    await pricingService.joinRoom(roomId.replace("estimate_", ""));

    this.emit("system", {
      type: "system",
      subtype: "room-joined",
      data: { roomId },
      timestamp: new Date().toISOString(),
      id: this.generateId("system"),
    });
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.connected) return;

    const pricingService = getRealTimePricingService();
    await pricingService.leaveRoom();

    this.emit("system", {
      type: "system",
      subtype: "room-left",
      data: { roomId },
      timestamp: new Date().toISOString(),
      id: this.generateId("system"),
    });
  }

  // Subscription management
  subscribe(
    types: string | string[],
    callback: (event: RealTimeEvent) => void,
    options: EventSubscriptionOptions = {},
  ): string {
    const subscriptionId = this.generateId("sub");
    const eventTypes = Array.isArray(types) ? types : [types];

    const subscription: EventSubscription = {
      id: subscriptionId,
      types: eventTypes,
      callback,
      options: {
        priority: "medium",
        throttleMs: 0,
        persistent: false,
        ...options,
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.stats.activeSubscriptions = this.subscriptions.size;

    // Set up event listeners
    eventTypes.forEach((type) => {
      this.on(type, (event: RealTimeEvent) => {
        this.handleSubscriptionEvent(subscription, event);
      });
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    this.subscriptions.delete(subscriptionId);
    this.stats.activeSubscriptions = this.subscriptions.size;

    return true;
  }

  private handleSubscriptionEvent(
    subscription: EventSubscription,
    event: RealTimeEvent,
  ) {
    // Apply filters
    if (
      subscription.options.roomId &&
      event.roomId !== subscription.options.roomId
    ) {
      return;
    }

    if (
      subscription.options.userId &&
      event.userId !== subscription.options.userId
    ) {
      return;
    }

    // Apply throttling
    if (
      subscription.options.throttleMs &&
      subscription.options.throttleMs > 0
    ) {
      const throttleKey = `${subscription.id}_${event.type}`;
      const lastCall = this.throttleMap.get(throttleKey) || 0;
      const now = Date.now();

      if (now - lastCall < subscription.options.throttleMs) {
        return; // Throttled
      }

      this.throttleMap.set(throttleKey, now);
    }

    // Execute callback
    try {
      subscription.callback(event);
    } catch (error) {
      console.error("Subscription callback error:", error);
      this.stats.errorRate++;
    }
  }

  // Event emission
  async emitEvent(
    type: string,
    data: any,
    options: {
      subtype?: string;
      roomId?: string;
      userId?: string;
      priority?: "low" | "medium" | "high";
      optimistic?: boolean;
    } = {},
  ): Promise<string> {
    const eventId = this.generateId(type);
    const event: RealTimeEvent = {
      type,
      subtype: options.subtype,
      data,
      timestamp: new Date().toISOString(),
      userId: options.userId,
      roomId: options.roomId,
      id: eventId,
      metadata: {
        priority: options.priority || "medium",
        optimistic: options.optimistic || false,
        source: "event-system",
      },
    };

    // Add to queue for processing
    this.eventQueue.push(event);
    this.stats.totalEvents++;

    // Process queue
    this.processEventQueue();

    // Emit to EventEmitter
    super.emit(type, event);

    // Forward to pricing service if needed
    if (type === "pricing") {
      const pricingService = getRealTimePricingService();
      if (options.optimistic) {
        await pricingService.updatePricingOptimistic(data);
      }
    }

    return eventId;
  }

  private async processEventQueue() {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;

      try {
        // Sort by priority
        const priority = event.metadata?.priority || "medium";
        const delay = priority === "high" ? 0 : priority === "medium" ? 1 : 5;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Process event (already emitted above)
      } catch (error) {
        console.error("Event processing error:", error);
        this.stats.errorRate++;
      }
    }

    this.processingQueue = false;
  }

  // Utility methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private clearAllSubscriptions() {
    this.subscriptions.clear();
    this.stats.activeSubscriptions = 0;
  }

  private startStatsTracking() {
    setInterval(() => {
      // Calculate events per second
      const now = Date.now();
      const oneSecondAgo = now - 1000;

      // Simple approximation - would be better with sliding window
      this.stats.eventsPerSecond = this.eventQueue.length;

      // Update connection stats
      this.stats.connectedUsers = this.connected ? 1 : 0;

      // Reset error rate periodically
      if (this.stats.totalEvents % 1000 === 0) {
        this.stats.errorRate = 0;
      }
    }, 1000);
  }

  // Public API
  getStats(): EventSystemStats {
    return { ...this.stats };
  }

  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  getConnectionState() {
    return { ...this.connectionState };
  }

  // Batch operations
  async emitBatch(
    events: Array<{
      type: string;
      data: any;
      options?: any;
    }>,
  ): Promise<string[]> {
    const promises = events.map(async (event) => {
      return await this.emitEvent(event.type, event.data, event.options);
    });
    return Promise.all(promises);
  }

  // Event filtering and routing
  createEventFilter(criteria: {
    types?: string[];
    roomId?: string;
    userId?: string;
    timeRange?: { start: Date; end: Date };
  }) {
    return (event: RealTimeEvent): boolean => {
      if (criteria.types && !criteria.types.includes(event.type)) {
        return false;
      }

      if (criteria.roomId && event.roomId !== criteria.roomId) {
        return false;
      }

      if (criteria.userId && event.userId !== criteria.userId) {
        return false;
      }

      if (criteria.timeRange) {
        const eventTime = new Date(event.timestamp);
        if (
          eventTime < criteria.timeRange.start ||
          eventTime > criteria.timeRange.end
        ) {
          return false;
        }
      }

      return true;
    };
  }
}

// Singleton instance
let eventSystemInstance: UnifiedEventSystem | null = null;

export function getRealTimeEventSystem(): UnifiedEventSystem {
  if (!eventSystemInstance) {
    eventSystemInstance = new UnifiedEventSystem();
  }
  return eventSystemInstance;
}

export default UnifiedEventSystem;

/**
 * Unified Real-Time Service
 * Consolidates and enhances all real-time communication features
 * Integrates WebSocket management, event system, and collaboration
 */

import { EventEmitter } from "events";
import { getRealTimeEventSystem } from "@/lib/websocket/event-system";
import { getConnectionManager } from "@/lib/websocket/connection-manager";
import { getRealTimePricingService } from "@/lib/websocket/enhanced-pricing-service";
import type {
  RealTimeEvent,
  EventSubscription,
  EventSubscriptionOptions,
} from "@/lib/websocket/event-system";
import type {
  ConnectionHealth,
  ConnectionConfig,
} from "@/lib/websocket/connection-manager";
import type { OptimisticUpdate } from "@/lib/websocket/enhanced-pricing-service";

// Enhanced types for unified service
export interface UnifiedConnectionState {
  connected: boolean;
  healthy: boolean;
  reconnecting: boolean;
  error: string | null;
  uptime: number;
  latency: number;
  reconnectAttempts: number;
  errorCount: number;
  lastSeen: Date;
  status: "healthy" | "degraded" | "unhealthy" | "disconnected";
}

export interface CollaborationState {
  roomId: string | null;
  userId: string | null;
  collaborators: Collaborator[];
  isActive: boolean;
}

export interface Collaborator {
  userId: string;
  userName: string;
  avatar?: string;
  status: "active" | "idle" | "disconnected";
  lastActivity: Date;
  currentField?: string;
  isTyping: boolean;
  cursor?: { x: number; y: number };
}

export interface RealTimeServiceConfig {
  // Connection settings
  autoConnect: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;

  // Health monitoring
  healthCheckInterval: number;
  heartbeatInterval: number;
  connectionTimeout: number;

  // Performance settings
  eventBatchSize: number;
  eventBatchTimeout: number;
  optimisticTimeout: number;

  // Collaboration settings
  cursorThrottleMs: number;
  typingTimeoutMs: number;
  activityTimeoutMs: number;

  // Debug settings
  debugMode: boolean;
  enableMetrics: boolean;
}

export interface ServiceMetrics {
  // Connection metrics
  totalConnections: number;
  activeConnections: number;
  averageLatency: number;
  uptimeSeconds: number;

  // Event metrics
  totalEvents: number;
  eventsPerSecond: number;
  activeSubscriptions: number;

  // Collaboration metrics
  activeRooms: number;
  totalCollaborators: number;

  // Performance metrics
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
}

/**
 * Unified Real-Time Service
 * Provides a single interface for all real-time functionality
 */
export class UnifiedRealTimeService extends EventEmitter {
  private rtConfig: RealTimeServiceConfig;
  private rtConnectionState: UnifiedConnectionState;
  private rtCollaborationState: CollaborationState;
  private rtMetrics: ServiceMetrics;
  private subscriptions = new Map<string, EventSubscription>();
  private metricsInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(config: Partial<RealTimeServiceConfig> = {}) {
    super();

    this.rtConfig = {
      // Connection defaults
      autoConnect: true,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectBaseDelay: 1000,

      // Health monitoring defaults
      healthCheckInterval: 10000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,

      // Performance defaults
      eventBatchSize: 10,
      eventBatchTimeout: 100,
      optimisticTimeout: 5000,

      // Collaboration defaults
      cursorThrottleMs: 100,
      typingTimeoutMs: 3000,
      activityTimeoutMs: 300000, // 5 minutes

      // Debug defaults
      debugMode: process.env.NODE_ENV === "development",
      enableMetrics: true,

      ...config,
    };

    this.rtConnectionState = {
      connected: false,
      healthy: false,
      reconnecting: false,
      error: null,
      uptime: 0,
      latency: 0,
      reconnectAttempts: 0,
      errorCount: 0,
      lastSeen: new Date(),
      status: "disconnected",
    };

    this.rtCollaborationState = {
      roomId: null,
      userId: null,
      collaborators: [],
      isActive: false,
    };

    this.rtMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      averageLatency: 0,
      uptimeSeconds: 0,
      totalEvents: 0,
      eventsPerSecond: 0,
      activeSubscriptions: 0,
      activeRooms: 0,
      totalCollaborators: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
    };

    this.setMaxListeners(100);
  }

  /**
   * Initialize the unified real-time service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.log("Initializing unified real-time service");

      // Setup core service integrations
      await this.setupConnectionManager();
      await this.setupEventSystem();
      await this.setupPricingService();

      // Start metrics collection if enabled
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }

      this.initialized = true;
      this.emit("initialized");

      this.log("Unified real-time service initialized successfully");
    } catch (error) {
      this.log(
        `Failed to initialize: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  private async setupConnectionManager(): Promise<void> {
    const connectionManager = getConnectionManager();

    // Update connection manager configuration
    connectionManager.updateConfig({
      maxReconnectAttempts: this.rtConfig.maxReconnectAttempts,
      reconnectBaseDelay: this.rtConfig.reconnectBaseDelay,
      healthCheckInterval: this.rtConfig.healthCheckInterval,
      heartbeatInterval: this.rtConfig.heartbeatInterval,
      connectionTimeout: this.rtConfig.connectionTimeout,
      debugMode: this.rtConfig.debugMode,
    });

    // Listen to connection manager events
    connectionManager.on("connected", () => {
      this.updateConnectionState({ connected: true, error: null });
      this.emit("connected");
    });

    connectionManager.on("disconnected", () => {
      this.updateConnectionState({ connected: false });
      this.emit("disconnected");
    });

    connectionManager.on("reconnecting", (attempts: number) => {
      this.updateConnectionState({
        reconnecting: true,
        reconnectAttempts: attempts,
      });
      this.emit("reconnecting", attempts);
    });

    connectionManager.on("error", (error: Error) => {
      this.updateConnectionState({ error: error.message });
      this.emit("error", error);
    });

    connectionManager.on("health", (health: ConnectionHealth) => {
      this.updateConnectionState({
        healthy: health.status === "healthy",
        uptime: health.uptime,
        latency: health.latency,
        errorCount: health.errorCount,
        lastSeen: health.lastSeen,
        status: health.status,
      });
      this.emit("health", health);
    });
  }

  private async setupEventSystem(): Promise<void> {
    const eventSystem = getRealTimeEventSystem();

    // Setup unified event handling
    const systemSubscription = eventSystem.subscribe(
      ["system", "pricing", "collaboration"],
      (event: RealTimeEvent) => {
        this.handleUnifiedEvent(event);
      },
      { priority: "high" },
    );

    this.subscriptions.set("system", systemSubscription as any);
  }

  private async setupPricingService(): Promise<void> {
    const pricingService = getRealTimePricingService();

    // Listen to pricing service events
    pricingService.on("optimistic-update", (update: OptimisticUpdate) => {
      this.emit("optimistic-update", update);
    });

    pricingService.on("optimistic-confirmed", (update: OptimisticUpdate) => {
      this.emit("optimistic-confirmed", update);
    });

    pricingService.on("optimistic-rollback", (data: any) => {
      this.emit("optimistic-rollback", data);
    });

    pricingService.on("ping", (latency: number) => {
      this.updateConnectionState({ latency });
    });
  }

  private handleUnifiedEvent(event: RealTimeEvent): void {
    this.metrics.totalEvents++;

    switch (event.type) {
      case "system":
        this.handleSystemEvent(event);
        break;
      case "pricing":
        this.handlePricingEvent(event);
        break;
      case "collaboration":
        this.handleCollaborationEvent(event);
        break;
      default:
        this.emit("event", event);
    }
  }

  private handleSystemEvent(event: RealTimeEvent): void {
    switch (event.subtype) {
      case "connected":
        this.updateConnectionState({ connected: true, error: null });
        break;
      case "disconnected":
        this.updateConnectionState({ connected: false });
        break;
      case "room-joined":
        this.collaborationState.roomId = event.data.roomId;
        this.collaborationState.isActive = true;
        this.emit("room-joined", event.data);
        break;
      case "room-left":
        this.collaborationState.roomId = null;
        this.collaborationState.isActive = false;
        this.emit("room-left", event.data);
        break;
    }
  }

  private handlePricingEvent(event: RealTimeEvent): void {
    this.emit("pricing-event", event);
  }

  private handleCollaborationEvent(event: RealTimeEvent): void {
    switch (event.subtype) {
      case "user-joined":
        this.addCollaborator(event.data);
        break;
      case "user-left":
        this.removeCollaborator(event.data.userId);
        break;
      case "user-disconnected":
        this.updateCollaboratorStatus(event.data.userId, "disconnected");
        break;
      case "cursor-moved":
        this.updateCollaboratorCursor(event.data.userId, event.data.position);
        break;
      case "field-focused":
        this.updateCollaboratorField(event.data.userId, event.data.fieldId);
        break;
      case "field-blurred":
        this.updateCollaboratorField(event.data.userId, null);
        break;
      case "typing-started":
        this.updateCollaboratorTyping(event.data.userId, true);
        break;
      case "typing-stopped":
        this.updateCollaboratorTyping(event.data.userId, false);
        break;
    }

    this.emit("collaboration-event", event);
  }

  // Connection Management
  async connect(userId: string, authToken: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.collaborationState.userId = userId;

    try {
      const connectionManager = getConnectionManager();
      await connectionManager.connect(userId, authToken);

      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      this.log(`Connected user: ${userId}`);
    } catch (error) {
      this.log(
        `Connection failed for user ${userId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const connectionManager = getConnectionManager();
    await connectionManager.disconnect();

    // Clean up collaboration state
    if (this.collaborationState.roomId) {
      await this.leaveRoom();
    }

    this.metrics.activeConnections = Math.max(
      0,
      this.metrics.activeConnections - 1,
    );
    this.collaborationState.userId = null;

    this.log("Disconnected");
  }

  async reconnect(): Promise<void> {
    const connectionManager = getConnectionManager();
    await connectionManager.reconnect();

    this.log("Reconnected");
  }

  // Room Management
  async joinRoom(roomId: string): Promise<void> {
    if (!this.connectionState.connected) {
      throw new Error("Not connected to real-time service");
    }

    const eventSystem = getRealTimeEventSystem();
    await eventSystem.joinRoom(roomId);

    this.collaborationState.roomId = roomId;
    this.collaborationState.isActive = true;

    this.metrics.activeRooms++;

    this.log(`Joined room: ${roomId}`);
  }

  async leaveRoom(): Promise<void> {
    if (!this.collaborationState.roomId) {
      return;
    }

    const eventSystem = getRealTimeEventSystem();
    await eventSystem.leaveRoom(this.collaborationState.roomId);

    this.collaborationState.roomId = null;
    this.collaborationState.isActive = false;
    this.collaborationState.collaborators = [];

    this.metrics.activeRooms = Math.max(0, this.metrics.activeRooms - 1);

    this.log("Left room");
  }

  // Event Management
  subscribe(
    types: string | string[],
    callback: (event: RealTimeEvent) => void,
    options: EventSubscriptionOptions = {},
  ): string {
    const eventSystem = getRealTimeEventSystem();
    const subscriptionId = eventSystem.subscribe(types, callback, options);

    this.metrics.activeSubscriptions++;

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    const eventSystem = getRealTimeEventSystem();
    const success = eventSystem.unsubscribe(subscriptionId);

    if (success) {
      this.metrics.activeSubscriptions = Math.max(
        0,
        this.metrics.activeSubscriptions - 1,
      );
    }

    return success;
  }

  async emit(
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
    const eventSystem = getRealTimeEventSystem();
    return eventSystem.emit(type, data, {
      ...options,
      roomId: options.roomId || this.collaborationState.roomId || undefined,
      userId: options.userId || this.collaborationState.userId || undefined,
    });
  }

  // Optimistic Updates
  async updateOptimistic(data: any): Promise<string> {
    const pricingService = getRealTimePricingService();
    return pricingService.updatePricingOptimistic(data);
  }

  getPendingOptimisticUpdates(): OptimisticUpdate[] {
    const pricingService = getRealTimePricingService();
    return pricingService.getPendingOptimisticUpdates();
  }

  // Collaboration Management
  private addCollaborator(userData: any): void {
    const existingIndex = this.collaborationState.collaborators.findIndex(
      (c) => c.userId === userData.userId,
    );

    const collaborator: Collaborator = {
      userId: userData.userId,
      userName: userData.userName,
      avatar: userData.avatar,
      status: "active",
      lastActivity: new Date(),
      isTyping: false,
    };

    if (existingIndex >= 0) {
      this.collaborationState.collaborators[existingIndex] = collaborator;
    } else {
      this.collaborationState.collaborators.push(collaborator);
      this.metrics.totalCollaborators++;
    }

    this.emit("collaborator-added", collaborator);
  }

  private removeCollaborator(userId: string): void {
    const index = this.collaborationState.collaborators.findIndex(
      (c) => c.userId === userId,
    );

    if (index >= 0) {
      const collaborator = this.collaborationState.collaborators[index];
      this.collaborationState.collaborators.splice(index, 1);
      this.emit("collaborator-removed", collaborator);
    }
  }

  private updateCollaboratorStatus(
    userId: string,
    status: Collaborator["status"],
  ): void {
    const collaborator = this.collaborationState.collaborators.find(
      (c) => c.userId === userId,
    );

    if (collaborator) {
      collaborator.status = status;
      collaborator.lastActivity = new Date();
      this.emit("collaborator-updated", collaborator);
    }
  }

  private updateCollaboratorCursor(
    userId: string,
    position: { x: number; y: number },
  ): void {
    const collaborator = this.collaborationState.collaborators.find(
      (c) => c.userId === userId,
    );

    if (collaborator) {
      collaborator.cursor = position;
      collaborator.lastActivity = new Date();
      this.emit("collaborator-cursor", { collaborator, position });
    }
  }

  private updateCollaboratorField(
    userId: string,
    fieldId: string | null,
  ): void {
    const collaborator = this.collaborationState.collaborators.find(
      (c) => c.userId === userId,
    );

    if (collaborator) {
      collaborator.currentField = fieldId || undefined;
      collaborator.lastActivity = new Date();
      this.emit("collaborator-field", { collaborator, fieldId });
    }
  }

  private updateCollaboratorTyping(userId: string, isTyping: boolean): void {
    const collaborator = this.collaborationState.collaborators.find(
      (c) => c.userId === userId,
    );

    if (collaborator) {
      collaborator.isTyping = isTyping;
      collaborator.lastActivity = new Date();
      this.emit("collaborator-typing", { collaborator, isTyping });
    }
  }

  // Utility Methods
  private updateConnectionState(
    updates: Partial<UnifiedConnectionState>,
  ): void {
    Object.assign(this.connectionState, updates);
    this.emit("connection-state", this.connectionState);
  }

  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.emit("metrics", this.metrics);
    }, 10000); // Update every 10 seconds
  }

  private updateMetrics(): void {
    const now = Date.now();

    // Update performance metrics
    if (typeof window !== "undefined" && (window as any).performance?.memory) {
      this.metrics.memoryUsage = (
        window as any
      ).performance.memory.usedJSHeapSize;
    }

    // Update connection metrics
    this.metrics.averageLatency = this.connectionState.latency;
    this.metrics.uptimeSeconds = Math.floor(this.connectionState.uptime / 1000);

    // Update collaboration metrics
    this.metrics.totalCollaborators =
      this.collaborationState.collaborators.length;
  }

  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[UnifiedRealTimeService] ${message}`);
    }
  }

  // Public API - Getters
  get connected(): boolean {
    return this.connectionState.connected;
  }

  get healthy(): boolean {
    return this.connectionState.healthy;
  }

  get connectionState(): UnifiedConnectionState {
    return { ...this.connectionState };
  }

  get collaborationState(): CollaborationState {
    return {
      ...this.collaborationState,
      collaborators: [...this.collaborationState.collaborators],
    };
  }

  get metrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  get config(): RealTimeServiceConfig {
    return { ...this.config };
  }

  // Configuration Updates
  updateConfig(updates: Partial<RealTimeServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update underlying services
    const connectionManager = getConnectionManager();
    connectionManager.updateConfig({
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectBaseDelay: this.config.reconnectBaseDelay,
      healthCheckInterval: this.config.healthCheckInterval,
      heartbeatInterval: this.config.heartbeatInterval,
      connectionTimeout: this.config.connectionTimeout,
      debugMode: this.config.debugMode,
    });

    this.emit("config-updated", this.config);
  }

  // Cleanup
  destroy(): void {
    this.log("Destroying unified real-time service");

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Clean up subscriptions
    this.subscriptions.forEach((_, id) => {
      this.unsubscribe(id);
    });
    this.subscriptions.clear();

    // Disconnect if connected
    if (this.connectionState.connected) {
      this.disconnect().catch((error) => {
        this.log(
          `Error during cleanup disconnect: ${error instanceof Error ? error.message : error}`,
        );
      });
    }

    this.removeAllListeners();
    this.initialized = false;

    this.log("Unified real-time service destroyed");
  }
}

// Singleton instance
let unifiedRealTimeServiceInstance: UnifiedRealTimeService | null = null;

export function getUnifiedRealTimeService(): UnifiedRealTimeService {
  if (!unifiedRealTimeServiceInstance) {
    unifiedRealTimeServiceInstance = new UnifiedRealTimeService();
  }
  return unifiedRealTimeServiceInstance;
}

// Convenience functions for common operations
export async function connectRealTime(
  userId: string,
  authToken: string,
): Promise<void> {
  const service = getUnifiedRealTimeService();
  await service.connect(userId, authToken);
}

export async function joinCollaborationRoom(roomId: string): Promise<void> {
  const service = getUnifiedRealTimeService();
  await service.joinRoom(roomId);
}

export async function sendOptimisticUpdate(data: any): Promise<string> {
  const service = getUnifiedRealTimeService();
  return service.updateOptimistic(data);
}

export function subscribeToRealTimeEvents(
  types: string | string[],
  callback: (event: RealTimeEvent) => void,
  options?: EventSubscriptionOptions,
): string {
  const service = getUnifiedRealTimeService();
  return service.subscribe(types, callback, options);
}

export function unsubscribeFromRealTimeEvents(subscriptionId: string): boolean {
  const service = getUnifiedRealTimeService();
  return service.unsubscribe(subscriptionId);
}

export default UnifiedRealTimeService;

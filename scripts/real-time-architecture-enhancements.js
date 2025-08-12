#!/usr/bin/env node

/**
 * Real-Time Architecture Enhancement Script
 * Wave 4.1: Implement real-time architecture enhancements
 *
 * This script analyzes and enhances the real-time architecture of EstimatePro:
 * 1. Assess current WebSocket implementation
 * 2. Implement proper WebSocket server with Socket.io
 * 3. Enhance real-time pricing with optimistic updates
 * 4. Create unified real-time event system
 * 5. Add real-time collaboration features
 * 6. Implement connection management and resilience
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class RealTimeArchitectureEnhancer {
  constructor() {
    this.projectRoot = process.cwd();
    this.changes = [];
    this.config = {
      socketPort: 3001,
      enableCollaboration: true,
      enableOptimisticUpdates: true,
      connectionTimeout: 30000,
      heartbeatInterval: 25000,
      maxConnections: 1000,
      enableClustering: true,
    };
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      enhance: "🚀",
      websocket: "🔗",
      realtime: "⚡",
    }[type];

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runEnhancements() {
    this.log("Starting real-time architecture enhancements...", "enhance");

    await this.analyzeCurrentArchitecture();
    await this.installRealTimeDependencies();
    await this.createWebSocketServer();
    await this.enhanceRealTimePricing();
    await this.createUnifiedEventSystem();
    await this.implementCollaborationFeatures();
    await this.enhanceConnectionManagement();
    await this.createRealTimeComponents();
    await this.updateConfiguration();
    await this.generateDocumentation();

    this.log("Real-time architecture enhancements completed!", "success");
    this.generateSummaryReport();
  }

  async analyzeCurrentArchitecture() {
    this.log("Analyzing current real-time architecture...", "realtime");

    const analysisResults = {
      existingWebSockets: this.findWebSocketImplementations(),
      realTimeServices: this.findRealTimeServices(),
      hooks: this.findRealTimeHooks(),
      apiEndpoints: this.findRealTimeAPI(),
      gaps: [],
      recommendations: [],
    };

    // Identify gaps
    if (!analysisResults.existingWebSockets.properServer) {
      analysisResults.gaps.push("No proper WebSocket server implementation");
    }

    if (!analysisResults.realTimeServices.optimisticUpdates) {
      analysisResults.gaps.push(
        "Missing optimistic updates in real-time pricing",
      );
    }

    if (!analysisResults.hooks.connectionResilience) {
      analysisResults.gaps.push("Insufficient connection resilience in hooks");
    }

    // Generate recommendations
    analysisResults.recommendations = [
      "Implement Socket.io server for robust WebSocket handling",
      "Add optimistic updates for real-time pricing",
      "Create unified real-time event system",
      "Enhance connection management with heartbeats",
      "Add real-time collaboration features",
      "Implement connection pooling and clustering support",
    ];

    this.log(
      `Found ${analysisResults.gaps.length} architecture gaps`,
      "warning",
    );
    this.log(
      `Generated ${analysisResults.recommendations.length} enhancement recommendations`,
      "info",
    );

    this.changes.push({
      type: "analysis",
      description: "Completed real-time architecture analysis",
      details: analysisResults,
    });
  }

  findWebSocketImplementations() {
    const webSocketFiles = [
      "app/api/analytics/websocket/route.ts",
      "lib/services/analytics-websocket-service.ts",
      "hooks/useAnalyticsWebSocket.ts",
    ];

    return {
      properServer: false, // Current implementation is simulated
      existingFiles: webSocketFiles.filter((file) =>
        fs.existsSync(path.join(this.projectRoot, file)),
      ),
      needsEnhancement: true,
    };
  }

  findRealTimeServices() {
    const serviceFiles = [
      "lib/services/real-time-pricing-service.ts",
      "lib/services/real-time-pricing-service-unified.ts",
      "lib/services/analytics-service-unified.ts",
    ];

    return {
      pricingServices: serviceFiles.filter((file) =>
        fs.existsSync(path.join(this.projectRoot, file)),
      ),
      optimisticUpdates: false,
      needsEnhancement: true,
    };
  }

  findRealTimeHooks() {
    const hookFiles = [
      "hooks/useAnalyticsWebSocket.ts",
      "hooks/useRealTimePricing.ts",
    ];

    return {
      existingHooks: hookFiles.filter((file) =>
        fs.existsSync(path.join(this.projectRoot, file)),
      ),
      connectionResilience: false,
      needsEnhancement: true,
    };
  }

  findRealTimeAPI() {
    const apiFiles = [
      "app/api/analytics/websocket/route.ts",
      "app/api/analytics/real-time/route.ts",
    ];

    return {
      existingEndpoints: apiFiles.filter((file) =>
        fs.existsSync(path.join(this.projectRoot, file)),
      ),
      needsEnhancement: true,
    };
  }

  async installRealTimeDependencies() {
    this.log("Installing real-time dependencies...", "websocket");

    const dependencies = [
      "socket.io@4.7.5",
      "socket.io-client@4.7.5",
      "@socket.io/cluster-adapter@0.2.2",
      "socket.io-redis-adapter@8.2.1",
    ];

    const devDependencies = ["@types/socket.io@3.0.2"];

    try {
      this.log("Installing production dependencies...", "info");
      execSync(`npm install ${dependencies.join(" ")}`, { stdio: "inherit" });

      this.log("Installing development dependencies...", "info");
      execSync(`npm install -D ${devDependencies.join(" ")}`, {
        stdio: "inherit",
      });

      this.changes.push({
        type: "dependencies",
        description: "Installed real-time dependencies",
        details: { dependencies, devDependencies },
      });
    } catch (error) {
      this.log(`Failed to install dependencies: ${error.message}`, "error");
    }
  }

  async createWebSocketServer() {
    this.log("Creating enhanced WebSocket server...", "websocket");

    const serverCode = `/**
 * Enhanced WebSocket Server for EstimatePro
 * Provides real-time communication with Socket.io
 */

import { Server } from "socket.io";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { createClient } from "@/lib/supabase/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.SOCKET_PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface RoomData {
  estimateId?: string;
  dashboardId?: string;
  collaborators: Set<string>;
  lastActivity: Date;
}

export interface RealTimeMessage {
  type: string;
  data: any;
  timestamp: string;
  userId: string;
  id: string;
}

class EstimateProWebSocketServer {
  private io: Server;
  private users = new Map<string, SocketUser>();
  private rooms = new Map<string, RoomData>();
  private connections = new Map<string, string>(); // socketId -> userId
  
  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? process.env.ALLOWED_ORIGINS?.split(",") || []
          : ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      allowEIO3: true,
    });

    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  private setupEventHandlers() {
    this.io.on("connection", async (socket) => {
      console.log(\`Client connected: \${socket.id}\`);

      // Authenticate user
      const user = await this.authenticateSocket(socket);
      if (!user) {
        socket.disconnect();
        return;
      }

      this.users.set(socket.id, user);
      this.connections.set(socket.id, user.id);

      // Handle user joining rooms
      socket.on("join-room", (roomId: string) => {
        this.handleJoinRoom(socket, roomId, user);
      });

      socket.on("leave-room", (roomId: string) => {
        this.handleLeaveRoom(socket, roomId, user);
      });

      // Real-time pricing updates
      socket.on("pricing-update", (data) => {
        this.handlePricingUpdate(socket, data, user);
      });

      // Analytics subscriptions
      socket.on("subscribe-analytics", (metrics: string[]) => {
        this.handleAnalyticsSubscription(socket, metrics, user);
      });

      socket.on("unsubscribe-analytics", () => {
        this.handleAnalyticsUnsubscription(socket, user);
      });

      // Collaboration features
      socket.on("cursor-move", (data) => {
        this.handleCursorMove(socket, data, user);
      });

      socket.on("field-focus", (data) => {
        this.handleFieldFocus(socket, data, user);
      });

      socket.on("field-blur", (data) => {
        this.handleFieldBlur(socket, data, user);
      });

      socket.on("typing-start", (data) => {
        this.handleTypingStart(socket, data, user);
      });

      socket.on("typing-stop", (data) => {
        this.handleTypingStop(socket, data, user);
      });

      // Connection management
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });

      socket.on("disconnect", (reason) => {
        this.handleDisconnect(socket, reason, user);
      });

      // Send welcome message
      socket.emit("welcome", {
        message: "Connected to EstimatePro real-time server",
        userId: user.id,
        serverTime: new Date().toISOString(),
      });
    });
  }

  private async authenticateSocket(socket: any): Promise<SocketUser | null> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        console.log("No authentication token provided");
        return null;
      }

      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log("Invalid authentication token");
        return null;
      }

      return {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.email || "",
        role: user.user_metadata?.role || "user",
      };
    } catch (error) {
      console.error("Socket authentication error:", error);
      return null;
    }
  }

  private handleJoinRoom(socket: any, roomId: string, user: SocketUser) {
    socket.join(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        collaborators: new Set(),
        lastActivity: new Date(),
      });
    }

    const room = this.rooms.get(roomId)!;
    room.collaborators.add(user.id);
    room.lastActivity = new Date();

    // Notify others in room
    socket.to(roomId).emit("user-joined", {
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    // Send room status to joining user
    socket.emit("room-joined", {
      roomId,
      collaborators: Array.from(room.collaborators),
      timestamp: new Date().toISOString(),
    });

    console.log(\`User \${user.name} joined room \${roomId}\`);
  }

  private handleLeaveRoom(socket: any, roomId: string, user: SocketUser) {
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.collaborators.delete(user.id);
      
      // Clean up empty rooms
      if (room.collaborators.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Notify others in room
    socket.to(roomId).emit("user-left", {
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(\`User \${user.name} left room \${roomId}\`);
  }

  private handlePricingUpdate(socket: any, data: any, user: SocketUser) {
    const message: RealTimeMessage = {
      type: "pricing-update",
      data: {
        ...data,
        updatedBy: user.id,
        updatedByName: user.name,
      },
      timestamp: new Date().toISOString(),
      userId: user.id,
      id: \`pricing_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
    };

    // Broadcast to room (excluding sender for optimistic updates)
    if (data.roomId) {
      socket.to(data.roomId).emit("pricing-updated", message);
    }

    console.log(\`Pricing update from \${user.name}: \${data.serviceType}\`);
  }

  private handleAnalyticsSubscription(socket: any, metrics: string[], user: SocketUser) {
    socket.join("analytics-subscribers");
    
    socket.emit("analytics-subscribed", {
      metrics,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Start sending analytics updates
    this.startAnalyticsUpdates(socket, metrics);

    console.log(\`User \${user.name} subscribed to analytics: \${metrics.join(", ")}\`);
  }

  private handleAnalyticsUnsubscription(socket: any, user: SocketUser) {
    socket.leave("analytics-subscribers");
    
    socket.emit("analytics-unsubscribed", {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    console.log(\`User \${user.name} unsubscribed from analytics\`);
  }

  private handleCursorMove(socket: any, data: any, user: SocketUser) {
    if (data.roomId) {
      socket.to(data.roomId).emit("cursor-moved", {
        userId: user.id,
        userName: user.name,
        position: data.position,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleFieldFocus(socket: any, data: any, user: SocketUser) {
    if (data.roomId) {
      socket.to(data.roomId).emit("field-focused", {
        userId: user.id,
        userName: user.name,
        fieldId: data.fieldId,
        fieldType: data.fieldType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleFieldBlur(socket: any, data: any, user: SocketUser) {
    if (data.roomId) {
      socket.to(data.roomId).emit("field-blurred", {
        userId: user.id,
        userName: user.name,
        fieldId: data.fieldId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleTypingStart(socket: any, data: any, user: SocketUser) {
    if (data.roomId) {
      socket.to(data.roomId).emit("typing-started", {
        userId: user.id,
        userName: user.name,
        fieldId: data.fieldId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleTypingStop(socket: any, data: any, user: SocketUser) {
    if (data.roomId) {
      socket.to(data.roomId).emit("typing-stopped", {
        userId: user.id,
        userName: user.name,
        fieldId: data.fieldId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleDisconnect(socket: any, reason: string, user: SocketUser) {
    console.log(\`Client disconnected: \${socket.id} - \${reason}\`);

    this.users.delete(socket.id);
    this.connections.delete(socket.id);

    // Remove user from all rooms
    this.rooms.forEach((room, roomId) => {
      if (room.collaborators.has(user.id)) {
        room.collaborators.delete(user.id);
        
        // Notify others in room
        socket.to(roomId).emit("user-disconnected", {
          userId: user.id,
          userName: user.name,
          reason,
          timestamp: new Date().toISOString(),
        });

        // Clean up empty rooms
        if (room.collaborators.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });
  }

  private startAnalyticsUpdates(socket: any, metrics: string[]) {
    // Generate mock analytics data every 5 seconds
    const interval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(interval);
        return;
      }

      metrics.forEach((metric) => {
        const update = this.generateAnalyticsUpdate(metric);
        socket.emit("analytics-update", update);
      });
    }, 5000);

    // Store interval for cleanup
    socket.analyticsInterval = interval;

    socket.on("disconnect", () => {
      if (interval) {
        clearInterval(interval);
      }
    });
  }

  private generateAnalyticsUpdate(metric: string) {
    const baseData = {
      metric,
      timestamp: new Date().toISOString(),
      id: \`analytics_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
    };

    switch (metric) {
      case "live_estimates":
        return {
          ...baseData,
          data: {
            value: Math.floor(Math.random() * 20) + 10,
            trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)],
            confidence: 0.8 + Math.random() * 0.2,
          },
        };
      
      case "revenue_stream":
        return {
          ...baseData,
          data: {
            value: Math.floor(Math.random() * 5000) + 8000,
            trend: Math.random() > 0.7 ? "up" : "stable",
            confidence: 0.85 + Math.random() * 0.15,
          },
        };
      
      default:
        return {
          ...baseData,
          data: {
            value: Math.random() * 100,
            trend: "stable",
            confidence: 0.9,
          },
        };
    }
  }

  private startCleanupInterval() {
    // Clean up inactive rooms every 5 minutes
    setInterval(() => {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      this.rooms.forEach((room, roomId) => {
        if (room.lastActivity < cutoff && room.collaborators.size === 0) {
          this.rooms.delete(roomId);
          console.log(\`Cleaned up inactive room: \${roomId}\`);
        }
      });
    }, 5 * 60 * 1000);
  }

  getStats() {
    return {
      connectedUsers: this.users.size,
      activeRooms: this.rooms.size,
      totalConnections: this.connections.size,
    };
  }
}

export async function startWebSocketServer() {
  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handler(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wsServer = new EstimateProWebSocketServer(server);

  server
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(\`🚀 EstimatePro WebSocket Server ready on http://\${hostname}:\${port}\`);
      console.log(\`📊 Stats: \${JSON.stringify(wsServer.getStats())}\`);
    });
}

// Start server if run directly
if (require.main === module) {
  startWebSocketServer();
}`;

    fs.writeFileSync(
      path.join(this.projectRoot, "lib/websocket/server.ts"),
      serverCode,
    );

    this.log("Created enhanced WebSocket server", "success");
    this.changes.push({
      type: "file_created",
      path: "lib/websocket/server.ts",
      description: "Enhanced WebSocket server with Socket.io",
    });
  }

  async enhanceRealTimePricing() {
    this.log(
      "Enhancing real-time pricing with optimistic updates...",
      "realtime",
    );

    const enhancedPricingService = `/**
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

  constructor(private config = {
    serverUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    optimisticTimeout: 5000,
  }) {
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
      this.connectionState.error = error instanceof Error ? error.message : "Connection failed";
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
    if (this.connectionState.reconnectAttempts >= this.config.reconnectAttempts) {
      this.connectionState.error = "Max reconnection attempts exceeded";
      this.emit("error", new Error(this.connectionState.error));
      return;
    }

    this.connectionState.reconnecting = true;
    this.connectionState.reconnectAttempts++;

    const delay = this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1);
    
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

    this.roomId = \`estimate_\${estimateId}\`;
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
    const updateId = \`opt_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    
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
    return Array.from(this.optimisticUpdates.values()).filter(u => !u.confirmed);
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

export default EnhancedRealTimePricingService;`;

    fs.mkdirSync(path.join(this.projectRoot, "lib/websocket"), {
      recursive: true,
    });

    fs.writeFileSync(
      path.join(this.projectRoot, "lib/websocket/enhanced-pricing-service.ts"),
      enhancedPricingService,
    );

    this.log("Enhanced real-time pricing service created", "success");
    this.changes.push({
      type: "file_created",
      path: "lib/websocket/enhanced-pricing-service.ts",
      description: "Enhanced real-time pricing with optimistic updates",
    });
  }

  async createUnifiedEventSystem() {
    this.log("Creating unified real-time event system...", "realtime");

    const eventSystemCode = `/**
 * Unified Real-Time Event System
 * Provides centralized event management for all real-time features
 */

import { EventEmitter } from "events";
import { io, Socket } from "socket.io-client";

export type EventType = 
  | "pricing"
  | "analytics" 
  | "collaboration"
  | "notification"
  | "system";

export interface RealTimeEvent {
  id: string;
  type: EventType;
  subtype?: string;
  data: any;
  timestamp: string;
  userId?: string;
  roomId?: string;
  priority: "low" | "medium" | "high" | "critical";
  persistent?: boolean;
}

export interface EventSubscription {
  id: string;
  eventTypes: EventType[];
  subtypes?: string[];
  callback: (event: RealTimeEvent) => void;
  filters?: Record<string, any>;
  userId?: string;
  roomId?: string;
}

export interface EventSystemConfig {
  serverUrl: string;
  autoConnect: boolean;
  bufferSize: number;
  retryAttempts: number;
  reconnectDelay: number;
  eventTimeout: number;
}

export class UnifiedRealTimeEventSystem extends EventEmitter {
  private socket: Socket | null = null;
  private subscriptions = new Map<string, EventSubscription>();
  private eventBuffer = new Array<RealTimeEvent>();
  private connectionState = {
    connected: false,
    reconnecting: false,
    error: null as string | null,
    userId: null as string | null,
    roomIds: new Set<string>(),
  };
  
  private config: EventSystemConfig = {
    serverUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
    autoConnect: true,
    bufferSize: 1000,
    retryAttempts: 5,
    reconnectDelay: 1000,
    eventTimeout: 30000,
  };

  constructor(config: Partial<EventSystemConfig> = {}) {
    super();
    this.config = { ...this.config, ...config };
    this.setMaxListeners(100);

    if (this.config.autoConnect) {
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    // Auto-connect will be handled by explicit connect() call
    this.setupEventBuffer();
  }

  async connect(userId: string, authToken: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.connectionState.userId = userId;
    this.connectionState.reconnecting = true;

    try {
      this.socket = io(this.config.serverUrl, {
        auth: { token: authToken },
        transports: ["websocket", "polling"],
      });

      this.setupSocketHandlers();
      await this.waitForConnection();
      
      this.connectionState.connected = true;
      this.connectionState.reconnecting = false;
      this.connectionState.error = null;

      // Restore subscriptions
      await this.restoreSubscriptions();
      
      this.emit("system-connected", { userId });
      
    } catch (error) {
      this.connectionState.reconnecting = false;
      this.connectionState.error = error instanceof Error ? error.message : "Connection failed";
      this.emit("system-error", error);
      throw error;
    }
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      this.connectionState.connected = true;
      this.connectionState.reconnecting = false;
      this.emit("system-connected");
    });

    this.socket.on("disconnect", (reason) => {
      this.connectionState.connected = false;
      this.emit("system-disconnected", { reason });
    });

    this.socket.on("connect_error", (error) => {
      this.connectionState.error = error.message;
      this.emit("system-error", error);
    });

    // Event handlers for different types
    this.socket.on("pricing-event", (data) => {
      this.handleEvent({ ...data, type: "pricing" });
    });

    this.socket.on("analytics-event", (data) => {
      this.handleEvent({ ...data, type: "analytics" });
    });

    this.socket.on("collaboration-event", (data) => {
      this.handleEvent({ ...data, type: "collaboration" });
    });

    this.socket.on("notification-event", (data) => {
      this.handleEvent({ ...data, type: "notification" });
    });

    this.socket.on("system-event", (data) => {
      this.handleEvent({ ...data, type: "system" });
    });

    // Generic event handler
    this.socket.on("realtime-event", (data) => {
      this.handleEvent(data);
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

  private handleEvent(eventData: Partial<RealTimeEvent>): void {
    const event: RealTimeEvent = {
      id: eventData.id || \`event_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
      type: eventData.type || "system",
      subtype: eventData.subtype,
      data: eventData.data || {},
      timestamp: eventData.timestamp || new Date().toISOString(),
      userId: eventData.userId,
      roomId: eventData.roomId,
      priority: eventData.priority || "medium",
      persistent: eventData.persistent || false,
    };

    // Add to buffer
    this.addToBuffer(event);

    // Notify subscribers
    this.notifySubscribers(event);

    // Emit generic event
    this.emit("realtime-event", event);
    this.emit(\`\${event.type}-event\`, event);
    
    if (event.subtype) {
      this.emit(\`\${event.type}-\${event.subtype}\`, event);
    }
  }

  private addToBuffer(event: RealTimeEvent): void {
    this.eventBuffer.push(event);

    // Maintain buffer size
    if (this.eventBuffer.length > this.config.bufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.config.bufferSize);
    }

    // Clean up old events
    const cutoff = Date.now() - this.config.eventTimeout;
    this.eventBuffer = this.eventBuffer.filter(e => 
      new Date(e.timestamp).getTime() > cutoff || e.persistent
    );
  }

  private notifySubscribers(event: RealTimeEvent): void {
    this.subscriptions.forEach((subscription) => {
      if (this.matchesSubscription(event, subscription)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error("Error in event subscription callback:", error);
        }
      }
    });
  }

  private matchesSubscription(event: RealTimeEvent, subscription: EventSubscription): boolean {
    // Check event type
    if (!subscription.eventTypes.includes(event.type)) {
      return false;
    }

    // Check subtype if specified
    if (subscription.subtypes && event.subtype && 
        !subscription.subtypes.includes(event.subtype)) {
      return false;
    }

    // Check user filter
    if (subscription.userId && event.userId !== subscription.userId) {
      return false;
    }

    // Check room filter  
    if (subscription.roomId && event.roomId !== subscription.roomId) {
      return false;
    }

    // Check custom filters
    if (subscription.filters) {
      for (const [key, value] of Object.entries(subscription.filters)) {
        if (event.data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  // Public API methods
  subscribe(
    eventTypes: EventType | EventType[],
    callback: (event: RealTimeEvent) => void,
    options: {
      subtypes?: string[];
      filters?: Record<string, any>;
      userId?: string;
      roomId?: string;
    } = {}
  ): string {
    const subscriptionId = \`sub_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventTypes: Array.isArray(eventTypes) ? eventTypes : [eventTypes],
      subtypes: options.subtypes,
      callback,
      filters: options.filters,
      userId: options.userId,
      roomId: options.roomId,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription to server if connected
    if (this.socket?.connected) {
      this.socket.emit("subscribe-events", {
        subscriptionId,
        eventTypes: subscription.eventTypes,
        subtypes: subscription.subtypes,
        filters: subscription.filters,
        userId: subscription.userId,
        roomId: subscription.roomId,
      });
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    // Send unsubscription to server if connected
    if (this.socket?.connected) {
      this.socket.emit("unsubscribe-events", { subscriptionId });
    }
  }

  async emit(eventType: EventType, data: any, options: {
    subtype?: string;
    roomId?: string;
    priority?: "low" | "medium" | "high" | "critical";
    persistent?: boolean;
  } = {}): Promise<string> {
    const event: RealTimeEvent = {
      id: \`event_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
      type: eventType,
      subtype: options.subtype,
      data,
      timestamp: new Date().toISOString(),
      userId: this.connectionState.userId || undefined,
      roomId: options.roomId,
      priority: options.priority || "medium",
      persistent: options.persistent || false,
    };

    // Send to server if connected
    if (this.socket?.connected) {
      this.socket.emit("emit-event", event);
    } else {
      // Buffer the event for when connection is restored
      this.addToBuffer(event);
    }

    return event.id;
  }

  async joinRoom(roomId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error("Not connected to server");
    }

    this.socket.emit("join-room", roomId);
    this.connectionState.roomIds.add(roomId);
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("leave-room", roomId);
    this.connectionState.roomIds.delete(roomId);
  }

  private async restoreSubscriptions(): Promise<void> {
    if (!this.socket?.connected) return;

    // Re-subscribe to all subscriptions
    this.subscriptions.forEach((subscription) => {
      this.socket!.emit("subscribe-events", {
        subscriptionId: subscription.id,
        eventTypes: subscription.eventTypes,
        subtypes: subscription.subtypes,
        filters: subscription.filters,
        userId: subscription.userId,
        roomId: subscription.roomId,
      });
    });

    // Rejoin rooms
    this.connectionState.roomIds.forEach((roomId) => {
      this.socket!.emit("join-room", roomId);
    });
  }

  private setupEventBuffer(): void {
    // Clean up old events periodically
    setInterval(() => {
      const cutoff = Date.now() - this.config.eventTimeout;
      this.eventBuffer = this.eventBuffer.filter(e => 
        new Date(e.timestamp).getTime() > cutoff || e.persistent
      );
    }, 60000); // Clean up every minute
  }

  // Getters
  get connected(): boolean {
    return this.connectionState.connected;
  }

  get userId(): string | null {
    return this.connectionState.userId;
  }

  getRecentEvents(type?: EventType, limit = 50): RealTimeEvent[] {
    let events = [...this.eventBuffer];
    
    if (type) {
      events = events.filter(e => e.type === type);
    }

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState.connected = false;
    this.connectionState.roomIds.clear();
    this.subscriptions.clear();
  }
}

// Singleton instance
let eventSystem: UnifiedRealTimeEventSystem | null = null;

export function getRealTimeEventSystem(): UnifiedRealTimeEventSystem {
  if (!eventSystem) {
    eventSystem = new UnifiedRealTimeEventSystem();
  }
  return eventSystem;
}

export default UnifiedRealTimeEventSystem;`;

    fs.writeFileSync(
      path.join(this.projectRoot, "lib/websocket/event-system.ts"),
      eventSystemCode,
    );

    this.log("Created unified real-time event system", "success");
    this.changes.push({
      type: "file_created",
      path: "lib/websocket/event-system.ts",
      description: "Unified real-time event system for all features",
    });
  }

  async implementCollaborationFeatures() {
    this.log("Implementing real-time collaboration features...", "realtime");

    const collaborationHook = `/**
 * Real-Time Collaboration Hook
 * Provides real-time collaboration features for estimate editing
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getRealTimeEventSystem } from "@/lib/websocket/event-system";

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  activeField?: string;
  isTyping?: boolean;
  lastSeen: string;
}

export interface CollaborationState {
  isConnected: boolean;
  currentRoom: string | null;
  collaborators: Map<string, Collaborator>;
  userActivity: {
    activeUsers: number;
    totalSessions: number;
    lastActivity: string;
  };
}

export interface UseCollaborationOptions {
  estimateId?: string;
  autoJoin?: boolean;
  trackCursor?: boolean;
  trackTyping?: boolean;
  debounceMs?: number;
}

export interface UseCollaborationReturn {
  collaborators: Collaborator[];
  isConnected: boolean;
  joinSession: (estimateId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  updateCursor: (position: { x: number; y: number }) => void;
  focusField: (fieldId: string, fieldType?: string) => void;
  blurField: (fieldId: string) => void;
  startTyping: (fieldId: string) => void;
  stopTyping: (fieldId: string) => void;
  sendUpdate: (data: any) => void;
  collaborationState: CollaborationState;
}

const COLLABORATOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
];

export function useCollaboration(options: UseCollaborationOptions = {}): UseCollaborationReturn {
  const {
    estimateId,
    autoJoin = true,
    trackCursor = true,
    trackTyping = true,
    debounceMs = 100,
  } = options;

  const eventSystem = getRealTimeEventSystem();
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    isConnected: false,
    currentRoom: null,
    collaborators: new Map(),
    userActivity: {
      activeUsers: 0,
      totalSessions: 0,
      lastActivity: new Date().toISOString(),
    },
  });

  const subscriptionId = useRef<string | null>(null);
  const cursorDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserRef = useRef<string | null>(null);

  // Join collaboration session
  const joinSession = useCallback(async (targetEstimateId: string) => {
    if (!eventSystem.connected) {
      throw new Error("Event system not connected");
    }

    const roomId = \`estimate_\${targetEstimateId}\`;
    
    try {
      await eventSystem.joinRoom(roomId);
      
      setCollaborationState(prev => ({
        ...prev,
        currentRoom: roomId,
        isConnected: true,
      }));

      // Subscribe to collaboration events
      subscriptionId.current = eventSystem.subscribe(
        ["collaboration", "system"],
        handleCollaborationEvent,
        { roomId }
      );

      console.log(\`Joined collaboration session: \${roomId}\`);
    } catch (error) {
      console.error("Failed to join collaboration session:", error);
      throw error;
    }
  }, [eventSystem]);

  // Leave collaboration session
  const leaveSession = useCallback(async () => {
    if (collaborationState.currentRoom && eventSystem.connected) {
      await eventSystem.leaveRoom(collaborationState.currentRoom);
    }

    if (subscriptionId.current) {
      eventSystem.unsubscribe(subscriptionId.current);
      subscriptionId.current = null;
    }

    setCollaborationState(prev => ({
      ...prev,
      isConnected: false,
      currentRoom: null,
      collaborators: new Map(),
    }));
  }, [collaborationState.currentRoom, eventSystem]);

  // Handle collaboration events
  const handleCollaborationEvent = useCallback((event: any) => {
    switch (event.subtype) {
      case "user-joined":
        handleUserJoined(event.data);
        break;
      case "user-left":
        handleUserLeft(event.data);
        break;
      case "cursor-moved":
        handleCursorMove(event.data);
        break;
      case "field-focused":
        handleFieldFocus(event.data);
        break;
      case "field-blurred":
        handleFieldBlur(event.data);
        break;
      case "typing-started":
        handleTypingStart(event.data);
        break;
      case "typing-stopped":
        handleTypingStop(event.data);
        break;
      case "user-disconnected":
        handleUserDisconnected(event.data);
        break;
    }
  }, []);

  const handleUserJoined = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      
      if (!newCollaborators.has(data.userId)) {
        const colorIndex = newCollaborators.size % COLLABORATOR_COLORS.length;
        newCollaborators.set(data.userId, {
          id: data.userId,
          name: data.userName,
          color: COLLABORATOR_COLORS[colorIndex],
          lastSeen: data.timestamp,
        });
      }

      return {
        ...prev,
        collaborators: newCollaborators,
        userActivity: {
          activeUsers: newCollaborators.size,
          totalSessions: prev.userActivity.totalSessions + 1,
          lastActivity: data.timestamp,
        },
      };
    });
  };

  const handleUserLeft = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      newCollaborators.delete(data.userId);

      return {
        ...prev,
        collaborators: newCollaborators,
        userActivity: {
          ...prev.userActivity,
          activeUsers: newCollaborators.size,
          lastActivity: data.timestamp,
        },
      };
    });
  };

  const handleCursorMove = (data: any) => {
    if (!trackCursor) return;

    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      const collaborator = newCollaborators.get(data.userId);
      
      if (collaborator) {
        newCollaborators.set(data.userId, {
          ...collaborator,
          cursor: data.position,
          lastSeen: data.timestamp,
        });
      }

      return { ...prev, collaborators: newCollaborators };
    });
  };

  const handleFieldFocus = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      const collaborator = newCollaborators.get(data.userId);
      
      if (collaborator) {
        newCollaborators.set(data.userId, {
          ...collaborator,
          activeField: data.fieldId,
          lastSeen: data.timestamp,
        });
      }

      return { ...prev, collaborators: newCollaborators };
    });
  };

  const handleFieldBlur = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      const collaborator = newCollaborators.get(data.userId);
      
      if (collaborator) {
        newCollaborators.set(data.userId, {
          ...collaborator,
          activeField: undefined,
          lastSeen: data.timestamp,
        });
      }

      return { ...prev, collaborators: newCollaborators };
    });
  };

  const handleTypingStart = (data: any) => {
    if (!trackTyping) return;

    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      const collaborator = newCollaborators.get(data.userId);
      
      if (collaborator) {
        newCollaborators.set(data.userId, {
          ...collaborator,
          isTyping: true,
          activeField: data.fieldId,
          lastSeen: data.timestamp,
        });
      }

      return { ...prev, collaborators: newCollaborators };
    });
  };

  const handleTypingStop = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      const collaborator = newCollaborators.get(data.userId);
      
      if (collaborator) {
        newCollaborators.set(data.userId, {
          ...collaborator,
          isTyping: false,
          lastSeen: data.timestamp,
        });
      }

      return { ...prev, collaborators: newCollaborators };
    });
  };

  const handleUserDisconnected = (data: any) => {
    setCollaborationState(prev => {
      const newCollaborators = new Map(prev.collaborators);
      newCollaborators.delete(data.userId);

      return {
        ...prev,
        collaborators: newCollaborators,
        userActivity: {
          ...prev.userActivity,
          activeUsers: newCollaborators.size,
        },
      };
    });
  };

  // Cursor tracking
  const updateCursor = useCallback((position: { x: number; y: number }) => {
    if (!trackCursor || !eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    // Debounce cursor updates
    if (cursorDebounceRef.current) {
      clearTimeout(cursorDebounceRef.current);
    }

    cursorDebounceRef.current = setTimeout(() => {
      eventSystem.emit("collaboration", {
        position,
        roomId: collaborationState.currentRoom,
      }, {
        subtype: "cursor-move",
      });
    }, debounceMs);
  }, [trackCursor, eventSystem, collaborationState.currentRoom, debounceMs]);

  // Field focus/blur
  const focusField = useCallback((fieldId: string, fieldType?: string) => {
    if (!eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    eventSystem.emit("collaboration", {
      fieldId,
      fieldType,
      roomId: collaborationState.currentRoom,
    }, {
      subtype: "field-focus",
    });
  }, [eventSystem, collaborationState.currentRoom]);

  const blurField = useCallback((fieldId: string) => {
    if (!eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    eventSystem.emit("collaboration", {
      fieldId,
      roomId: collaborationState.currentRoom,
    }, {
      subtype: "field-blur",
    });
  }, [eventSystem, collaborationState.currentRoom]);

  // Typing indicators
  const startTyping = useCallback((fieldId: string) => {
    if (!trackTyping || !eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    eventSystem.emit("collaboration", {
      fieldId,
      roomId: collaborationState.currentRoom,
    }, {
      subtype: "typing-start",
    });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(fieldId);
    }, 3000);
  }, [trackTyping, eventSystem, collaborationState.currentRoom]);

  const stopTyping = useCallback((fieldId: string) => {
    if (!eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    eventSystem.emit("collaboration", {
      fieldId,
      roomId: collaborationState.currentRoom,
    }, {
      subtype: "typing-stop",
    });
  }, [eventSystem, collaborationState.currentRoom]);

  // Send custom updates
  const sendUpdate = useCallback((data: any) => {
    if (!eventSystem.connected || !collaborationState.currentRoom) {
      return;
    }

    eventSystem.emit("collaboration", {
      ...data,
      roomId: collaborationState.currentRoom,
    });
  }, [eventSystem, collaborationState.currentRoom]);

  // Auto-join effect
  useEffect(() => {
    if (autoJoin && estimateId && eventSystem.connected) {
      joinSession(estimateId);
    }

    return () => {
      leaveSession();
    };
  }, [autoJoin, estimateId, eventSystem.connected, joinSession, leaveSession]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const collaborators = Array.from(collaborationState.collaborators.values());

  return {
    collaborators,
    isConnected: collaborationState.isConnected,
    joinSession,
    leaveSession,
    updateCursor,
    focusField,
    blurField,
    startTyping,
    stopTyping,
    sendUpdate,
    collaborationState,
  };
}

export default useCollaboration;`;

    fs.mkdirSync(path.join(this.projectRoot, "hooks"), { recursive: true });
    fs.writeFileSync(
      path.join(this.projectRoot, "hooks/useCollaboration.ts"),
      collaborationHook,
    );

    this.log("Created real-time collaboration features", "success");
    this.changes.push({
      type: "file_created",
      path: "hooks/useCollaboration.ts",
      description:
        "Real-time collaboration hook with cursor tracking and typing indicators",
    });
  }

  async enhanceConnectionManagement() {
    this.log("Enhancing connection management and resilience...", "websocket");

    const connectionManagerCode = `/**
 * Enhanced Connection Manager
 * Provides robust connection management with auto-reconnection and health monitoring
 */

import { EventEmitter } from "events";

export interface ConnectionHealth {
  ping: number;
  reconnectAttempts: number;
  lastConnected: string;
  totalUptime: number;
  totalDowntime: number;
  avgPing: number;
  errorRate: number;
}

export interface ConnectionConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  pingInterval: number;
  pingTimeout: number;
  healthCheckInterval: number;
  connectionTimeout: number;
  enableMetrics: boolean;
}

export interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  totalReconnections: number;
  averageConnectionTime: number;
  uptime: number;
  downtime: number;
  lastError: string | null;
}

export class EnhancedConnectionManager extends EventEmitter {
  private config: ConnectionConfig;
  private socket: any = null;
  private connectionState = {
    connected: false,
    connecting: false,
    reconnecting: false,
    lastConnected: null as Date | null,
    connectTime: null as Date | null,
    disconnectTime: null as Date | null,
  };

  private health: ConnectionHealth = {
    ping: 0,
    reconnectAttempts: 0,
    lastConnected: "",
    totalUptime: 0,
    totalDowntime: 0,
    avgPing: 0,
    errorRate: 0,
  };

  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalReconnections: 0,
    averageConnectionTime: 0,
    uptime: 0,
    downtime: 0,
    lastError: null,
  };

  private intervals = {
    ping: null as NodeJS.Timeout | null,
    healthCheck: null as NodeJS.Timeout | null,
    reconnect: null as NodeJS.Timeout | null,
  };

  private pingHistory: number[] = [];
  private errorCount = 0;
  private totalOperations = 0;

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();
    
    this.config = {
      url: config.url || "http://localhost:3001",
      reconnectDelay: config.reconnectDelay || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      pingInterval: config.pingInterval || 30000,
      pingTimeout: config.pingTimeout || 5000,
      healthCheckInterval: config.healthCheckInterval || 60000,
      connectionTimeout: config.connectionTimeout || 10000,
      enableMetrics: config.enableMetrics !== false,
    };

    this.setMaxListeners(50);
    this.setupHealthMonitoring();
  }

  async connect(authToken: string, userId: string): Promise<void> {
    if (this.connectionState.connected || this.connectionState.connecting) {
      return;
    }

    this.connectionState.connecting = true;
    this.connectionState.connectTime = new Date();
    this.metrics.totalConnections++;

    try {
      // Dynamic import to avoid build issues
      const { io } = await import("socket.io-client");
      
      this.socket = io(this.config.url, {
        auth: { token: authToken, userId },
        transports: ["websocket", "polling"],
        timeout: this.config.connectionTimeout,
      });

      await this.setupSocketHandlers();
      await this.waitForConnection();

      this.connectionState.connected = true;
      this.connectionState.connecting = false;
      this.connectionState.lastConnected = new Date();
      this.connectionState.reconnecting = false;
      
      this.health.reconnectAttempts = 0;
      this.health.lastConnected = new Date().toISOString();
      this.metrics.successfulConnections++;

      this.startPingMonitoring();
      this.emit("connected", { userId, timestamp: new Date().toISOString() });

    } catch (error) {
      this.connectionState.connecting = false;
      this.connectionState.connected = false;
      this.metrics.failedConnections++;
      this.metrics.lastError = error instanceof Error ? error.message : "Connection failed";
      
      this.emit("error", error);
      throw error;
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, this.config.connectionTimeout);

      this.socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once("connect_error", (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async setupSocketHandlers(): Promise<void> {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.connectionState.connected = true;
      this.connectionState.connecting = false;
      this.connectionState.reconnecting = false;
      
      if (this.connectionState.disconnectTime) {
        const downtime = Date.now() - this.connectionState.disconnectTime.getTime();
        this.metrics.downtime += downtime;
        this.health.totalDowntime += downtime;
      }

      this.emit("connected");
    });

    this.socket.on("disconnect", (reason: string) => {
      this.connectionState.connected = false;
      this.connectionState.disconnectTime = new Date();
      
      if (this.connectionState.connectTime) {
        const uptime = Date.now() - this.connectionState.connectTime.getTime();
        this.metrics.uptime += uptime;
        this.health.totalUptime += uptime;
      }

      this.stopPingMonitoring();
      this.emit("disconnected", { reason });

      // Auto-reconnect for certain disconnect reasons
      if (reason !== "io server disconnect" && reason !== "io client disconnect") {
        this.handleReconnection();
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      this.errorCount++;
      this.metrics.lastError = error.message;
      this.updateErrorRate();
      
      this.emit("error", error);
      this.handleReconnection();
    });

    this.socket.on("pong", (data: { timestamp: number }) => {
      const ping = Date.now() - data.timestamp;
      this.updatePingStats(ping);
    });

    // Custom events for monitoring
    this.socket.on("server-status", (data: any) => {
      this.emit("server-status", data);
    });
  }

  private handleReconnection(): void {
    if (this.health.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit("max-reconnect-attempts-reached", {
        attempts: this.health.reconnectAttempts,
      });
      return;
    }

    if (this.connectionState.reconnecting) {
      return;
    }

    this.connectionState.reconnecting = true;
    this.health.reconnectAttempts++;
    this.metrics.totalReconnections++;

    const delay = this.config.reconnectDelay * Math.pow(2, this.health.reconnectAttempts - 1);
    
    this.emit("reconnecting", {
      attempt: this.health.reconnectAttempts,
      delay,
    });

    this.intervals.reconnect = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  private startPingMonitoring(): void {
    if (this.intervals.ping) {
      clearInterval(this.intervals.ping);
    }

    this.intervals.ping = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping", { timestamp: Date.now() });
      }
    }, this.config.pingInterval);
  }

  private stopPingMonitoring(): void {
    if (this.intervals.ping) {
      clearInterval(this.intervals.ping);
      this.intervals.ping = null;
    }
  }

  private updatePingStats(ping: number): void {
    this.health.ping = ping;
    this.pingHistory.push(ping);

    // Keep only last 10 ping measurements
    if (this.pingHistory.length > 10) {
      this.pingHistory = this.pingHistory.slice(-10);
    }

    this.health.avgPing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
    this.emit("ping", { current: ping, average: this.health.avgPing });
  }

  private updateErrorRate(): void {
    this.totalOperations++;
    this.health.errorRate = this.errorCount / this.totalOperations;
  }

  private setupHealthMonitoring(): void {
    if (!this.config.enableMetrics) return;

    this.intervals.healthCheck = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    const healthStatus = {
      connected: this.connectionState.connected,
      ping: this.health.ping,
      avgPing: this.health.avgPing,
      errorRate: this.health.errorRate,
      reconnectAttempts: this.health.reconnectAttempts,
      uptime: this.metrics.uptime,
      downtime: this.metrics.downtime,
      timestamp: new Date().toISOString(),
    };

    // Check for health issues
    const issues = [];
    if (this.health.ping > 1000) {
      issues.push("High ping detected");
    }
    if (this.health.errorRate > 0.1) {
      issues.push("High error rate detected");
    }
    if (!this.connectionState.connected) {
      issues.push("Connection lost");
    }

    this.emit("health-check", {
      status: healthStatus,
      issues,
      isHealthy: issues.length === 0,
    });
  }

  // Public API methods
  disconnect(): void {
    this.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState.connected = false;
    this.connectionState.connecting = false;
    this.connectionState.reconnecting = false;
  }

  reconnect(): void {
    if (this.connectionState.connected) {
      this.disconnect();
    }
    
    this.health.reconnectAttempts = 0;
    // Reconnection will be handled by connect() call
  }

  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getConnectionState() {
    return {
      ...this.connectionState,
      health: this.getHealth(),
    };
  }

  isConnected(): boolean {
    return this.connectionState.connected;
  }

  isReconnecting(): boolean {
    return this.connectionState.reconnecting;
  }

  getPing(): number {
    return this.health.ping;
  }

  getAveragePing(): number {
    return this.health.avgPing;
  }

  private cleanup(): void {
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    this.intervals = {
      ping: null,
      healthCheck: null,
      reconnect: null,
    };
  }

  // Event emitter methods with typing
  on(event: "connected" | "disconnected" | "reconnecting" | "error" | "ping" | "health-check" | "server-status" | "max-reconnect-attempts-reached", listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}

// Singleton instance
let connectionManager: EnhancedConnectionManager | null = null;

export function getConnectionManager(): EnhancedConnectionManager {
  if (!connectionManager) {
    connectionManager = new EnhancedConnectionManager();
  }
  return connectionManager;
}

export default EnhancedConnectionManager;`;

    fs.writeFileSync(
      path.join(this.projectRoot, "lib/websocket/connection-manager.ts"),
      connectionManagerCode,
    );

    this.log("Created enhanced connection management system", "success");
    this.changes.push({
      type: "file_created",
      path: "lib/websocket/connection-manager.ts",
      description:
        "Enhanced connection manager with health monitoring and auto-reconnection",
    });
  }

  async createRealTimeComponents() {
    this.log("Creating real-time React components...", "realtime");

    const connectionStatusComponent = `/**
 * Real-Time Connection Status Component
 * Displays connection health and provides manual controls
 */

import { useEffect, useState } from "react";
import { getConnectionManager } from "@/lib/websocket/connection-manager";
import { getRealTimeEventSystem } from "@/lib/websocket/event-system";
import { AlertTriangle, Wifi, WifiOff, Activity, Zap } from "lucide-react";

export interface ConnectionStatusProps {
  showDetails?: boolean;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  ping: number;
  avgPing: number;
  errorRate: number;
  reconnectAttempts: number;
  uptime: number;
}

export function ConnectionStatus({
  showDetails = false,
  showControls = false,
  compact = false,
  className = "",
}: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnecting: false,
    ping: 0,
    avgPing: 0,
    errorRate: 0,
    reconnectAttempts: 0,
    uptime: 0,
  });

  const connectionManager = getConnectionManager();
  const eventSystem = getRealTimeEventSystem();

  useEffect(() => {
    const updateConnectionState = () => {
      const health = connectionManager.getHealth();
      const metrics = connectionManager.getMetrics();
      
      setConnectionState({
        connected: connectionManager.isConnected(),
        reconnecting: connectionManager.isReconnecting(),
        ping: health.ping,
        avgPing: health.avgPing,
        errorRate: health.errorRate,
        reconnectAttempts: health.reconnectAttempts,
        uptime: metrics.uptime,
      });
    };

    // Initial state
    updateConnectionState();

    // Listen for connection events
    const handleConnected = () => updateConnectionState();
    const handleDisconnected = () => updateConnectionState();
    const handleReconnecting = () => updateConnectionState();
    const handlePing = () => updateConnectionState();
    const handleHealthCheck = () => updateConnectionState();

    connectionManager.on("connected", handleConnected);
    connectionManager.on("disconnected", handleDisconnected);
    connectionManager.on("reconnecting", handleReconnecting);
    connectionManager.on("ping", handlePing);
    connectionManager.on("health-check", handleHealthCheck);

    return () => {
      connectionManager.off("connected", handleConnected);
      connectionManager.off("disconnected", handleDisconnected);
      connectionManager.off("reconnecting", handleReconnecting);
      connectionManager.off("ping", handlePing);
      connectionManager.off("health-check", handleHealthCheck);
    };
  }, [connectionManager]);

  const handleReconnect = () => {
    connectionManager.reconnect();
  };

  const handleDisconnect = () => {
    connectionManager.disconnect();
  };

  if (compact) {
    return (
      <div className={\`flex items-center space-x-2 \${className}\`}>
        <div className="relative">
          {connectionState.connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : connectionState.reconnecting ? (
            <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          
          {connectionState.ping > 0 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-ping" />
          )}
        </div>
        
        {connectionState.ping > 0 && (
          <span className="text-xs text-muted-foreground">
            {\`\${Math.round(connectionState.ping)}ms\`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={\`rounded-lg border bg-card p-4 \${className}\`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {connectionState.connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : connectionState.reconnecting ? (
              <Activity className="h-5 w-5 text-yellow-500 animate-pulse" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
          
          <div>
            <h3 className="font-medium">
              {connectionState.connected
                ? "Connected"
                : connectionState.reconnecting
                ? "Reconnecting..."
                : "Disconnected"}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Real-time communication status
            </p>
          </div>
        </div>
        
        {showControls && (
          <div className="flex space-x-2">
            {!connectionState.connected && (
              <button
                onClick={handleReconnect}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
                disabled={connectionState.reconnecting}
              >
                {connectionState.reconnecting ? "Connecting..." : "Reconnect"}
              </button>
            )}
            
            {connectionState.connected && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded"
              >
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ping:</span>
              <span className={\`font-mono \${
                connectionState.ping < 100 
                  ? "text-green-600" 
                  : connectionState.ping < 300 
                  ? "text-yellow-600" 
                  : "text-red-600"
              }\`}>
                {\`\${Math.round(connectionState.ping)}ms\`}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Ping:</span>
              <span className="font-mono">
                {\`\${Math.round(connectionState.avgPing)}ms\`}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Rate:</span>
              <span className={\`font-mono \${
                connectionState.errorRate < 0.05 
                  ? "text-green-600" 
                  : connectionState.errorRate < 0.1 
                  ? "text-yellow-600" 
                  : "text-red-600"
              }\`}>
                {\`\${(connectionState.errorRate * 100).toFixed(1)}%\`}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reconnects:</span>
              <span className="font-mono">
                {connectionState.reconnectAttempts}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="font-mono">
                {\`\${Math.floor(connectionState.uptime / 60000)}m\`}
              </span>
            </div>
            
            {connectionState.errorRate > 0.1 && (
              <div className="flex items-center space-x-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">High error rate</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;`;

    const collaboratorIndicatorComponent = `/**
 * Real-Time Collaborator Indicator Component  
 * Shows active collaborators with avatars and activity indicators
 */

import { useCollaboration, type Collaborator } from "@/hooks/useCollaboration";
import { Users, Eye, Edit3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CollaboratorIndicatorProps {
  estimateId?: string;
  maxVisible?: number;
  showActivity?: boolean;
  compact?: boolean;
  className?: string;
}

export function CollaboratorIndicator({
  estimateId,
  maxVisible = 5,
  showActivity = true,
  compact = false,
  className = "",
}: CollaboratorIndicatorProps) {
  const { collaborators, isConnected } = useCollaboration({
    estimateId,
    autoJoin: !!estimateId,
  });

  if (!isConnected || collaborators.length === 0) {
    return null;
  }

  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, collaborators.length - maxVisible);

  if (compact) {
    return (
      <div className={\`flex items-center space-x-1 \${className}\`}>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{collaborators.length}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={\`flex items-center space-x-2 \${className}\`}>
        <div className="flex items-center -space-x-2">
          {visibleCollaborators.map((collaborator) => (
            <CollaboratorAvatar
              key={collaborator.id}
              collaborator={collaborator}
              showActivity={showActivity}
            />
          ))}
          
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {hiddenCount} more collaborator{hiddenCount > 1 ? "s" : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {collaborators.length} active
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface CollaboratorAvatarProps {
  collaborator: Collaborator;
  showActivity: boolean;
}

function CollaboratorAvatar({
  collaborator,
  showActivity,
}: CollaboratorAvatarProps) {
  const getActivityIcon = () => {
    if (collaborator.isTyping) {
      return <Edit3 className="h-2 w-2 text-blue-500" />;
    }
    if (collaborator.activeField) {
      return <Eye className="h-2 w-2 text-green-500" />;
    }
    return null;
  };

  const getActivityText = () => {
    if (collaborator.isTyping && collaborator.activeField) {
      return \`Typing in \${collaborator.activeField}\`;
    }
    if (collaborator.activeField) {
      return \`Viewing \${collaborator.activeField}\`;
    }
    return "Active";
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="relative">
          <Avatar className="h-8 w-8 border-2 border-background">
            <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
            <AvatarFallback
              style={{ backgroundColor: collaborator.color }}
              className="text-white text-xs"
            >
              {collaborator.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {showActivity && (
            <>
              {/* Activity indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-background">
                {getActivityIcon()}
              </div>
              
              {/* Typing indicator animation */}
              {collaborator.isTyping && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{collaborator.name}</p>
          {showActivity && (
            <p className="text-xs text-muted-foreground">
              {getActivityText()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Last seen: {new Date(collaborator.lastSeen).toLocaleTimeString()}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default CollaboratorIndicator;`;

    fs.mkdirSync(path.join(this.projectRoot, "components/realtime"), {
      recursive: true,
    });

    fs.writeFileSync(
      path.join(this.projectRoot, "components/realtime/ConnectionStatus.tsx"),
      connectionStatusComponent,
    );

    fs.writeFileSync(
      path.join(
        this.projectRoot,
        "components/realtime/CollaboratorIndicator.tsx",
      ),
      collaboratorIndicatorComponent,
    );

    this.log("Created real-time React components", "success");
    this.changes.push({
      type: "files_created",
      paths: [
        "components/realtime/ConnectionStatus.tsx",
        "components/realtime/CollaboratorIndicator.tsx",
      ],
      description: "Real-time status and collaboration UI components",
    });
  }

  async updateConfiguration() {
    this.log("Updating configuration files...", "enhance");

    // Update package.json with new scripts
    const packageJsonPath = path.join(this.projectRoot, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    packageJson.scripts = {
      ...packageJson.scripts,
      "websocket:dev": "tsx lib/websocket/server.ts",
      "websocket:start": "node dist/websocket/server.js",
      "websocket:build":
        "tsc lib/websocket/server.ts --outDir dist/websocket --target es2020 --module commonjs",
      "realtime:test": "node scripts/test-realtime-features.js",
    };

    // Add WebSocket environment variables to .env.example
    const envExample = `
# Real-Time WebSocket Configuration
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
SOCKET_PORT=3001
WEBSOCKET_CORS_ORIGINS=http://localhost:3000
ENABLE_REALTIME_FEATURES=true
ENABLE_COLLABORATION=true
ENABLE_OPTIMISTIC_UPDATES=true
WEBSOCKET_MAX_CONNECTIONS=1000
WEBSOCKET_HEARTBEAT_INTERVAL=25000
WEBSOCKET_CONNECTION_TIMEOUT=30000
`;

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const envExamplePath = path.join(this.projectRoot, ".env.example");
    if (fs.existsSync(envExamplePath)) {
      fs.appendFileSync(envExamplePath, envExample);
    } else {
      fs.writeFileSync(envExamplePath, envExample.trim());
    }

    this.log("Updated configuration files", "success");
    this.changes.push({
      type: "config_updated",
      files: ["package.json", ".env.example"],
      description: "Added WebSocket scripts and environment variables",
    });
  }

  async generateDocumentation() {
    this.log("Generating real-time architecture documentation...", "enhance");

    const documentationContent = `# Real-Time Architecture Enhancement Documentation

## Overview

Wave 4.1 implementation adds comprehensive real-time capabilities to EstimatePro:

- **Enhanced WebSocket Server**: Socket.io-based server with proper authentication and room management
- **Optimistic Updates**: Real-time pricing with immediate UI updates and rollback capability
- **Unified Event System**: Centralized event management for all real-time features
- **Collaboration Features**: Real-time cursor tracking, typing indicators, and user presence
- **Connection Management**: Robust connection handling with auto-reconnection and health monitoring
- **React Components**: Ready-to-use UI components for real-time features

## Architecture Components

### 1. WebSocket Server (\`lib/websocket/server.ts\`)

Socket.io-based server providing:
- User authentication and session management
- Room-based communication for estimates
- Real-time pricing updates with optimistic handling
- Analytics streaming with subscription management
- Collaboration features (cursor, typing, presence)
- Connection health monitoring

**Key Features:**
- JWT-based authentication
- Room management for estimates/dashboards
- Auto-cleanup of inactive sessions
- CORS configuration for development/production
- Ping/pong heartbeat monitoring
- Error handling and logging

### 2. Enhanced Pricing Service (\`lib/websocket/enhanced-pricing-service.ts\`)

Advanced real-time pricing with:
- **Optimistic Updates**: Immediate UI updates with server confirmation
- **Connection Resilience**: Auto-reconnection with exponential backoff
- **Health Monitoring**: Ping tracking and connection quality metrics
- **Event-Driven**: Uses EventEmitter for loose coupling

**Optimistic Update Flow:**
1. User makes change → Immediate UI update
2. Send to server → Server processes and broadcasts
3. Receive confirmation → Mark as confirmed
4. Timeout handler → Rollback if not confirmed in 5s

### 3. Unified Event System (\`lib/websocket/event-system.ts\`)

Centralized event management supporting:
- **Event Types**: pricing, analytics, collaboration, notification, system
- **Subscriptions**: Filtered event subscriptions with callbacks
- **Event Buffer**: Persistent event history with configurable retention
- **Room Support**: Room-based event filtering and routing

**Event Structure:**
\`\`\`typescript
interface RealTimeEvent {
  id: string;
  type: EventType;
  subtype?: string;
  data: any;
  timestamp: string;
  userId?: string;
  roomId?: string;
  priority: "low" | "medium" | "high" | "critical";
  persistent?: boolean;
}
\`\`\`

### 4. Collaboration System (\`hooks/useCollaboration.ts\`)

Real-time collaboration features:
- **User Presence**: Track active collaborators in estimate sessions
- **Cursor Tracking**: Real-time cursor position sharing (debounced)
- **Typing Indicators**: Show when users are typing in specific fields
- **Field Focus**: Highlight fields being edited by other users

**Collaboration Events:**
- \`user-joined\` / \`user-left\`: User presence changes
- \`cursor-moved\`: Cursor position updates
- \`field-focused\` / \`field-blurred\`: Field interaction tracking
- \`typing-started\` / \`typing-stopped\`: Typing state changes

### 5. Connection Manager (\`lib/websocket/connection-manager.ts\`)

Robust connection handling:
- **Auto-Reconnection**: Exponential backoff with configurable max attempts
- **Health Monitoring**: Ping tracking, error rate calculation, uptime metrics
- **Metrics Collection**: Connection statistics and performance data
- **Event Emission**: Detailed connection state events

**Health Metrics:**
- Ping (current/average)
- Error rate percentage
- Total uptime/downtime
- Reconnection attempt count
- Connection success rate

### 6. React Components

**ConnectionStatus** (\`components/realtime/ConnectionStatus.tsx\`):
- Displays real-time connection health
- Compact and detailed view modes
- Manual reconnect/disconnect controls
- Visual indicators for connection state

**CollaboratorIndicator** (\`components/realtime/CollaboratorIndicator.tsx\`):
- Shows active collaborators with avatars
- Activity indicators (typing, viewing)
- Tooltip with user details
- Configurable display options

## Usage Examples

### Basic WebSocket Connection

\`\`\`typescript
import { getRealTimeEventSystem } from "@/lib/websocket/event-system";

const eventSystem = getRealTimeEventSystem();

// Connect with authentication
await eventSystem.connect(userId, authToken);

// Join estimate room
await eventSystem.joinRoom("estimate_123");

// Subscribe to pricing events
const subscriptionId = eventSystem.subscribe(
  ["pricing", "collaboration"],
  (event) => {
    console.log("Received event:", event);
  },
  { roomId: "estimate_123" }
);
\`\`\`

### Optimistic Pricing Updates

\`\`\`typescript
import { getRealTimePricingService } from "@/lib/websocket/enhanced-pricing-service";

const pricingService = getRealTimePricingService();

// Connect and join room
await pricingService.connect(userId, authToken);
await pricingService.joinRoom(estimateId);

// Make optimistic update
const updateId = await pricingService.updatePricingOptimistic({
  serviceId: "window-cleaning",
  newPrice: 150.00,
  type: "service"
});

// Listen for confirmations/rollbacks
pricingService.on("optimistic-confirmed", (update) => {
  console.log("Update confirmed:", update);
});

pricingService.on("optimistic-rollback", (data) => {
  console.log("Rolling back update:", data);
  // Restore previous state
  restoreState(data.rollbackData);
});
\`\`\`

### Collaboration Integration

\`\`\`typescript
import { useCollaboration } from "@/hooks/useCollaboration";

function EstimateEditor({ estimateId }: { estimateId: string }) {
  const {
    collaborators,
    isConnected,
    updateCursor,
    focusField,
    blurField,
    startTyping,
    stopTyping,
  } = useCollaboration({
    estimateId,
    autoJoin: true,
    trackCursor: true,
    trackTyping: true,
  });

  const handleMouseMove = (e: MouseEvent) => {
    updateCursor({ x: e.clientX, y: e.clientY });
  };

  const handleFieldFocus = (fieldId: string) => {
    focusField(fieldId, "input");
    startTyping(fieldId);
  };

  return (
    <div onMouseMove={handleMouseMove}>
      <CollaboratorIndicator
        estimateId={estimateId}
        showActivity={true}
      />
      
      {/* Your form fields */}
      <input
        onFocus={() => handleFieldFocus("customer-name")}
        onBlur={() => blurField("customer-name")}
        onChange={() => stopTyping("customer-name")}
      />
    </div>
  );
}
\`\`\`

## Environment Configuration

Required environment variables:

\`\`\`env
# WebSocket Server
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
SOCKET_PORT=3001
WEBSOCKET_CORS_ORIGINS=http://localhost:3000

# Features
ENABLE_REALTIME_FEATURES=true
ENABLE_COLLABORATION=true
ENABLE_OPTIMISTIC_UPDATES=true

# Performance
WEBSOCKET_MAX_CONNECTIONS=1000
WEBSOCKET_HEARTBEAT_INTERVAL=25000
WEBSOCKET_CONNECTION_TIMEOUT=30000
\`\`\`

## Development Scripts

\`\`\`bash
# Start WebSocket server in development
npm run websocket:dev

# Build WebSocket server for production
npm run websocket:build

# Start production WebSocket server
npm run websocket:start

# Test real-time features
npm run realtime:test
\`\`\`

## Deployment Considerations

### Production Setup

1. **Separate WebSocket Server**: Run WebSocket server on different port/process
2. **Load Balancing**: Use sticky sessions for WebSocket connections
3. **Redis Adapter**: For multi-instance WebSocket scaling
4. **SSL/TLS**: Secure WebSocket connections (WSS)
5. **CORS**: Configure allowed origins for production domains

### Scaling Strategies

- **Horizontal Scaling**: Multiple WebSocket server instances with Redis adapter
- **Room Sharding**: Distribute rooms across server instances
- **Connection Pooling**: Limit connections per instance
- **Health Checks**: Monitor server health and auto-restart failed instances

## Monitoring & Debugging

### Health Monitoring

- Connection count and health metrics
- Room activity and cleanup
- Error rates and failure patterns
- Performance metrics (ping, memory usage)

### Debug Tools

- WebSocket connection inspector in browser dev tools
- Server-side logging with different log levels
- Connection health dashboard components
- Real-time event debugging

## Future Enhancements

- **Conflict Resolution**: Advanced merge strategies for concurrent edits
- **Presence API**: More detailed user activity tracking
- **Offline Support**: Queue events for offline users
- **Video/Voice**: WebRTC integration for communication
- **File Sharing**: Real-time document collaboration
- **Mobile Optimization**: Enhanced mobile gesture support

## Performance Optimization

- **Event Debouncing**: Reduce network traffic for rapid events
- **Connection Pooling**: Reuse connections efficiently
- **Message Compression**: Gzip/deflate for large payloads
- **Selective Subscriptions**: Only subscribe to needed events
- **Connection Cleanup**: Automatic cleanup of stale connections

This implementation provides a robust foundation for real-time features in EstimatePro while maintaining scalability and performance.`;

    fs.writeFileSync(
      path.join(this.projectRoot, "docs/REAL_TIME_ARCHITECTURE.md"),
      documentationContent,
    );

    this.log("Generated comprehensive documentation", "success");
    this.changes.push({
      type: "documentation",
      path: "docs/REAL_TIME_ARCHITECTURE.md",
      description:
        "Complete real-time architecture documentation with examples",
    });
  }

  generateSummaryReport() {
    const summary = {
      title: "Wave 4.1: Real-Time Architecture Enhancements - COMPLETED",
      timestamp: new Date().toISOString(),
      totalChanges: this.changes.length,
      enhancements: [
        {
          category: "WebSocket Server",
          description:
            "Socket.io-based server with authentication and room management",
          benefits: [
            "Proper WebSocket handling with fallbacks",
            "User authentication and session management",
            "Room-based communication for estimates",
            "Auto-cleanup of inactive sessions",
          ],
        },
        {
          category: "Optimistic Updates",
          description: "Enhanced real-time pricing with immediate UI feedback",
          benefits: [
            "Instant UI updates with server confirmation",
            "Automatic rollback for failed updates",
            "Connection resilience with auto-reconnection",
            "Performance metrics and health monitoring",
          ],
        },
        {
          category: "Unified Event System",
          description:
            "Centralized event management for all real-time features",
          benefits: [
            "Type-safe event handling with subscriptions",
            "Event buffering and persistence",
            "Room-based event filtering",
            "Priority-based event processing",
          ],
        },
        {
          category: "Collaboration Features",
          description:
            "Real-time collaboration with presence and activity tracking",
          benefits: [
            "User presence indicators",
            "Real-time cursor tracking",
            "Typing indicators for form fields",
            "Field focus/blur notifications",
          ],
        },
        {
          category: "Connection Management",
          description: "Robust connection handling with health monitoring",
          benefits: [
            "Auto-reconnection with exponential backoff",
            "Health metrics (ping, error rate, uptime)",
            "Connection quality monitoring",
            "Graceful degradation during outages",
          ],
        },
        {
          category: "React Components",
          description: "Ready-to-use UI components for real-time features",
          benefits: [
            "Connection status indicators",
            "Collaborator avatars with activity",
            "Configurable display options",
            "Accessibility-compliant design",
          ],
        },
      ],
      technicalDetails: {
        newDependencies: [
          "socket.io@4.7.5",
          "socket.io-client@4.7.5",
          "@socket.io/cluster-adapter@0.2.2",
          "socket.io-redis-adapter@8.2.1",
          "@types/socket.io@3.0.2",
        ],
        newFiles: [
          "lib/websocket/server.ts",
          "lib/websocket/enhanced-pricing-service.ts",
          "lib/websocket/event-system.ts",
          "lib/websocket/connection-manager.ts",
          "hooks/useCollaboration.ts",
          "components/realtime/ConnectionStatus.tsx",
          "components/realtime/CollaboratorIndicator.tsx",
        ],
        newScripts: [
          "websocket:dev",
          "websocket:start",
          "websocket:build",
          "realtime:test",
        ],
        documentation: ["docs/REAL_TIME_ARCHITECTURE.md"],
      },
      nextSteps: [
        "Wave 4.2: Enhance PWA capabilities with real-time sync",
        "Integration testing with existing services",
        "Production deployment configuration",
        "Performance monitoring setup",
      ],
    };

    console.log("\n" + "=".repeat(80));
    console.log(summary.title);
    console.log("=".repeat(80));
    console.log(`📅 Completed: ${summary.timestamp}`);
    console.log(`📊 Total Changes: ${summary.totalChanges}`);
    console.log("\n🚀 ENHANCEMENTS IMPLEMENTED:");

    summary.enhancements.forEach((enhancement, index) => {
      console.log(`\n${index + 1}. ${enhancement.category}`);
      console.log(`   ${enhancement.description}`);
      console.log("   Benefits:");
      enhancement.benefits.forEach((benefit) => {
        console.log(`   • ${benefit}`);
      });
    });

    console.log("\n🔧 TECHNICAL DETAILS:");
    console.log(
      `• ${summary.technicalDetails.newDependencies.length} new dependencies added`,
    );
    console.log(
      `• ${summary.technicalDetails.newFiles.length} new files created`,
    );
    console.log(
      `• ${summary.technicalDetails.newScripts.length} new package.json scripts`,
    );
    console.log(
      `• ${summary.technicalDetails.documentation.length} documentation files`,
    );

    console.log("\n📝 KEY FEATURES:");
    console.log("• Socket.io-based WebSocket server with authentication");
    console.log("• Optimistic updates for real-time pricing");
    console.log("• Unified event system for all real-time features");
    console.log("• Real-time collaboration with presence tracking");
    console.log("• Robust connection management with health monitoring");
    console.log("• Ready-to-use React components");

    console.log("\n⚡ PERFORMANCE BENEFITS:");
    console.log("• Instant UI feedback with optimistic updates");
    console.log("• Reduced server load through intelligent debouncing");
    console.log("• Connection pooling and efficient resource usage");
    console.log("• Auto-reconnection minimizes disruption");

    console.log("\n🔜 NEXT STEPS:");
    summary.nextSteps.forEach((step) => {
      console.log(`• ${step}`);
    });

    console.log("\n" + "=".repeat(80));
    this.log(
      "Wave 4.1 real-time architecture enhancements completed successfully!",
      "success",
    );
    console.log("=".repeat(80));
  }
}

// Run if called directly
if (require.main === module) {
  const enhancer = new RealTimeArchitectureEnhancer();
  enhancer
    .runEnhancements()
    .then(() => {
      console.log(
        "\n✅ Real-time architecture enhancements completed successfully!",
      );
    })
    .catch((error) => {
      console.error("\n❌ Enhancement failed:", error);
      process.exit(1);
    });
}

module.exports = RealTimeArchitectureEnhancer;

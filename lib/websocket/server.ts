/**
 * Enhanced WebSocket Server for EstimatePro
 * Provides real-time communication with Socket.io
 */

import { Server } from "socket.io";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { createClient } from "@/lib/supabase/universal-client";

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

export interface OptimisticUpdate {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  userId: string;
  optimistic: boolean;
}

class EstimateProWebSocketServer {
  private io: Server;
  private users = new Map<string, SocketUser>();
  private rooms = new Map<string, RoomData>();
  private connections = new Map<string, string>(); // socketId -> userId

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
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
      console.log(`Client connected: ${socket.id}`);

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
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        console.log("No authentication token provided");
        return null;
      }

      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

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

    console.log(`User ${user.name} joined room ${roomId}`);
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

    console.log(`User ${user.name} left room ${roomId}`);
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
      id: `pricing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Broadcast to room (excluding sender for optimistic updates)
    if (data.roomId) {
      socket.to(data.roomId).emit("pricing-updated", message);
    }

    console.log(`Pricing update from ${user.name}: ${data.serviceType}`);
  }

  private handleAnalyticsSubscription(
    socket: any,
    metrics: string[],
    user: SocketUser,
  ) {
    socket.join("analytics-subscribers");

    socket.emit("analytics-subscribed", {
      metrics,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Start sending analytics updates
    this.startAnalyticsUpdates(socket, metrics);

    console.log(
      `User ${user.name} subscribed to analytics: ${metrics.join(", ")}`,
    );
  }

  private handleAnalyticsUnsubscription(socket: any, user: SocketUser) {
    socket.leave("analytics-subscribers");

    socket.emit("analytics-unsubscribed", {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    console.log(`User ${user.name} unsubscribed from analytics`);
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
    console.log(`Client disconnected: ${socket.id} - ${reason}`);

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
      id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    setInterval(
      () => {
        const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

        this.rooms.forEach((room, roomId) => {
          if (room.lastActivity < cutoff && room.collaborators.size === 0) {
            this.rooms.delete(roomId);
            console.log(`Cleaned up inactive room: ${roomId}`);
          }
        });
      },
      5 * 60 * 1000,
    );
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
      console.log(
        `🚀 EstimatePro WebSocket Server ready on http://${hostname}:${port}`,
      );
      console.log(`📊 Stats: ${JSON.stringify(wsServer.getStats())}`);
    });
}

// Start server if run directly
if (require.main === module) {
  startWebSocketServer();
}

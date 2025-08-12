# Real-Time Architecture Documentation

## Overview

EstimatePro's real-time architecture provides seamless WebSocket-based communication for collaborative editing, live pricing updates, and multi-user synchronization. The system is built on Socket.io with comprehensive reliability features including auto-reconnection, health monitoring, and optimistic updates.

## Architecture Components

### Core Services

#### 1. WebSocket Server (`lib/websocket/server.ts`)

- **Purpose**: Central Socket.io server handling all real-time communications
- **Features**:
  - User authentication with Supabase integration
  - Room-based collaboration (estimate-specific rooms)
  - Real-time pricing broadcasts
  - Analytics subscriptions
  - Collaboration features (cursor tracking, field focus, typing indicators)
  - Connection health monitoring with ping/pong
  - Automatic room cleanup for inactive sessions

**Key Methods**:

```typescript
// Authentication
await authenticateSocket(socket): Promise<SocketUser | null>

// Room Management
handleJoinRoom(socket, roomId, user)
handleLeaveRoom(socket, roomId, user)

// Real-time Features
handlePricingUpdate(socket, data, user)
handleCursorMove(socket, data, user)
handleFieldFocus(socket, data, user)
```

#### 2. Enhanced Pricing Service (`lib/websocket/enhanced-pricing-service.ts`)

- **Purpose**: Client-side WebSocket management with optimistic updates
- **Features**:
  - Connection management with exponential backoff reconnection
  - Optimistic update system with rollback capability
  - Heartbeat monitoring and latency tracking
  - Room joining/leaving with automatic cleanup
  - Event forwarding to unified event system

**Key Methods**:

```typescript
// Connection Management
await connect(userId: string, authToken: string): Promise<void>
await disconnect(): Promise<void>

// Optimistic Updates
await updatePricingOptimistic(data: any): Promise<string>

// Room Management
await joinRoom(estimateId: string): Promise<void>
await leaveRoom(): Promise<void>
```

#### 3. Unified Event System (`lib/websocket/event-system.ts`)

- **Purpose**: Centralized event management and coordination
- **Features**:
  - Event subscription with filtering and throttling
  - Integration with pricing service events
  - Batch event processing with priority queues
  - Event statistics and monitoring
  - Cross-service event coordination

**Key Methods**:

```typescript
// Subscriptions
subscribe(types: string | string[], callback: Function, options?: EventSubscriptionOptions): string
unsubscribe(subscriptionId: string): boolean

// Event Emission
async emit(type: string, data: any, options?: EventEmissionOptions): Promise<string>
async emitBatch(events: Array<{type: string, data: any, options?: any}>): Promise<string[]>

// Connection Management
async connect(userId: string, authToken: string): Promise<void>
async joinRoom(roomId: string): Promise<void>
```

#### 4. Connection Manager (`lib/websocket/connection-manager.ts`)

- **Purpose**: Connection reliability and health monitoring
- **Features**:
  - Automatic reconnection with exponential backoff and jitter
  - Health status tracking (healthy/degraded/unhealthy/disconnected)
  - Heartbeat monitoring with latency measurement
  - Connection statistics and uptime tracking
  - Configurable reconnection policies

**Key Methods**:

```typescript
// Connection Control
async connect(userId: string, authToken: string): Promise<void>
async reconnect(): Promise<void>
async disconnect(): Promise<void>

// Health Monitoring
getHealth(): ConnectionHealth
getConnectionStats(): ConnectionStats
async checkHealth(): Promise<ConnectionHealth>

// Configuration
updateConfig(updates: Partial<ConnectionConfig>): void
```

### React Components

#### 1. Connection Status (`components/realtime/ConnectionStatus.tsx`)

- **Purpose**: Visual connection health indicator with manual controls
- **Features**:
  - Real-time connection status display
  - Latency and uptime information
  - Manual reconnection button
  - Auto-hiding with configurable timeout
  - Detailed connection statistics view

**Props**:

```typescript
interface ConnectionStatusProps {
  showDetails?: boolean; // Show detailed connection info
  autoHide?: boolean; // Auto-hide after status change
  hideAfterMs?: number; // Auto-hide timeout (default: 5000ms)
  className?: string; // Custom CSS classes
}
```

#### 2. Collaborator Indicator (`components/realtime/CollaboratorIndicator.tsx`)

- **Purpose**: Shows active collaborators and their real-time activities
- **Features**:
  - Active collaborator avatars with activity indicators
  - Real-time cursor tracking and display
  - Typing indicators and field focus tracking
  - Expandable detailed view with user activities
  - Activity sorting (active users first)

**Props**:

```typescript
interface CollaboratorIndicatorProps {
  estimateId?: string; // Auto-join collaboration session
  showDetails?: boolean; // Show detailed user activity
  showCursors?: boolean; // Display real-time cursors
  maxAvatars?: number; // Maximum avatars to show (default: 5)
  className?: string; // Custom CSS classes
}
```

### React Hooks

#### useCollaboration Hook (`hooks/useCollaboration.ts`)

- **Purpose**: React hook for collaboration features
- **Features**:
  - Automatic session joining/leaving
  - Real-time cursor tracking with debouncing
  - Field focus/blur tracking
  - Typing indicators with auto-stop
  - Collaborator state management
  - Event system integration

**Usage**:

```typescript
const {
  collaborators, // Array of active collaborators
  isConnected, // Connection status
  joinSession, // Join collaboration session
  leaveSession, // Leave collaboration session
  updateCursor, // Update cursor position
  focusField, // Mark field as focused
  blurField, // Mark field as blurred
  startTyping, // Start typing indicator
  stopTyping, // Stop typing indicator
  sendUpdate, // Send custom updates
  collaborationState, // Full collaboration state
} = useCollaboration({
  estimateId: "123",
  autoJoin: true,
  trackCursor: true,
  trackTyping: true,
  debounceMs: 100,
});
```

## Integration Guide

### 1. Server Setup

```bash
# Start WebSocket server (development)
npm run websocket:dev

# Build and start WebSocket server (production)
npm run websocket:build
npm run websocket:start
```

### 2. Client Integration

```typescript
// Basic connection setup
import { getConnectionManager } from "@/lib/websocket/connection-manager";
import { getRealTimeEventSystem } from "@/lib/websocket/event-system";

const connectionManager = getConnectionManager();
const eventSystem = getRealTimeEventSystem();

// Connect with user authentication
await connectionManager.connect(userId, authToken);

// Subscribe to events
const subscriptionId = eventSystem.subscribe(
  ["pricing", "collaboration"],
  (event) => {
    console.log("Real-time event:", event);
  },
  { roomId: "estimate_123" },
);
```

### 3. Component Usage

```tsx
import { ConnectionStatus, CollaboratorIndicator } from "@/components/realtime";

function EstimateEditor({ estimateId }: { estimateId: string }) {
  return (
    <div className="relative">
      {/* Connection status indicator */}
      <ConnectionStatus
        showDetails={true}
        autoHide={false}
        className="fixed top-4 right-4"
      />

      {/* Collaborator indicator */}
      <CollaboratorIndicator
        estimateId={estimateId}
        showDetails={false}
        showCursors={true}
        maxAvatars={5}
        className="fixed bottom-4 right-4"
      />

      {/* Your estimate editing UI */}
      <EstimateForm estimateId={estimateId} />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# WebSocket server configuration
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001  # WebSocket server URL
SOCKET_PORT=3001                                 # WebSocket server port

# Connection reliability
WEBSOCKET_MAX_RECONNECT_ATTEMPTS=5              # Max reconnection attempts
WEBSOCKET_RECONNECT_BASE_DELAY=1000             # Base reconnection delay (ms)
WEBSOCKET_MAX_RECONNECT_DELAY=30000             # Max reconnection delay (ms)

# Health monitoring
WEBSOCKET_HEALTH_CHECK_INTERVAL=10000           # Health check interval (ms)
WEBSOCKET_HEARTBEAT_INTERVAL=30000              # Heartbeat interval (ms)

# Performance
WEBSOCKET_PING_TIMEOUT=60000                    # Ping timeout (ms)
WEBSOCKET_PING_INTERVAL=25000                   # Ping interval (ms)
WEBSOCKET_MAX_HTTP_BUFFER_SIZE=1000000          # Max HTTP buffer size

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com  # CORS origins
```

### Connection Manager Configuration

```typescript
import { getConnectionManager } from "@/lib/websocket/connection-manager";

const connectionManager = getConnectionManager();

// Update configuration
connectionManager.updateConfig({
  maxReconnectAttempts: 10,
  reconnectBaseDelay: 500,
  maxReconnectDelay: 60000,
  healthCheckInterval: 5000,
  heartbeatInterval: 15000,
  debugMode: process.env.NODE_ENV === "development",
});
```

## Event Types and Data Structures

### System Events

```typescript
// Connection events
"system" -> {
  subtype: "connected" | "disconnected" | "room-joined" | "room-left",
  data: { service?: string, roomId?: string }
}

// Health events
"system" -> {
  subtype: "heartbeat" | "ping",
  data: { timestamp: string }
}
```

### Pricing Events

```typescript
// Real-time pricing updates
"pricing" -> {
  subtype: "update" | "optimistic-update",
  data: {
    serviceType: string,
    amount: number,
    updatedBy: string,
    optimisticId?: string
  }
}
```

### Collaboration Events

```typescript
// User presence
"collaboration" -> {
  subtype: "user-joined" | "user-left" | "user-disconnected",
  data: {
    userId: string,
    userName: string,
    timestamp: string
  }
}

// User activity
"collaboration" -> {
  subtype: "cursor-moved" | "field-focused" | "field-blurred" | "typing-started" | "typing-stopped",
  data: {
    userId: string,
    userName: string,
    position?: { x: number, y: number },
    fieldId?: string,
    fieldType?: string,
    timestamp: string
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Connection Pooling**: Single WebSocket connection per user with room-based message routing
2. **Event Throttling**: Configurable throttling for high-frequency events (cursor movements)
3. **Optimistic Updates**: Immediate UI updates with server confirmation/rollback
4. **Batch Processing**: Event queue with priority-based processing
5. **Memory Management**: Automatic cleanup of inactive rooms and expired subscriptions

### Resource Usage

- **Memory**: ~2-5MB per active connection
- **CPU**: <1% per 100 concurrent users
- **Network**: ~100-500 bytes per real-time event
- **Storage**: In-memory only, no persistent storage required

### Scaling Recommendations

1. **Horizontal Scaling**: Use Redis adapter for multiple server instances
2. **Load Balancing**: Sticky sessions recommended for WebSocket connections
3. **Monitoring**: Implement connection count and event throughput monitoring
4. **Limits**: Configure per-user event rate limits to prevent abuse

## Security

### Authentication

- JWT token validation through Supabase Auth
- User role-based room access control
- Token refresh handling with automatic reconnection

### Data Protection

- HTTPS/WSS encryption in production
- CORS configuration for allowed origins
- Input sanitization and validation
- No sensitive data in WebSocket messages

### Rate Limiting

- Per-user event emission limits
- Connection attempt throttling
- Automatic disconnection for excessive errors

## Monitoring and Debugging

### Health Metrics

```typescript
// Connection manager stats
const stats = connectionManager.getConnectionStats();
console.log({
  connected: stats.connected,
  healthy: stats.healthy,
  uptime: stats.uptime,
  latency: stats.latency,
  reconnectAttempts: stats.reconnectAttempts,
  errorCount: stats.errorCount,
});

// Event system stats
const eventStats = eventSystem.getStats();
console.log({
  totalEvents: eventStats.totalEvents,
  activeSubscriptions: eventStats.activeSubscriptions,
  eventsPerSecond: eventStats.eventsPerSecond,
  errorRate: eventStats.errorRate,
});
```

### Debug Logging

```typescript
// Enable debug mode
connectionManager.updateConfig({ debugMode: true });

// Server-side logging
console.log(`Client connected: ${socket.id}`);
console.log(`User ${user.name} joined room ${roomId}`);
console.log(`Pricing update from ${user.name}: ${data.serviceType}`);
```

## Testing

### Unit Tests

- Connection manager reliability testing
- Event system subscription/emission testing
- Optimistic update rollback testing
- Health monitoring accuracy testing

### Integration Tests

- End-to-end WebSocket communication testing
- Multi-user collaboration scenario testing
- Connection failure and recovery testing
- Performance and load testing

### Testing Commands

```bash
# Test real-time features
npm run realtime:test

# WebSocket server testing
npm run websocket:dev
# In another terminal:
curl -v http://localhost:3001/health
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check WebSocket server status: `curl http://localhost:3001/health`
   - Verify authentication tokens are valid
   - Check CORS configuration for allowed origins
   - Ensure firewall allows WebSocket traffic on configured port

2. **Optimistic Updates Not Confirming**
   - Check server-side error logs for validation failures
   - Verify room membership before sending updates
   - Ensure optimistic timeout is reasonable (default: 5s)

3. **High Memory Usage**
   - Monitor active connections and clean up inactive rooms
   - Check for subscription memory leaks
   - Implement connection limits per user

4. **Poor Performance**
   - Enable event throttling for high-frequency events
   - Monitor event queue size and processing time
   - Consider Redis adapter for scaling

### Debug Commands

```bash
# Check WebSocket server status
curl -v http://localhost:3001/health

# Monitor real-time events
# Enable debug logging in browser console

# Test connection reliability
# Simulate network failures and verify auto-reconnection
```

## Migration and Upgrade Path

### From Legacy Real-Time System

1. Gradual migration: Run both systems in parallel
2. Feature flags for real-time components
3. Data synchronization between old and new systems
4. User acceptance testing before full rollout

### Future Enhancements

- Redis adapter for horizontal scaling
- Persistent message queuing for offline users
- Video/audio collaboration features
- Advanced conflict resolution for concurrent edits
- Real-time analytics and usage metrics

## API Reference

### WebSocket Server Events

**Client → Server**:

- `join-room`: Join collaboration room
- `leave-room`: Leave collaboration room
- `pricing-update`: Send pricing update
- `cursor-move`: Send cursor position
- `field-focus`: Mark field as focused
- `field-blur`: Mark field as blurred
- `typing-start`: Start typing indicator
- `typing-stop`: Stop typing indicator
- `ping`: Heartbeat ping

**Server → Client**:

- `welcome`: Connection confirmation
- `room-joined`: Room join confirmation
- `user-joined`: User joined room
- `user-left`: User left room
- `user-disconnected`: User disconnected
- `pricing-updated`: Real-time pricing update
- `cursor-moved`: Cursor position update
- `field-focused`: Field focus update
- `field-blurred`: Field blur update
- `typing-started`: Typing started
- `typing-stopped`: Typing stopped
- `pong`: Heartbeat pong
- `analytics-update`: Analytics data update

### REST API Endpoints

**Health Check**:

```
GET /health
Response: { status: "ok", uptime: number, connections: number }
```

**Statistics**:

```
GET /stats
Response: {
  connectedUsers: number,
  activeRooms: number,
  totalConnections: number
}
```

This comprehensive real-time architecture provides EstimatePro with enterprise-grade collaborative features while maintaining reliability, performance, and security.

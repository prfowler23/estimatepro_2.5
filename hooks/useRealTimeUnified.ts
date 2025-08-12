/**
 * Unified Real-Time React Hook
 * Provides comprehensive real-time functionality through a single hook
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { getUnifiedRealTimeService } from "@/lib/services/real-time-service-unified";
import type {
  UnifiedConnectionState,
  CollaborationState,
  Collaborator,
  ServiceMetrics,
  RealTimeServiceConfig,
} from "@/lib/services/real-time-service-unified";
import type {
  RealTimeEvent,
  EventSubscriptionOptions,
} from "@/lib/websocket/event-system";
import type { OptimisticUpdate } from "@/lib/websocket/enhanced-pricing-service";

export interface UseRealTimeConfig {
  // Auto-connection settings
  userId?: string;
  authToken?: string;
  autoConnect?: boolean;

  // Room settings
  roomId?: string;
  autoJoinRoom?: boolean;

  // Event subscriptions
  eventTypes?: string[];
  subscriptionOptions?: EventSubscriptionOptions;

  // Collaboration features
  enableCollaboration?: boolean;
  trackCursor?: boolean;
  trackTyping?: boolean;
  trackFieldFocus?: boolean;

  // Performance settings
  cursorThrottleMs?: number;
  typingTimeoutMs?: number;

  // Metrics and debugging
  enableMetrics?: boolean;
  debugMode?: boolean;
}

export interface UseRealTimeReturn {
  // Connection state
  connected: boolean;
  healthy: boolean;
  connecting: boolean;
  connectionState: UnifiedConnectionState;

  // Collaboration state
  collaborationState: CollaborationState;
  collaborators: Collaborator[];
  isCollaborating: boolean;

  // Service metrics
  metrics: ServiceMetrics | null;

  // Connection management
  connect: (userId: string, authToken: string) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Room management
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;

  // Event management
  subscribe: (
    types: string | string[],
    callback: (event: RealTimeEvent) => void,
    options?: EventSubscriptionOptions,
  ) => string;
  unsubscribe: (subscriptionId: string) => boolean;
  emit: (type: string, data: any, options?: any) => Promise<string>;

  // Optimistic updates
  updateOptimistic: (data: any) => Promise<string>;
  pendingOptimisticUpdates: OptimisticUpdate[];

  // Collaboration actions
  updateCursor: (x: number, y: number) => void;
  focusField: (fieldId: string) => void;
  blurField: (fieldId: string) => void;
  startTyping: (fieldId: string) => void;
  stopTyping: (fieldId: string) => void;

  // Event handlers (can be overridden)
  onEvent?: (event: RealTimeEvent) => void;
  onCollaboratorJoined?: (collaborator: Collaborator) => void;
  onCollaboratorLeft?: (collaborator: Collaborator) => void;
  onOptimisticUpdate?: (update: OptimisticUpdate) => void;
  onOptimisticConfirmed?: (update: OptimisticUpdate) => void;
  onOptimisticRollback?: (data: any) => void;
}

export function useRealTimeUnified(
  config: UseRealTimeConfig = {},
): UseRealTimeReturn {
  const {
    userId,
    authToken,
    autoConnect = true,
    roomId,
    autoJoinRoom = true,
    eventTypes = [],
    subscriptionOptions = {},
    enableCollaboration = true,
    trackCursor = true,
    trackTyping = true,
    trackFieldFocus = true,
    cursorThrottleMs = 100,
    typingTimeoutMs = 3000,
    enableMetrics = true,
    debugMode = false,
  } = config;

  // State
  const [connected, setConnected] = useState(false);
  const [healthy, setHealthy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionState, setConnectionState] =
    useState<UnifiedConnectionState>({
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
    });

  const [collaborationState, setCollaborationState] =
    useState<CollaborationState>({
      roomId: null,
      userId: null,
      collaborators: [],
      isActive: false,
    });

  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [pendingOptimisticUpdates, setPendingOptimisticUpdates] = useState<
    OptimisticUpdate[]
  >([]);

  // Refs for stable references
  const serviceRef = useRef(getUnifiedRealTimeService());
  const subscriptionsRef = useRef(new Set<string>());
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event handlers
  const handleConnectionState = useCallback((state: UnifiedConnectionState) => {
    setConnectionState(state);
    setConnected(state.connected);
    setHealthy(state.healthy);
  }, []);

  const handleCollaborationState = useCallback((state: CollaborationState) => {
    setCollaborationState(state);
  }, []);

  const handleMetrics = useCallback(
    (metricsUpdate: ServiceMetrics) => {
      if (enableMetrics) {
        setMetrics(metricsUpdate);
      }
    },
    [enableMetrics],
  );

  const handleOptimisticUpdate = useCallback(
    (update: OptimisticUpdate) => {
      setPendingOptimisticUpdates((prev) => [...prev, update]);
      config.onOptimisticUpdate?.(update);
    },
    [config],
  );

  const handleOptimisticConfirmed = useCallback(
    (update: OptimisticUpdate) => {
      setPendingOptimisticUpdates((prev) =>
        prev.filter((u) => u.id !== update.id),
      );
      config.onOptimisticConfirmed?.(update);
    },
    [config],
  );

  const handleOptimisticRollback = useCallback(
    (data: any) => {
      if (data.update) {
        setPendingOptimisticUpdates((prev) =>
          prev.filter((u) => u.id !== data.update.id),
        );
      }
      config.onOptimisticRollback?.(data);
    },
    [config],
  );

  const handleCollaboratorJoined = useCallback(
    (collaborator: Collaborator) => {
      config.onCollaboratorJoined?.(collaborator);
    },
    [config],
  );

  const handleCollaboratorLeft = useCallback(
    (collaborator: Collaborator) => {
      config.onCollaboratorLeft?.(collaborator);
    },
    [config],
  );

  // Initialize service and setup event listeners
  useEffect(() => {
    const service = serviceRef.current;

    // Update service configuration
    service.updateConfig({
      cursorThrottleMs,
      typingTimeoutMs,
      debugMode,
      enableMetrics,
    });

    // Setup event listeners
    service.on("connection-state", handleConnectionState);
    service.on("initialized", () => {
      setConnected(service.connected);
      setHealthy(service.healthy);
      setConnectionState(service.connectionState);
      setCollaborationState(service.collaborationState);
    });

    service.on("connected", () => {
      setConnected(true);
      setConnecting(false);
    });

    service.on("disconnected", () => {
      setConnected(false);
      setConnecting(false);
    });

    service.on("reconnecting", () => {
      setConnecting(true);
    });

    if (enableMetrics) {
      service.on("metrics", handleMetrics);
    }

    if (enableCollaboration) {
      service.on("collaborator-added", handleCollaboratorJoined);
      service.on("collaborator-removed", handleCollaboratorLeft);
    }

    // Optimistic update handlers
    service.on("optimistic-update", handleOptimisticUpdate);
    service.on("optimistic-confirmed", handleOptimisticConfirmed);
    service.on("optimistic-rollback", handleOptimisticRollback);

    // Initialize service
    service.initialize().catch((error) => {
      console.error("Failed to initialize unified real-time service:", error);
    });

    return () => {
      // Cleanup event listeners
      service.off("connection-state", handleConnectionState);
      service.off("metrics", handleMetrics);
      service.off("collaborator-added", handleCollaboratorJoined);
      service.off("collaborator-removed", handleCollaboratorLeft);
      service.off("optimistic-update", handleOptimisticUpdate);
      service.off("optimistic-confirmed", handleOptimisticConfirmed);
      service.off("optimistic-rollback", handleOptimisticRollback);
    };
  }, [
    cursorThrottleMs,
    typingTimeoutMs,
    debugMode,
    enableMetrics,
    enableCollaboration,
    handleConnectionState,
    handleMetrics,
    handleCollaboratorJoined,
    handleCollaboratorLeft,
    handleOptimisticUpdate,
    handleOptimisticConfirmed,
    handleOptimisticRollback,
  ]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && userId && authToken && !connected && !connecting) {
      setConnecting(true);
      serviceRef.current.connect(userId, authToken).catch((error) => {
        console.error("Auto-connect failed:", error);
        setConnecting(false);
      });
    }
  }, [autoConnect, userId, authToken, connected, connecting]);

  // Auto-join room
  useEffect(() => {
    if (autoJoinRoom && roomId && connected && !collaborationState.isActive) {
      serviceRef.current.joinRoom(roomId).catch((error) => {
        console.error("Auto-join room failed:", error);
      });
    }
  }, [autoJoinRoom, roomId, connected, collaborationState.isActive]);

  // Subscribe to specified event types
  useEffect(() => {
    if (eventTypes.length > 0 && connected) {
      const subscriptionId = serviceRef.current.subscribe(
        eventTypes,
        (event) => {
          config.onEvent?.(event);
        },
        subscriptionOptions,
      );

      subscriptionsRef.current.add(subscriptionId);

      return () => {
        serviceRef.current.unsubscribe(subscriptionId);
        subscriptionsRef.current.delete(subscriptionId);
      };
    }
  }, [eventTypes, connected, subscriptionOptions, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Unsubscribe from all events
      subscriptionsRef.current.forEach((id) => {
        serviceRef.current.unsubscribe(id);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  // Connection management functions
  const connect = useCallback(async (userId: string, authToken: string) => {
    setConnecting(true);
    try {
      await serviceRef.current.connect(userId, authToken);
    } catch (error) {
      setConnecting(false);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await serviceRef.current.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    setConnecting(true);
    try {
      await serviceRef.current.reconnect();
    } catch (error) {
      setConnecting(false);
      throw error;
    }
  }, []);

  // Room management functions
  const joinRoom = useCallback(async (roomId: string) => {
    await serviceRef.current.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback(async () => {
    await serviceRef.current.leaveRoom();
  }, []);

  // Event management functions
  const subscribe = useCallback(
    (
      types: string | string[],
      callback: (event: RealTimeEvent) => void,
      options?: EventSubscriptionOptions,
    ) => {
      const subscriptionId = serviceRef.current.subscribe(
        types,
        callback,
        options,
      );
      subscriptionsRef.current.add(subscriptionId);
      return subscriptionId;
    },
    [],
  );

  const unsubscribe = useCallback((subscriptionId: string) => {
    const success = serviceRef.current.unsubscribe(subscriptionId);
    if (success) {
      subscriptionsRef.current.delete(subscriptionId);
    }
    return success;
  }, []);

  const emit = useCallback(async (type: string, data: any, options?: any) => {
    return serviceRef.current.emit(type, data, options);
  }, []);

  // Optimistic update functions
  const updateOptimistic = useCallback(async (data: any) => {
    return serviceRef.current.updateOptimistic(data);
  }, []);

  // Collaboration functions
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (!trackCursor || !collaborationState.isActive) return;

      // Throttle cursor updates
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }

      cursorThrottleRef.current = setTimeout(() => {
        serviceRef.current.emit(
          "collaboration",
          { x, y },
          {
            subtype: "cursor-moved",
          },
        );
      }, cursorThrottleMs);
    },
    [trackCursor, collaborationState.isActive, cursorThrottleMs],
  );

  const focusField = useCallback(
    (fieldId: string) => {
      if (!trackFieldFocus || !collaborationState.isActive) return;

      serviceRef.current.emit(
        "collaboration",
        { fieldId },
        {
          subtype: "field-focused",
        },
      );
    },
    [trackFieldFocus, collaborationState.isActive],
  );

  const blurField = useCallback(
    (fieldId: string) => {
      if (!trackFieldFocus || !collaborationState.isActive) return;

      serviceRef.current.emit(
        "collaboration",
        { fieldId },
        {
          subtype: "field-blurred",
        },
      );
    },
    [trackFieldFocus, collaborationState.isActive],
  );

  const startTyping = useCallback(
    (fieldId: string) => {
      if (!trackTyping || !collaborationState.isActive) return;

      serviceRef.current.emit(
        "collaboration",
        { fieldId },
        {
          subtype: "typing-started",
        },
      );

      // Auto-stop typing after timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(fieldId);
      }, typingTimeoutMs);
    },
    [trackTyping, collaborationState.isActive, typingTimeoutMs],
  );

  const stopTyping = useCallback(
    (fieldId: string) => {
      if (!trackTyping || !collaborationState.isActive) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      serviceRef.current.emit(
        "collaboration",
        { fieldId },
        {
          subtype: "typing-stopped",
        },
      );
    },
    [trackTyping, collaborationState.isActive],
  );

  return {
    // Connection state
    connected,
    healthy,
    connecting,
    connectionState,

    // Collaboration state
    collaborationState,
    collaborators: collaborationState.collaborators,
    isCollaborating: collaborationState.isActive,

    // Service metrics
    metrics,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Room management
    joinRoom,
    leaveRoom,

    // Event management
    subscribe,
    unsubscribe,
    emit,

    // Optimistic updates
    updateOptimistic,
    pendingOptimisticUpdates,

    // Collaboration actions
    updateCursor,
    focusField,
    blurField,
    startTyping,
    stopTyping,
  };
}

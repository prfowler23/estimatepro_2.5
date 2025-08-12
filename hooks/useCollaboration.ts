/**
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
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
];

export function useCollaboration(
  options: UseCollaborationOptions = {},
): UseCollaborationReturn {
  const {
    estimateId,
    autoJoin = true,
    trackCursor = true,
    trackTyping = true,
    debounceMs = 100,
  } = options;

  const eventSystem = getRealTimeEventSystem();
  const [collaborationState, setCollaborationState] =
    useState<CollaborationState>({
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

  // Join collaboration session
  const joinSession = useCallback(
    async (targetEstimateId: string) => {
      if (!eventSystem.connected) {
        throw new Error("Event system not connected");
      }

      const roomId = `estimate_${targetEstimateId}`;

      try {
        await eventSystem.joinRoom(roomId);

        setCollaborationState((prev) => ({
          ...prev,
          currentRoom: roomId,
          isConnected: true,
        }));

        // Subscribe to collaboration events
        subscriptionId.current = eventSystem.subscribe(
          ["collaboration", "system"],
          handleCollaborationEvent,
          { roomId },
        );

        console.log(`Joined collaboration session: ${roomId}`);
      } catch (error) {
        console.error("Failed to join collaboration session:", error);
        throw error;
      }
    },
    [eventSystem, handleCollaborationEvent],
  );

  // Leave collaboration session
  const leaveSession = useCallback(async () => {
    if (collaborationState.currentRoom && eventSystem.connected) {
      await eventSystem.leaveRoom(collaborationState.currentRoom);
    }

    if (subscriptionId.current) {
      eventSystem.unsubscribe(subscriptionId.current);
      subscriptionId.current = null;
    }

    setCollaborationState((prev) => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserJoined = (data: any) => {
    setCollaborationState((prev) => {
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
    setCollaborationState((prev) => {
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

    setCollaborationState((prev) => {
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
    setCollaborationState((prev) => {
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
    setCollaborationState((prev) => {
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

    setCollaborationState((prev) => {
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
    setCollaborationState((prev) => {
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
    setCollaborationState((prev) => {
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
  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (
        !trackCursor ||
        !eventSystem.connected ||
        !collaborationState.currentRoom
      ) {
        return;
      }

      // Debounce cursor updates
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }

      cursorDebounceRef.current = setTimeout(() => {
        eventSystem.emit(
          "collaboration",
          {
            position,
            roomId: collaborationState.currentRoom,
          },
          {
            subtype: "cursor-move",
          },
        );
      }, debounceMs);
    },
    [trackCursor, eventSystem, collaborationState.currentRoom, debounceMs],
  );

  // Field focus/blur
  const focusField = useCallback(
    (fieldId: string, fieldType?: string) => {
      if (!eventSystem.connected || !collaborationState.currentRoom) {
        return;
      }

      eventSystem.emit(
        "collaboration",
        {
          fieldId,
          fieldType,
          roomId: collaborationState.currentRoom,
        },
        {
          subtype: "field-focus",
        },
      );
    },
    [eventSystem, collaborationState.currentRoom],
  );

  const blurField = useCallback(
    (fieldId: string) => {
      if (!eventSystem.connected || !collaborationState.currentRoom) {
        return;
      }

      eventSystem.emit(
        "collaboration",
        {
          fieldId,
          roomId: collaborationState.currentRoom,
        },
        {
          subtype: "field-blur",
        },
      );
    },
    [eventSystem, collaborationState.currentRoom],
  );

  // Typing indicators
  const startTyping = useCallback(
    (fieldId: string) => {
      if (
        !trackTyping ||
        !eventSystem.connected ||
        !collaborationState.currentRoom
      ) {
        return;
      }

      eventSystem.emit(
        "collaboration",
        {
          fieldId,
          roomId: collaborationState.currentRoom,
        },
        {
          subtype: "typing-start",
        },
      );

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(fieldId);
      }, 3000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackTyping, eventSystem, collaborationState.currentRoom],
  );

  const stopTyping = useCallback(
    (fieldId: string) => {
      if (!eventSystem.connected || !collaborationState.currentRoom) {
        return;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      eventSystem.emit(
        "collaboration",
        {
          fieldId,
          roomId: collaborationState.currentRoom,
        },
        {
          subtype: "typing-stop",
        },
      );
    },
    [eventSystem, collaborationState.currentRoom],
  );

  // Send custom updates
  const sendUpdate = useCallback(
    (data: any) => {
      if (!eventSystem.connected || !collaborationState.currentRoom) {
        return;
      }

      eventSystem.emit("collaboration", {
        ...data,
        roomId: collaborationState.currentRoom,
      });
    },
    [eventSystem, collaborationState.currentRoom],
  );

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

export default useCollaboration;

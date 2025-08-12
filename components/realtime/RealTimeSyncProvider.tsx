/**
 * Real-Time Synchronization Provider
 * Provides centralized real-time data synchronization across components
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { useRealTimeUnified } from "@/hooks/useRealTimeUnified";
import type { RealTimeEvent } from "@/lib/websocket/event-system";
import type { OptimisticUpdate } from "@/lib/websocket/enhanced-pricing-service";

// State shape for synchronized data
export interface SyncState {
  // Estimate data synchronization
  estimates: Record<string, any>;
  services: Record<string, any>;
  pricing: Record<string, any>;

  // User interaction state
  cursors: Record<string, { x: number; y: number; timestamp: number }>;
  focusedFields: Record<string, string>; // userId -> fieldId
  typingUsers: Record<string, string>; // userId -> fieldId

  // System state
  lastSync: number;
  syncErrors: string[];
  pendingChanges: Record<string, any>;

  // Optimistic updates
  optimisticUpdates: Record<string, OptimisticUpdate>;
}

// Actions for state updates
export type SyncAction =
  | { type: "SET_ESTIMATE"; payload: { id: string; data: any } }
  | {
      type: "UPDATE_SERVICE";
      payload: { estimateId: string; serviceId: string; data: any };
    }
  | {
      type: "UPDATE_PRICING";
      payload: { estimateId: string; serviceId: string; pricing: any };
    }
  | { type: "SET_CURSOR"; payload: { userId: string; x: number; y: number } }
  | { type: "SET_FIELD_FOCUS"; payload: { userId: string; fieldId: string } }
  | { type: "CLEAR_FIELD_FOCUS"; payload: { userId: string } }
  | { type: "SET_TYPING"; payload: { userId: string; fieldId: string } }
  | { type: "CLEAR_TYPING"; payload: { userId: string } }
  | { type: "ADD_OPTIMISTIC_UPDATE"; payload: OptimisticUpdate }
  | { type: "CONFIRM_OPTIMISTIC_UPDATE"; payload: { id: string } }
  | {
      type: "ROLLBACK_OPTIMISTIC_UPDATE";
      payload: { id: string; rollbackData: any };
    }
  | { type: "SET_SYNC_ERROR"; payload: string }
  | { type: "CLEAR_SYNC_ERRORS" }
  | { type: "MERGE_REMOTE_STATE"; payload: Partial<SyncState> }
  | { type: "RESET_STATE" };

// Initial state
const initialState: SyncState = {
  estimates: {},
  services: {},
  pricing: {},
  cursors: {},
  focusedFields: {},
  typingUsers: {},
  lastSync: Date.now(),
  syncErrors: [],
  pendingChanges: {},
  optimisticUpdates: {},
};

// Reducer for state management
function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "SET_ESTIMATE":
      return {
        ...state,
        estimates: {
          ...state.estimates,
          [action.payload.id]: action.payload.data,
        },
        lastSync: Date.now(),
      };

    case "UPDATE_SERVICE":
      return {
        ...state,
        services: {
          ...state.services,
          [`${action.payload.estimateId}_${action.payload.serviceId}`]:
            action.payload.data,
        },
        lastSync: Date.now(),
      };

    case "UPDATE_PRICING":
      return {
        ...state,
        pricing: {
          ...state.pricing,
          [`${action.payload.estimateId}_${action.payload.serviceId}`]:
            action.payload.pricing,
        },
        lastSync: Date.now(),
      };

    case "SET_CURSOR":
      return {
        ...state,
        cursors: {
          ...state.cursors,
          [action.payload.userId]: {
            x: action.payload.x,
            y: action.payload.y,
            timestamp: Date.now(),
          },
        },
      };

    case "SET_FIELD_FOCUS":
      return {
        ...state,
        focusedFields: {
          ...state.focusedFields,
          [action.payload.userId]: action.payload.fieldId,
        },
      };

    case "CLEAR_FIELD_FOCUS":
      const newFocusedFields = { ...state.focusedFields };
      delete newFocusedFields[action.payload.userId];
      return {
        ...state,
        focusedFields: newFocusedFields,
      };

    case "SET_TYPING":
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.userId]: action.payload.fieldId,
        },
      };

    case "CLEAR_TYPING":
      const newTypingUsers = { ...state.typingUsers };
      delete newTypingUsers[action.payload.userId];
      return {
        ...state,
        typingUsers: newTypingUsers,
      };

    case "ADD_OPTIMISTIC_UPDATE":
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          [action.payload.id]: action.payload,
        },
      };

    case "CONFIRM_OPTIMISTIC_UPDATE":
      const confirmedUpdates = { ...state.optimisticUpdates };
      delete confirmedUpdates[action.payload.id];
      return {
        ...state,
        optimisticUpdates: confirmedUpdates,
      };

    case "ROLLBACK_OPTIMISTIC_UPDATE":
      const rolledBackUpdates = { ...state.optimisticUpdates };
      delete rolledBackUpdates[action.payload.id];

      // Apply rollback data if available
      const rollbackState = action.payload.rollbackData
        ? {
            ...state,
            ...action.payload.rollbackData,
          }
        : state;

      return {
        ...rollbackState,
        optimisticUpdates: rolledBackUpdates,
        syncErrors: [
          ...state.syncErrors,
          `Optimistic update ${action.payload.id} was rolled back`,
        ],
      };

    case "SET_SYNC_ERROR":
      return {
        ...state,
        syncErrors: [...state.syncErrors, action.payload],
      };

    case "CLEAR_SYNC_ERRORS":
      return {
        ...state,
        syncErrors: [],
      };

    case "MERGE_REMOTE_STATE":
      return {
        ...state,
        ...action.payload,
        lastSync: Date.now(),
      };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
}

// Context for sync state and actions
interface SyncContextValue {
  state: SyncState;
  dispatch: React.Dispatch<SyncAction>;

  // Convenience methods
  updateEstimate: (
    id: string,
    data: any,
    optimistic?: boolean,
  ) => Promise<void>;
  updateService: (
    estimateId: string,
    serviceId: string,
    data: any,
    optimistic?: boolean,
  ) => Promise<void>;
  updatePricing: (
    estimateId: string,
    serviceId: string,
    pricing: any,
    optimistic?: boolean,
  ) => Promise<void>;

  // Collaboration methods
  updateCursor: (x: number, y: number) => void;
  focusField: (fieldId: string) => void;
  blurField: (fieldId: string) => void;
  startTyping: (fieldId: string) => void;
  stopTyping: (fieldId: string) => void;

  // Utility methods
  getEstimate: (id: string) => any | undefined;
  getService: (estimateId: string, serviceId: string) => any | undefined;
  getPricing: (estimateId: string, serviceId: string) => any | undefined;
  clearErrors: () => void;
  resetSync: () => void;

  // Real-time connection state
  connected: boolean;
  healthy: boolean;
  collaborators: any[];
}

const SyncContext = createContext<SyncContextValue | null>(null);

// Provider component
interface RealTimeSyncProviderProps {
  children: ReactNode;
  userId?: string;
  authToken?: string;
  roomId?: string;
  autoConnect?: boolean;
  enableOptimisticUpdates?: boolean;
  enableCollaboration?: boolean;
  onSyncError?: (error: string) => void;
  onStateChange?: (state: SyncState) => void;
}

export function RealTimeSyncProvider({
  children,
  userId,
  authToken,
  roomId,
  autoConnect = true,
  enableOptimisticUpdates = true,
  enableCollaboration = true,
  onSyncError,
  onStateChange,
}: RealTimeSyncProviderProps) {
  const [state, dispatch] = useReducer(syncReducer, initialState);
  const stateRef = useRef(state);

  // Update state ref when state changes
  useEffect(() => {
    stateRef.current = state;
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Real-time connection
  const {
    connected,
    healthy,
    collaborators,
    updateOptimistic,
    emit,
    updateCursor: rtUpdateCursor,
    focusField: rtFocusField,
    blurField: rtBlurField,
    startTyping: rtStartTyping,
    stopTyping: rtStopTyping,
  } = useRealTimeUnified({
    userId,
    authToken,
    roomId,
    autoConnect,
    enableCollaboration,
    eventTypes: ["pricing", "collaboration", "estimate", "service"],

    // Event handlers
    onEvent: (event: RealTimeEvent) => {
      handleRealTimeEvent(event);
    },

    onOptimisticUpdate: (update: OptimisticUpdate) => {
      if (enableOptimisticUpdates) {
        dispatch({ type: "ADD_OPTIMISTIC_UPDATE", payload: update });
      }
    },

    onOptimisticConfirmed: (update: OptimisticUpdate) => {
      dispatch({
        type: "CONFIRM_OPTIMISTIC_UPDATE",
        payload: { id: update.id },
      });
    },

    onOptimisticRollback: (data: any) => {
      dispatch({
        type: "ROLLBACK_OPTIMISTIC_UPDATE",
        payload: { id: data.update?.id, rollbackData: data.rollbackData },
      });
    },
  });

  // Handle incoming real-time events
  const handleRealTimeEvent = useCallback(
    (event: RealTimeEvent) => {
      try {
        switch (event.type) {
          case "estimate":
            handleEstimateEvent(event);
            break;
          case "service":
            handleServiceEvent(event);
            break;
          case "pricing":
            handlePricingEvent(event);
            break;
          case "collaboration":
            handleCollaborationEvent(event);
            break;
          default:
            console.debug("Unhandled real-time event:", event);
        }
      } catch (error) {
        const errorMessage = `Failed to handle real-time event: ${error instanceof Error ? error.message : error}`;
        dispatch({ type: "SET_SYNC_ERROR", payload: errorMessage });
        onSyncError?.(errorMessage);
      }
    },
    [onSyncError],
  );

  const handleEstimateEvent = (event: RealTimeEvent) => {
    switch (event.subtype) {
      case "updated":
        dispatch({
          type: "SET_ESTIMATE",
          payload: { id: event.data.id, data: event.data },
        });
        break;
      default:
        console.debug("Unhandled estimate event:", event);
    }
  };

  const handleServiceEvent = (event: RealTimeEvent) => {
    switch (event.subtype) {
      case "updated":
        dispatch({
          type: "UPDATE_SERVICE",
          payload: {
            estimateId: event.data.estimateId,
            serviceId: event.data.serviceId,
            data: event.data,
          },
        });
        break;
      default:
        console.debug("Unhandled service event:", event);
    }
  };

  const handlePricingEvent = (event: RealTimeEvent) => {
    switch (event.subtype) {
      case "updated":
      case "optimistic-update":
        dispatch({
          type: "UPDATE_PRICING",
          payload: {
            estimateId: event.data.estimateId,
            serviceId: event.data.serviceId,
            pricing: event.data,
          },
        });
        break;
      default:
        console.debug("Unhandled pricing event:", event);
    }
  };

  const handleCollaborationEvent = (event: RealTimeEvent) => {
    if (!enableCollaboration) return;

    switch (event.subtype) {
      case "cursor-moved":
        if (event.userId) {
          dispatch({
            type: "SET_CURSOR",
            payload: {
              userId: event.userId,
              x: event.data.x,
              y: event.data.y,
            },
          });
        }
        break;

      case "field-focused":
        if (event.userId) {
          dispatch({
            type: "SET_FIELD_FOCUS",
            payload: {
              userId: event.userId,
              fieldId: event.data.fieldId,
            },
          });
        }
        break;

      case "field-blurred":
        if (event.userId) {
          dispatch({
            type: "CLEAR_FIELD_FOCUS",
            payload: { userId: event.userId },
          });
        }
        break;

      case "typing-started":
        if (event.userId) {
          dispatch({
            type: "SET_TYPING",
            payload: {
              userId: event.userId,
              fieldId: event.data.fieldId,
            },
          });
        }
        break;

      case "typing-stopped":
        if (event.userId) {
          dispatch({
            type: "CLEAR_TYPING",
            payload: { userId: event.userId },
          });
        }
        break;

      default:
        console.debug("Unhandled collaboration event:", event);
    }
  };

  // Convenience methods
  const updateEstimate = useCallback(
    async (id: string, data: any, optimistic = false) => {
      try {
        if (optimistic && enableOptimisticUpdates) {
          await updateOptimistic({
            type: "estimate",
            id,
            data,
          });
        } else {
          await emit("estimate", { id, ...data }, { subtype: "updated" });
        }

        // Update local state immediately for better UX
        dispatch({
          type: "SET_ESTIMATE",
          payload: { id, data },
        });
      } catch (error) {
        const errorMessage = `Failed to update estimate: ${error instanceof Error ? error.message : error}`;
        dispatch({ type: "SET_SYNC_ERROR", payload: errorMessage });
        onSyncError?.(errorMessage);
      }
    },
    [updateOptimistic, emit, enableOptimisticUpdates, onSyncError],
  );

  const updateService = useCallback(
    async (
      estimateId: string,
      serviceId: string,
      data: any,
      optimistic = false,
    ) => {
      try {
        if (optimistic && enableOptimisticUpdates) {
          await updateOptimistic({
            type: "service",
            estimateId,
            serviceId,
            data,
          });
        } else {
          await emit(
            "service",
            { estimateId, serviceId, ...data },
            { subtype: "updated" },
          );
        }

        dispatch({
          type: "UPDATE_SERVICE",
          payload: { estimateId, serviceId, data },
        });
      } catch (error) {
        const errorMessage = `Failed to update service: ${error instanceof Error ? error.message : error}`;
        dispatch({ type: "SET_SYNC_ERROR", payload: errorMessage });
        onSyncError?.(errorMessage);
      }
    },
    [updateOptimistic, emit, enableOptimisticUpdates, onSyncError],
  );

  const updatePricing = useCallback(
    async (
      estimateId: string,
      serviceId: string,
      pricing: any,
      optimistic = false,
    ) => {
      try {
        if (optimistic && enableOptimisticUpdates) {
          await updateOptimistic({
            type: "pricing",
            estimateId,
            serviceId,
            data: pricing,
          });
        } else {
          await emit(
            "pricing",
            { estimateId, serviceId, ...pricing },
            { subtype: "updated" },
          );
        }

        dispatch({
          type: "UPDATE_PRICING",
          payload: { estimateId, serviceId, pricing },
        });
      } catch (error) {
        const errorMessage = `Failed to update pricing: ${error instanceof Error ? error.message : error}`;
        dispatch({ type: "SET_SYNC_ERROR", payload: errorMessage });
        onSyncError?.(errorMessage);
      }
    },
    [updateOptimistic, emit, enableOptimisticUpdates, onSyncError],
  );

  // Collaboration methods
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (enableCollaboration) {
        rtUpdateCursor(x, y);
        // Don't dispatch locally - wait for event to come back
      }
    },
    [rtUpdateCursor, enableCollaboration],
  );

  const focusField = useCallback(
    (fieldId: string) => {
      if (enableCollaboration) {
        rtFocusField(fieldId);
      }
    },
    [rtFocusField, enableCollaboration],
  );

  const blurField = useCallback(
    (fieldId: string) => {
      if (enableCollaboration) {
        rtBlurField(fieldId);
      }
    },
    [rtBlurField, enableCollaboration],
  );

  const startTyping = useCallback(
    (fieldId: string) => {
      if (enableCollaboration) {
        rtStartTyping(fieldId);
      }
    },
    [rtStartTyping, enableCollaboration],
  );

  const stopTyping = useCallback(
    (fieldId: string) => {
      if (enableCollaboration) {
        rtStopTyping(fieldId);
      }
    },
    [rtStopTyping, enableCollaboration],
  );

  // Utility methods
  const getEstimate = useCallback((id: string) => {
    return stateRef.current.estimates[id];
  }, []);

  const getService = useCallback((estimateId: string, serviceId: string) => {
    return stateRef.current.services[`${estimateId}_${serviceId}`];
  }, []);

  const getPricing = useCallback((estimateId: string, serviceId: string) => {
    return stateRef.current.pricing[`${estimateId}_${serviceId}`];
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: "CLEAR_SYNC_ERRORS" });
  }, []);

  const resetSync = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  const contextValue: SyncContextValue = {
    state,
    dispatch,
    updateEstimate,
    updateService,
    updatePricing,
    updateCursor,
    focusField,
    blurField,
    startTyping,
    stopTyping,
    getEstimate,
    getService,
    getPricing,
    clearErrors,
    resetSync,
    connected,
    healthy,
    collaborators,
  };

  return (
    <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>
  );
}

// Hook to use sync context
export function useRealTimeSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error(
      "useRealTimeSync must be used within a RealTimeSyncProvider",
    );
  }
  return context;
}

export default RealTimeSyncProvider;

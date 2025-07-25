"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import {
  RealTimeCollaborationEngine,
  CollaboratorPresence,
  RealTimeChange,
  CollaborationSession,
  CollaborationPermissions,
} from "@/lib/collaboration/real-time-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";

interface CollaborationContextType {
  // Session state
  session: CollaborationSession | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Participants and presence
  participants: CollaboratorPresence[];
  currentUser: CollaboratorPresence | null;
  activeUsers: CollaboratorPresence[];

  // Real-time changes
  pendingChanges: RealTimeChange[];
  conflicts: any[];
  changeHistory: RealTimeChange[];

  // Permissions
  permissions: CollaborationPermissions | null;
  canEdit: (fieldPath?: string) => boolean;
  canNavigateToStep: (stepNumber: number) => boolean;

  // Actions
  initializeCollaboration: (
    estimateId: string,
    userProfile: Partial<CollaboratorPresence>,
  ) => Promise<void>;
  broadcastChange: (
    stepId: string,
    fieldPath: string,
    oldValue: any,
    newValue: any,
  ) => Promise<void>;
  updatePresence: (updates: Partial<CollaboratorPresence>) => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: "accept_incoming" | "keep_local" | "merge",
    mergedValue?: any,
  ) => Promise<void>;
  inviteCollaborator: (
    email: string,
    role: "owner" | "editor" | "viewer",
  ) => Promise<void>;
  removeCollaborator: (userId: string) => Promise<void>;
  leaveSession: () => Promise<void>;

  // Utilities
  getUserCursor: (userId: string) => CollaboratorPresence["cursor"] | null;
  getFieldStatus: (fieldPath: string) => "available" | "editing" | "locked";
  getRecentChanges: (fieldPath?: string) => RealTimeChange[];
}

const CollaborationContext = createContext<CollaborationContextType | null>(
  null,
);

interface CollaborationProviderProps {
  children: ReactNode;
  estimateId?: string;
  autoConnect?: boolean;
  conflictResolution?:
    | "last-writer-wins"
    | "manual-review"
    | "merge-compatible";
}

export function CollaborationProvider({
  children,
  estimateId,
  autoConnect = false,
  conflictResolution = "manual-review",
}: CollaborationProviderProps) {
  const [engine, setEngine] = useState<RealTimeCollaborationEngine | null>(
    null,
  );
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<CollaboratorPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<CollaboratorPresence | null>(
    null,
  );
  const [pendingChanges, setPendingChanges] = useState<RealTimeChange[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [changeHistory, setChangeHistory] = useState<RealTimeChange[]>([]);
  const [permissions, setPermissions] =
    useState<CollaborationPermissions | null>(null);

  /**
   * Initialize collaboration session
   */
  const initializeCollaboration = async (
    estimateId: string,
    userProfile: Partial<CollaboratorPresence>,
  ): Promise<void> => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Get current user session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User must be authenticated to collaborate");
      }

      // Create collaboration engine
      const collaborationEngine = new RealTimeCollaborationEngine(
        supabase,
        estimateId,
        user.id,
        {
          userEmail: user.email || "",
          userName: userProfile.userName || user.email || "Anonymous",
          avatar: userProfile.avatar,
          currentStep: userProfile.currentStep || 1,
          role: userProfile.role || "editor",
        },
      );

      // Set up event handlers
      collaborationEngine.onPresenceUpdate((newParticipants) => {
        setParticipants(newParticipants);

        // Update current user info
        const currentUserPresence = newParticipants.find(
          (p) => p.userId === user.id,
        );
        if (currentUserPresence) {
          setCurrentUser(currentUserPresence);
        }
      });

      collaborationEngine.onDataUpdate((change) => {
        setPendingChanges((prev) => [...prev, change]);

        // Add to change history
        setChangeHistory((prev) => [change, ...prev.slice(0, 49)]); // Keep last 50 changes
      });

      collaborationEngine.onConflict((conflict) => {
        setConflicts((prev) => [...prev, conflict]);
      });

      // Initialize session
      const collaborationSession =
        await collaborationEngine.initializeSession();

      setEngine(collaborationEngine);
      setSession(collaborationSession);
      setPermissions(collaborationSession.permissions);
      setIsConnected(true);

      // Load initial change history
      const history = await collaborationEngine.getChangeHistory(50);
      setChangeHistory(history);
    } catch (error) {
      // Error handled by setting connection error state
      setConnectionError(
        error instanceof Error ? error.message : "Failed to connect",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Broadcast change to other collaborators
   */
  const broadcastChange = async (
    stepId: string,
    fieldPath: string,
    oldValue: any,
    newValue: any,
  ): Promise<void> => {
    if (!engine || !isConnected) return;

    try {
      await engine.broadcastChange(stepId, fieldPath, oldValue, newValue);
    } catch (error) {
      // Broadcast failure handled silently
    }
  };

  /**
   * Update user presence
   */
  const updatePresence = async (
    updates: Partial<CollaboratorPresence>,
  ): Promise<void> => {
    if (!engine || !isConnected) return;

    try {
      await engine.updatePresence(updates);
    } catch (error) {
      // Presence update failure handled silently
    }
  };

  /**
   * Resolve conflict
   */
  const resolveConflict = async (
    conflictId: string,
    resolution: "accept_incoming" | "keep_local" | "merge",
    mergedValue?: any,
  ): Promise<void> => {
    if (!engine || !isConnected) return;

    try {
      await engine.resolveConflict(conflictId, resolution, mergedValue);

      // Remove resolved conflict
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    } catch (error) {
      // Conflict resolution failure handled silently
    }
  };

  /**
   * Invite collaborator
   */
  const inviteCollaborator = async (
    email: string,
    role: "owner" | "editor" | "viewer",
  ): Promise<void> => {
    if (!session) return;

    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .single();

      if (!existingUser) {
        // Send invitation email (would integrate with your email service)
        throw new Error(
          "User not found. Invitation emails are not yet implemented.",
        );
      }

      // Add collaborator to estimate
      const { error } = await supabase.from("estimate_collaborators").insert({
        estimate_id: session.estimateId,
        user_id: existingUser.id,
        role,
        permissions: getDefaultPermissions(role) as any,
        invited_by: currentUser?.userId,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      // Invitation failure handled silently
      throw error;
    }
  };

  /**
   * Remove collaborator
   */
  const removeCollaborator = async (userId: string): Promise<void> => {
    if (!session || !permissions?.canShare) return;

    try {
      const { error } = await supabase
        .from("estimate_collaborators")
        .delete()
        .eq("estimate_id", session.estimateId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      // Removal failure handled silently
      throw error;
    }
  };

  /**
   * Leave collaboration session
   */
  const leaveSession = async (): Promise<void> => {
    try {
      if (engine) {
        await engine.disconnect();
      }

      setEngine(null);
      setSession(null);
      setIsConnected(false);
      setParticipants([]);
      setCurrentUser(null);
      setPendingChanges([]);
      setConflicts([]);
      setPermissions(null);
    } catch (error) {
      // Leave session failure handled silently
    }
  };

  /**
   * Check if user can edit specific field
   */
  const canEdit = (fieldPath?: string): boolean => {
    if (!permissions) return false;
    if (!permissions.canEdit) return false;
    if (fieldPath && permissions.restrictedFields.includes(fieldPath))
      return false;
    return true;
  };

  /**
   * Check if user can navigate to specific step
   */
  const canNavigateToStep = (stepNumber: number): boolean => {
    if (!permissions) return false;
    return permissions.allowedSteps.includes(stepNumber);
  };

  /**
   * Get user cursor position
   */
  const getUserCursor = (
    userId: string,
  ): CollaboratorPresence["cursor"] | null => {
    const user = participants.find((p) => p.userId === userId);
    return user?.cursor || null;
  };

  /**
   * Get field editing status
   */
  const getFieldStatus = (
    fieldPath: string,
  ): "available" | "editing" | "locked" => {
    // Check if someone else is currently editing this field
    const editingUser = participants.find(
      (p) =>
        p.userId !== currentUser?.userId &&
        p.cursor?.fieldId === fieldPath &&
        p.isActive,
    );

    if (editingUser) {
      return permissions?.canEdit ? "editing" : "locked";
    }

    return canEdit(fieldPath) ? "available" : "locked";
  };

  /**
   * Get recent changes for field
   */
  const getRecentChanges = (fieldPath?: string): RealTimeChange[] => {
    if (!fieldPath) return changeHistory;

    return changeHistory.filter((change) => change.fieldPath === fieldPath);
  };

  // Auto-connect if estimateId provided
  useEffect(() => {
    if (autoConnect && estimateId && !isConnected && !isConnecting) {
      initializeCollaboration(estimateId, {
        userName: "User",
        currentStep: 1,
        role: "editor",
      });
    }
  }, [autoConnect, estimateId, isConnected, isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engine) {
        engine.disconnect();
      }
    };
  }, [engine]);

  // Calculate active users
  const activeUsers = participants.filter((p) => p.isActive);

  const contextValue: CollaborationContextType = {
    // Session state
    session,
    isConnected,
    isConnecting,
    connectionError,

    // Participants and presence
    participants,
    currentUser,
    activeUsers,

    // Real-time changes
    pendingChanges,
    conflicts,
    changeHistory,

    // Permissions
    permissions,
    canEdit,
    canNavigateToStep,

    // Actions
    initializeCollaboration,
    broadcastChange,
    updatePresence,
    resolveConflict,
    inviteCollaborator,
    removeCollaborator,
    leaveSession,

    // Utilities
    getUserCursor,
    getFieldStatus,
    getRecentChanges,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

/**
 * Hook to use collaboration context
 */
export function useCollaboration(): CollaborationContextType {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider",
    );
  }
  return context;
}

/**
 * Get default permissions for role
 */
function getDefaultPermissions(
  role: "owner" | "editor" | "viewer",
): CollaborationPermissions {
  switch (role) {
    case "owner":
      return {
        canEdit: true,
        canComment: true,
        canShare: true,
        canDelete: true,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: [],
      };
    case "editor":
      return {
        canEdit: true,
        canComment: true,
        canShare: false,
        canDelete: false,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: ["final_pricing"],
      };
    case "viewer":
      return {
        canEdit: false,
        canComment: true,
        canShare: false,
        canDelete: false,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: ["pricing", "expenses", "final_pricing"],
      };
    default:
      return {
        canEdit: false,
        canComment: false,
        canShare: false,
        canDelete: false,
        allowedSteps: [],
        restrictedFields: [],
      };
  }
}

export default CollaborationProvider;

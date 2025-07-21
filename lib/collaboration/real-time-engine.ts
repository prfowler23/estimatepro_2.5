"use client";

import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface CollaboratorPresence {
  userId: string;
  userEmail: string;
  userName: string;
  avatar?: string;
  currentStep: number;
  lastSeen: string;
  isActive: boolean;
  cursor?: {
    fieldId?: string;
    stepId?: string;
    position?: { x: number; y: number };
  };
  role: "owner" | "editor" | "viewer";
}

export interface RealTimeChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  changeType:
    | "field_update"
    | "step_navigation"
    | "file_upload"
    | "calculation_update";
  stepId: string;
  fieldPath: string;
  oldValue: any;
  newValue: any;
  metadata?: {
    confidence?: number;
    isAIGenerated?: boolean;
    conflictResolved?: boolean;
  };
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  allowedSteps: number[];
  restrictedFields: string[];
}

export interface CollaborationSession {
  estimateId: string;
  sessionId: string;
  participants: CollaboratorPresence[];
  isActive: boolean;
  permissions: CollaborationPermissions;
  conflictResolution: "last-writer-wins" | "manual-review" | "merge-compatible";
}

export class RealTimeCollaborationEngine {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private estimateId: string;
  private userId: string;
  private userProfile: CollaboratorPresence;
  private onPresenceChange?: (participants: CollaboratorPresence[]) => void;
  private onDataChange?: (change: RealTimeChange) => void;
  private onConflictDetected?: (conflict: any) => void;
  private changeBuffer: RealTimeChange[] = [];
  private lastSyncTime: Date = new Date();
  private conflictQueue: RealTimeChange[] = [];

  constructor(
    supabase: SupabaseClient,
    estimateId: string,
    userId: string,
    userProfile: Omit<CollaboratorPresence, "userId" | "lastSeen" | "isActive">,
  ) {
    this.supabase = supabase;
    this.estimateId = estimateId;
    this.userId = userId;
    this.userProfile = {
      ...userProfile,
      userId,
      lastSeen: new Date().toISOString(),
      isActive: true,
    };
  }

  /**
   * Initialize real-time collaboration session
   */
  async initializeSession(): Promise<CollaborationSession> {
    try {
      // Create or join collaboration session
      const sessionId = `estimate_${this.estimateId}`;

      // Set up real-time channel
      this.channel = this.supabase.channel(sessionId, {
        config: {
          broadcast: { self: true },
          presence: { key: this.userId },
        },
      });

      // Handle presence changes (users joining/leaving)
      this.channel.on("presence", { event: "sync" }, () => {
        const presenceState = this.channel?.presenceState();
        const participants = this.extractParticipants(presenceState);
        this.onPresenceChange?.(participants);
      });

      // Handle real-time data changes
      this.channel.on("broadcast", { event: "data_change" }, (payload) => {
        this.handleIncomingChange(payload.change as RealTimeChange);
      });

      // Handle conflict notifications
      this.channel.on(
        "broadcast",
        { event: "conflict_detected" },
        (payload) => {
          this.onConflictDetected?.(payload.conflict);
        },
      );

      // Subscribe to channel
      await this.channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track presence
          await this.channel?.track(this.userProfile);
        }
      });

      // Get collaboration permissions
      const permissions = await this.getCollaborationPermissions();

      return {
        estimateId: this.estimateId,
        sessionId,
        participants: [],
        isActive: true,
        permissions,
        conflictResolution: "manual-review",
      };
    } catch (error) {
      console.error("Failed to initialize collaboration session:", error);
      throw error;
    }
  }

  /**
   * Broadcast data change to other collaborators
   */
  async broadcastChange(
    stepId: string,
    fieldPath: string,
    oldValue: any,
    newValue: any,
    changeType: RealTimeChange["changeType"] = "field_update",
    metadata?: RealTimeChange["metadata"],
  ): Promise<void> {
    const change: RealTimeChange = {
      id: `${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId,
      userName: this.userProfile.userName,
      timestamp: new Date().toISOString(),
      changeType,
      stepId,
      fieldPath,
      oldValue,
      newValue,
      metadata,
    };

    // Add to buffer for conflict detection
    this.changeBuffer.push(change);

    try {
      // Broadcast change to other users
      await this.channel?.send({
        type: "broadcast",
        event: "data_change",
        change,
      });

      // Store change in database for persistence
      await this.storeChange(change);
    } catch (error) {
      console.error("Failed to broadcast change:", error);

      // Queue for retry
      this.conflictQueue.push(change);
    }
  }

  /**
   * Update user presence (current step, cursor position, etc.)
   */
  async updatePresence(updates: Partial<CollaboratorPresence>): Promise<void> {
    this.userProfile = {
      ...this.userProfile,
      ...updates,
      lastSeen: new Date().toISOString(),
      isActive: true,
    };

    try {
      await this.channel?.track(this.userProfile);
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }

  /**
   * Handle incoming changes from other users
   */
  private handleIncomingChange(change: RealTimeChange): void {
    // Ignore changes from self
    if (change.userId === this.userId) return;

    // Check for conflicts
    const conflict = this.detectConflict(change);

    if (conflict) {
      this.handleConflict(change, conflict);
    } else {
      // Apply change directly
      this.onDataChange?.(change);
    }
  }

  /**
   * Detect conflicts between incoming change and local changes
   */
  private detectConflict(incomingChange: RealTimeChange): any | null {
    const recentLocalChanges = this.changeBuffer.filter(
      (change) =>
        change.fieldPath === incomingChange.fieldPath &&
        change.stepId === incomingChange.stepId &&
        new Date(change.timestamp) > new Date(incomingChange.timestamp),
    );

    if (recentLocalChanges.length > 0) {
      return {
        type: "concurrent_edit",
        localChanges: recentLocalChanges,
        incomingChange,
        conflictTime: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Handle conflicts based on resolution strategy
   */
  private handleConflict(incomingChange: RealTimeChange, conflict: any): void {
    // Notify about conflict
    this.onConflictDetected?.(conflict);

    // Queue for manual resolution
    this.conflictQueue.push(incomingChange);

    // Broadcast conflict notification to all users
    this.channel?.send({
      type: "broadcast",
      event: "conflict_detected",
      conflict: {
        ...conflict,
        participants: [this.userId, incomingChange.userId],
      },
    });
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(
    conflictId: string,
    resolution: "accept_incoming" | "keep_local" | "merge",
    mergedValue?: any,
  ): Promise<void> {
    const conflictChange = this.conflictQueue.find(
      (change) => change.id === conflictId || change.fieldPath === conflictId,
    );

    if (!conflictChange) return;

    try {
      let finalValue = conflictChange.newValue;

      switch (resolution) {
        case "accept_incoming":
          finalValue = conflictChange.newValue;
          break;
        case "keep_local":
          // Keep current local value - no change needed
          return;
        case "merge":
          finalValue = mergedValue || conflictChange.newValue;
          break;
      }

      // Apply resolved change
      const resolvedChange: RealTimeChange = {
        ...conflictChange,
        id: `resolved_${conflictChange.id}`,
        timestamp: new Date().toISOString(),
        metadata: {
          ...conflictChange.metadata,
          conflictResolved: true,
        },
        newValue: finalValue,
      };

      this.onDataChange?.(resolvedChange);

      // Remove from conflict queue
      this.conflictQueue = this.conflictQueue.filter(
        (c) => c.id !== conflictChange.id,
      );

      // Broadcast resolution
      await this.broadcastChange(
        resolvedChange.stepId,
        resolvedChange.fieldPath,
        conflictChange.oldValue,
        finalValue,
        "field_update",
        { conflictResolved: true },
      );
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    }
  }

  /**
   * Get collaboration permissions for current user
   */
  private async getCollaborationPermissions(): Promise<CollaborationPermissions> {
    try {
      const { data, error } = await this.supabase
        .from("estimate_collaborators")
        .select("role, permissions")
        .eq("estimate_id", this.estimateId)
        .eq("user_id", this.userId)
        .single();

      if (error || !data) {
        // Default permissions for estimate owner
        return {
          canEdit: true,
          canComment: true,
          canShare: true,
          canDelete: true,
          allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          restrictedFields: [],
        };
      }

      return (
        data.permissions || {
          canEdit: data.role !== "viewer",
          canComment: true,
          canShare: data.role === "owner",
          canDelete: data.role === "owner",
          allowedSteps:
            data.role === "viewer"
              ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
              : [1, 2, 3, 4, 5, 6, 7, 8, 9],
          restrictedFields: data.role === "viewer" ? ["pricing"] : [],
        }
      );
    } catch (error) {
      console.error("Failed to get collaboration permissions:", error);

      // Return safe default permissions
      return {
        canEdit: false,
        canComment: true,
        canShare: false,
        canDelete: false,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: ["pricing", "expenses"],
      };
    }
  }

  /**
   * Store change in database for persistence and audit trail
   */
  private async storeChange(change: RealTimeChange): Promise<void> {
    try {
      await this.supabase.from("estimate_changes").insert({
        estimate_id: this.estimateId,
        user_id: this.userId,
        change_id: change.id,
        change_type: change.changeType,
        step_id: change.stepId,
        field_path: change.fieldPath,
        old_value: change.oldValue,
        new_value: change.newValue,
        metadata: change.metadata,
        created_at: change.timestamp,
      });
    } catch (error) {
      console.error("Failed to store change:", error);
    }
  }

  /**
   * Extract participants from presence state
   */
  private extractParticipants(presenceState: any): CollaboratorPresence[] {
    if (!presenceState) return [];

    const participants: CollaboratorPresence[] = [];

    Object.values(presenceState).forEach((userPresences: any) => {
      if (Array.isArray(userPresences) && userPresences.length > 0) {
        // Take the most recent presence for each user
        const latestPresence = userPresences[userPresences.length - 1];
        participants.push(latestPresence);
      }
    });

    return participants;
  }

  /**
   * Get change history for estimate
   */
  async getChangeHistory(limit: number = 50): Promise<RealTimeChange[]> {
    try {
      const { data, error } = await this.supabase
        .from("estimate_changes")
        .select(
          `
          change_id,
          user_id,
          change_type,
          step_id,
          field_path,
          old_value,
          new_value,
          metadata,
          created_at,
          profiles!user_id (
            full_name,
            email
          )
        `,
        )
        .eq("estimate_id", this.estimateId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((item) => ({
        id: item.change_id,
        userId: item.user_id,
        userName:
          item.profiles?.[0]?.full_name ||
          item.profiles?.[0]?.email ||
          "Unknown User",
        timestamp: item.created_at,
        changeType: item.change_type,
        stepId: item.step_id,
        fieldPath: item.field_path,
        oldValue: item.old_value,
        newValue: item.new_value,
        metadata: item.metadata,
      }));
    } catch (error) {
      console.error("Failed to get change history:", error);
      return [];
    }
  }

  /**
   * Register event handlers
   */
  onPresenceUpdate(
    handler: (participants: CollaboratorPresence[]) => void,
  ): void {
    this.onPresenceChange = handler;
  }

  onDataUpdate(handler: (change: RealTimeChange) => void): void {
    this.onDataChange = handler;
  }

  onConflict(handler: (conflict: any) => void): void {
    this.onConflictDetected = handler;
  }

  /**
   * Clean up and disconnect
   */
  async disconnect(): Promise<void> {
    try {
      // Update presence to inactive
      await this.updatePresence({ isActive: false });

      // Unsubscribe from channel
      if (this.channel) {
        await this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
    } catch (error) {
      console.error("Failed to disconnect from collaboration session:", error);
    }
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): {
    participantCount: number;
    changeCount: number;
    conflictCount: number;
    sessionDuration: number;
  } {
    return {
      participantCount: 0, // Will be set by presence updates
      changeCount: this.changeBuffer.length,
      conflictCount: this.conflictQueue.length,
      sessionDuration: Date.now() - this.lastSyncTime.getTime(),
    };
  }
}

export default RealTimeCollaborationEngine;

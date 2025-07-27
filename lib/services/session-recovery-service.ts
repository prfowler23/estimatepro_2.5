// Session Recovery Service
// Handles browser tab recovery, draft management, and session restoration

import { supabase } from "@/lib/supabase/client";
import { GuidedFlowData } from "@/lib/types/estimate-types";
import { withDatabaseRetry } from "@/lib/utils/retry-logic";

export interface SessionDraft {
  id: string;
  estimateId: string | null;
  userId: string;
  sessionId: string;
  currentStep: string;
  data: GuidedFlowData;
  progress: {
    completedSteps: string[];
    currentStepIndex: number;
    totalSteps: number;
    progressPercentage: number;
  };
  metadata: {
    lastActivity: Date;
    browserInfo: {
      userAgent: string;
      platform: string;
      url: string;
      tabId?: string;
    };
    autoSaveEnabled: boolean;
    isActive: boolean;
  };
  recovery: {
    source: "auto-save" | "manual-save" | "tab-close" | "browser-crash";
    recoveryAttempts: number;
    lastRecoveryTime?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface RecoveryOptions {
  maxDraftAge: number; // hours
  maxRecoveryAttempts: number;
  autoCleanupEnabled: boolean;
  notificationEnabled: boolean;
  persistenceStrategy: "localStorage" | "indexedDB" | "both";
}

export interface RecoveryState {
  hasRecoverableSessions: boolean;
  availableDrafts: SessionDraft[];
  currentSession?: SessionDraft;
  lastRecoveryCheck: Date;
  recoveryInProgress: boolean;
}

export class SessionRecoveryService {
  private static readonly DEFAULT_OPTIONS: RecoveryOptions = {
    maxDraftAge: 24, // 24 hours
    maxRecoveryAttempts: 3,
    autoCleanupEnabled: true,
    notificationEnabled: true,
    persistenceStrategy: "both",
  };

  private static readonly STORAGE_KEY = "estimatepro_session_drafts";
  private static readonly SESSION_KEY = "estimatepro_session_id";

  private static sessionId: string;
  private static options = this.DEFAULT_OPTIONS;
  private static recoveryState: RecoveryState = {
    hasRecoverableSessions: false,
    availableDrafts: [],
    lastRecoveryCheck: new Date(),
    recoveryInProgress: false,
  };

  // Initialize session recovery system
  static async initialize(
    customOptions?: Partial<RecoveryOptions>,
  ): Promise<void> {
    this.options = { ...this.DEFAULT_OPTIONS, ...customOptions };
    this.sessionId = this.getOrCreateSessionId();

    // Set up beforeunload listener for tab close detection
    this.setupTabCloseDetection();

    // Set up periodic cleanup
    if (this.options.autoCleanupEnabled) {
      this.setupAutoCleanup();
    }

    // Check for existing recoverable sessions
    await this.checkForRecoverableSessions();
  }

  // Create or update a session draft
  static async saveDraft(
    estimateId: string,
    data: GuidedFlowData,
    currentStep: string,
    source: SessionDraft["recovery"]["source"] = "auto-save",
  ): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const draft: SessionDraft = {
        id: `${estimateId}_${this.sessionId}_${Date.now()}`,
        estimateId,
        userId: user.id,
        sessionId: this.sessionId,
        currentStep,
        data,
        progress: this.calculateProgress(data, currentStep),
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href,
            tabId: this.getTabId(),
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: this.calculateExpiryDate(),
      };

      // Save to both local storage and database
      await Promise.all([
        this.saveToLocalStorage(draft),
        this.saveToDatabase(draft),
      ]);

      // Update recovery state
      this.updateRecoveryState(draft);

      return true;
    } catch (error) {
      console.error("Failed to save session draft:", error);
      return false;
    }
  }

  // Get all recoverable sessions for current user
  static async getRecoverableSessions(): Promise<SessionDraft[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      // Get from both sources and merge
      const [localDrafts, remoteDrafts] = await Promise.all([
        this.getFromLocalStorage(),
        this.getFromDatabase(user.id),
      ]);

      // Merge and deduplicate
      const allDrafts = this.mergeDrafts(localDrafts, remoteDrafts);

      // Filter valid drafts
      const validDrafts = this.filterValidDrafts(allDrafts);

      // Sort by most recent
      return validDrafts.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch (error) {
      console.error("Failed to get recoverable sessions:", error);
      return [];
    }
  }

  // Recover a specific session
  static async recoverSession(draftId: string): Promise<SessionDraft | null> {
    try {
      this.recoveryState.recoveryInProgress = true;

      const drafts = await this.getRecoverableSessions();
      const draft = drafts.find((d) => d.id === draftId);

      if (!draft) {
        throw new Error(`Draft with ID ${draftId} not found`);
      }

      // Update recovery attempts
      draft.recovery.recoveryAttempts++;
      draft.recovery.lastRecoveryTime = new Date();
      draft.metadata.isActive = true;

      // Save updated draft
      await this.saveDraft(
        draft.estimateId || "",
        draft.data,
        draft.currentStep,
        "manual-save",
      );

      // Set as current session
      this.recoveryState.currentSession = draft;

      return draft;
    } catch (error) {
      console.error("Failed to recover session:", error);
      return null;
    } finally {
      this.recoveryState.recoveryInProgress = false;
    }
  }

  // Delete a session draft
  static async deleteDraft(draftId: string): Promise<boolean> {
    try {
      await Promise.all([
        this.deleteFromLocalStorage(draftId),
        this.deleteFromDatabase(draftId),
      ]);

      // Update recovery state
      this.recoveryState.availableDrafts =
        this.recoveryState.availableDrafts.filter((d) => d.id !== draftId);

      this.recoveryState.hasRecoverableSessions =
        this.recoveryState.availableDrafts.length > 0;

      return true;
    } catch (error) {
      console.error("Failed to delete draft:", error);
      return false;
    }
  }

  // Clean up expired drafts
  static async cleanupExpiredDrafts(): Promise<number> {
    try {
      const drafts = await this.getRecoverableSessions();
      const expiredDrafts = drafts.filter(
        (d) => new Date(d.expiresAt) < new Date(),
      );

      await Promise.all(
        expiredDrafts.map((draft) => this.deleteDraft(draft.id)),
      );

      return expiredDrafts.length;
    } catch (error) {
      console.error("Failed to cleanup expired drafts:", error);
      return 0;
    }
  }

  // Get current recovery state
  static getRecoveryState(): RecoveryState {
    return { ...this.recoveryState };
  }

  // Check if current session has unsaved changes
  static hasUnsavedChanges(): boolean {
    return this.recoveryState.currentSession?.metadata.isActive || false;
  }

  // Private helper methods

  private static getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  private static getTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static setupTabCloseDetection(): void {
    window.addEventListener("beforeunload", async (event) => {
      if (this.hasUnsavedChanges()) {
        // Save emergency draft before tab closes
        if (this.recoveryState.currentSession) {
          await this.saveDraft(
            this.recoveryState.currentSession.estimateId || "",
            this.recoveryState.currentSession.data,
            this.recoveryState.currentSession.currentStep,
            "tab-close",
          );
        }

        event.preventDefault();
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
      }
    });

    // Page visibility API for detecting tab switches
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.recoveryState.currentSession) {
        // Save draft when tab becomes hidden
        this.saveDraft(
          this.recoveryState.currentSession.estimateId || "",
          this.recoveryState.currentSession.data,
          this.recoveryState.currentSession.currentStep,
          "auto-save",
        );
      }
    });
  }

  private static setupAutoCleanup(): void {
    // Run cleanup every hour
    setInterval(
      () => {
        this.cleanupExpiredDrafts();
      },
      60 * 60 * 1000,
    );
  }

  private static async checkForRecoverableSessions(): Promise<void> {
    const drafts = await this.getRecoverableSessions();
    this.recoveryState.availableDrafts = drafts;
    this.recoveryState.hasRecoverableSessions = drafts.length > 0;
    this.recoveryState.lastRecoveryCheck = new Date();
  }

  private static calculateProgress(
    data: GuidedFlowData,
    currentStep: string,
  ): SessionDraft["progress"] {
    const allSteps = [
      "initial-contact",
      "area-of-work",
      "scope-details",
      "duration",
      "pricing",
      "files-photos",
    ];

    const currentIndex = allSteps.indexOf(currentStep);
    const completedSteps = allSteps.slice(0, Math.max(0, currentIndex));

    return {
      completedSteps,
      currentStepIndex: currentIndex,
      totalSteps: allSteps.length,
      progressPercentage: Math.round(
        (completedSteps.length / allSteps.length) * 100,
      ),
    };
  }

  private static calculateExpiryDate(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.options.maxDraftAge);
    return expiry;
  }

  private static async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  private static updateRecoveryState(draft: SessionDraft): void {
    const existingIndex = this.recoveryState.availableDrafts.findIndex(
      (d) => d.id === draft.id,
    );

    if (existingIndex >= 0) {
      this.recoveryState.availableDrafts[existingIndex] = draft;
    } else {
      this.recoveryState.availableDrafts.push(draft);
    }

    this.recoveryState.hasRecoverableSessions = true;
    this.recoveryState.currentSession = draft;
  }

  private static async saveToLocalStorage(draft: SessionDraft): Promise<void> {
    const drafts = await this.getFromLocalStorage();
    const existingIndex = drafts.findIndex((d) => d.id === draft.id);

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
  }

  private static async getFromLocalStorage(): Promise<SessionDraft[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get drafts from localStorage:", error);
      return [];
    }
  }

  private static async deleteFromLocalStorage(draftId: string): Promise<void> {
    const drafts = await this.getFromLocalStorage();
    const filtered = drafts.filter((d) => d.id !== draftId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  private static async saveToDatabase(draft: SessionDraft): Promise<void> {
    await withDatabaseRetry(async () => {
      const upsertData = {
        id: draft.id,
        estimate_id: draft.estimateId,
        user_id: draft.userId,
        session_id: draft.sessionId,
        current_step: draft.currentStep,
        data: draft.data as any,
        progress: draft.progress as any,
        metadata: draft.metadata as any,
        recovery: draft.recovery as any,
        expires_at: draft.expiresAt.toISOString(),
      };

      const { error } = await supabase.from("estimation_flows").upsert({
        id: draft.id,
        estimate_id: draft.estimateId || "",
        user_id: draft.userId,
        current_step: draft.currentStep,
        data: draft.data as any,
        progress: draft.progress as any,
        metadata: draft.metadata as any,
        status: "active",
        expires_at: draft.expiresAt.toISOString(),
        auto_cleanup: false,
      });

      if (error) throw error;
    });
  }

  private static async getFromDatabase(
    userId: string,
  ): Promise<SessionDraft[]> {
    const result = await withDatabaseRetry(async () => {
      const { data, error } = await supabase
        .from("estimation_flows")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        estimateId: row.estimate_id,
        userId: row.user_id,
        sessionId: row.id, // Use id as sessionId since estimation_flows doesn't have session_id
        currentStep: row.current_step?.toString() || "1",
        data: (row.flow_data || {}) as GuidedFlowData,
        progress: {
          completedSteps: [],
          currentStepIndex: row.current_step || 1,
          totalSteps: 5,
          progressPercentage: ((row.current_step || 1) / 5) * 100,
        },
        metadata: {
          browser: "",
          device: (row.device_info as any) || {},
          location: "",
          lastSavedDuration: 0,
        },
        recovery: {
          autoSaveEnabled: row.auto_save_enabled || true,
          lastAutoSave: row.last_auto_save
            ? new Date(row.last_auto_save)
            : new Date(),
          conflictDetected: row.conflict_detected || false,
          version: 1,
        },
        createdAt: new Date(row.created_at || new Date()),
        updatedAt: new Date(row.updated_at || new Date()),
        expiresAt: new Date(row.expires_at),
      }));
    });

    return result.data || [];
  }

  private static async deleteFromDatabase(draftId: string): Promise<void> {
    await withDatabaseRetry(async () => {
      const { error } = await supabase
        .from("estimation_flows")
        .delete()
        .eq("id", draftId);

      if (error) throw error;
    });
  }

  private static mergeDrafts(
    local: SessionDraft[],
    remote: SessionDraft[],
  ): SessionDraft[] {
    const merged = new Map<string, SessionDraft>();

    // Add all drafts, preferring the most recent version
    [...local, ...remote].forEach((draft) => {
      const existing = merged.get(draft.id);
      if (
        !existing ||
        new Date(draft.updatedAt) > new Date(existing.updatedAt)
      ) {
        merged.set(draft.id, draft);
      }
    });

    return Array.from(merged.values());
  }

  private static filterValidDrafts(drafts: SessionDraft[]): SessionDraft[] {
    const now = new Date();
    return drafts.filter((draft) => {
      // Check if not expired
      if (new Date(draft.expiresAt) < now) return false;

      // Check recovery attempts limit
      if (draft.recovery.recoveryAttempts >= this.options.maxRecoveryAttempts)
        return false;

      // Check if has meaningful data
      if (!draft.data || Object.keys(draft.data).length === 0) return false;

      return true;
    });
  }
}

export default SessionRecoveryService;

// Client-safe Session Recovery Service
// Provides browser-based session recovery without server dependencies

import { GuidedFlowData } from "@/lib/types/estimate-types";

export interface SessionDraft {
  id: string;
  estimateId: string;
  data: Partial<GuidedFlowData>;
  timestamp: number;
  tabId: string;
  pageUrl: string;
  isActive: boolean;
  lastActiveStep?: string;
  completedSteps?: string[];
  version: number;
}

export interface RecoveryState {
  status:
    | "idle"
    | "checking"
    | "available"
    | "recovering"
    | "recovered"
    | "error";
  message?: string;
  timestamp?: number;
}

export interface RecoveryOptions {
  maxDrafts: number;
  maxAge: number; // milliseconds
  checkInterval: number;
  mergeStrategy: "newest" | "mostComplete" | "manual";
}

export class SessionRecoveryServiceClient {
  private readonly STORAGE_KEY_PREFIX = "estimatepro_session_";
  private readonly TAB_ID_KEY = "estimatepro_tab_id";
  private readonly SESSION_META_KEY = "estimatepro_session_meta";

  private tabId: string;
  private checkInterval?: NodeJS.Timeout;

  private readonly defaultOptions: RecoveryOptions = {
    maxDrafts: 10,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    checkInterval: 5000, // 5 seconds
    mergeStrategy: "newest",
  };

  constructor() {
    this.tabId = this.getOrCreateTabId();
    this.startHeartbeat();

    // Clean up old sessions on initialization
    this.cleanupOldSessions();
  }

  // Get or create unique tab ID
  private getOrCreateTabId(): string {
    if (typeof window === "undefined") return "server";

    let tabId = sessionStorage.getItem(this.TAB_ID_KEY);
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(this.TAB_ID_KEY, tabId);
    }
    return tabId;
  }

  // Start heartbeat to mark tab as active
  private startHeartbeat(): void {
    if (typeof window === "undefined") return;

    this.updateTabActivity();
    setInterval(() => {
      this.updateTabActivity();
    }, 5000);
  }

  // Update tab activity timestamp
  private updateTabActivity(): void {
    const meta = this.getSessionMeta();
    meta[this.tabId] = {
      lastActive: Date.now(),
      url: window.location.href,
    };
    localStorage.setItem(this.SESSION_META_KEY, JSON.stringify(meta));
  }

  // Get session metadata
  private getSessionMeta(): Record<
    string,
    { lastActive: number; url: string }
  > {
    try {
      const meta = localStorage.getItem(this.SESSION_META_KEY);
      return meta ? JSON.parse(meta) : {};
    } catch {
      return {};
    }
  }

  // Save session draft
  async saveDraft(
    estimateId: string,
    data: Partial<GuidedFlowData>,
  ): Promise<void> {
    try {
      const draft: SessionDraft = {
        id: `${estimateId}_${this.tabId}_${Date.now()}`,
        estimateId,
        data,
        timestamp: Date.now(),
        tabId: this.tabId,
        pageUrl: window.location.href,
        isActive: true,
        lastActiveStep: data.currentStep,
        completedSteps: data.completedSteps || [],
        version: 1,
      };

      const key = `${this.STORAGE_KEY_PREFIX}${estimateId}_${this.tabId}`;
      localStorage.setItem(key, JSON.stringify(draft));

      // Cleanup old drafts
      this.cleanupOldDrafts(estimateId);
    } catch (error) {
      console.error("Failed to save session draft:", error);
    }
  }

  // Get available recovery drafts
  async getRecoverableDrafts(estimateId: string): Promise<SessionDraft[]> {
    const drafts: SessionDraft[] = [];
    const meta = this.getSessionMeta();
    const currentTime = Date.now();

    try {
      // Check all storage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(`${this.STORAGE_KEY_PREFIX}${estimateId}_`))
          continue;

        const draftStr = localStorage.getItem(key);
        if (!draftStr) continue;

        const draft = JSON.parse(draftStr) as SessionDraft;

        // Skip current tab's draft
        if (draft.tabId === this.tabId) continue;

        // Skip old drafts
        if (currentTime - draft.timestamp > this.defaultOptions.maxAge)
          continue;

        // Check if tab is still active
        const tabMeta = meta[draft.tabId];
        const isTabActive = tabMeta && currentTime - tabMeta.lastActive < 30000; // 30 seconds

        drafts.push({
          ...draft,
          isActive: isTabActive,
        });
      }

      // Sort by timestamp, newest first
      return drafts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Failed to get recoverable drafts:", error);
      return [];
    }
  }

  // Recover specific draft
  async recoverDraft(draftId: string): Promise<SessionDraft | null> {
    try {
      // Find the draft
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.STORAGE_KEY_PREFIX)) continue;

        const draftStr = localStorage.getItem(key);
        if (!draftStr) continue;

        const draft = JSON.parse(draftStr) as SessionDraft;
        if (draft.id === draftId) {
          return draft;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to recover draft:", error);
      return null;
    }
  }

  // Delete draft
  async deleteDraft(draftId: string): Promise<void> {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.STORAGE_KEY_PREFIX)) continue;

        const draftStr = localStorage.getItem(key);
        if (!draftStr) continue;

        const draft = JSON.parse(draftStr) as SessionDraft;
        if (draft.id === draftId) {
          localStorage.removeItem(key);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  }

  // Clear all drafts for an estimate
  async clearEstimateDrafts(estimateId: string): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${this.STORAGE_KEY_PREFIX}${estimateId}_`)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to clear estimate drafts:", error);
    }
  }

  // Cleanup old drafts
  private cleanupOldDrafts(estimateId: string): void {
    try {
      const drafts: Array<{ key: string; timestamp: number }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(`${this.STORAGE_KEY_PREFIX}${estimateId}_`))
          continue;

        const draftStr = localStorage.getItem(key);
        if (!draftStr) continue;

        const draft = JSON.parse(draftStr) as SessionDraft;
        drafts.push({ key, timestamp: draft.timestamp });
      }

      // Keep only the most recent drafts
      drafts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(this.defaultOptions.maxDrafts)
        .forEach(({ key }) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to cleanup old drafts:", error);
    }
  }

  // Cleanup old sessions on startup
  private cleanupOldSessions(): void {
    try {
      const currentTime = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.STORAGE_KEY_PREFIX)) continue;

        const draftStr = localStorage.getItem(key);
        if (!draftStr) continue;

        try {
          const draft = JSON.parse(draftStr) as SessionDraft;
          if (currentTime - draft.timestamp > this.defaultOptions.maxAge) {
            keysToRemove.push(key);
          }
        } catch {
          // Remove invalid drafts
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clean up old tab metadata
      const meta = this.getSessionMeta();
      const activeTabs: Record<string, any> = {};

      Object.entries(meta).forEach(([tabId, info]) => {
        if (currentTime - info.lastActive < this.defaultOptions.maxAge) {
          activeTabs[tabId] = info;
        }
      });

      localStorage.setItem(this.SESSION_META_KEY, JSON.stringify(activeTabs));
    } catch (error) {
      console.error("Failed to cleanup old sessions:", error);
    }
  }

  // Destroy service and cleanup
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Export singleton instance for client-side use
export const sessionRecoveryServiceClient = new SessionRecoveryServiceClient();

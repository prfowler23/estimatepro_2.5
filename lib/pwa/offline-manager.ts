// PHASE 3 FIX: Offline Manager for handling offline functionality
// Manages offline state, pending actions, and background sync

export interface OfflineAction {
  id: string;
  type: "estimate" | "customer" | "photo" | "generic";
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  metadata?: {
    estimateId?: string;
    customerId?: string;
    description?: string;
  };
}

export interface OfflineStatus {
  isOnline: boolean;
  pendingActions: number;
  lastSync: Date | null;
  syncInProgress: boolean;
  queueSize: number;
  storageUsed: number;
}

type OfflineStatusCallback = (status: OfflineStatus) => void;

export class OfflineManager {
  private static instance: OfflineManager;
  private isEnabled: boolean = true;
  private pendingActions: OfflineAction[] = [];
  private subscribers: Set<OfflineStatusCallback> = new Set();
  private syncInProgress: boolean = false;
  private lastSync: Date | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private storageKey = "estimatepro-offline-actions";

  private constructor() {
    this.loadPendingActions();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // Initialize offline manager
  initialize(): void {
    if (!this.isEnabled) return;

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Load pending actions from storage
    this.loadPendingActions();

    // If online, try to sync
    if (navigator.onLine) {
      this.sync();
    }
  }

  // Handle online event
  private handleOnline(): void {
    console.log("Offline Manager: Device is online");
    this.notifySubscribers();

    // Attempt to sync pending actions
    if (this.pendingActions.length > 0) {
      this.sync();
    }
  }

  // Handle offline event
  private handleOffline(): void {
    console.log("Offline Manager: Device is offline");
    this.notifySubscribers();
  }

  // Add action to offline queue
  addAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): string {
    const fullAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3,
    };

    this.pendingActions.push(fullAction);
    this.savePendingActions();
    this.notifySubscribers();

    console.log("Offline Manager: Added action to queue", fullAction.type);

    // If online, try to sync immediately
    if (navigator.onLine && !this.syncInProgress) {
      setTimeout(() => this.sync(), 100);
    }

    return fullAction.id;
  }

  // Remove action from queue
  removeAction(actionId: string): void {
    const index = this.pendingActions.findIndex(
      (action) => action.id === actionId,
    );
    if (index !== -1) {
      this.pendingActions.splice(index, 1);
      this.savePendingActions();
      this.notifySubscribers();
    }
  }

  // Get pending actions
  getPendingActions(): OfflineAction[] {
    return [...this.pendingActions];
  }

  // Get offline status
  getStatus(): OfflineStatus {
    return {
      isOnline: navigator.onLine,
      pendingActions: this.pendingActions.length,
      lastSync: this.lastSync,
      syncInProgress: this.syncInProgress,
      queueSize: this.pendingActions.length,
      storageUsed: this.getStorageSize(),
    };
  }

  // Sync pending actions
  async sync(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress || !this.isEnabled) {
      return;
    }

    if (this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifySubscribers();

    console.log(
      `Offline Manager: Starting sync of ${this.pendingActions.length} actions`,
    );

    const actionsToProcess = [...this.pendingActions];
    let syncedCount = 0;
    let failedCount = 0;

    for (const action of actionsToProcess) {
      try {
        const success = await this.processAction(action);

        if (success) {
          this.removeAction(action.id);
          syncedCount++;
        } else {
          // Increment retry count
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            console.error(
              `Offline Manager: Action ${action.id} exceeded max retries, removing`,
            );
            this.removeAction(action.id);
          }
          failedCount++;
        }

        // Small delay between requests to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Offline Manager: Failed to process action ${action.id}:`,
          error,
        );
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          this.removeAction(action.id);
        }
        failedCount++;
      }
    }

    this.syncInProgress = false;
    this.lastSync = new Date();
    this.savePendingActions();
    this.notifySubscribers();

    console.log(
      `Offline Manager: Sync complete. Synced: ${syncedCount}, Failed: ${failedCount}`,
    );

    // Schedule retry for failed actions if any remain
    if (this.pendingActions.length > 0) {
      this.scheduleRetry();
    }
  }

  // Process a single offline action
  private async processAction(action: OfflineAction): Promise<boolean> {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          ...action.data.headers,
        },
        body: action.method !== "GET" ? JSON.stringify(action.data) : undefined,
      });

      if (response.ok) {
        console.log(
          `Offline Manager: Successfully synced ${action.type} action`,
        );
        return true;
      } else {
        console.error(
          `Offline Manager: Failed to sync action ${action.id}:`,
          response.statusText,
        );
        return false;
      }
    } catch (error) {
      console.error(
        `Offline Manager: Network error syncing action ${action.id}:`,
        error,
      );
      return false;
    }
  }

  // Schedule retry for failed actions
  private scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff: start with 30 seconds, double each time
    const baseDelay = 30 * 1000;
    const maxRetries = Math.max(
      ...this.pendingActions.map((a) => a.retryCount),
    );
    const delay = Math.min(baseDelay * Math.pow(2, maxRetries), 5 * 60 * 1000); // Max 5 minutes

    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine && this.pendingActions.length > 0) {
        this.sync();
      }
    }, delay);
  }

  // Subscribe to status changes
  subscribe(callback: OfflineStatusCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify all subscribers of status change
  private notifySubscribers(): void {
    const status = this.getStatus();
    this.subscribers.forEach((callback) => callback(status));
  }

  // Save pending actions to localStorage
  private savePendingActions(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }

      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.pendingActions),
      );
    } catch (error) {
      console.error("Offline Manager: Failed to save pending actions:", error);
    }
  }

  // Load pending actions from localStorage
  private loadPendingActions(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !window.localStorage) {
        this.pendingActions = [];
        return;
      }

      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.pendingActions = JSON.parse(stored);
        console.log(
          `Offline Manager: Loaded ${this.pendingActions.length} pending actions`,
        );
      }
    } catch (error) {
      console.error("Offline Manager: Failed to load pending actions:", error);
      this.pendingActions = [];
    }
  }

  // Get storage size estimate
  private getStorageSize(): number {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !window.localStorage) {
        return 0;
      }

      const data = localStorage.getItem(this.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  // Generate unique ID for actions
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Enable/disable offline functionality
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      // Clear pending actions when disabled
      this.pendingActions = [];
      this.savePendingActions();
      this.notifySubscribers();
    }
  }

  // Clear all pending actions
  clearPendingActions(): void {
    this.pendingActions = [];
    this.savePendingActions();
    this.notifySubscribers();
  }

  // Cleanup
  destroy(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    this.subscribers.clear();
  }
}

// Global offline manager instance
export const offlineManager = OfflineManager.getInstance();

// Helper functions for common offline operations
export const offlineUtils = {
  // Queue estimate save for offline sync
  queueEstimateSave: (estimateId: string, data: any) => {
    return offlineManager.addAction({
      type: "estimate",
      endpoint: `/api/estimates/${estimateId}`,
      method: "PUT",
      data,
      maxRetries: 3,
      metadata: { estimateId, description: "Save estimate" },
    });
  },

  // Queue customer save for offline sync
  queueCustomerSave: (customerId: string, data: any) => {
    return offlineManager.addAction({
      type: "customer",
      endpoint: `/api/customers/${customerId}`,
      method: "PUT",
      data,
      maxRetries: 3,
      metadata: { customerId, description: "Save customer" },
    });
  },

  // Queue photo upload for offline sync
  queuePhotoUpload: (estimateId: string, photoData: any) => {
    return offlineManager.addAction({
      type: "photo",
      endpoint: `/api/estimates/${estimateId}/photos`,
      method: "POST",
      data: photoData,
      maxRetries: 5,
      metadata: { estimateId, description: "Upload photo" },
    });
  },

  // Queue generic API call for offline sync
  queueApiCall: (
    endpoint: string,
    method: string,
    data: any,
    description?: string,
  ) => {
    return offlineManager.addAction({
      type: "generic",
      endpoint,
      method,
      data,
      maxRetries: 3,
      metadata: { description: description || "API call" },
    });
  },
};

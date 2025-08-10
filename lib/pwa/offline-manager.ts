// PHASE 3 FIX: Offline Manager for handling offline functionality
// Manages offline state, pending actions, and background sync

import { ActionType } from "./types";
import type {
  OfflineAction,
  OfflineStatus,
  isOfflineAction,
  OfflineError,
} from "./types";

type OfflineStatusCallback = (status: OfflineStatus) => void;

// Constants for performance optimization
const MAX_BATCH_SIZE = 10;
const MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes
const BASE_RETRY_DELAY = 30 * 1000; // 30 seconds
const JITTER_FACTOR = 0.3; // 30% jitter for retry backoff
const REQUEST_TIMEOUT = 10000; // 10 seconds
const BATCH_DELAY = 100; // 100ms between batch items

export class OfflineManager {
  private static instance: OfflineManager;
  private isEnabled: boolean = true;
  private pendingActions: OfflineAction[] = [];
  private subscribers: Set<OfflineStatusCallback> = new Set();
  private syncInProgress: boolean = false;
  private lastSync: Date | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private storageKey = "estimatepro-offline-actions";
  private requestDeduplication: Map<string, string> = new Map();
  private batchQueue: OfflineAction[][] = [];
  private compressionUtils: any = null; // Will be lazily loaded

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

  // Add action to offline queue with deduplication
  addAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): string {
    // Check for duplicate requests
    const dedupeKey = this.generateDeduplicationKey(action);
    const existingId = this.requestDeduplication.get(dedupeKey);

    if (existingId) {
      const existingAction = this.pendingActions.find(
        (a) => a.id === existingId,
      );
      if (existingAction && Date.now() - existingAction.timestamp < 5000) {
        console.log(
          "Offline Manager: Duplicate action detected, skipping",
          action.type,
        );
        return existingId;
      }
    }

    const fullAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3,
    };

    this.pendingActions.push(fullAction);
    this.requestDeduplication.set(dedupeKey, fullAction.id);

    // Batch save operations
    this.batchSavePendingActions();
    this.notifySubscribers();

    console.log("Offline Manager: Added action to queue", fullAction.type);

    // If online, try to sync immediately with batching
    if (navigator.onLine && !this.syncInProgress) {
      this.scheduleBatchSync();
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

  // Sync pending actions with batching
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
      `Offline Manager: Starting batch sync of ${this.pendingActions.length} actions`,
    );

    // Create batches of actions
    const batches = this.createBatches(this.pendingActions);
    let totalSynced = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      const results = await this.processBatch(batch);
      totalSynced += results.synced;
      totalFailed += results.failed;

      // Small delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    this.syncInProgress = false;
    this.lastSync = new Date();
    this.batchSavePendingActions();
    this.notifySubscribers();

    console.log(
      `Offline Manager: Batch sync complete. Synced: ${totalSynced}, Failed: ${totalFailed}`,
    );

    // Schedule retry for failed actions if any remain
    if (this.pendingActions.length > 0) {
      this.scheduleRetryWithJitter();
    }
  }

  // Process a single offline action with timeout
  private async processAction(action: OfflineAction): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          ...action.data.headers,
        },
        body:
          action.method !== "GET"
            ? await this.compressPayload(action.data)
            : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

  // Schedule retry with jitter for failed actions
  private scheduleRetryWithJitter(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff with jitter
    const maxRetries = Math.max(
      ...this.pendingActions.map((a) => a.retryCount),
      0,
    );
    const baseDelay = Math.min(
      BASE_RETRY_DELAY * Math.pow(2, maxRetries),
      MAX_RETRY_DELAY,
    );

    // Add jitter to prevent thundering herd
    const jitter = baseDelay * JITTER_FACTOR * (Math.random() - 0.5);
    const delay = Math.max(baseDelay + jitter, 1000);

    console.log(
      `Offline Manager: Scheduling retry in ${Math.round(delay / 1000)}s`,
    );

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

  // Batch save pending actions to localStorage
  private batchSaveTimeout: NodeJS.Timeout | null = null;
  private batchSavePendingActions(): void {
    // Clear existing timeout
    if (this.batchSaveTimeout) {
      clearTimeout(this.batchSaveTimeout);
    }

    // Batch saves to reduce localStorage writes
    this.batchSaveTimeout = setTimeout(() => {
      this.savePendingActions();
    }, 50);
  }

  // Save pending actions to localStorage with compression
  private async savePendingActions(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }

      const data = JSON.stringify(this.pendingActions);

      // Compress if data is large
      if (data.length > 5000) {
        const compressed = await this.compressData(data);
        localStorage.setItem(this.storageKey, compressed);
        localStorage.setItem(this.storageKey + "-compressed", "true");
      } else {
        localStorage.setItem(this.storageKey, data);
        localStorage.removeItem(this.storageKey + "-compressed");
      }
    } catch (error) {
      console.error("Offline Manager: Failed to save pending actions:", error);
    }
  }

  // Load pending actions from localStorage with decompression
  private async loadPendingActions(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || !window.localStorage) {
        this.pendingActions = [];
        return;
      }

      const stored = localStorage.getItem(this.storageKey);
      const isCompressed =
        localStorage.getItem(this.storageKey + "-compressed") === "true";

      if (stored) {
        let data = stored;
        if (isCompressed) {
          data = await this.decompressData(stored);
        }

        this.pendingActions = JSON.parse(data);

        // Rebuild deduplication map
        this.pendingActions.forEach((action) => {
          const key = this.generateDeduplicationKey(action);
          this.requestDeduplication.set(key, action.id);
        });

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

  // Helper methods for optimization
  private generateDeduplicationKey(action: Partial<OfflineAction>): string {
    return `${action.type}-${action.method}-${action.endpoint}-${JSON.stringify(action.data || {})}`;
  }

  private createBatches(actions: OfflineAction[]): OfflineAction[][] {
    const batches: OfflineAction[][] = [];
    for (let i = 0; i < actions.length; i += MAX_BATCH_SIZE) {
      batches.push(actions.slice(i, i + MAX_BATCH_SIZE));
    }
    return batches;
  }

  private async processBatch(
    batch: OfflineAction[],
  ): Promise<{ synced: number; failed: number }> {
    const results = await Promise.allSettled(
      batch.map((action) => this.processAction(action)),
    );

    let synced = 0;
    let failed = 0;

    results.forEach((result, index) => {
      const action = batch[index];
      if (result.status === "fulfilled" && result.value) {
        this.removeAction(action.id);
        synced++;
      } else {
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          console.error(
            `Offline Manager: Action ${action.id} exceeded max retries`,
          );
          this.removeAction(action.id);
        }
        failed++;
      }
    });

    return { synced, failed };
  }

  private scheduleBatchSync(): void {
    if (!this.syncInProgress) {
      setTimeout(() => this.sync(), 100);
    }
  }

  private async compressPayload(data: any): Promise<string | undefined> {
    const jsonData = JSON.stringify(data);

    // Only compress large payloads
    if (jsonData.length < 1000) {
      return jsonData;
    }

    try {
      // Lazy load compression utils
      if (!this.compressionUtils) {
        const { CompressionUtils } = await import("../cache/compression-utils");
        this.compressionUtils = new CompressionUtils({
          threshold: 1000,
          algorithm: "gzip",
          level: 6,
        });
      }

      const result = await this.compressionUtils.compress(data);
      return result.data.toString("base64");
    } catch (error) {
      console.warn("Failed to compress payload, using uncompressed", error);
      return jsonData;
    }
  }

  private async compressData(data: string): Promise<string> {
    try {
      // Simple compression using browser's CompressionStream API if available
      if ("CompressionStream" in globalThis) {
        const encoder = new TextEncoder();
        const stream = new Response(
          new Blob([encoder.encode(data)])
            .stream()
            .pipeThrough(new (globalThis as any).CompressionStream("gzip")),
        );
        const blob = await stream.blob();
        const buffer = await blob.arrayBuffer();
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }
    } catch (error) {
      console.warn("Compression failed, using raw data", error);
    }
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    try {
      // Decompress using browser's DecompressionStream API if available
      if ("DecompressionStream" in globalThis) {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const stream = new Response(
          new Blob([bytes])
            .stream()
            .pipeThrough(new (globalThis as any).DecompressionStream("gzip")),
        );
        return await stream.text();
      }
    } catch (error) {
      console.warn("Decompression failed, trying raw data", error);
    }
    return data;
  }

  // Enhanced cleanup
  destroy(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.batchSaveTimeout) {
      clearTimeout(this.batchSaveTimeout);
      this.batchSaveTimeout = null;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    this.subscribers.clear();
    this.requestDeduplication.clear();
    this.batchQueue = [];
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

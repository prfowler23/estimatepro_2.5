// Offline Manager
// Manages offline functionality, data synchronization, and offline actions

import { performanceMonitor } from "@/lib/performance/performance-monitor";

// Offline action types
export interface OfflineAction {
  id: string;
  type: "create" | "update" | "delete";
  resource: "estimate" | "customer" | "photo" | "calculation";
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

// Offline status
export interface OfflineStatus {
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  isServiceWorkerRegistered: boolean;
  pendingActions: number;
  lastSync: number | null;
  syncInProgress: boolean;
}

// Offline configuration
export interface OfflineConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  maxCacheSize: number;
  enableBackgroundSync: boolean;
  enableNotifications: boolean;
}

// Default configuration
const DEFAULT_CONFIG: OfflineConfig = {
  enabled: true,
  maxRetries: 3,
  retryDelay: 5000,
  syncInterval: 30000,
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  enableBackgroundSync: true,
  enableNotifications: true,
};

// Offline Manager
export class OfflineManager {
  private static instance: OfflineManager;
  private config: OfflineConfig;
  private status: OfflineStatus;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private pendingActions: Map<string, OfflineAction> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<(status: OfflineStatus) => void> = new Set();

  private constructor(config: OfflineConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.status = {
      isOnline: navigator.onLine,
      isServiceWorkerSupported: "serviceWorker" in navigator,
      isServiceWorkerRegistered: false,
      pendingActions: 0,
      lastSync: null,
      syncInProgress: false,
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  static getInstance(config?: OfflineConfig): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(config);
    }
    return OfflineManager.instance;
  }

  private async initialize(): Promise<void> {
    // Register service worker
    if (this.status.isServiceWorkerSupported) {
      await this.registerServiceWorker();
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load pending actions from storage
    await this.loadPendingActions();

    // Start sync timer
    this.startSyncTimer();

    // Initial sync if online
    if (this.status.isOnline) {
      await this.sync();
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.serviceWorker = await navigator.serviceWorker.register("/sw.js");
      this.status.isServiceWorkerRegistered = true;

      console.log("Service Worker registered successfully");

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        this.handleServiceWorkerMessage(event);
      });
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener("online", () => {
      this.status.isOnline = true;
      this.notifySubscribers();
      this.sync();
    });

    window.addEventListener("offline", () => {
      this.status.isOnline = false;
      this.notifySubscribers();
    });

    // Page visibility change
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.status.isOnline) {
        this.sync();
      }
    });
  }

  private async loadPendingActions(): Promise<void> {
    try {
      const stored = localStorage.getItem("offline-actions");
      if (stored) {
        const actions = JSON.parse(stored);
        for (const action of actions) {
          this.pendingActions.set(action.id, action);
        }
        this.status.pendingActions = this.pendingActions.size;
      }
    } catch (error) {
      console.error("Failed to load pending actions:", error);
    }
  }

  private async savePendingActions(): Promise<void> {
    try {
      const actions = Array.from(this.pendingActions.values());
      localStorage.setItem("offline-actions", JSON.stringify(actions));
    } catch (error) {
      console.error("Failed to save pending actions:", error);
    }
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.status.isOnline && !this.status.syncInProgress) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case "SYNC_COMPLETE":
        this.status.lastSync = Date.now();
        this.status.syncInProgress = false;
        this.notifySubscribers();
        break;
      case "SYNC_FAILED":
        this.status.syncInProgress = false;
        this.notifySubscribers();
        break;
      case "CACHE_UPDATED":
        this.notifySubscribers();
        break;
    }
  }

  // Add offline action
  async addOfflineAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.pendingActions.set(offlineAction.id, offlineAction);
    this.status.pendingActions = this.pendingActions.size;

    await this.savePendingActions();
    this.notifySubscribers();

    // Try to sync immediately if online
    if (this.status.isOnline) {
      await this.sync();
    }
  }

  // Remove offline action
  async removeOfflineAction(actionId: string): Promise<void> {
    this.pendingActions.delete(actionId);
    this.status.pendingActions = this.pendingActions.size;

    await this.savePendingActions();
    this.notifySubscribers();
  }

  // Sync all pending actions
  async sync(): Promise<void> {
    if (!this.status.isOnline || this.status.syncInProgress) {
      return;
    }

    this.status.syncInProgress = true;
    this.notifySubscribers();

    const actions = Array.from(this.pendingActions.values());
    const syncPromises = actions.map((action) => this.syncAction(action));

    try {
      await Promise.allSettled(syncPromises);
      this.status.lastSync = Date.now();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.status.syncInProgress = false;
      this.notifySubscribers();
    }
  }

  // Sync individual action
  private async syncAction(action: OfflineAction): Promise<void> {
    try {
      const response = await performanceMonitor.measure(
        `offline-sync-${action.type}-${action.resource}`,
        "api",
        () => this.executeAction(action),
      );

      if (response.ok) {
        await this.removeOfflineAction(action.id);
        console.log(`Offline action synced: ${action.type} ${action.resource}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);

      action.retryCount++;

      if (action.retryCount >= action.maxRetries) {
        console.error(`Max retries reached for action ${action.id}, removing`);
        await this.removeOfflineAction(action.id);
      } else {
        // Update retry count
        this.pendingActions.set(action.id, action);
        await this.savePendingActions();

        // Schedule retry
        setTimeout(() => {
          if (this.status.isOnline) {
            this.syncAction(action);
          }
        }, this.config.retryDelay * action.retryCount);
      }
    }
  }

  // Execute offline action
  private async executeAction(action: OfflineAction): Promise<Response> {
    const { type, resource, data } = action;

    // Custom URL and method if provided
    if (action.url && action.method) {
      return fetch(action.url, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          ...action.headers,
        },
        body: JSON.stringify(data),
      });
    }

    // Default API endpoints
    const endpoints = {
      estimate: "/api/estimates",
      customer: "/api/customers",
      photo: "/api/photos",
      calculation: "/api/calculations",
    };

    const baseUrl = endpoints[resource];
    if (!baseUrl) {
      throw new Error(`Unknown resource: ${resource}`);
    }

    let url = baseUrl;
    let method = "POST";

    if (type === "update") {
      url = `${baseUrl}/${data.id}`;
      method = "PUT";
    } else if (type === "delete") {
      url = `${baseUrl}/${data.id}`;
      method = "DELETE";
    }

    return fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...action.headers,
      },
      body: type !== "delete" ? JSON.stringify(data) : undefined,
    });
  }

  // Cache data for offline access
  async cacheData(key: string, data: any): Promise<void> {
    if (!this.serviceWorker) return;

    try {
      this.serviceWorker.active?.postMessage({
        type: "CACHE_DATA",
        payload: { key, data },
      });
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  }

  // Get cached data
  async getCachedData(key: string): Promise<any> {
    if (!this.serviceWorker) return null;

    try {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        this.serviceWorker!.active?.postMessage(
          {
            type: "GET_CACHED_DATA",
            payload: { key },
          },
          [channel.port2],
        );
      });
    } catch (error) {
      console.error("Failed to get cached data:", error);
      return null;
    }
  }

  // Clear cache
  async clearCache(): Promise<void> {
    if (!this.serviceWorker) return;

    try {
      this.serviceWorker.active?.postMessage({
        type: "CLEAR_CACHE",
      });
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  // Get cache status
  async getCacheStatus(): Promise<any> {
    if (!this.serviceWorker) return null;

    try {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        this.serviceWorker!.active?.postMessage(
          {
            type: "GET_CACHE_STATUS",
          },
          [channel.port2],
        );
      });
    } catch (error) {
      console.error("Failed to get cache status:", error);
      return null;
    }
  }

  // Subscribe to status changes
  subscribe(callback: (status: OfflineStatus) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Get current status
  getStatus(): OfflineStatus {
    return { ...this.status };
  }

  // Get pending actions
  getPendingActions(): OfflineAction[] {
    return Array.from(this.pendingActions.values());
  }

  // Clear all pending actions
  async clearPendingActions(): Promise<void> {
    this.pendingActions.clear();
    this.status.pendingActions = 0;
    await this.savePendingActions();
    this.notifySubscribers();
  }

  // Enable/disable offline functionality
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (enabled) {
      this.initialize();
    } else {
      this.cleanup();
    }
  }

  // Cleanup resources
  private cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.subscribers.clear();
    this.pendingActions.clear();
  }

  // Notify subscribers
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback(this.status));
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global offline manager instance
export const offlineManager = OfflineManager.getInstance();

// Offline-aware API helpers
export const offlineAPI = {
  // Create estimate offline
  createEstimate: async (estimate: any) => {
    if (offlineManager.getStatus().isOnline) {
      try {
        const response = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(estimate),
        });
        return await response.json();
      } catch (error) {
        // Fallback to offline
        await offlineManager.addOfflineAction({
          type: "create",
          resource: "estimate",
          data: estimate,
          maxRetries: 3,
        });
        return { ...estimate, id: `offline-${Date.now()}`, offline: true };
      }
    } else {
      await offlineManager.addOfflineAction({
        type: "create",
        resource: "estimate",
        data: estimate,
        maxRetries: 3,
      });
      return { ...estimate, id: `offline-${Date.now()}`, offline: true };
    }
  },

  // Update estimate offline
  updateEstimate: async (id: string, estimate: any) => {
    if (offlineManager.getStatus().isOnline) {
      try {
        const response = await fetch(`/api/estimates/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(estimate),
        });
        return await response.json();
      } catch (error) {
        await offlineManager.addOfflineAction({
          type: "update",
          resource: "estimate",
          data: { ...estimate, id },
          maxRetries: 3,
        });
        return { ...estimate, id, offline: true };
      }
    } else {
      await offlineManager.addOfflineAction({
        type: "update",
        resource: "estimate",
        data: { ...estimate, id },
        maxRetries: 3,
      });
      return { ...estimate, id, offline: true };
    }
  },

  // Delete estimate offline
  deleteEstimate: async (id: string) => {
    if (offlineManager.getStatus().isOnline) {
      try {
        const response = await fetch(`/api/estimates/${id}`, {
          method: "DELETE",
        });
        return await response.json();
      } catch (error) {
        await offlineManager.addOfflineAction({
          type: "delete",
          resource: "estimate",
          data: { id },
          maxRetries: 3,
        });
        return { id, deleted: true, offline: true };
      }
    } else {
      await offlineManager.addOfflineAction({
        type: "delete",
        resource: "estimate",
        data: { id },
        maxRetries: 3,
      });
      return { id, deleted: true, offline: true };
    }
  },
};

export default offlineManager;

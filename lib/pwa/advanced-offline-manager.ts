/**
 * Advanced Offline Manager
 * Intelligent offline functionality with smart sync and conflict resolution
 */

import { offlineManager } from "./offline-manager";

interface OfflineOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: string;
  data: any;
  timestamp: number;
  retries: number;
  priority: "low" | "normal" | "high" | "critical";
  dependencies?: string[];
}

interface SyncStrategy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

export class AdvancedOfflineManager {
  private static instance: AdvancedOfflineManager;
  private operationQueue: Map<string, OfflineOperation> = new Map();
  private syncInProgress: boolean = false;
  private syncStrategies: Map<string, SyncStrategy> = new Map();
  private conflictResolvers: Map<string, (local: any, remote: any) => any> =
    new Map();

  private constructor() {
    this.initializeSyncStrategies();
    this.initializeConflictResolvers();
    this.setupEventListeners();
  }

  static getInstance(): AdvancedOfflineManager {
    if (!AdvancedOfflineManager.instance) {
      AdvancedOfflineManager.instance = new AdvancedOfflineManager();
    }
    return AdvancedOfflineManager.instance;
  }

  private initializeSyncStrategies(): void {
    // Critical operations (estimates, calculations)
    this.syncStrategies.set("critical", {
      maxRetries: 10,
      retryDelay: 1000,
      backoffMultiplier: 2,
      timeout: 30000,
    });

    // Normal operations (photos, notes)
    this.syncStrategies.set("normal", {
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 1.5,
      timeout: 15000,
    });

    // Low priority operations (analytics, logs)
    this.syncStrategies.set("low", {
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 1.2,
      timeout: 10000,
    });
  }

  private initializeConflictResolvers(): void {
    // Estimate conflict resolver - merge with timestamp priority
    this.conflictResolvers.set("estimates", (local, remote) => {
      const localTimestamp = new Date(local.updated_at).getTime();
      const remoteTimestamp = new Date(remote.updated_at).getTime();

      if (localTimestamp > remoteTimestamp) {
        return { ...remote, ...local, conflict_resolved: true };
      }
      return remote;
    });

    // Photo conflict resolver - keep both versions
    this.conflictResolvers.set("photos", (local, remote) => ({
      ...remote,
      variants: [...(remote.variants || []), local],
    }));

    // Notes conflict resolver - concatenate content
    this.conflictResolvers.set("notes", (local, remote) => ({
      ...remote,
      content: remote.content + "\n\n--- Offline changes ---\n" + local.content,
    }));
  }

  private setupEventListeners(): void {
    // Listen for online events
    window.addEventListener("online", () => {
      this.log("Connection restored, starting sync...", "info");
      this.syncPendingOperations();
    });

    // Listen for app visibility changes
    document.addEventListener("visibilitychange", () => {
      if (
        !document.hidden &&
        navigator.onLine &&
        this.operationQueue.size > 0
      ) {
        this.syncPendingOperations();
      }
    });
  }

  // Queue operation for offline sync
  async queueOperation(
    operation: Omit<OfflineOperation, "id" | "timestamp" | "retries">,
  ): Promise<string> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedOperation: OfflineOperation = {
      id,
      timestamp: Date.now(),
      retries: 0,
      ...operation,
    };

    this.operationQueue.set(id, queuedOperation);

    // Persist to local storage
    await this.persistQueue();

    // Try immediate sync if online
    if (navigator.onLine) {
      await this.syncOperation(queuedOperation);
    }

    return id;
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    this.log(`Starting sync of ${this.operationQueue.size} operations`, "info");

    try {
      // Sort operations by priority and dependencies
      const sortedOperations = this.sortOperationsByPriority();

      for (const operation of sortedOperations) {
        await this.syncOperation(operation);
      }

      this.log("Sync completed successfully", "success");
    } catch (error) {
      this.log(`Sync failed: ${error.message}`, "error");
    } finally {
      this.syncInProgress = false;
      await this.persistQueue();
    }
  }

  private sortOperationsByPriority(): OfflineOperation[] {
    const operations = Array.from(this.operationQueue.values());

    return operations.sort((a, b) => {
      // Priority order
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  private async syncOperation(operation: OfflineOperation): Promise<void> {
    const strategy =
      this.syncStrategies.get(operation.priority) ||
      this.syncStrategies.get("normal")!;

    try {
      await this.executeOperation(operation, strategy);
      this.operationQueue.delete(operation.id);
      this.log(`Operation ${operation.id} synced successfully`, "success");
    } catch (error) {
      operation.retries++;

      if (operation.retries >= strategy.maxRetries) {
        this.log(
          `Operation ${operation.id} failed permanently after ${operation.retries} retries`,
          "error",
        );
        this.operationQueue.delete(operation.id);
        await this.handleFailedOperation(operation, error);
      } else {
        this.log(
          `Operation ${operation.id} failed, will retry (${operation.retries}/${strategy.maxRetries})`,
          "warning",
        );

        // Schedule retry with backoff
        const delay =
          strategy.retryDelay *
          Math.pow(strategy.backoffMultiplier, operation.retries - 1);
        setTimeout(() => this.syncOperation(operation), delay);
      }
    }
  }

  private async executeOperation(
    operation: OfflineOperation,
    strategy: SyncStrategy,
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

    try {
      let url = `/api/${operation.entity}`;
      let options: RequestInit = {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      };

      switch (operation.type) {
        case "create":
          options.method = "POST";
          options.body = JSON.stringify(operation.data);
          break;

        case "update":
          url += `/${operation.data.id}`;
          options.method = "PUT";
          options.body = JSON.stringify(operation.data);
          break;

        case "delete":
          url += `/${operation.data.id}`;
          options.method = "DELETE";
          break;
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 409) {
          // Handle conflict
          await this.handleConflict(operation, response);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleConflict(
    operation: OfflineOperation,
    response: Response,
  ): Promise<void> {
    const remoteData = await response.json();
    const resolver = this.conflictResolvers.get(operation.entity);

    if (resolver) {
      const resolved = resolver(operation.data, remoteData);

      // Update operation with resolved data
      operation.data = resolved;
      operation.type = "update";

      this.log(`Conflict resolved for operation ${operation.id}`, "info");
    } else {
      // No resolver available, use remote version
      this.log(
        `No conflict resolver for ${operation.entity}, using remote version`,
        "warning",
      );
    }
  }

  private async handleFailedOperation(
    operation: OfflineOperation,
    error: any,
  ): Promise<void> {
    // Store failed operation for manual review
    const failedOp = {
      ...operation,
      error: error.message,
      failedAt: new Date().toISOString(),
    };

    const failedOps = JSON.parse(
      localStorage.getItem("pwa-failed-operations") || "[]",
    );
    failedOps.push(failedOp);
    localStorage.setItem("pwa-failed-operations", JSON.stringify(failedOps));

    // Notify user about failed operation
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Sync Failed", {
        body: `Failed to sync ${operation.entity} operation`,
        icon: "/icon-192x192.svg",
        badge: "/icon-72x72.svg",
      });
    }
  }

  private async persistQueue(): Promise<void> {
    const operations = Array.from(this.operationQueue.values());
    localStorage.setItem("pwa-operation-queue", JSON.stringify(operations));
  }

  async loadPersistedQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem("pwa-operation-queue");
      if (stored) {
        const operations: OfflineOperation[] = JSON.parse(stored);
        this.operationQueue.clear();

        operations.forEach((op) => {
          this.operationQueue.set(op.id, op);
        });

        this.log(`Loaded ${operations.length} persisted operations`, "info");
      }
    } catch (error) {
      this.log(`Failed to load persisted queue: ${error.message}`, "error");
    }
  }

  // Get queue statistics
  getQueueStats(): {
    total: number;
    byPriority: Record<string, number>;
    oldestOperation: Date | null;
  } {
    const operations = Array.from(this.operationQueue.values());
    const stats = {
      total: operations.length,
      byPriority: { critical: 0, high: 0, normal: 0, low: 0 },
      oldestOperation: null as Date | null,
    };

    operations.forEach((op) => {
      stats.byPriority[op.priority]++;

      const opDate = new Date(op.timestamp);
      if (!stats.oldestOperation || opDate < stats.oldestOperation) {
        stats.oldestOperation = opDate;
      }
    });

    return stats;
  }

  // Clear failed operations
  clearFailedOperations(): void {
    localStorage.removeItem("pwa-failed-operations");
    this.log("Failed operations cleared", "info");
  }

  private log(message: string, level: string): void {
    console.log(`[AdvancedOfflineManager] ${message}`);
  }
}

export const advancedOfflineManager = AdvancedOfflineManager.getInstance();

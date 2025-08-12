/**
 * Background Sync Manager
 * Handles background synchronization of critical operations
 */

import { advancedOfflineManager } from "./advanced-offline-manager";

interface SyncTask {
  id: string;
  name: string;
  data: any;
  priority: "low" | "normal" | "high" | "critical";
  maxRetries: number;
  retryCount: number;
  createdAt: number;
  lastAttempt?: number;
}

interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private syncTasks: Map<string, SyncTask> = new Map();
  private syncHandlers: Map<string, (data: any) => Promise<SyncResult>> =
    new Map();

  private constructor() {
    this.initializeSyncHandlers();
    this.setupMessageHandlers();
  }

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    this.serviceWorkerRegistration = registration;

    // Load persisted sync tasks
    await this.loadPersistedTasks();

    this.log("Background sync manager initialized", "info");
  }

  private initializeSyncHandlers(): void {
    // Estimate sync handler
    this.syncHandlers.set("sync-estimates", async (data) => {
      try {
        const response = await fetch("/api/estimates/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Photo upload sync handler
    this.syncHandlers.set("sync-photos", async (data) => {
      try {
        const formData = new FormData();

        // Reconstruct photos from stored data
        for (const photo of data.photos) {
          const blob = await this.base64ToBlob(photo.data, photo.type);
          formData.append("photos", blob, photo.name);
        }

        formData.append("estimateId", data.estimateId);

        const response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Analytics sync handler
    this.syncHandlers.set("sync-analytics", async (data) => {
      try {
        const response = await fetch("/api/analytics/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: data.events }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Calculation sync handler
    this.syncHandlers.set("sync-calculations", async (data) => {
      try {
        await advancedOfflineManager.queueOperation({
          type: "update",
          entity: "calculations",
          data: data.calculations,
          priority: "high",
        });

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  // Schedule background sync
  async scheduleSync(
    name: string,
    data: any,
    priority: "low" | "normal" | "high" | "critical" = "normal",
  ): Promise<string> {
    if (!this.serviceWorkerRegistration) {
      throw new Error("Service Worker not registered");
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: SyncTask = {
      id: taskId,
      name,
      data,
      priority,
      maxRetries: this.getMaxRetriesForPriority(priority),
      retryCount: 0,
      createdAt: Date.now(),
    };

    this.syncTasks.set(taskId, task);
    await this.persistTasks();

    try {
      // Register background sync
      await this.serviceWorkerRegistration.sync.register(`bg-sync-${name}`);
      this.log(`Background sync scheduled: ${name}`, "info");
    } catch (error) {
      this.log(`Failed to register background sync: ${error.message}`, "error");

      // Fallback: try immediate sync if online
      if (navigator.onLine) {
        await this.executeSync(task);
      }
    }

    return taskId;
  }

  private getMaxRetriesForPriority(priority: string): number {
    switch (priority) {
      case "critical":
        return 10;
      case "high":
        return 7;
      case "normal":
        return 5;
      case "low":
        return 3;
      default:
        return 5;
    }
  }

  // Execute sync task
  async executeSync(task: SyncTask): Promise<SyncResult> {
    const handler = this.syncHandlers.get(task.name);

    if (!handler) {
      const error = `No handler found for sync task: ${task.name}`;
      this.log(error, "error");
      return { success: false, error };
    }

    task.lastAttempt = Date.now();
    task.retryCount++;

    try {
      const result = await handler(task.data);

      if (result.success) {
        this.syncTasks.delete(task.id);
        this.log(`Sync task completed: ${task.name}`, "success");
      } else {
        if (task.retryCount >= task.maxRetries) {
          this.syncTasks.delete(task.id);
          this.log(`Sync task failed permanently: ${task.name}`, "error");
        } else {
          this.log(
            `Sync task failed, will retry: ${task.name} (${task.retryCount}/${task.maxRetries})`,
            "warning",
          );
        }
      }

      await this.persistTasks();
      return result;
    } catch (error) {
      const result = { success: false, error: error.message };

      if (task.retryCount >= task.maxRetries) {
        this.syncTasks.delete(task.id);
        this.log(`Sync task failed permanently: ${task.name}`, "error");
      }

      await this.persistTasks();
      return result;
    }
  }

  // Execute all pending sync tasks
  async executeAllSyncs(): Promise<void> {
    if (!navigator.onLine) {
      this.log("Device offline, skipping sync execution", "info");
      return;
    }

    const tasks = Array.from(this.syncTasks.values()).sort((a, b) => {
      // Sort by priority and creation time
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.createdAt - b.createdAt;
    });

    this.log(`Executing ${tasks.length} sync tasks`, "info");

    for (const task of tasks) {
      await this.executeSync(task);
    }

    this.log("All sync tasks processed", "success");
  }

  private setupMessageHandlers(): void {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, data } = event.data;

        if (type === "BACKGROUND_SYNC") {
          this.handleBackgroundSync(data);
        }
      });
    }
  }

  private async handleBackgroundSync(data: any): Promise<void> {
    const { tag } = data;

    // Extract sync name from tag
    const syncName = tag.replace("bg-sync-", "");

    // Find and execute matching tasks
    const matchingTasks = Array.from(this.syncTasks.values()).filter(
      (task) => task.name === syncName,
    );

    for (const task of matchingTasks) {
      await this.executeSync(task);
    }
  }

  private async persistTasks(): Promise<void> {
    const tasks = Array.from(this.syncTasks.values());
    localStorage.setItem("pwa-sync-tasks", JSON.stringify(tasks));
  }

  private async loadPersistedTasks(): Promise<void> {
    try {
      const stored = localStorage.getItem("pwa-sync-tasks");
      if (stored) {
        const tasks: SyncTask[] = JSON.parse(stored);
        this.syncTasks.clear();

        tasks.forEach((task) => {
          this.syncTasks.set(task.id, task);
        });

        this.log(`Loaded ${tasks.length} persisted sync tasks`, "info");
      }
    } catch (error) {
      this.log(
        `Failed to load persisted sync tasks: ${error.message}`,
        "error",
      );
    }
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(`data:${mimeType};base64,${base64}`);
    return response.blob();
  }

  // Get sync statistics
  getSyncStats(): {
    totalTasks: number;
    tasksByPriority: Record<string, number>;
    tasksByStatus: Record<string, number>;
    oldestTask: Date | null;
  } {
    const tasks = Array.from(this.syncTasks.values());
    const stats = {
      totalTasks: tasks.length,
      tasksByPriority: { critical: 0, high: 0, normal: 0, low: 0 },
      tasksByStatus: { pending: 0, retrying: 0 },
      oldestTask: null as Date | null,
    };

    tasks.forEach((task) => {
      stats.tasksByPriority[task.priority]++;
      stats.tasksByStatus[task.retryCount > 0 ? "retrying" : "pending"]++;

      const taskDate = new Date(task.createdAt);
      if (!stats.oldestTask || taskDate < stats.oldestTask) {
        stats.oldestTask = taskDate;
      }
    });

    return stats;
  }

  // Clear completed tasks
  clearCompletedTasks(): void {
    // Only persisted tasks remain, so this just clears storage
    localStorage.removeItem("pwa-sync-tasks");
    this.log("Completed sync tasks cleared", "info");
  }

  private log(message: string, level: string): void {
    console.log(`[BackgroundSyncManager] ${message}`);
  }
}

export const backgroundSyncManager = BackgroundSyncManager.getInstance();

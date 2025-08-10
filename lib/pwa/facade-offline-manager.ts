/**
 * Offline Manager for Facade Analysis Features
 * Provides offline support for facade analysis operations including:
 * - Image caching and offline upload queueing
 * - Analysis data persistence
 * - Background sync for pending operations
 */

import {
  FacadeAnalysis,
  FacadeAnalysisImage,
} from "@/lib/types/facade-analysis-types";

// IndexedDB configuration
const DB_NAME = "facade-analysis-offline";
const DB_VERSION = 1;
const STORES = {
  ANALYSES: "analyses",
  IMAGES: "images",
  PENDING_UPLOADS: "pending_uploads",
  PENDING_OPERATIONS: "pending_operations",
};

interface PendingUpload {
  id: string;
  facadeAnalysisId: string;
  formData: FormData;
  timestamp: number;
  retryCount: number;
}

interface PendingOperation {
  id: string;
  type: "analysis" | "export" | "delete";
  facadeAnalysisId: string;
  payload?: any;
  timestamp: number;
  retryCount: number;
}

export class FacadeOfflineManager {
  private db: IDBDatabase | null = null;
  private syncInProgress = false;

  constructor() {
    this.initDB();
    this.registerServiceWorker();
    this.setupEventListeners();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
          db.createObjectStore(STORES.ANALYSES, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const imageStore = db.createObjectStore(STORES.IMAGES, {
            keyPath: "id",
          });
          imageStore.createIndex("facadeAnalysisId", "facadeAnalysisId", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
          db.createObjectStore(STORES.PENDING_UPLOADS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
          db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Register service worker for background sync
   */
  private async registerServiceWorker(): Promise<void> {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Register for background sync
        if ("sync" in registration) {
          await (registration as any).sync.register("facade-sync");
        }
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    }
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.syncPendingOperations();
    });

    // Listen for visibility change to sync when app comes to foreground
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && navigator.onLine) {
        this.syncPendingOperations();
      }
    });
  }

  /**
   * Save facade analysis for offline access
   */
  async saveAnalysisOffline(analysis: FacadeAnalysis): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([STORES.ANALYSES], "readwrite");
    const store = transaction.objectStore(STORES.ANALYSES);

    return new Promise((resolve, reject) => {
      const request = store.put(analysis);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save images for offline access
   */
  async saveImagesOffline(images: FacadeAnalysisImage[]): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([STORES.IMAGES], "readwrite");
    const store = transaction.objectStore(STORES.IMAGES);

    const promises = images.map((image) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(image);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Get offline analysis by ID
   */
  async getOfflineAnalysis(id: string): Promise<FacadeAnalysis | null> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([STORES.ANALYSES], "readonly");
    const store = transaction.objectStore(STORES.ANALYSES);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline images for analysis
   */
  async getOfflineImages(
    facadeAnalysisId: string,
  ): Promise<FacadeAnalysisImage[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([STORES.IMAGES], "readonly");
    const store = transaction.objectStore(STORES.IMAGES);
    const index = store.index("facadeAnalysisId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(facadeAnalysisId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue image upload for when online
   */
  async queueImageUpload(
    facadeAnalysisId: string,
    formData: FormData,
  ): Promise<void> {
    if (!this.db) await this.initDB();

    const pendingUpload: PendingUpload = {
      id: `upload-${Date.now()}-${Math.random()}`,
      facadeAnalysisId,
      formData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const transaction = this.db!.transaction(
      [STORES.PENDING_UPLOADS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_UPLOADS);

    return new Promise((resolve, reject) => {
      const request = store.add(pendingUpload);
      request.onsuccess = () => {
        // Show notification to user
        this.showOfflineNotification(
          "Image upload queued for when you're back online",
        );
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue operation for when online
   */
  async queueOperation(
    type: PendingOperation["type"],
    facadeAnalysisId: string,
    payload?: any,
  ): Promise<void> {
    if (!this.db) await this.initDB();

    const pendingOp: PendingOperation = {
      id: `op-${Date.now()}-${Math.random()}`,
      type,
      facadeAnalysisId,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const transaction = this.db!.transaction(
      [STORES.PENDING_OPERATIONS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_OPERATIONS);

    return new Promise((resolve, reject) => {
      const request = store.add(pendingOp);
      request.onsuccess = () => {
        this.showOfflineNotification(`${type} operation queued for sync`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync all pending operations when online
   */
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;

    try {
      await Promise.all([this.syncPendingUploads(), this.syncPendingOps()]);

      this.showSuccessNotification(
        "All pending operations synced successfully",
      );
    } catch (error) {
      console.error("Sync failed:", error);
      this.showErrorNotification(
        "Some operations failed to sync. Will retry later.",
      );
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync pending image uploads
   */
  private async syncPendingUploads(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      [STORES.PENDING_UPLOADS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_UPLOADS);

    const uploads = await new Promise<PendingUpload[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    for (const upload of uploads) {
      try {
        const response = await fetch(
          `/api/facade-analysis/${upload.facadeAnalysisId}/images`,
          {
            method: "POST",
            body: upload.formData,
          },
        );

        if (response.ok) {
          // Remove from pending uploads
          await this.removePendingUpload(upload.id);
        } else if (upload.retryCount < 3) {
          // Increment retry count
          await this.updateRetryCount(STORES.PENDING_UPLOADS, upload.id);
        } else {
          // Max retries reached, remove and notify
          await this.removePendingUpload(upload.id);
          this.showErrorNotification(
            `Failed to upload image after multiple attempts`,
          );
        }
      } catch (error) {
        console.error("Upload sync failed:", error);
        if (upload.retryCount < 3) {
          await this.updateRetryCount(STORES.PENDING_UPLOADS, upload.id);
        }
      }
    }
  }

  /**
   * Sync pending operations
   */
  private async syncPendingOps(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      [STORES.PENDING_OPERATIONS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_OPERATIONS);

    const operations = await new Promise<PendingOperation[]>(
      (resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      },
    );

    for (const op of operations) {
      try {
        let success = false;

        switch (op.type) {
          case "analysis":
            const response = await fetch(
              `/api/facade-analysis/${op.facadeAnalysisId}/analyze`,
              { method: "POST" },
            );
            success = response.ok;
            break;

          case "export":
            const exportResponse = await fetch(
              `/api/facade-analysis/${op.facadeAnalysisId}/export`,
            );
            success = exportResponse.ok;
            break;

          case "delete":
            const deleteResponse = await fetch(
              `/api/facade-analysis/${op.facadeAnalysisId}`,
              { method: "DELETE" },
            );
            success = deleteResponse.ok;
            break;
        }

        if (success) {
          await this.removePendingOperation(op.id);
        } else if (op.retryCount < 3) {
          await this.updateRetryCount(STORES.PENDING_OPERATIONS, op.id);
        } else {
          await this.removePendingOperation(op.id);
          this.showErrorNotification(`Failed to complete ${op.type} operation`);
        }
      } catch (error) {
        console.error("Operation sync failed:", error);
        if (op.retryCount < 3) {
          await this.updateRetryCount(STORES.PENDING_OPERATIONS, op.id);
        }
      }
    }
  }

  /**
   * Update retry count for pending item
   */
  private async updateRetryCount(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    const item = await new Promise<any>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (item) {
      item.retryCount++;
      await new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Remove pending upload
   */
  private async removePendingUpload(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      [STORES.PENDING_UPLOADS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_UPLOADS);
    store.delete(id);
  }

  /**
   * Remove pending operation
   */
  private async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      [STORES.PENDING_OPERATIONS],
      "readwrite",
    );
    const store = transaction.objectStore(STORES.PENDING_OPERATIONS);
    store.delete(id);
  }

  /**
   * Show offline notification
   */
  private showOfflineNotification(message: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Offline Mode", {
        body: message,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "offline-notification",
      });
    }
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(message: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Sync Complete", {
        body: message,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "sync-success",
      });
    }
  }

  /**
   * Show error notification
   */
  private showErrorNotification(message: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Sync Error", {
        body: message,
        icon: "/icon-192x192.png",
        badge: "/icon-72x72.png",
        tag: "sync-error",
      });
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      [
        STORES.ANALYSES,
        STORES.IMAGES,
        STORES.PENDING_UPLOADS,
        STORES.PENDING_OPERATIONS,
      ],
      "readwrite",
    );

    const promises = Object.values(STORES).map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }
}

// Export singleton instance
export const facadeOfflineManager = new FacadeOfflineManager();

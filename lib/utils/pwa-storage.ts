// Secure localStorage wrapper with error handling and validation
"use client";

interface StorageOptions {
  enableLogging?: boolean;
  prefix?: string;
  validateData?: boolean;
}

class PWAStorage {
  private prefix: string;
  private enableLogging: boolean;
  private validateData: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || "pwa_";
    this.enableLogging = options.enableLogging || false;
    this.validateData = options.validateData !== false;
  }

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      if (this.enableLogging) {
        console.warn("localStorage is not available:", e);
      }
      return false;
    }
  }

  /**
   * Get the full key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Validate and sanitize data before storage
   */
  private sanitizeData(data: any): any {
    if (!this.validateData) return data;

    // Remove any potentially dangerous content
    if (typeof data === "string") {
      // Basic XSS prevention
      return data
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\//g, "&#x2F;");
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeData(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Set item in localStorage with error handling
   */
  setItem<T = any>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      if (this.enableLogging) {
        console.warn(`Failed to set "${key}": localStorage not available`);
      }
      return false;
    }

    try {
      const fullKey = this.getKey(key);
      const dataToStore = {
        value: this.sanitizeData(value),
        timestamp: Date.now(),
        version: "1.0",
      };
      localStorage.setItem(fullKey, JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`Failed to set "${key}":`, error);
      }
      // Handle quota exceeded error
      if (
        error instanceof DOMException &&
        (error.code === 22 ||
          error.code === 1014 ||
          error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        // Try to clear old data
        this.clearOldData();
        // Retry once
        try {
          const fullKey = this.getKey(key);
          const dataToStore = {
            value: this.sanitizeData(value),
            timestamp: Date.now(),
            version: "1.0",
          };
          localStorage.setItem(fullKey, JSON.stringify(dataToStore));
          return true;
        } catch (retryError) {
          if (this.enableLogging) {
            console.error(`Retry failed for "${key}":`, retryError);
          }
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Get item from localStorage with error handling
   */
  getItem<T = any>(key: string, defaultValue?: T): T | undefined {
    if (!this.isAvailable()) {
      if (this.enableLogging) {
        console.warn(`Failed to get "${key}": localStorage not available`);
      }
      return defaultValue;
    }

    try {
      const fullKey = this.getKey(key);
      const item = localStorage.getItem(fullKey);

      if (item === null) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);

      // Validate stored data structure
      if (!parsed || typeof parsed !== "object" || !("value" in parsed)) {
        if (this.enableLogging) {
          console.warn(`Invalid data structure for "${key}"`);
        }
        return defaultValue;
      }

      return parsed.value as T;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`Failed to get "${key}":`, error);
      }
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`Failed to remove "${key}":`, error);
      }
      return false;
    }
  }

  /**
   * Clear all PWA-related data
   */
  clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }

      keys.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error("Failed to clear storage:", error);
      }
      return false;
    }
  }

  /**
   * Clear old data (older than 30 days by default)
   */
  clearOldData(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed.timestamp && now - parsed.timestamp > maxAgeMs) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // If we can't parse it, it's probably old format, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      if (this.enableLogging && keysToRemove.length > 0) {
        console.log(`Cleared ${keysToRemove.length} old storage items`);
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error("Failed to clear old data:", error);
      }
    }
  }

  /**
   * Get storage size information
   */
  async getStorageInfo(): Promise<{
    used: number;
    quota: number;
    percentage: number;
  } | null> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        return {
          used,
          quota,
          percentage,
        };
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error("Failed to get storage info:", error);
      }
    }
    return null;
  }
}

// Create singleton instance
export const pwaStorage = new PWAStorage({
  enableLogging: process.env.NODE_ENV === "development",
  validateData: true,
});

// Export specific storage keys as constants
export const PWA_STORAGE_KEYS = {
  INSTALL_DISMISSED: "install_dismissed",
  INSTALL_DATE: "install_date",
  LAST_SYNC: "last_sync",
  PENDING_ACTIONS: "pending_actions",
  USER_PREFERENCES: "user_preferences",
  CACHE_VERSION: "cache_version",
  SERVICE_WORKER_VERSION: "sw_version",
} as const;

// Type-safe storage helpers
export const pwaStorageHelpers = {
  isInstallDismissed(): boolean {
    return pwaStorage.getItem(
      PWA_STORAGE_KEYS.INSTALL_DISMISSED,
      false,
    ) as boolean;
  },

  setInstallDismissed(dismissed: boolean): boolean {
    return pwaStorage.setItem(PWA_STORAGE_KEYS.INSTALL_DISMISSED, dismissed);
  },

  getInstallDate(): Date | null {
    const timestamp = pwaStorage.getItem<number>(PWA_STORAGE_KEYS.INSTALL_DATE);
    return timestamp ? new Date(timestamp) : null;
  },

  setInstallDate(): boolean {
    return pwaStorage.setItem(PWA_STORAGE_KEYS.INSTALL_DATE, Date.now());
  },

  getLastSync(): Date | null {
    const timestamp = pwaStorage.getItem<number>(PWA_STORAGE_KEYS.LAST_SYNC);
    return timestamp ? new Date(timestamp) : null;
  },

  setLastSync(): boolean {
    return pwaStorage.setItem(PWA_STORAGE_KEYS.LAST_SYNC, Date.now());
  },
};

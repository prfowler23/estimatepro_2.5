// Offline Hooks
// React hooks for offline functionality and PWA features

import { useState, useEffect, useCallback, useRef } from "react";
import {
  offlineManager,
  OfflineStatus,
  OfflineAction,
  offlineUtils,
} from "@/lib/pwa/offline-manager";

// Main offline status hook
export const useOfflineStatus = () => {
  const [status, setStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setIsInitialized(true);
    });

    // Get initial status
    setStatus(offlineManager.getStatus());
    setIsInitialized(true);

    return unsubscribe;
  }, []);

  return {
    ...status,
    isInitialized,
  };
};

// Offline actions hook
export const useOfflineActions = () => {
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshActions = useCallback(() => {
    setActions(offlineManager.getPendingActions());
  }, []);

  useEffect(() => {
    refreshActions();

    const unsubscribe = offlineManager.subscribe(() => {
      refreshActions();
    });

    return unsubscribe;
  }, [refreshActions]);

  const addAction = useCallback(
    async (action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">) => {
      setIsLoading(true);
      try {
        await offlineManager.addOfflineAction(action);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const removeAction = useCallback(async (actionId: string) => {
    setIsLoading(true);
    try {
      await offlineManager.removeOfflineAction(actionId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllActions = useCallback(async () => {
    setIsLoading(true);
    try {
      await offlineManager.clearPendingActions();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncActions = useCallback(async () => {
    setIsLoading(true);
    try {
      await offlineManager.sync();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    actions,
    isLoading,
    addAction,
    removeAction,
    clearAllActions,
    syncActions,
  };
};

// Offline-aware API hook
export const useOfflineAPI = () => {
  const { isOnline } = useOfflineStatus();
  const { addAction } = useOfflineActions();

  const createEstimate = useCallback(async (estimate: any) => {
    return offlineUtils.queueApiCall(
      "/api/estimates",
      "POST",
      estimate,
      "Create estimate",
    );
  }, []);

  const updateEstimate = useCallback(async (id: string, estimate: any) => {
    return offlineUtils.queueEstimateSave(id, estimate);
  }, []);

  const deleteEstimate = useCallback(async (id: string) => {
    return offlineUtils.queueApiCall(
      `/api/estimates/${id}`,
      "DELETE",
      {},
      "Delete estimate",
    );
  }, []);

  const createCustomer = useCallback(
    async (customer: any) => {
      if (isOnline) {
        try {
          const response = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer),
          });
          return await response.json();
        } catch (error) {
          await addAction({
            type: "create",
            resource: "customer",
            data: customer,
            maxRetries: 3,
          });
          return { ...customer, id: `offline-${Date.now()}`, offline: true };
        }
      } else {
        await addAction({
          type: "create",
          resource: "customer",
          data: customer,
          maxRetries: 3,
        });
        return { ...customer, id: `offline-${Date.now()}`, offline: true };
      }
    },
    [isOnline, addAction],
  );

  const updateCustomer = useCallback(
    async (id: string, customer: any) => {
      if (isOnline) {
        try {
          const response = await fetch(`/api/customers/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer),
          });
          return await response.json();
        } catch (error) {
          await addAction({
            type: "update",
            resource: "customer",
            data: { ...customer, id },
            maxRetries: 3,
          });
          return { ...customer, id, offline: true };
        }
      } else {
        await addAction({
          type: "update",
          resource: "customer",
          data: { ...customer, id },
          maxRetries: 3,
        });
        return { ...customer, id, offline: true };
      }
    },
    [isOnline, addAction],
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      if (isOnline) {
        try {
          const response = await fetch(`/api/customers/${id}`, {
            method: "DELETE",
          });
          return await response.json();
        } catch (error) {
          await addAction({
            type: "delete",
            resource: "customer",
            data: { id },
            maxRetries: 3,
          });
          return { id, deleted: true, offline: true };
        }
      } else {
        await addAction({
          type: "delete",
          resource: "customer",
          data: { id },
          maxRetries: 3,
        });
        return { id, deleted: true, offline: true };
      }
    },
    [isOnline, addAction],
  );

  return {
    createEstimate,
    updateEstimate,
    deleteEstimate,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    isOnline,
  };
};

// Offline data caching hook
export const useOfflineCache = () => {
  const cacheData = useCallback(async (key: string, data: any) => {
    await offlineManager.cacheData(key, data);
  }, []);

  const getCachedData = useCallback(async (key: string) => {
    return await offlineManager.getCachedData(key);
  }, []);

  const clearCache = useCallback(async () => {
    await offlineManager.clearCache();
  }, []);

  const getCacheStatus = useCallback(async () => {
    return await offlineManager.getCacheStatus();
  }, []);

  return {
    cacheData,
    getCachedData,
    clearCache,
    getCacheStatus,
  };
};

// PWA installation hook
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInIOSApp = isIOS && (window.navigator as any).standalone;

    setIsInstalled(isStandalone || isInIOSApp);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Installation failed:", error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  return {
    isInstallable,
    isInstalled,
    isInstalling,
    install,
    canInstall: isInstallable && !isInstalled,
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setDownlink(connection.downlink);
        setEffectiveType(connection.effectiveType);
      }
    };

    // Initial update
    updateConnectionInfo();

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateConnectionInfo);
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (connection) {
        connection.removeEventListener("change", updateConnectionInfo);
      }
    };
  }, []);

  const getConnectionQuality = useCallback(() => {
    if (!isOnline) return "offline";
    if (!effectiveType) return "unknown";

    switch (effectiveType) {
      case "slow-2g":
      case "2g":
        return "poor";
      case "3g":
        return "fair";
      case "4g":
        return "good";
      default:
        return "unknown";
    }
  }, [isOnline, effectiveType]);

  return {
    isOnline,
    downlink,
    effectiveType,
    connectionQuality: getConnectionQuality(),
  };
};

// Background sync hook
export const useBackgroundSync = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [registrations, setRegistrations] = useState<string[]>([]);

  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        "serviceWorker" in navigator &&
        "sync" in window.ServiceWorkerRegistration.prototype;
      setIsSupported(supported);
    };

    checkSupport();
  }, []);

  const requestSync = useCallback(
    async (tag: string) => {
      if (!isSupported) return false;

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        setRegistrations((prev) => [...prev, tag]);
        return true;
      } catch (error) {
        console.error("Background sync registration failed:", error);
        return false;
      }
    },
    [isSupported],
  );

  const requestEstimateSync = useCallback(() => {
    return requestSync("estimate-sync");
  }, [requestSync]);

  const requestCustomerSync = useCallback(() => {
    return requestSync("customer-sync");
  }, [requestSync]);

  const requestPhotoSync = useCallback(() => {
    return requestSync("photo-upload");
  }, [requestSync]);

  return {
    isSupported,
    registrations,
    requestSync,
    requestEstimateSync,
    requestCustomerSync,
    requestPhotoSync,
  };
};

// Storage quota hook
export const useStorageQuota = () => {
  const [quota, setQuota] = useState<number | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [percentage, setPercentage] = useState<number | null>(null);

  const updateQuota = useCallback(async () => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quotaValue = estimate.quota || 0;
        const usageValue = estimate.usage || 0;
        const percentageValue =
          quotaValue > 0 ? (usageValue / quotaValue) * 100 : 0;

        setQuota(quotaValue);
        setUsage(usageValue);
        setPercentage(percentageValue);
      } catch (error) {
        console.error("Failed to estimate storage:", error);
      }
    }
  }, []);

  useEffect(() => {
    updateQuota();
  }, [updateQuota]);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  return {
    quota,
    usage,
    percentage,
    formatBytes,
    updateQuota,
  };
};

export default {
  useOfflineStatus,
  useOfflineActions,
  useOfflineAPI,
  useOfflineCache,
  usePWAInstall,
  useNetworkStatus,
  useBackgroundSync,
  useStorageQuota,
};

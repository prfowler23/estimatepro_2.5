// Custom hook for PWA status management with optimized performance
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { pwaService, PWAStatus } from "@/lib/pwa/pwa-service";
import { offlineManager, OfflineStatus } from "@/lib/pwa/offline-manager";

interface UsePWAStatusOptions {
  pollInterval?: number;
  debounceDelay?: number;
  enableCacheStats?: boolean;
}

interface PWAStatusHookResult {
  pwaStatus: PWAStatus;
  offlineStatus: OfflineStatus;
  cacheStats: { total: { entries: number; size: number } } | null;
  isOnline: boolean;
  hasPendingActions: boolean;
  isSyncing: boolean;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  clearPendingActions: () => Promise<void>;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function usePWAStatus(
  options: UsePWAStatusOptions = {},
): PWAStatusHookResult {
  const {
    pollInterval = 10000, // Increased from 5000 to reduce polling frequency
    debounceDelay = 500,
    enableCacheStats = false,
  } = options;

  const [pwaStatus, setPwaStatus] = useState<PWAStatus>(pwaService.getStatus());
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );
  const [cacheStats, setCacheStats] = useState<{
    total: { entries: number; size: number };
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced offline status to reduce re-renders
  const debouncedOfflineStatus = useDebounce(offlineStatus, debounceDelay);

  // Memoized computed values
  const isOnline = useMemo(
    () => debouncedOfflineStatus.isOnline,
    [debouncedOfflineStatus.isOnline],
  );

  const hasPendingActions = useMemo(
    () => debouncedOfflineStatus.pendingActions > 0,
    [debouncedOfflineStatus.pendingActions],
  );

  // Update cache stats
  const updateCacheStats = useCallback(async () => {
    if (!enableCacheStats || !isMountedRef.current) return;

    try {
      const stats = await pwaService.getCacheStats();
      if (isMountedRef.current) {
        setCacheStats(stats);
      }
    } catch (error) {
      console.error("Failed to get cache stats:", error);
    }
  }, [enableCacheStats]);

  // Sync function
  const sync = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      await offlineManager.sync();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [isSyncing, isOnline]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await pwaService.clearCache();
      await updateCacheStats();
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }, [updateCacheStats]);

  // Clear pending actions
  const clearPendingActions = useCallback(async () => {
    try {
      await offlineManager.clearPendingActions();
    } catch (error) {
      console.error("Failed to clear pending actions:", error);
    }
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to offline status changes
    const unsubscribe = offlineManager.subscribe((status) => {
      if (isMountedRef.current) {
        setOfflineStatus(status);
      }
    });

    // Set up polling for PWA status and cache stats
    const updateStatuses = async () => {
      if (!isMountedRef.current) return;

      setPwaStatus(pwaService.getStatus());
      await updateCacheStats();
    };

    // Initial update
    updateStatuses();

    // Set up polling interval
    if (pollInterval > 0) {
      pollIntervalRef.current = setInterval(updateStatuses, pollInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [pollInterval, updateCacheStats]);

  return {
    pwaStatus,
    offlineStatus: debouncedOfflineStatus,
    cacheStats,
    isOnline,
    hasPendingActions,
    isSyncing,
    sync,
    clearCache,
    clearPendingActions,
  };
}

// Hook for install prompt management
interface UseInstallPromptResult {
  isInstallable: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isInIOSApp = isIOS && (window.navigator as any).standalone;

      setIsInstalled(isStandalone || isInIOSApp);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      try {
        localStorage.setItem("pwa-installed", "true");
      } catch (error) {
        console.error("Failed to save install status:", error);
      }
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
    if (!deferredPrompt) {
      throw new Error("No install prompt available");
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("PWA installation accepted");
      } else {
        console.log("PWA installation dismissed");
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error("Installation failed:", error);
      throw error;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem("pwa-install-dismissed", "true");
    } catch (error) {
      console.error("Failed to save dismiss status:", error);
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    canInstall: isInstallable && !isInstalled,
    install,
    dismiss,
  };
}

// Install prompt interface (for TypeScript)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

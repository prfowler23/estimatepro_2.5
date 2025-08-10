// PHASE 3 FIX: PWA Status Component for offline indicators and sync status
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  CloudOff,
  CloudUpload,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Zap,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { offlineManager, OfflineStatus } from "@/lib/pwa/offline-manager";
import { pwaService, pwaUtils, PWAStatus } from "@/lib/pwa/pwa-service";

interface PWAStatusProps {
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export function PWAStatus({
  className = "",
  compact = false,
  showDetails = true,
}: PWAStatusProps) {
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>(pwaService.getStatus());
  const [cacheStats, setCacheStats] = useState<{
    total: { entries: number; size: number };
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Subscribe to offline status changes
    const unsubscribe = offlineManager.subscribe((status) => {
      if (!isMounted) return;
      setOfflineStatus(status);

      // Show offline alert when going offline
      if (!status.isOnline && showOfflineAlert === false) {
        setShowOfflineAlert(true);
        timeoutId = setTimeout(() => {
          if (isMounted) setShowOfflineAlert(false);
        }, 5000);
      }
    });

    // Update PWA status periodically
    const interval = setInterval(async () => {
      if (!isMounted) return;
      setPwaStatus(pwaService.getStatus());

      // Update cache stats
      if (showDetails) {
        try {
          const stats = await pwaService.getCacheStats();
          if (isMounted) setCacheStats(stats);
        } catch (error) {
          console.error("Failed to get cache stats:", error);
        }
      }
    }, 5000);

    // Initial cache stats
    if (showDetails) {
      pwaService
        .getCacheStats()
        .then((stats) => {
          if (isMounted) setCacheStats(stats);
        })
        .catch(console.error);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, [showDetails, showOfflineAlert]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    let progressInterval: NodeJS.Timeout | null = null;
    let finalTimeout: NodeJS.Timeout | null = null;

    try {
      // Simulate progress
      progressInterval = setInterval(() => {
        setSyncProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await offlineManager.sync();

      if (progressInterval) clearInterval(progressInterval);
      setSyncProgress(100);

      finalTimeout = setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Sync failed:", error);
      if (progressInterval) clearInterval(progressInterval);
      if (finalTimeout) clearTimeout(finalTimeout);
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleClearCache = async () => {
    if (
      confirm(
        "Are you sure you want to clear all cached data? This will remove offline functionality until data is re-cached.",
      )
    ) {
      await pwaService.clearCache();
      const stats = await pwaService.getCacheStats();
      setCacheStats(stats);
    }
  };

  // Compact mode - just show connection status
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {offlineStatus.isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-600">Offline</span>
          </>
        )}
        {offlineStatus.pendingActions > 0 && (
          <Badge variant="secondary" className="text-xs">
            {offlineStatus.pendingActions} pending
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Offline Alert */}
      <AnimatePresence>
        {showOfflineAlert && !offlineStatus.isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <Alert className="bg-yellow-50 border-yellow-200 shadow-lg">
              <CloudOff className="w-4 h-4 text-yellow-600" />
              <div className="ml-2">
                <h4 className="font-semibold text-yellow-800">
                  You're Offline
                </h4>
                <p className="text-sm text-yellow-700">
                  Don't worry! You can continue working. Changes will sync when
                  you're back online.
                </p>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Status Card */}
      <Card className={cn("p-4", className)}>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {offlineStatus.isOnline ? (
                <div className="p-2 bg-green-100 rounded-full">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-red-100 rounded-full">
                  <WifiOff className="w-5 h-5 text-red-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {offlineStatus.isOnline ? "Online" : "Offline Mode"}
                </h3>
                <p className="text-sm text-gray-600">
                  {offlineStatus.isOnline
                    ? pwaStatus.networkStatus === "slow"
                      ? "Slow connection detected"
                      : "All features available"
                    : "Working locally, will sync later"}
                </p>
              </div>
            </div>

            {/* Network Speed Indicator */}
            {offlineStatus.isOnline && pwaStatus.networkStatus === "slow" && (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                <Zap className="w-3 h-3 mr-1" />
                Slow
              </Badge>
            )}
          </div>

          {/* Pending Actions */}
          {offlineStatus.pendingActions > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudUpload className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {offlineStatus.pendingActions} pending{" "}
                    {offlineStatus.pendingActions === 1 ? "action" : "actions"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={!offlineStatus.isOnline || isSyncing}
                  className="text-xs"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Sync Now
                </Button>
              </div>

              {isSyncing && (
                <Progress value={syncProgress} className="mt-2 h-1" />
              )}
            </div>
          )}

          {/* Last Sync Info */}
          {offlineStatus.lastSync && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-3 h-3" />
              <span>
                Last synced{" "}
                {new Date(offlineStatus.lastSync).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* PWA Status Details */}
          {showDetails && (
            <>
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm">App Status</h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {pwaStatus.isInstalled ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-600">
                      {pwaStatus.isInstalled ? "Installed" : "Not Installed"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pwaStatus.hasServiceWorker ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-600">
                      {pwaStatus.hasServiceWorker
                        ? "Service Worker Active"
                        : "No Service Worker"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pwaStatus.isOfflineReady ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-600">
                      {pwaStatus.isOfflineReady
                        ? "Offline Ready"
                        : "Not Offline Ready"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pwaStatus.hasPushPermission ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-600">
                      {pwaStatus.hasPushPermission
                        ? "Notifications On"
                        : "Notifications Off"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cache Status */}
              {cacheStats && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Cache Storage
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearCache}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear Cache
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Cached Items</span>
                      <span className="font-medium">
                        {cacheStats.total.entries}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cache Size</span>
                      <span className="font-medium">
                        {pwaUtils.formatBytes(cacheStats.total.size)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Update Available */}
              {pwaStatus.updateAvailable && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Download className="w-4 h-4 text-blue-600" />
                  <div className="ml-2">
                    <h4 className="font-semibold text-blue-800">
                      Update Available
                    </h4>
                    <p className="text-sm text-blue-700">
                      A new version is available. Refresh to update.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="mt-2"
                    >
                      Refresh Now
                    </Button>
                  </div>
                </Alert>
              )}
            </>
          )}
        </div>
      </Card>
    </>
  );
}

// Minimal offline indicator for navigation bars
export function MinimalOfflineIndicator({
  className = "",
}: {
  className?: string;
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm",
        className,
      )}
    >
      <CloudOff className="w-4 h-4" />
      <span>Offline</span>
    </motion.div>
  );
}

// Sync status indicator
export function SyncIndicator({ className = "" }: { className?: string }) {
  const [pendingActions, setPendingActions] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((status) => {
      setPendingActions(status.pendingActions);
      setIsSyncing(status.syncInProgress);
    });

    return unsubscribe;
  }, []);

  if (pendingActions === 0 && !isSyncing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex items-center gap-2", className)}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-blue-600">Syncing...</span>
        </>
      ) : (
        <>
          <CloudUpload className="w-4 h-4 text-orange-500" />
          <Badge
            variant="secondary"
            className="text-xs bg-orange-100 text-orange-800"
          >
            {pendingActions} pending
          </Badge>
        </>
      )}
    </motion.div>
  );
}

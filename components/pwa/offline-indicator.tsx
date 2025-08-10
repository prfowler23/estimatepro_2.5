// Offline Indicator Component
// Shows current offline status and sync progress

"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RotateCw as Sync,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Settings,
  RefreshCw,
  Database,
  Cloud,
  CloudOff,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  offlineManager,
  OfflineStatus,
  OfflineAction,
} from "@/lib/pwa/offline-manager";

// Offline indicator component
export const OfflineIndicator: React.FC = () => {
  const [status, setStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );
  const [showDetails, setShowDetails] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setIsVisible(!newStatus.isOnline || newStatus.pendingActions > 0);
    });

    // Get initial pending actions
    setPendingActions(offlineManager.getPendingActions());

    // Update pending actions periodically
    const interval = setInterval(() => {
      // Only update if the component is still mounted
      setPendingActions(offlineManager.getPendingActions());
    }, 5000);

    return () => {
      // Ensure proper cleanup
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, []);

  // Load cache status when details are shown
  useEffect(() => {
    if (showDetails) {
      offlineManager.getCacheStatus().then(setCacheStatus);
    }
  }, [showDetails]);

  // Manual sync
  const handleSync = async () => {
    await offlineManager.sync();
  };

  // Clear cache
  const handleClearCache = async () => {
    await offlineManager.clearCache();
    setCacheStatus(null);
  };

  // Clear pending actions
  const handleClearPendingActions = async () => {
    await offlineManager.clearPendingActions();
    setPendingActions([]);
  };

  // Get status icon
  const getStatusIcon = () => {
    if (status.syncInProgress) {
      return <Sync className="w-4 h-4 animate-spin" />;
    }

    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }

    if (status.pendingActions > 0) {
      return <Clock className="w-4 h-4" />;
    }

    return <Wifi className="w-4 h-4" />;
  };

  // Get status color
  const getStatusColor = () => {
    if (status.syncInProgress) {
      return "bg-blue-500";
    }

    if (!status.isOnline) {
      return "bg-red-500";
    }

    if (status.pendingActions > 0) {
      return "bg-yellow-500";
    }

    return "bg-green-500";
  };

  // Get status text
  const getStatusText = () => {
    if (status.syncInProgress) {
      return "Syncing...";
    }

    if (!status.isOnline) {
      return "Offline";
    }

    if (status.pendingActions > 0) {
      return `${status.pendingActions} pending`;
    }

    return "Online";
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get action icon
  const getActionIcon = (action: OfflineAction) => {
    switch (action.type) {
      case "create":
        return <Zap className="w-4 h-4 text-green-500" />;
      case "update":
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case "delete":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(true)}
          className={`${getStatusColor()} text-white border-none shadow-lg hover:opacity-90`}
        >
          {getStatusIcon()}
          <span className="ml-2">{getStatusText()}</span>
        </Button>
      </div>

      {/* Details dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Offline Status
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status overview */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Connection</p>
                      <p className="text-2xl font-bold">
                        {status.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div className="text-2xl">
                      {status.isOnline ? (
                        <Cloud className="w-8 h-8 text-green-500" />
                      ) : (
                        <CloudOff className="w-8 h-8 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Pending Actions</p>
                      <p className="text-2xl font-bold">
                        {status.pendingActions}
                      </p>
                    </div>
                    <div className="text-2xl">
                      <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Worker status */}
            <div className="space-y-2">
              <h3 className="font-semibold">Service Worker Status</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status.isServiceWorkerSupported
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm">Supported</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status.isServiceWorkerRegistered
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm">Registered</span>
                </div>
              </div>
            </div>

            {/* Sync status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Sync Status</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={status.syncInProgress || !status.isOnline}
                >
                  {status.syncInProgress ? (
                    <Sync className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
              </div>

              {status.syncInProgress && (
                <div className="space-y-2">
                  <Progress value={50} className="h-2" />
                  <p className="text-sm text-gray-600">
                    Syncing pending actions...
                  </p>
                </div>
              )}

              {status.lastSync && (
                <p className="text-sm text-gray-600">
                  Last sync: {formatTimestamp(status.lastSync)}
                </p>
              )}
            </div>

            {/* Pending actions */}
            {pendingActions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Pending Actions</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearPendingActions}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {pendingActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {getActionIcon(action)}
                        <div>
                          <p className="text-sm font-medium">
                            {action.type} {action.resource}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatTimestamp(action.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {action.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {action.retryCount}/{action.maxRetries}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            offlineManager.removeOfflineAction(action.id)
                          }
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cache status */}
            {cacheStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Cache Status</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                  >
                    Clear Cache
                  </Button>
                </div>
                <div className="space-y-2">
                  {cacheStatus.caches?.map((cache: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium">{cache.name}</span>
                      <Badge variant="outline">{cache.entries} entries</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Compact offline status badge
export const OfflineStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const getVariant = () => {
    if (status.syncInProgress) return "default";
    if (!status.isOnline) return "destructive";
    if (status.pendingActions > 0) return "secondary";
    return "outline";
  };

  return (
    <Badge variant={getVariant()} className="flex items-center space-x-1">
      {status.syncInProgress ? (
        <Sync className="w-3 h-3 animate-spin" />
      ) : !status.isOnline ? (
        <WifiOff className="w-3 h-3" />
      ) : status.pendingActions > 0 ? (
        <Clock className="w-3 h-3" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      <span>
        {status.syncInProgress
          ? "Syncing"
          : !status.isOnline
            ? "Offline"
            : status.pendingActions > 0
              ? `${status.pendingActions} pending`
              : "Online"}
      </span>
    </Badge>
  );
};

export default OfflineIndicator;

/**
 * PWA Status Dashboard Component
 * Comprehensive PWA status monitoring with all enhanced capabilities
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Download,
  Bell,
  Sync,
  Database,
  Clock,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { pwaService } from "@/lib/pwa/pwa-service";
import type { PWAStatus } from "@/lib/pwa/types";

interface PWAStatusDashboardProps {
  className?: string;
  compact?: boolean;
}

interface CapabilityStatus {
  name: string;
  status: "active" | "inactive" | "error";
  description: string;
  icon: React.ComponentType<any>;
  details?: string;
}

export function PWAStatusDashboard({
  className = "",
  compact = false,
}: PWAStatusDashboardProps) {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilityStatus[]>([]);

  useEffect(() => {
    loadPWAStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(loadPWAStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPWAStatus = async () => {
    try {
      const status = pwaService.getStatus();
      setPwaStatus(status);
      updateCapabilities(status);
    } catch (error) {
      console.error("Failed to load PWA status:", error);
    }
  };

  const updateCapabilities = (status: PWAStatus) => {
    const caps: CapabilityStatus[] = [
      {
        name: "Service Worker",
        status: status.hasServiceWorker ? "active" : "inactive",
        description: "Background processing and caching",
        icon: Activity,
        details: status.hasServiceWorker
          ? "Registered and active"
          : "Not available",
      },
      {
        name: "Offline Mode",
        status: status.isOfflineReady ? "active" : "inactive",
        description: "Work without internet connection",
        icon: WifiOff,
        details: status.isOfflineReady
          ? "Ready for offline use"
          : "Preparing offline data",
      },
      {
        name: "Push Notifications",
        status: status.hasPushPermission ? "active" : "inactive",
        description: "Receive important updates",
        icon: Bell,
        details: status.hasPushPermission ? "Enabled" : "Permission required",
      },
      {
        name: "Background Sync",
        status: "serviceWorker" in navigator ? "active" : "inactive",
        description: "Sync data when connection returns",
        icon: Sync,
        details: "serviceWorker" in navigator ? "Available" : "Not supported",
      },
      {
        name: "App Install",
        status: status.isInstalled ? "active" : "inactive",
        description: "Install as native app",
        icon: Download,
        details: status.isInstalled ? "Installed" : "Available for install",
      },
    ];

    setCapabilities(caps);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPWAStatus();

    // Check for updates
    await pwaService.checkForUpdates();

    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "inactive":
        return "text-gray-500";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return CheckCircle;
      case "inactive":
        return AlertCircle;
      case "error":
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const formatCacheSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!pwaStatus) {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading PWA status...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                pwaStatus.networkStatus === "online"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-900">
              {pwaStatus.isInstalled ? "PWA Installed" : "PWA Ready"}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">
              {capabilities.filter((c) => c.status === "active").length}/
              {capabilities.length}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <RefreshCw
                className={`w-3 h-3 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">PWA Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              Progressive Web App capabilities and health
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Network status indicator */}
            <div className="flex items-center space-x-2">
              {pwaStatus.networkStatus === "online" ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm text-gray-700 capitalize">
                {pwaStatus.networkStatus}
              </span>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh status"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Update notification */}
      <AnimatePresence>
        {pwaStatus.updateAvailable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-50 border-b border-blue-200 px-6 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    App Update Available
                  </p>
                  <p className="text-xs text-blue-700">
                    A new version of EstimatePro is ready to install
                  </p>
                </div>
              </div>
              <button
                onClick={() => pwaService.updateServiceWorker()}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capabilities grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {capabilities.map((capability, index) => {
            const StatusIcon = getStatusIcon(capability.status);
            const FeatureIcon = capability.icon;

            return (
              <motion.div
                key={capability.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white rounded-lg">
                    <FeatureIcon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {capability.name}
                      </h4>
                      <StatusIcon
                        className={`w-4 h-4 ${getStatusColor(capability.status)}`}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {capability.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {capability.details}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Cache status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-gray-700" />
              <h4 className="font-medium text-gray-900">Cache Status</h4>
            </div>
            <button
              onClick={() => pwaService.clearCache()}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              Clear Cache
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {pwaStatus.cacheStatus.itemCount}
              </p>
              <p className="text-xs text-gray-600">Items Cached</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCacheSize(pwaStatus.cacheStatus.totalSize)}
              </p>
              <p className="text-xs text-gray-600">Cache Size</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {pwaStatus.cacheStatus.lastCleared
                  ? new Date(
                      pwaStatus.cacheStatus.lastCleared,
                    ).toLocaleDateString()
                  : "Never"}
              </p>
              <p className="text-xs text-gray-600">Last Cleared</p>
            </div>
          </div>
        </div>

        {/* Installation status */}
        {!pwaStatus.isInstalled && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Install EstimatePro App
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Get faster performance and offline access by installing the
                  app
                </p>
              </div>
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                Install
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PWAStatusDashboard;

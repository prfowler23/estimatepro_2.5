/**
 * Real-Time Connection Status Component
 * Shows WebSocket connection health and provides manual controls
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Activity,
} from "lucide-react";
import { getConnectionManager } from "@/lib/websocket/connection-manager";
import type { ConnectionHealth } from "@/lib/websocket/connection-manager";

interface ConnectionStatusProps {
  showDetails?: boolean;
  autoHide?: boolean;
  hideAfterMs?: number;
  className?: string;
}

export function ConnectionStatus({
  showDetails = false,
  autoHide = true,
  hideAfterMs = 5000,
  className = "",
}: ConnectionStatusProps) {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const connectionManager = getConnectionManager();

    // Initial health check
    connectionManager.checkHealth().then(setHealth);

    // Listen for health updates
    const handleHealth = (healthUpdate: ConnectionHealth) => {
      setHealth(healthUpdate);

      // Show indicator when status changes
      if (autoHide) {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), hideAfterMs);
      }
    };

    const handleReconnecting = () => {
      setIsReconnecting(true);
    };

    const handleConnected = () => {
      setIsReconnecting(false);
    };

    connectionManager.on("health", handleHealth);
    connectionManager.on("reconnecting", handleReconnecting);
    connectionManager.on("connected", handleConnected);

    return () => {
      connectionManager.off("health", handleHealth);
      connectionManager.off("reconnecting", handleReconnecting);
      connectionManager.off("connected", handleConnected);
    };
  }, [autoHide, hideAfterMs]);

  const handleManualReconnect = async () => {
    try {
      const connectionManager = getConnectionManager();
      await connectionManager.reconnect();
    } catch (error) {
      console.error("Manual reconnect failed:", error);
    }
  };

  if (!health) return null;

  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        icon: RefreshCw,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        label: "Reconnecting...",
        animate: true,
      };
    }

    switch (health.status) {
      case "healthy":
        return {
          icon: Wifi,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          label: "Connected",
          animate: false,
        };
      case "degraded":
        return {
          icon: AlertTriangle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          label: "Connection Issues",
          animate: false,
        };
      case "unhealthy":
        return {
          icon: WifiOff,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "Connection Problems",
          animate: false,
        };
      case "disconnected":
        return {
          icon: WifiOff,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: "Disconnected",
          animate: false,
        };
      default:
        return {
          icon: WifiOff,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: "Unknown",
          animate: false,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <AnimatePresence>
      {(isVisible || !autoHide) && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`
            fixed top-4 right-4 z-50 
            ${statusInfo.bgColor} ${statusInfo.borderColor}
            border rounded-lg shadow-lg backdrop-blur-sm
            min-w-48 max-w-xs
            ${className}
          `}
        >
          <div className="p-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={statusInfo.animate ? { rotate: 360 } : {}}
                transition={{
                  duration: 1,
                  repeat: statusInfo.animate ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <Icon
                  className={`w-5 h-5 ${statusInfo.color}`}
                  strokeWidth={2}
                />
              </motion.div>

              <div className="flex-1">
                <div className={`font-medium text-sm ${statusInfo.color}`}>
                  {statusInfo.label}
                </div>

                {health.latency > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {health.latency}ms latency
                  </div>
                )}
              </div>

              {/* Manual reconnect button for problematic connections */}
              {(health.status === "unhealthy" ||
                health.status === "disconnected") && (
                <button
                  onClick={handleManualReconnect}
                  className="p-1 rounded-md hover:bg-white/50 transition-colors"
                  title="Reconnect manually"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Detailed information */}
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1"
              >
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{formatUptime(health.uptime)}</span>
                </div>

                {health.reconnectAttempts > 0 && (
                  <div className="flex justify-between">
                    <span>Reconnects:</span>
                    <span>{health.reconnectAttempts}</span>
                  </div>
                )}

                {health.errorCount > 0 && (
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <span>{health.errorCount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Last Seen:</span>
                  <span>
                    {new Date(health.lastSeen).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Health indicator bar */}
          <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
            <motion.div
              className={`h-full transition-colors duration-500 ${
                health.status === "healthy"
                  ? "bg-green-400"
                  : health.status === "degraded"
                    ? "bg-yellow-400"
                    : health.status === "unhealthy"
                      ? "bg-red-400"
                      : "bg-gray-400"
              }`}
              initial={{ width: 0 }}
              animate={{
                width:
                  health.status === "healthy"
                    ? "100%"
                    : health.status === "degraded"
                      ? "60%"
                      : health.status === "unhealthy"
                        ? "30%"
                        : "0%",
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConnectionStatus;

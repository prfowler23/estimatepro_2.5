/**
 * Unified Connection Status Component
 * Enhanced real-time connection indicator with comprehensive monitoring
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Activity,
  Users,
  Gauge,
  Clock,
  TrendingUp,
  Settings,
  X,
} from "lucide-react";
import { useRealTimeUnified } from "@/hooks/useRealTimeUnified";
import type {
  UnifiedConnectionState,
  ServiceMetrics,
  Collaborator,
} from "@/lib/services/real-time-service-unified";

interface UnifiedConnectionStatusProps {
  // Display options
  showDetails?: boolean;
  showMetrics?: boolean;
  showCollaborators?: boolean;
  autoHide?: boolean;
  hideAfterMs?: number;

  // Layout options
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  compact?: boolean;
  className?: string;

  // Functionality
  allowManualReconnect?: boolean;
  allowSettingsToggle?: boolean;

  // Event handlers
  onReconnect?: () => void;
  onSettingsClick?: () => void;
}

export function UnifiedConnectionStatus({
  showDetails = false,
  showMetrics = false,
  showCollaborators = true,
  autoHide = true,
  hideAfterMs = 5000,
  position = "top-right",
  compact = false,
  className = "",
  allowManualReconnect = true,
  allowSettingsToggle = false,
  onReconnect,
  onSettingsClick,
}: UnifiedConnectionStatusProps) {
  const {
    connected,
    healthy,
    connecting,
    connectionState,
    collaborators,
    metrics,
    reconnect,
  } = useRealTimeUnified({
    enableMetrics: showMetrics,
    debugMode: process.env.NODE_ENV === "development",
  });

  const [isVisible, setIsVisible] = useState(!autoHide);
  const [isExpanded, setIsExpanded] = useState(showDetails);

  // Auto-hide logic
  useEffect(() => {
    if (autoHide && (connecting || connectionState.error)) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        if (connected && healthy && !connectionState.error) {
          setIsVisible(false);
        }
      }, hideAfterMs);

      return () => clearTimeout(timer);
    }
  }, [
    autoHide,
    connecting,
    connectionState.error,
    connected,
    healthy,
    hideAfterMs,
  ]);

  const handleManualReconnect = async () => {
    try {
      await reconnect();
      onReconnect?.();
    } catch (error) {
      console.error("Manual reconnect failed:", error);
    }
  };

  const getStatusInfo = () => {
    if (connecting) {
      return {
        icon: RefreshCw,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        label: "Connecting...",
        animate: true,
      };
    }

    if (connectionState.error) {
      return {
        icon: AlertTriangle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "Connection Error",
        animate: false,
      };
    }

    if (connected && healthy) {
      return {
        icon: Wifi,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        label: "Connected",
        animate: false,
      };
    }

    if (connected && !healthy) {
      return {
        icon: AlertTriangle,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        label: "Connection Issues",
        animate: false,
      };
    }

    return {
      icon: WifiOff,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      label: "Disconnected",
      animate: false,
    };
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  const formatUptime = (ms: number) => {
    if (!ms) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 50) return { value: `${ms}ms`, color: "text-green-600" };
    if (ms < 200) return { value: `${ms}ms`, color: "text-yellow-600" };
    return { value: `${ms}ms`, color: "text-red-600" };
  };

  if (!isVisible && autoHide) return null;

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;
  const latencyInfo = formatLatency(connectionState.latency);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`
          fixed ${getPositionClasses()} z-50
          ${statusInfo.bgColor} ${statusInfo.borderColor}
          border rounded-lg shadow-lg backdrop-blur-sm
          ${compact ? "min-w-48" : "min-w-64"} max-w-sm
          ${className}
        `}
      >
        {/* Main Status Header */}
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
              <Icon className={`w-5 h-5 ${statusInfo.color}`} strokeWidth={2} />
            </motion.div>

            <div className="flex-1">
              <div className={`font-medium text-sm ${statusInfo.color}`}>
                {statusInfo.label}
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                {connectionState.latency > 0 && (
                  <span className={latencyInfo.color}>{latencyInfo.value}</span>
                )}

                {showCollaborators && collaborators.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {collaborators.length}
                  </span>
                )}

                {connectionState.uptime > 0 && !compact && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatUptime(connectionState.uptime)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Expand/Collapse button */}
              {(showDetails || showMetrics || showCollaborators) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 rounded-md hover:bg-white/50 transition-colors"
                  title={isExpanded ? "Collapse" : "Expand details"}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Activity className="w-4 h-4 text-gray-600" />
                  </motion.div>
                </button>
              )}

              {/* Settings button */}
              {allowSettingsToggle && (
                <button
                  onClick={onSettingsClick}
                  className="p-1 rounded-md hover:bg-white/50 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
              )}

              {/* Manual reconnect button */}
              {allowManualReconnect &&
                (!connected || connectionState.error) && (
                  <button
                    onClick={handleManualReconnect}
                    className="p-1 rounded-md hover:bg-white/50 transition-colors"
                    title="Reconnect manually"
                    disabled={connecting}
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-600 ${connecting ? "animate-spin" : ""}`}
                    />
                  </button>
                )}

              {/* Close button for auto-hide mode */}
              {autoHide && (
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 rounded-md hover:bg-white/50 transition-colors"
                  title="Hide"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200"
            >
              {/* Connection Details */}
              {showDetails && (
                <div className="p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Connection Details
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="capitalize">
                        {connectionState.status}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{formatUptime(connectionState.uptime)}</span>
                    </div>

                    {connectionState.reconnectAttempts > 0 && (
                      <div className="flex justify-between">
                        <span>Reconnects:</span>
                        <span>{connectionState.reconnectAttempts}</span>
                      </div>
                    )}

                    {connectionState.errorCount > 0 && (
                      <div className="flex justify-between">
                        <span>Errors:</span>
                        <span>{connectionState.errorCount}</span>
                      </div>
                    )}
                  </div>

                  {connectionState.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {connectionState.error}
                    </div>
                  )}
                </div>
              )}

              {/* Collaborators */}
              {showCollaborators && collaborators.length > 0 && (
                <div className="p-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Active Collaborators ({collaborators.length})
                  </div>

                  <div className="space-y-2">
                    {collaborators.slice(0, 5).map((collaborator) => (
                      <div
                        key={collaborator.userId}
                        className="flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-xs text-gray-700 flex-1">
                          {collaborator.userName}
                        </span>
                        {collaborator.isTyping && (
                          <div className="text-xs text-yellow-600">
                            typing...
                          </div>
                        )}
                        {collaborator.currentField && (
                          <div className="text-xs text-blue-600">
                            {collaborator.currentField}
                          </div>
                        )}
                      </div>
                    ))}

                    {collaborators.length > 5 && (
                      <div className="text-xs text-gray-500">
                        +{collaborators.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Metrics */}
              {showMetrics && metrics && (
                <div className="p-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Service Metrics
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Events:</span>
                      <span>{metrics.totalEvents.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Events/sec:</span>
                      <span>{metrics.eventsPerSecond}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Active Rooms:</span>
                      <span>{metrics.activeRooms}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Subscriptions:</span>
                      <span>{metrics.activeSubscriptions}</span>
                    </div>

                    {metrics.memoryUsage > 0 && (
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span>
                          {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </div>
                    )}

                    {metrics.errorRate > 0 && (
                      <div className="flex justify-between">
                        <span>Error Rate:</span>
                        <span className="text-red-600">
                          {metrics.errorRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Health Indicator Bar */}
        <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
          <motion.div
            className={`h-full transition-colors duration-500 ${
              healthy && connected
                ? "bg-green-400"
                : connected && !healthy
                  ? "bg-yellow-400"
                  : connectionState.error
                    ? "bg-red-400"
                    : "bg-gray-400"
            }`}
            initial={{ width: 0 }}
            animate={{
              width:
                healthy && connected
                  ? "100%"
                  : connected && !healthy
                    ? "60%"
                    : connectionState.error
                      ? "30%"
                      : "0%",
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UnifiedConnectionStatus;

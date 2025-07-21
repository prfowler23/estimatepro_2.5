"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ErrorMessage,
  ErrorRecoveryAction,
} from "@/lib/error/error-recovery-engine";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

export interface SmartErrorNotificationProps {
  errorMessage: ErrorMessage;
  onDismiss: () => void;
  onActionExecute?: (action: ErrorRecoveryAction) => Promise<void>;
  onRetry?: () => void;
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

export function SmartErrorNotification({
  errorMessage,
  onDismiss,
  onActionExecute,
  onRetry,
  position = "top-right",
  autoHide = false,
  autoHideDelay = 5000,
  className = "",
}: SmartErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && errorMessage.severity !== "error") {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      setAutoHideTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [autoHide, autoHideDelay, errorMessage.severity]);

  // Clear auto-hide timer on user interaction
  const pauseAutoHide = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Allow exit animation
  };

  const handleActionExecute = async (action: ErrorRecoveryAction) => {
    if (!onActionExecute) return;

    pauseAutoHide();
    setExecutingAction(action.id);

    try {
      await onActionExecute(action);

      // Auto-dismiss after successful action execution
      if (action.type === "auto") {
        setTimeout(handleDismiss, 1000);
      }
    } catch (error) {
      console.error("Action execution failed:", error);
    } finally {
      setExecutingAction(null);
    }
  };

  const getSeverityConfig = () => {
    switch (errorMessage.severity) {
      case "error":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          badgeColor: "bg-red-100 text-red-800",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          badgeColor: "bg-yellow-100 text-yellow-800",
        };
      case "info":
        return {
          icon: <Info className="w-5 h-5" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          badgeColor: "bg-blue-100 text-blue-800",
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          badgeColor: "bg-gray-100 text-gray-800",
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "top-4 right-4";
      case "top-center":
        return "top-4 left-1/2 transform -translate-x-1/2";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-center":
        return "bottom-4 left-1/2 transform -translate-x-1/2";
      default:
        return "top-4 right-4";
    }
  };

  const config = getSeverityConfig();
  const primaryAction = errorMessage.recoveryActions[0];
  const hasMultipleActions = errorMessage.recoveryActions.length > 1;

  if (!isVisible) return null;

  const notification = (
    <div
      className={`
        fixed z-50 max-w-md w-full transition-all duration-300 ease-in-out
        ${getPositionClasses()}
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
        ${className}
      `}
      onMouseEnter={pauseAutoHide}
    >
      <div
        className={`
        bg-white rounded-lg shadow-lg border-2 overflow-hidden
        ${config.borderColor}
      `}
      >
        {/* Header */}
        <div className={`p-4 ${config.bgColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {errorMessage.title}
                  </h4>
                  <Badge className={`text-xs ${config.badgeColor}`}>
                    {errorMessage.category.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700">
                  {errorMessage.userFriendly}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-hide progress bar */}
          {autoHide && autoHideTimer && errorMessage.severity !== "error" && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-gray-400 h-1 rounded-full transition-all ease-linear"
                  style={{
                    animation: `shrink ${autoHideDelay}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-white">
          {/* Primary Action */}
          {primaryAction && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                onClick={() => handleActionExecute(primaryAction)}
                disabled={executingAction === primaryAction.id}
                size="sm"
                className="flex-1"
              >
                {executingAction === primaryAction.id ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {primaryAction.type === "auto" && (
                      <RefreshCw className="w-3 h-3 mr-2" />
                    )}
                    {primaryAction.type === "user-action" && (
                      <ChevronRight className="w-3 h-3 mr-2" />
                    )}
                    {primaryAction.type === "guidance" && (
                      <HelpCircle className="w-3 h-3 mr-2" />
                    )}
                    {primaryAction.label}
                  </>
                )}
              </Button>

              {onRetry && errorMessage.canRetry && (
                <Button onClick={onRetry} variant="outline" size="sm">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Additional Actions */}
          {hasMultipleActions && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>{isExpanded ? "Fewer" : "More"} options</span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              <div className="text-xs text-gray-500">
                {errorMessage.recoveryActions.length} options available
              </div>
            </div>
          )}

          {/* Expanded Actions */}
          {isExpanded && hasMultipleActions && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {errorMessage.recoveryActions.slice(1).map((action) => (
                <Button
                  key={action.id}
                  onClick={() => handleActionExecute(action)}
                  disabled={executingAction === action.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  {executingAction === action.id ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {action.type === "auto" && (
                        <RefreshCw className="w-3 h-3 mr-2" />
                      )}
                      {action.type === "user-action" && (
                        <ChevronRight className="w-3 h-3 mr-2" />
                      )}
                      {action.type === "guidance" && (
                        <HelpCircle className="w-3 h-3 mr-2" />
                      )}
                      <span className="flex-1 text-left">{action.label}</span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Help Content Preview */}
          {errorMessage.helpContent && !isExpanded && (
            <div className="mt-3 pt-3 border-t">
              <button
                onClick={() => setIsExpanded(true)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <HelpCircle className="w-3 h-3" />
                <span>View help for this issue</span>
              </button>
            </div>
          )}

          {/* Help Content */}
          {isExpanded && errorMessage.helpContent && (
            <div className="mt-3 pt-3 border-t">
              <h5 className="font-medium text-gray-900 mb-2">
                {errorMessage.helpContent.title}
              </h5>
              <p className="text-sm text-gray-600">
                {errorMessage.helpContent.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render in portal if we're in the browser
  if (typeof window !== "undefined") {
    return createPortal(notification, document.body);
  }

  return notification;
}

// CSS for auto-hide animation
const styles = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;

// Inject styles if not already present
if (
  typeof window !== "undefined" &&
  !document.getElementById("smart-error-notification-styles")
) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "smart-error-notification-styles";
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default SmartErrorNotification;

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  RefreshCw,
  Copy,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Zap,
  Timer,
  WifiOff,
  Shield,
  Settings,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useFocusManager } from "./focus-management";

// Notification types and severity levels
export type NotificationType = "success" | "error" | "warning" | "info";
export type NotificationSeverity = "low" | "medium" | "high" | "critical";
export type NotificationPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center";

// Recovery action types
export interface RecoveryAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary" | "outline";
  autoFocus?: boolean;
  async?: boolean;
  handler: () => void | Promise<void>;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  dismissible?: boolean;
  recoveryActions?: RecoveryAction[];
  metadata?: Record<string, any>;
  timestamp: Date;
  context?: {
    stepId?: string;
    userId?: string;
    sessionId?: string;
    component?: string;
  };
}

// Styled variants for notifications
const notificationVariants = cva(
  "relative w-full max-w-md rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ease-out",
  {
    variants: {
      type: {
        success:
          "border-success-300 bg-success-50/95 text-success-800 shadow-success-100",
        error:
          "border-error-300 bg-error-50/95 text-error-800 shadow-error-100",
        warning:
          "border-warning-300 bg-warning-50/95 text-warning-800 shadow-warning-100",
        info: "border-primary-300 bg-primary-50/95 text-primary-800 shadow-primary-100",
      },
      severity: {
        low: "shadow-sm",
        medium: "shadow-md",
        high: "shadow-lg ring-1 ring-black/5",
        critical: "shadow-xl ring-2 ring-current/20 animate-pulse",
      },
      size: {
        compact: "p-3 text-sm",
        default: "p-4",
        expanded: "p-6 text-base",
      },
    },
    defaultVariants: {
      type: "info",
      severity: "medium",
      size: "default",
    },
  },
);

// Notification Context for global state management
interface NotificationContextType {
  notifications: NotificationData[];
  addNotification: (
    notification: Omit<NotificationData, "id" | "timestamp">,
  ) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateNotification: (id: string, updates: Partial<NotificationData>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Helper function to get appropriate icon
const getNotificationIcon = (
  type: NotificationType,
  severity: NotificationSeverity,
) => {
  const iconMap = {
    success: CheckCircle,
    error: severity === "critical" ? AlertTriangle : AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  return iconMap[type];
};

// Individual notification component
interface StandardizedNotificationProps
  extends VariantProps<typeof notificationVariants> {
  notification: NotificationData;
  position?: NotificationPosition;
  onDismiss?: (id: string) => void;
  onActionExecute?: (actionId: string, notificationId: string) => void;
  className?: string;
}

export function StandardizedNotification({
  notification,
  position = "top-right",
  onDismiss,
  onActionExecute,
  className,
}: StandardizedNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { announceToScreenReader } = useFocusManager();

  const Icon = getNotificationIcon(notification.type, notification.severity);

  // Auto-dismiss logic
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  // Announce notification to screen readers
  useEffect(() => {
    const priority =
      notification.severity === "critical" || notification.type === "error"
        ? "assertive"
        : "polite";

    announceToScreenReader(
      `${notification.type}: ${notification.title}. ${notification.message}`,
      priority,
    );
  }, [notification, announceToScreenReader]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(notification.id), 300);
  }, [notification.id, onDismiss]);

  const handleActionExecute = useCallback(
    async (action: RecoveryAction) => {
      if (action.async) {
        setActionLoading(action.id);
      }

      try {
        await action.handler();
        onActionExecute?.(action.id, notification.id);

        // Auto-dismiss on successful action if it's not critical
        if (notification.severity !== "critical") {
          handleDismiss();
        }
      } catch (error) {
        console.error(`Recovery action failed: ${action.id}`, error);
      } finally {
        setActionLoading(null);
      }
    },
    [notification, onActionExecute, handleDismiss],
  );

  const getPositionClasses = (pos: NotificationPosition): string => {
    const positionMap = {
      "top-left": "top-4 left-4",
      "top-center": "top-4 left-1/2 transform -translate-x-1/2",
      "top-right": "top-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
      "bottom-right": "bottom-4 right-4",
      center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
    };
    return positionMap[pos];
  };

  const getAnimationProps = (pos: NotificationPosition) => {
    const isTop = pos.includes("top");
    const isLeft = pos.includes("left");
    const isRight = pos.includes("right");
    const isCenter = pos.includes("center");

    return {
      initial: {
        opacity: 0,
        scale: 0.9,
        y: isTop ? -20 : 20,
        x: isLeft ? -20 : isRight ? 20 : 0,
      },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        x: 0,
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        y: isTop ? -10 : 10,
        x: isLeft ? -10 : isRight ? 10 : 0,
      },
    };
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={cn(
        "fixed z-50 pointer-events-auto",
        getPositionClasses(position),
      )}
      {...getAnimationProps(position)}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className={cn(
          notificationVariants({
            type: notification.type,
            severity: notification.severity,
          }),
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight">
                {notification.title}
              </h4>
              <p className="text-sm opacity-90 mt-1 leading-relaxed">
                {notification.message}
              </p>
            </div>
          </div>

          {/* Dismiss Button */}
          {notification.dismissible !== false && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDismiss}
              className="text-current opacity-60 hover:opacity-100 -mr-1 -mt-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Recovery Actions */}
        {notification.recoveryActions &&
          notification.recoveryActions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {notification.recoveryActions.map((action, index) => {
                const ActionIcon = action.icon;
                const isLoading = actionLoading === action.id;

                return (
                  <Button
                    key={action.id}
                    variant={
                      action.variant || (index === 0 ? "default" : "outline")
                    }
                    size="sm"
                    onClick={() => handleActionExecute(action)}
                    disabled={isLoading || actionLoading !== null}
                    className="text-xs"
                    loading={isLoading}
                    autoFocus={action.autoFocus && index === 0}
                    ariaLabel={`${action.label} for ${notification.title}`}
                  >
                    {!isLoading && ActionIcon && (
                      <ActionIcon className="w-3 h-3 mr-1" />
                    )}
                    {action.label}
                    {action.async && !isLoading && (
                      <ArrowRight className="w-3 h-3 ml-1" />
                    )}
                  </Button>
                );
              })}
            </div>
          )}

        {/* Metadata/Debug Info (Development only) */}
        {process.env.NODE_ENV === "development" && notification.metadata && (
          <details className="mt-3 text-xs opacity-70">
            <summary className="cursor-pointer hover:opacity-100">
              Debug Info
            </summary>
            <pre className="mt-1 p-2 bg-black/10 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  ...notification.metadata,
                  context: notification.context,
                  timestamp: notification.timestamp.toISOString(),
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}

        {/* Progress indicator for auto-dismiss */}
        {notification.duration && notification.duration > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-current rounded-b-lg opacity-30"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{
              duration: notification.duration / 1000,
              ease: "linear",
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

// Notification Provider Component
interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultPosition?: NotificationPosition;
  defaultDuration?: number;
}

export function NotificationProvider({
  children,
  maxNotifications = 5,
  defaultPosition = "top-right",
  defaultDuration = 5000,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback(
    (notificationData: Omit<NotificationData, "id" | "timestamp">): string => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notification: NotificationData = {
        ...notificationData,
        id,
        timestamp: new Date(),
        duration: notificationData.duration ?? defaultDuration,
      };

      setNotifications((prev) => {
        const updated = [notification, ...prev];
        return updated.slice(0, maxNotifications);
      });

      return id;
    },
    [maxNotifications, defaultDuration],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback(
    (id: string, updates: Partial<NotificationData>) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      );
    },
    [],
  );

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    updateNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Render notifications */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <StandardizedNotification
              key={notification.id}
              notification={notification}
              position={defaultPosition}
              onDismiss={removeNotification}
              style={{ zIndex: 1000 - index }}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}

// Convenience hooks for specific notification types
export function useSuccessNotification() {
  const { addNotification } = useNotifications();

  return useCallback(
    (
      title: string,
      message: string,
      options?: Partial<Omit<NotificationData, "type" | "title" | "message">>,
    ) => {
      return addNotification({
        type: "success",
        severity: "medium",
        title,
        message,
        duration: 4000,
        ...options,
      });
    },
    [addNotification],
  );
}

export function useErrorNotification() {
  const { addNotification } = useNotifications();

  return useCallback(
    (
      title: string,
      message: string,
      options?: Partial<Omit<NotificationData, "type" | "title" | "message">>,
    ) => {
      const defaultRecoveryActions: RecoveryAction[] = [
        {
          id: "retry",
          label: "Try Again",
          icon: RefreshCw,
          variant: "primary",
          handler: () => window.location.reload(),
        },
        {
          id: "report",
          label: "Report Issue",
          icon: MessageCircle,
          variant: "outline",
          handler: () => {
            // Open support or issue reporting
            // TODO: Implement issue reporting functionality
          },
        },
      ];

      return addNotification({
        type: "error",
        severity: "high",
        title,
        message,
        duration: 0, // Don't auto-dismiss errors
        recoveryActions: defaultRecoveryActions,
        ...options,
      });
    },
    [addNotification],
  );
}

export function useWarningNotification() {
  const { addNotification } = useNotifications();

  return useCallback(
    (
      title: string,
      message: string,
      options?: Partial<Omit<NotificationData, "type" | "title" | "message">>,
    ) => {
      return addNotification({
        type: "warning",
        severity: "medium",
        title,
        message,
        duration: 6000,
        ...options,
      });
    },
    [addNotification],
  );
}

export function useInfoNotification() {
  const { addNotification } = useNotifications();

  return useCallback(
    (
      title: string,
      message: string,
      options?: Partial<Omit<NotificationData, "type" | "title" | "message">>,
    ) => {
      return addNotification({
        type: "info",
        severity: "low",
        title,
        message,
        duration: 5000,
        ...options,
      });
    },
    [addNotification],
  );
}

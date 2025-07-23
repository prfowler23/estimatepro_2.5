import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  X,
  Copy,
  ExternalLink,
  MessageCircle,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const errorAlertVariants = cva(
  "relative w-full rounded-lg border p-4 transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        error:
          "border-error-300 bg-error-50/50 text-error-800 [&>svg]:text-error-600 shadow-sm shadow-error-100",
        warning:
          "border-warning-300 bg-warning-50/50 text-warning-800 [&>svg]:text-warning-600 shadow-sm shadow-warning-100",
        success:
          "border-success-300 bg-success-50/50 text-success-800 [&>svg]:text-success-600 shadow-sm shadow-success-100",
        info: "border-primary-300 bg-primary-50/50 text-primary-800 [&>svg]:text-primary-600 shadow-sm shadow-primary-100",
        network:
          "border-orange-300 bg-orange-50/50 text-orange-800 [&>svg]:text-orange-600 shadow-sm shadow-orange-100",
      },
      size: {
        sm: "p-3 text-sm",
        default: "p-4",
        lg: "p-6 text-base",
      },
    },
    defaultVariants: {
      variant: "error",
      size: "default",
    },
  },
);

// Common error types and their recovery suggestions
const errorRecoveryMap = {
  network: {
    title: "Connection Error",
    icon: WifiOff,
    suggestions: [
      { label: "Check your internet connection", action: "checkConnection" },
      { label: "Try again", action: "retry" },
      { label: "Work offline", action: "goOffline" },
    ],
  },
  authentication: {
    title: "Authentication Error",
    icon: AlertCircle,
    suggestions: [
      { label: "Sign in again", action: "signIn" },
      { label: "Reset password", action: "resetPassword" },
      { label: "Contact support", action: "contactSupport" },
    ],
  },
  validation: {
    title: "Validation Error",
    icon: AlertTriangle,
    suggestions: [
      { label: "Review your input", action: "reviewInput" },
      { label: "Clear form", action: "clearForm" },
      { label: "See example", action: "showExample" },
    ],
  },
  server: {
    title: "Server Error",
    icon: AlertCircle,
    suggestions: [
      { label: "Try again", action: "retry" },
      { label: "Check status page", action: "checkStatus" },
      { label: "Report issue", action: "reportIssue" },
    ],
  },
  permission: {
    title: "Permission Denied",
    icon: AlertCircle,
    suggestions: [
      { label: "Request access", action: "requestAccess" },
      { label: "Sign in with different account", action: "switchAccount" },
      { label: "Contact admin", action: "contactAdmin" },
    ],
  },
  quota: {
    title: "Quota Exceeded",
    icon: AlertTriangle,
    suggestions: [
      { label: "Upgrade plan", action: "upgradePlan" },
      { label: "Reduce usage", action: "reduceUsage" },
      { label: "Contact sales", action: "contactSales" },
    ],
  },
} as const;

export interface ErrorAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorAlertVariants> {
  title?: string;
  description?: string;
  errorType?: keyof typeof errorRecoveryMap;
  errorCode?: string;
  dismissible?: boolean;
  retryable?: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
  onAction?: (action: string) => void;
  showDetails?: boolean;
  details?: string;
  recoveryActions?: Array<{
    label: string;
    action: string;
    variant?: "default" | "outline" | "ghost";
    icon?: React.ComponentType<any>;
  }>;
  animate?: boolean;
}

const ErrorAlert = React.forwardRef<HTMLDivElement, ErrorAlertProps>(
  (
    {
      className,
      variant = "error",
      size,
      title,
      description,
      errorType,
      errorCode,
      dismissible = true,
      retryable = false,
      onDismiss,
      onRetry,
      onAction,
      showDetails = false,
      details,
      recoveryActions,
      animate = true,
      children,
      ...props
    },
    ref,
  ) => {
    const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);

    // Determine error configuration
    const errorConfig = errorType ? errorRecoveryMap[errorType] : null;
    const IconComponent = errorConfig?.icon || AlertCircle;

    // Default recovery actions based on error type
    const defaultRecoveryActions = errorConfig?.suggestions || [];
    const finalRecoveryActions = recoveryActions || defaultRecoveryActions;

    const handleAction = (action: string) => {
      onAction?.(action);

      // Handle common actions
      if (action === "retry" && onRetry) {
        onRetry();
      }
    };

    const handleCopyError = async () => {
      const errorText = `${title || errorConfig?.title || "Error"}: ${description}${errorCode ? ` (Code: ${errorCode})` : ""}${details ? `\n\nDetails: ${details}` : ""}`;

      try {
        await navigator.clipboard.writeText(errorText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.warn("Failed to copy to clipboard:", err);
      }
    };

    const alertContent = (
      <div
        ref={ref}
        role="alert"
        className={cn(errorAlertVariants({ variant, size }), className)}
        {...props}
      >
        {/* Main error content */}
        <div className="flex items-start gap-3">
          <IconComponent className="h-5 w-5 mt-0.5 shrink-0" />

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-semibold leading-none">
                {title || errorConfig?.title || "An error occurred"}
              </h4>

              <div className="flex items-center gap-1 shrink-0">
                {/* Error code badge */}
                {errorCode && (
                  <span className="px-2 py-1 text-xs font-mono bg-white/60 rounded border">
                    {errorCode}
                  </span>
                )}

                {/* Copy button */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyError}
                  className="h-6 w-6"
                  title="Copy error details"
                >
                  {isCopied ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>

                {/* Dismiss button */}
                {dismissible && onDismiss && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDismiss}
                    className="h-6 w-6"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm leading-relaxed mb-3 opacity-90">
                {description}
              </p>
            )}

            {/* Children content */}
            {children && <div className="mb-3">{children}</div>}

            {/* Recovery actions */}
            {finalRecoveryActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {retryable && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="bg-white/60 hover:bg-white/80"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                )}

                {finalRecoveryActions.slice(0, 3).map((action) => {
                  const ActionIcon = action.icon || ArrowRight;
                  return (
                    <Button
                      key={action.action}
                      variant={action.variant || "outline"}
                      size="sm"
                      onClick={() => handleAction(action.action)}
                      className="bg-white/60 hover:bg-white/80"
                    >
                      <ActionIcon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Details toggle */}
            {(details || showDetails) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="text-xs p-0 h-auto font-medium hover:bg-transparent"
                >
                  {isDetailsExpanded ? "Hide" : "Show"} details
                  <motion.div
                    animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-1"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </motion.div>
                </Button>

                <AnimatePresence>
                  {isDetailsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-3 bg-white/40 rounded border text-xs font-mono whitespace-pre-wrap">
                        {details || "No additional details available."}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>
    );

    if (!animate) return alertContent;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {alertContent}
      </motion.div>
    );
  },
);
ErrorAlert.displayName = "ErrorAlert";

// Specialized error alert components
const NetworkErrorAlert = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorAlertProps, "errorType" | "variant">
>((props, ref) => (
  <ErrorAlert
    ref={ref}
    variant="network"
    errorType="network"
    retryable
    {...props}
  />
));
NetworkErrorAlert.displayName = "NetworkErrorAlert";

const ValidationErrorAlert = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorAlertProps, "errorType" | "variant">
>((props, ref) => (
  <ErrorAlert ref={ref} variant="warning" errorType="validation" {...props} />
));
ValidationErrorAlert.displayName = "ValidationErrorAlert";

const ServerErrorAlert = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorAlertProps, "errorType" | "variant">
>((props, ref) => (
  <ErrorAlert
    ref={ref}
    variant="error"
    errorType="server"
    retryable
    {...props}
  />
));
ServerErrorAlert.displayName = "ServerErrorAlert";

const PermissionErrorAlert = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorAlertProps, "errorType" | "variant">
>((props, ref) => (
  <ErrorAlert ref={ref} variant="warning" errorType="permission" {...props} />
));
PermissionErrorAlert.displayName = "PermissionErrorAlert";

export {
  ErrorAlert,
  NetworkErrorAlert,
  ValidationErrorAlert,
  ServerErrorAlert,
  PermissionErrorAlert,
};

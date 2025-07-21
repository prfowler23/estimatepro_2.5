"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience hooks for different toast types
export function useToastActions() {
  const { addToast } = useToast();

  const success = useCallback(
    (title: string, description?: string) => {
      addToast({
        title,
        description,
        type: "success",
        duration: 5000,
        dismissible: true,
      });
    },
    [addToast],
  );

  const error = useCallback(
    (title: string, description?: string) => {
      addToast({
        title,
        description,
        type: "error",
        duration: 8000,
        dismissible: true,
      });
    },
    [addToast],
  );

  const warning = useCallback(
    (title: string, description?: string) => {
      addToast({
        title,
        description,
        type: "warning",
        duration: 6000,
        dismissible: true,
      });
    },
    [addToast],
  );

  const info = useCallback(
    (title: string, description?: string) => {
      addToast({
        title,
        description,
        type: "info",
        duration: 4000,
        dismissible: true,
      });
    },
    [addToast],
  );

  return { success, error, warning, info };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      dismissible: true,
      duration: 5000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const { id, title, description, type, action, dismissible } = toast;

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "text-green-600",
      titleColor: "text-green-900",
      descriptionColor: "text-green-700",
    },
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      descriptionColor: "text-red-700",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-900",
      descriptionColor: "text-yellow-700",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
      descriptionColor: "text-blue-700",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} 
        border rounded-lg p-4 shadow-lg animate-in slide-in-from-right-full
        flex items-start gap-3
      `}
    >
      <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />

      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${config.titleColor} text-sm`}>{title}</h4>
        {description && (
          <p className={`mt-1 ${config.descriptionColor} text-sm`}>
            {description}
          </p>
        )}
        {action && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-8 text-xs"
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(id)}
          className="h-6 w-6 p-0 hover:bg-black/10 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Utility function to replace alert() calls
export function showToast(
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) {
  // This is a utility function that can be used to programmatically show toasts
  // In practice, you would use the useToastActions hook within components
  console.warn(
    "showToast called outside of component context. Use useToastActions hook instead.",
  );
  console.log(`Toast: ${type.toUpperCase()} - ${message}`);
}

export default ToastProvider;

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Globe,
  Bot,
  Zap,
} from "lucide-react";

interface LoadingStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "success" | "error";
  icon?: React.ReactNode;
  error?: string;
}

interface AppLoadingProps {
  title?: string;
  description?: string;
  steps?: LoadingStep[];
  progress?: number;
  showProgress?: boolean;
  onRetry?: () => void;
  variant?: "default" | "minimal" | "fullscreen";
}

export function AppLoading({
  title = "Loading EstimatePro",
  description = "Please wait while we prepare your experience...",
  steps = [],
  progress,
  showProgress = false,
  onRetry,
  variant = "default",
}: AppLoadingProps) {
  const getStepIcon = (step: LoadingStep) => {
    if (step.icon) return step.icon;

    switch (step.status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (step: LoadingStep) => {
    switch (step.status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "loading":
        return "text-blue-600";
      default:
        return "text-gray-400";
    }
  };

  const getStepBackground = (step: LoadingStep) => {
    switch (step.status) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "loading":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const content = (
    <div className="text-center space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex justify-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      </div>

      {/* Progress Bar */}
      {showProgress && progress !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Loading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full max-w-md mx-auto" />
        </div>
      )}

      {/* Loading Steps */}
      {steps.length > 0 && (
        <div className="space-y-2 max-w-md mx-auto">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${getStepBackground(step)}`}
            >
              {getStepIcon(step)}
              <div className="flex-1 text-left">
                <div className={`font-medium ${getStepColor(step)}`}>
                  {step.label}
                </div>
                {step.error && (
                  <div className="text-xs text-red-600 mt-1">{step.error}</div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {step.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Retry Button */}
      {onRetry && steps.some((step) => step.status === "error") && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      )}

      {/* System Status Indicators */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          <span>Database</span>
        </div>
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          <span>Auth</span>
        </div>
        <div className="flex items-center gap-1">
          <Bot className="h-3 w-3" />
          <span>AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>Features</span>
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case "minimal":
      return (
        <div className="flex items-center justify-center p-4">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      );

    case "fullscreen":
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">{content}</CardContent>
          </Card>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">{content}</CardContent>
          </Card>
        </div>
      );
  }
}

// Predefined loading states
export const LoadingStates = {
  // Startup loading
  startup: {
    title: "Starting EstimatePro",
    description: "Initializing your workspace...",
    steps: [
      {
        id: "config",
        label: "Loading Configuration",
        status: "loading" as const,
      },
      {
        id: "auth",
        label: "Checking Authentication",
        status: "pending" as const,
      },
      {
        id: "database",
        label: "Connecting to Database",
        status: "pending" as const,
      },
      { id: "features", label: "Loading Features", status: "pending" as const },
    ],
    showProgress: true,
  },

  // Authentication loading
  authentication: {
    title: "Signing You In",
    description: "Verifying your credentials...",
    steps: [
      {
        id: "credentials",
        label: "Validating Credentials",
        status: "loading" as const,
      },
      { id: "session", label: "Creating Session", status: "pending" as const },
      {
        id: "redirect",
        label: "Redirecting to Dashboard",
        status: "pending" as const,
      },
    ],
    showProgress: true,
  },

  // Data loading
  data: {
    title: "Loading Your Data",
    description: "Fetching your estimates and analytics...",
    steps: [
      {
        id: "estimates",
        label: "Loading Estimates",
        status: "loading" as const,
      },
      {
        id: "analytics",
        label: "Loading Analytics",
        status: "pending" as const,
      },
      {
        id: "preferences",
        label: "Loading Preferences",
        status: "pending" as const,
      },
    ],
    showProgress: true,
  },

  // Feature loading
  feature: {
    title: "Loading Feature",
    description: "Preparing the requested feature...",
    variant: "minimal" as const,
  },

  // Error recovery
  recovery: {
    title: "Recovering Session",
    description: "Attempting to restore your previous session...",
    steps: [
      {
        id: "check",
        label: "Checking for Recovery Data",
        status: "loading" as const,
      },
      { id: "restore", label: "Restoring Session", status: "pending" as const },
      { id: "validate", label: "Validating Data", status: "pending" as const },
    ],
    showProgress: true,
  },
};

"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiFallbackService } from "@/lib/ai/ai-fallback-service";
import { aiGracefulDegradation } from "@/lib/ai/ai-graceful-degradation";
import {
  ModelHealthStatus,
  DegradationLevel,
  AI_CONSTANTS,
} from "@/lib/types/ai-types";

interface AIErrorRecoveryProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AIErrorRecovery({
  error,
  onRetry,
  onDismiss,
  className,
}: AIErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    setIsRetrying(true);
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      AI_CONSTANTS.RETRY_BASE_DELAY * Math.pow(2, newRetryCount),
      AI_CONSTANTS.RETRY_MAX_DELAY,
    );
    const jitter = Math.random() * 100;
    const delay = baseDelay + jitter;

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (onRetry) {
      onRetry();
    }

    setIsRetrying(false);
  };

  const getErrorInfo = () => {
    if (!error) return null;

    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("rate limit")) {
      return {
        type: "rate-limit",
        title: "Rate Limit Reached",
        description:
          "You've made too many requests. Please wait a moment before trying again.",
        icon: Clock,
        color: "text-yellow-600",
        canRetry: false,
      };
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return {
        type: "network",
        title: "Network Error",
        description:
          "Unable to connect to AI services. Please check your internet connection.",
        icon: WifiOff,
        color: "text-red-600",
        canRetry: true,
      };
    }

    if (errorMessage.includes("timeout")) {
      return {
        type: "timeout",
        title: "Request Timeout",
        description: "The request took too long. The AI service might be busy.",
        icon: Clock,
        color: "text-orange-600",
        canRetry: true,
      };
    }

    if (errorMessage.includes("model")) {
      return {
        type: "model",
        title: "AI Model Error",
        description:
          "The AI model encountered an issue. We'll try a different model.",
        icon: AlertCircle,
        color: "text-yellow-600",
        canRetry: true,
      };
    }

    return {
      type: "general",
      title: "AI Service Error",
      description:
        "Something went wrong with the AI service. Please try again.",
      icon: AlertCircle,
      color: "text-red-600",
      canRetry: true,
    };
  };

  const errorInfo = getErrorInfo();

  if (!error || !errorInfo) return null;

  const Icon = errorInfo.icon;

  return (
    <Alert className={cn("border-red-200 bg-red-50", className)}>
      <Icon className={cn("h-4 w-4", errorInfo.color)} />
      <AlertTitle>{errorInfo.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{errorInfo.description}</p>
          {retryCount >= AI_CONSTANTS.RETRY_MAX_ATTEMPTS && (
            <p className="text-sm text-muted-foreground">
              Multiple retry attempts failed. The service might be experiencing
              issues.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {errorInfo.canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface AIServiceStatusProps {
  className?: string;
}

export function AIServiceStatus({ className }: AIServiceStatusProps) {
  const [modelHealth, setModelHealth] = useState<ModelHealthStatus | null>(
    null,
  );
  const [degradationLevel, setDegradationLevel] =
    useState<DegradationLevel | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setModelHealth(aiFallbackService.getModelHealthStatus());
      setDegradationLevel(aiGracefulDegradation.getDegradationLevel());
    };

    updateStatus();
    const interval = setInterval(updateStatus, AI_CONSTANTS.POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  if (!degradationLevel || degradationLevel.level === "full") {
    return null; // Don't show when everything is working
  }

  const getStatusColor = () => {
    switch (degradationLevel.level) {
      case "partial":
        return "border-yellow-200 bg-yellow-50";
      case "offline":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusIcon = () => {
    switch (degradationLevel.level) {
      case "partial":
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-green-600" />;
    }
  };

  return (
    <Card className={cn(getStatusColor(), className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          AI Service Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {degradationLevel.message && (
            <p className="text-sm">{degradationLevel.message}</p>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium">Feature Availability:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(degradationLevel.features).map(
                ([feature, enabled]) => (
                  <div key={feature} className="flex items-center gap-1">
                    {enabled ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="capitalize">
                      {feature.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          {modelHealth && Object.keys(modelHealth).length > 0 && (
            <div className="space-y-2 border-t pt-2">
              <div className="text-xs font-medium">Model Status:</div>
              <div className="space-y-1">
                {Object.entries(modelHealth)
                  .filter(([_, health]) => !health.available)
                  .map(([model, health]) => (
                    <div
                      key={model}
                      className="text-xs flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>{model}: Circuit breaker open</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AIOfflineFallbackProps {
  query: string;
  mode?: string;
  onUseCalculator?: () => void;
  className?: string;
}

export function AIOfflineFallback({
  query,
  mode = "general",
  onUseCalculator,
  className,
}: AIOfflineFallbackProps) {
  const [fallbackResponse] = useState(() =>
    aiGracefulDegradation.getFallbackResponse(query, mode),
  );

  return (
    <Card className={cn("border-orange-200 bg-orange-50", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-orange-600" />
          AI Offline - Alternative Suggestion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm">{fallbackResponse}</p>
          {onUseCalculator && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUseCalculator}
              className="w-full"
            >
              Open Calculator Tools
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AIRetryIndicatorProps {
  attempt: number;
  maxAttempts: number;
  currentModel?: string;
  className?: string;
}

export function AIRetryIndicator({
  attempt,
  maxAttempts,
  currentModel,
  className,
}: AIRetryIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>
        Retry attempt {attempt} of {maxAttempts}
        {currentModel && ` (using ${currentModel})`}
      </span>
    </div>
  );
}

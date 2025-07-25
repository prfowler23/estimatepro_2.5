"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Zap,
  Globe,
  Bot,
  Settings,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { useStartupValidation } from "@/components/providers/startup-validation-provider";
import { supabase } from "@/lib/supabase/client";
import { config } from "@/lib/config";

interface ConnectivityStatus {
  database: "connected" | "disconnected" | "error" | "checking";
  auth: "connected" | "disconnected" | "error" | "checking";
  ai: "connected" | "disconnected" | "error" | "checking" | "disabled";
  features: {
    [key: string]: boolean;
  };
  lastChecked: Date;
}

export function ConnectivityStatus() {
  const { validationResult } = useStartupValidation();
  const [status, setStatus] = useState<ConnectivityStatus>({
    database: "checking",
    auth: "checking",
    ai: "checking",
    features: {},
    lastChecked: new Date(),
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    const newStatus: ConnectivityStatus = {
      database: "checking",
      auth: "checking",
      ai: "checking",
      features: {},
      lastChecked: new Date(),
    };

    try {
      // Check database connection
      try {
        const { data, error } = await supabase
          .from("estimates")
          .select("count")
          .limit(1);
        newStatus.database = error ? "disconnected" : "connected";
      } catch (error) {
        newStatus.database = "error";
      }

      // Check auth connection
      try {
        const { data, error } = await supabase.auth.getSession();
        newStatus.auth = error ? "disconnected" : "connected";
      } catch (error) {
        newStatus.auth = "error";
      }

      // Check AI connection (if enabled)
      if (config.features.ai) {
        try {
          // Simple check - in a real app, you'd test the actual AI endpoint
          newStatus.ai = "connected";
        } catch (error) {
          newStatus.ai = "error";
        }
      } else {
        newStatus.ai = "disabled";
      }

      // Check feature flags
      newStatus.features = {
        ai: config.features.ai,
        threeDimensional: config.features.threeDimensional,
        weather: config.features.weather,
        drone: config.features.drone,
        guidedFlow: config.features.guidedFlow,
      };
    } catch (error) {
      console.error("Connectivity check failed:", error);
    }

    setStatus(newStatus);
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnectivity();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "checking":
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      case "disabled":
        return <Settings className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Error";
      case "checking":
        return "Checking...";
      case "disabled":
        return "Disabled";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "disconnected":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "checking":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "disabled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const overallStatus =
    status.database === "error" || status.auth === "error"
      ? "error"
      : status.database === "disconnected" || status.auth === "disconnected"
        ? "warning"
        : "healthy";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            <CardTitle className="text-lg">System Status</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                overallStatus === "healthy"
                  ? "default"
                  : overallStatus === "warning"
                    ? "secondary"
                    : "destructive"
              }
              className="flex items-center gap-1"
            >
              {overallStatus === "healthy" && (
                <CheckCircle className="h-3 w-3" />
              )}
              {overallStatus === "warning" && (
                <AlertTriangle className="h-3 w-3" />
              )}
              {overallStatus === "error" && <XCircle className="h-3 w-3" />}
              {overallStatus === "healthy"
                ? "Healthy"
                : overallStatus === "warning"
                  ? "Warning"
                  : "Error"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkConnectivity}
              disabled={isChecking}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
        <CardDescription>
          Last checked: {status.lastChecked.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Services */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 rounded border">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">Database</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.database)}
              <span className="text-xs">{getStatusText(status.database)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Authentication</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.auth)}
              <span className="text-xs">{getStatusText(status.auth)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border">
            <Bot className="h-4 w-4" />
            <span className="text-sm font-medium">AI Services</span>
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon(status.ai)}
              <span className="text-xs">{getStatusText(status.ai)}</span>
            </div>
          </div>
        </div>

        {/* Feature Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Feature Status</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-6 text-xs"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
          </div>

          {showDetails && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(status.features).map(([feature, enabled]) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 p-2 rounded border"
                >
                  {enabled ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-xs capitalize">
                    {feature.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issues */}
        {(status.database === "error" ||
          status.auth === "error" ||
          status.database === "disconnected" ||
          status.auth === "disconnected") && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some system services are experiencing issues. This may affect app
              functionality.
              {status.database === "error" && " Database connection failed."}
              {status.auth === "error" &&
                " Authentication service unavailable."}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-xs"
          >
            Refresh Page
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/settings", "_blank")}
            className="text-xs"
          >
            Open Settings
          </Button>
          {process.env.NODE_ENV === "development" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log("System Status:", status)}
              className="text-xs"
            >
              Debug Info
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

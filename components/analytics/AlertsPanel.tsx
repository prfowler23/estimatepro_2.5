"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PredictiveInsight } from "@/lib/types/analytics-types";
import {
  AlertTriangle,
  X,
  Bell,
  Clock,
  Users,
  TrendingDown,
  Zap,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface AlertsPanelProps {
  insights: PredictiveInsight[];
  onAlertDismiss: (alertId: string) => void;
  className?: string;
}

export function AlertsPanel({
  insights,
  onAlertDismiss,
  className = "",
}: AlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [showDismissed, setShowDismissed] = useState(false);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    onAlertDismiss(alertId);
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "medium":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "low":
        return <Bell className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bottleneck_detection":
        return <TrendingDown className="w-4 h-4" />;
      case "completion_prediction":
        return <Clock className="w-4 h-4" />;
      case "quality_prediction":
        return <CheckCircle className="w-4 h-4" />;
      case "resource_optimization":
        return <Zap className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTimeSinceCreated = (createdAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return "Just now";
    }
  };

  const activeAlerts = insights.filter(
    (insight) => !dismissedAlerts.has(insight.insightId),
  );

  const dismissedAlertsList = insights.filter((insight) =>
    dismissedAlerts.has(insight.insightId),
  );

  const criticalAlerts = activeAlerts.filter(
    (alert) => alert.severity === "high",
  );
  const warningAlerts = activeAlerts.filter(
    (alert) => alert.severity === "medium",
  );
  const infoAlerts = activeAlerts.filter((alert) => alert.severity === "low");

  if (activeAlerts.length === 0 && dismissedAlertsList.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold">Active Alerts</h3>
              <Badge variant="destructive" className="text-xs">
                {activeAlerts.length}
              </Badge>
            </div>

            {dismissedAlertsList.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDismissed(!showDismissed)}
                className="flex items-center gap-2"
              >
                {showDismissed ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showDismissed ? "Hide" : "Show"} Dismissed (
                {dismissedAlertsList.length})
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Critical Alerts */}
            {criticalAlerts.map((alert) => (
              <Alert
                key={alert.insightId}
                className={getAlertColor(alert.severity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(alert.type)}
                        <span className="font-medium text-sm">
                          {alert.type
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.prediction}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alert.affectedUsers.length} users
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceCreated(alert.createdAt)}
                        </div>
                        <div>
                          Confidence: {(alert.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(alert.insightId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            ))}

            {/* Warning Alerts */}
            {warningAlerts.map((alert) => (
              <Alert
                key={alert.insightId}
                className={getAlertColor(alert.severity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(alert.type)}
                        <span className="font-medium text-sm">
                          {alert.type
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.prediction}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alert.affectedUsers.length} users
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceCreated(alert.createdAt)}
                        </div>
                        <div>
                          Confidence: {(alert.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(alert.insightId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            ))}

            {/* Info Alerts */}
            {infoAlerts.map((alert) => (
              <Alert
                key={alert.insightId}
                className={getAlertColor(alert.severity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(alert.type)}
                        <span className="font-medium text-sm">
                          {alert.type
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.prediction}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alert.affectedUsers.length} users
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceCreated(alert.createdAt)}
                        </div>
                        <div>
                          Confidence: {(alert.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(alert.insightId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Dismissed Alerts */}
      {showDismissed && dismissedAlertsList.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <EyeOff className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-600">Dismissed Alerts</h3>
            <Badge variant="outline" className="text-xs">
              {dismissedAlertsList.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {dismissedAlertsList.map((alert) => (
              <div
                key={alert.insightId}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(alert.type)}
                      <span className="font-medium text-sm">
                        {alert.type
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Dismissed
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {alert.prediction}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {alert.affectedUsers.length} users
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeSinceCreated(alert.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alert Summary */}
      {activeAlerts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">Alert Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {criticalAlerts.length}
              </div>
              <div className="text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {warningAlerts.length}
              </div>
              <div className="text-gray-600">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {infoAlerts.length}
              </div>
              <div className="text-gray-600">Info</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AlertsPanel;

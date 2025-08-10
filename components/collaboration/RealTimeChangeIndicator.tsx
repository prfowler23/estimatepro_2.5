"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useCollaboration } from "./CollaborationProvider";
import { RealTimeChange } from "@/lib/collaboration/real-time-engine";
import {
  Edit3,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Undo,
  RotateCcw,
  User,
  Calendar,
} from "lucide-react";

interface RealTimeChangeIndicatorProps {
  fieldPath?: string;
  showHistory?: boolean;
  maxChanges?: number;
  compact?: boolean;
  position?: "fixed" | "inline";
  className?: string;
}

export function RealTimeChangeIndicator({
  fieldPath,
  showHistory = false,
  maxChanges = 5,
  compact = false,
  position = "inline",
  className = "",
}: RealTimeChangeIndicatorProps) {
  const {
    pendingChanges,
    conflicts,
    getRecentChanges,
    getFieldStatus,
    resolveConflict,
    currentUser,
  } = useCollaboration();

  const [showChangesList, setShowChangesList] = useState(false);
  const [animatingChanges, setAnimatingChanges] = useState<Set<string>>(
    new Set(),
  );

  // Get changes for specific field or all changes
  const relevantChanges = fieldPath
    ? getRecentChanges(fieldPath).slice(0, maxChanges)
    : pendingChanges.slice(0, maxChanges);

  // Get conflicts for specific field
  const fieldConflicts = conflicts.filter(
    (conflict) => !fieldPath || conflict.fieldPath === fieldPath,
  );

  const fieldStatus = fieldPath ? getFieldStatus(fieldPath) : "available";

  // Animate new changes
  useEffect(() => {
    const newChangeIds = relevantChanges
      .filter((change) => !animatingChanges.has(change.id))
      .map((change) => change.id);

    if (newChangeIds.length > 0) {
      setAnimatingChanges((prev) => new Set([...prev, ...newChangeIds]));

      // Remove animation after delay
      setTimeout(() => {
        setAnimatingChanges((prev) => {
          const updated = new Set(prev);
          newChangeIds.forEach((id) => updated.delete(id));
          return updated;
        });
      }, 2000);
    }
  }, [relevantChanges.length]);

  const getChangeIcon = (changeType: RealTimeChange["changeType"]) => {
    switch (changeType) {
      case "field_update":
        return <Edit3 className="w-3 h-3" />;
      case "step_navigation":
        return <RotateCcw className="w-3 h-3" />;
      case "file_upload":
        return <Calendar className="w-3 h-3" />;
      case "calculation_update":
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Edit3 className="w-3 h-3" />;
    }
  };

  const getChangeColor = (change: RealTimeChange) => {
    if (change.userId === currentUser?.userId) {
      return "text-primary-action bg-primary-action/10 border-primary-action/30";
    }
    return "text-text-secondary bg-bg-subtle border-border-secondary";
  };

  const formatChangeDescription = (change: RealTimeChange) => {
    const fieldName = change.fieldPath.split(".").pop() || change.fieldPath;

    switch (change.changeType) {
      case "field_update":
        return `Updated ${fieldName}`;
      case "step_navigation":
        return `Moved to ${change.stepId}`;
      case "file_upload":
        return `Uploaded file to ${fieldName}`;
      case "calculation_update":
        return `Recalculated ${fieldName}`;
      default:
        return `Modified ${fieldName}`;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const changeTime = new Date(timestamp);
    const diffMs = now.getTime() - changeTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return changeTime.toLocaleDateString();
  };

  // Don't render if no changes and no conflicts
  if (relevantChanges.length === 0 && fieldConflicts.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Field status indicator */}
        {fieldPath && fieldStatus !== "available" && (
          <Badge
            variant={fieldStatus === "editing" ? "default" : "destructive"}
            className="text-xs flex items-center gap-1"
          >
            {fieldStatus === "editing" && <Edit3 className="w-2.5 h-2.5" />}
            {fieldStatus === "locked" && <X className="w-2.5 h-2.5" />}
            {fieldStatus}
          </Badge>
        )}

        {/* Conflict indicator */}
        {fieldConflicts.length > 0 && (
          <Badge
            variant="destructive"
            className="text-xs flex items-center gap-1"
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {fieldConflicts.length} conflict
            {fieldConflicts.length > 1 ? "s" : ""}
          </Badge>
        )}

        {/* Recent changes count */}
        {relevantChanges.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChangesList(!showChangesList)}
            className="h-6 px-2 text-xs"
          >
            <Clock className="w-3 h-3 mr-1" />
            {relevantChanges.length}
          </Button>
        )}

        {/* Changes dropdown */}
        {showChangesList && (
          <div className="absolute top-full left-0 mt-1 z-50">
            <Card className="p-3 w-64 max-h-60 overflow-y-auto shadow-lg">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Recent Changes</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangesList(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {relevantChanges.map((change) => (
                  <div
                    key={change.id}
                    className={`p-2 rounded border text-xs ${getChangeColor(change)} ${
                      animatingChanges.has(change.id) ? "animate-pulse" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {getChangeIcon(change.changeType)}
                        <span className="font-medium">{change.userName}</span>
                      </div>
                      <span className="text-text-muted">
                        {formatTimeAgo(change.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1">
                      {formatChangeDescription(change)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      className={`${position === "fixed" ? "fixed top-4 right-4 z-50" : ""} ${className}`}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Live Activity
            {fieldPath && (
              <span className="text-sm text-text-muted">for {fieldPath}</span>
            )}
          </h3>
          {position === "fixed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChangesList(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Conflicts */}
        {fieldConflicts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-error-600 dark:text-error-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Conflicts ({fieldConflicts.length})
            </h4>
            {fieldConflicts.map((conflict, index) => (
              <Alert key={index} variant="destructive">
                <div className="space-y-2">
                  <p className="text-sm">
                    Conflicting changes detected in {conflict.fieldPath}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        resolveConflict(conflict.id, "accept_incoming")
                      }
                    >
                      Accept Incoming
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveConflict(conflict.id, "keep_local")}
                    >
                      Keep Local
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Field Status */}
        {fieldPath && fieldStatus !== "available" && (
          <div className="p-3 rounded-lg border bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-400/30">
            <div className="flex items-center gap-2">
              {fieldStatus === "editing" && (
                <Edit3 className="w-4 h-4 text-warning-600 dark:text-warning-400" />
              )}
              {fieldStatus === "locked" && (
                <X className="w-4 h-4 text-error-600 dark:text-error-400" />
              )}
              <span className="font-medium">Field is {fieldStatus}</span>
            </div>
            {fieldStatus === "editing" && (
              <p className="text-sm text-text-secondary mt-1">
                Another user is currently editing this field
              </p>
            )}
          </div>
        )}

        {/* Recent Changes */}
        {relevantChanges.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Recent Changes</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {relevantChanges.map((change) => (
                <div
                  key={change.id}
                  className={`p-3 rounded-lg border transition-all ${getChangeColor(change)} ${
                    animatingChanges.has(change.id) ? "scale-105 shadow-md" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChangeIcon(change.changeType)}
                      <span className="font-medium">{change.userName}</span>
                      {change.userId === currentUser?.userId && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatTimeAgo(change.timestamp)}
                    </span>
                  </div>

                  <div className="text-sm">
                    {formatChangeDescription(change)}
                  </div>

                  {/* Show value changes for field updates */}
                  {change.changeType === "field_update" &&
                    change.oldValue !== change.newValue && (
                      <div className="mt-2 p-2 bg-bg-base rounded border border-border-primary text-xs">
                        <div className="space-y-1">
                          <div className="text-error-600 dark:text-error-400">
                            <span className="font-medium">From:</span>{" "}
                            {String(change.oldValue)}
                          </div>
                          <div className="text-success-600 dark:text-success-400">
                            <span className="font-medium">To:</span>{" "}
                            {String(change.newValue)}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* AI confidence indicator */}
                  {change.metadata?.isAIGenerated && (
                    <div className="mt-2 flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        AI Generated
                      </Badge>
                      {change.metadata.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(change.metadata.confidence)}% confidence
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showHistory && relevantChanges.length >= maxChanges && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // Would open full history view
                  // TODO: Implement full history view
                }}
              >
                View Full History
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default RealTimeChangeIndicator;

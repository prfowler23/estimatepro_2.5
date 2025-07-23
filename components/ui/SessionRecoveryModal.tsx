"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { SessionDraft } from "@/lib/services/session-recovery-service";
import {
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  Calendar,
  Monitor,
  Smartphone,
  MapPin,
} from "lucide-react";

interface SessionRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDrafts: SessionDraft[];
  isRecovering: boolean;
  onRecoverSession: (draftId: string) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onDeclineAll: () => void;
}

export function SessionRecoveryModal({
  isOpen,
  onClose,
  availableDrafts,
  isRecovering,
  onRecoverSession,
  onDeleteDraft,
  onDeclineAll,
}: SessionRecoveryModalProps) {
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  const getDeviceIcon = (platform: string) => {
    if (
      platform.toLowerCase().includes("mobile") ||
      platform.toLowerCase().includes("android") ||
      platform.toLowerCase().includes("iphone")
    ) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getRecoverySourceBadge = (
    source: SessionDraft["recovery"]["source"],
  ) => {
    const variants = {
      "auto-save": { color: "bg-blue-100 text-blue-800", label: "Auto-saved" },
      "manual-save": {
        color: "bg-green-100 text-green-800",
        label: "Manual save",
      },
      "tab-close": {
        color: "bg-orange-100 text-orange-800",
        label: "Tab closed",
      },
      "browser-crash": {
        color: "bg-red-100 text-red-800",
        label: "Browser crash",
      },
    };

    const variant = variants[source] || variants["auto-save"];

    return (
      <Badge className={variant.color} variant="secondary">
        {variant.label}
      </Badge>
    );
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const mostRecentDraft = availableDrafts[0];
  const olderDrafts = availableDrafts.slice(1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Recover Your Work
          </DialogTitle>
          <DialogDescription>
            We found {availableDrafts.length} unsaved session
            {availableDrafts.length === 1 ? "" : "s"} from your previous work.
            You can restore your progress or start fresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Most Recent Draft - Featured */}
          {mostRecentDraft && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    Most Recent Session
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Last saved{" "}
                    {formatTimeAgo(new Date(mostRecentDraft.updatedAt))}
                  </p>
                </div>
                {getRecoverySourceBadge(mostRecentDraft.recovery.source)}
              </div>

              {/* Progress Indicator */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-text-secondary">
                    {mostRecentDraft.progress.progressPercentage}% complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                      mostRecentDraft.progress.progressPercentage,
                    )}`}
                    style={{
                      width: `${mostRecentDraft.progress.progressPercentage}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Current step: {mostRecentDraft.currentStep.replace("-", " ")}
                </p>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  {getDeviceIcon(mostRecentDraft.metadata.browserInfo.platform)}
                  <span className="text-text-secondary">
                    {mostRecentDraft.metadata.browserInfo.platform}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-text-secondary">
                    {new Date(mostRecentDraft.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-text-secondary">
                    Step {mostRecentDraft.progress.currentStepIndex + 1} of{" "}
                    {mostRecentDraft.progress.totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-text-secondary truncate">
                    {mostRecentDraft.metadata.browserInfo.url
                      .split("/")
                      .pop() || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => onRecoverSession(mostRecentDraft.id)}
                  disabled={isRecovering}
                  className="flex-1"
                >
                  {isRecovering ? "Restoring..." : "Restore This Session"}
                </Button>
                <Button
                  onClick={() => onDeleteDraft(mostRecentDraft.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Older Drafts */}
          {olderDrafts.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                Older Sessions ({olderDrafts.length})
              </h3>
              <div className="space-y-3">
                {olderDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="border border-border-primary rounded-lg p-3 hover:bg-bg-secondary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {formatTimeAgo(new Date(draft.updatedAt))}
                          </span>
                          {getRecoverySourceBadge(draft.recovery.source)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span>
                            {draft.progress.progressPercentage}% complete
                          </span>
                          <span>
                            Step: {draft.currentStep.replace("-", " ")}
                          </span>
                          <span>
                            {getDeviceIcon(draft.metadata.browserInfo.platform)}{" "}
                            {draft.metadata.browserInfo.platform}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onRecoverSession(draft.id)}
                          variant="outline"
                          size="sm"
                          disabled={isRecovering}
                        >
                          Restore
                        </Button>
                        <Button
                          onClick={() => onDeleteDraft(draft.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Note:</strong> Saved sessions expire after 24 hours.
              Choose "Start Fresh" if you want to begin a new estimate instead
              of recovering previous work.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={onDeclineAll} variant="outline" className="flex-1">
              Start Fresh
            </Button>
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SessionRecoveryModal;

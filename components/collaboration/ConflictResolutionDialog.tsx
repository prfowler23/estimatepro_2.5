"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCollaboration } from "./CollaborationProvider";
import {
  AlertTriangle,
  Users,
  Clock,
  Edit3,
  CheckCircle,
  X,
  GitMerge,
  Eye,
  RotateCcw,
} from "lucide-react";

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflict?: any;
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflict,
}: ConflictResolutionDialogProps) {
  const { resolveConflict, activeUsers } = useCollaboration();

  const [selectedResolution, setSelectedResolution] = useState<
    "accept_incoming" | "keep_local" | "merge"
  >("merge");
  const [mergedValue, setMergedValue] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [previewTab, setPreviewTab] = useState("compare");

  if (!isOpen || !conflict) return null;

  const { localChanges, incomingChange } = conflict;
  const localChange = localChanges?.[0];

  // Get user information
  const incomingUser = activeUsers.find(
    (user) => user.userId === incomingChange.userId,
  );
  const localUser = activeUsers.find(
    (user) => user.userId === localChange?.userId,
  );

  const handleResolve = async () => {
    try {
      setIsResolving(true);

      const mergeValue =
        selectedResolution === "merge" ? mergedValue : undefined;
      await resolveConflict(
        conflict.id || incomingChange.id,
        selectedResolution,
        mergeValue,
      );

      onClose();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    } finally {
      setIsResolving(false);
    }
  };

  const renderValueComparison = () => {
    const localVal = localChange?.newValue || "";
    const incomingVal = incomingChange?.newValue || "";
    const originalVal = localChange?.oldValue || incomingChange?.oldValue || "";

    return (
      <div className="space-y-4">
        {/* Original Value */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-text-muted" />
            Original Value
          </h4>
          <div className="p-3 bg-bg-subtle rounded border border-border-primary">
            <pre className="text-sm whitespace-pre-wrap">
              {String(originalVal)}
            </pre>
          </div>
        </div>

        {/* Local Changes */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary-action" />
            Your Changes
            {localUser && (
              <Badge variant="outline" className="text-xs">
                {localUser.userName}
              </Badge>
            )}
          </h4>
          <div className="p-3 bg-primary-action/10 rounded border border-primary-action/30">
            <pre className="text-sm whitespace-pre-wrap">
              {String(localVal)}
            </pre>
          </div>
          {localChange && (
            <div className="text-xs text-text-muted mt-1">
              Modified {new Date(localChange.timestamp).toLocaleString()}
            </div>
          )}
        </div>

        {/* Incoming Changes */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-success-600 dark:text-success-400" />
            Incoming Changes
            {incomingUser && (
              <Badge variant="outline" className="text-xs">
                {incomingUser.userName}
              </Badge>
            )}
          </h4>
          <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded border border-success-200 dark:border-success-400/30">
            <pre className="text-sm whitespace-pre-wrap">
              {String(incomingVal)}
            </pre>
          </div>
          <div className="text-xs text-text-muted mt-1">
            Modified {new Date(incomingChange.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  const renderResolutionOptions = () => {
    return (
      <RadioGroup
        value={selectedResolution}
        onValueChange={(value) => setSelectedResolution(value as any)}
        className="space-y-4"
      >
        {/* Keep Local */}
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-primary-action/10">
          <RadioGroupItem value="keep_local" id="keep_local" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="keep_local" className="font-medium cursor-pointer">
              Keep Your Changes
            </Label>
            <p className="text-sm text-text-secondary mt-1">
              Discard the incoming changes and keep your version. This will
              overwrite the other user&apos;s work.
            </p>
            <div className="mt-2 p-2 bg-primary-action/20 rounded text-xs">
              <strong>Result:</strong> {String(localChange?.newValue || "")}
            </div>
          </div>
        </div>

        {/* Accept Incoming */}
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-success-50 dark:hover:bg-success-900/20">
          <RadioGroupItem
            value="accept_incoming"
            id="accept_incoming"
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="accept_incoming"
              className="font-medium cursor-pointer"
            >
              Accept Incoming Changes
            </Label>
            <p className="text-sm text-text-secondary mt-1">
              Use the other user&apos;s changes and discard your modifications.
            </p>
            <div className="mt-2 p-2 bg-success-100 dark:bg-success-900/30 rounded text-xs">
              <strong>Result:</strong> {String(incomingChange?.newValue || "")}
            </div>
          </div>
        </div>

        {/* Manual Merge */}
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-primary-action/10">
          <RadioGroupItem value="merge" id="merge" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="merge" className="font-medium cursor-pointer">
              Create Manual Merge
            </Label>
            <p className="text-sm text-text-secondary mt-1">
              Combine both changes manually by editing the content below.
            </p>

            {selectedResolution === "merge" && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="merged-content" className="text-sm">
                  Merged Content:
                </Label>
                <Textarea
                  id="merged-content"
                  value={mergedValue}
                  onChange={(e) => setMergedValue(e.target.value)}
                  placeholder="Enter the merged content here..."
                  rows={4}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMergedValue(localChange?.newValue || "")}
                  >
                    Start with Your Version
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMergedValue(incomingChange?.newValue || "")
                    }
                  >
                    Start with Their Version
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>
    );
  };

  return (
    <div className="fixed inset-0 bg-bg-base/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-error-600 dark:text-error-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Conflict Resolution Required
              </h2>
              <p className="text-text-secondary mt-1">
                Conflicting changes detected in field:{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {conflict.fieldPath}
                </code>
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <Tabs value={previewTab} onValueChange={setPreviewTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Compare Changes
              </TabsTrigger>
              <TabsTrigger value="resolve" className="flex items-center gap-2">
                <GitMerge className="w-4 h-4" />
                Resolution Options
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="mt-6">
              {renderValueComparison()}
            </TabsContent>

            <TabsContent value="resolve" className="mt-6">
              {renderResolutionOptions()}
            </TabsContent>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              <Clock className="w-4 h-4 inline mr-1" />
              Conflict detected at{" "}
              {new Date(conflict.conflictTime).toLocaleString()}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={
                  isResolving ||
                  (selectedResolution === "merge" && !mergedValue.trim())
                }
                className="flex items-center gap-2"
              >
                {isResolving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isResolving ? "Resolving..." : "Resolve Conflict"}
              </Button>
            </div>
          </div>

          {/* Resolution Summary */}
          {selectedResolution && (
            <Alert className="mt-4">
              <div className="text-sm">
                <strong>Resolution Summary:</strong>
                {selectedResolution === "keep_local" &&
                  " Your changes will be kept and the incoming changes will be discarded."}
                {selectedResolution === "accept_incoming" &&
                  " The incoming changes will be accepted and your changes will be discarded."}
                {selectedResolution === "merge" &&
                  " A custom merged version will be created from both changes."}
              </div>
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ConflictResolutionDialog;

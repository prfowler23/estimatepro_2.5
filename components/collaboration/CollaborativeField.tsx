"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useCollaboration } from "./CollaborationProvider";
import { RealTimeChangeIndicator } from "./RealTimeChangeIndicator";
import { Edit3, Eye, Lock, AlertTriangle, Users, Clock } from "lucide-react";

interface CollaborativeFieldProps {
  field: string;
  value: any;
  onChange: (value: any) => void;
  type?: "text" | "textarea" | "select" | "number" | "email" | "phone" | "date";
  placeholder?: string;
  label?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  stepId?: string;
  showCollaborationInfo?: boolean;
  debounceMs?: number;
}

export function CollaborativeField({
  field,
  value,
  onChange,
  type = "text",
  placeholder,
  label,
  options = [],
  required = false,
  disabled = false,
  className = "",
  stepId = "unknown",
  showCollaborationInfo = true,
  debounceMs = 500,
}: CollaborativeFieldProps) {
  const {
    canEdit,
    getFieldStatus,
    getUserCursor,
    activeUsers,
    broadcastChange,
    updatePresence,
    conflicts,
    getRecentChanges,
  } = useCollaboration();

  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [lastBroadcastValue, setLastBroadcastValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const fieldStatus = getFieldStatus(field);
  const canEditField = canEdit(field) && !disabled;
  const isLocked = fieldStatus === "locked" || !canEditField;
  const isBeingEdited = fieldStatus === "editing";

  // Get users currently viewing/editing this field
  const activeFieldUsers = activeUsers.filter((user) => {
    const cursor = getUserCursor(user.userId);
    return cursor?.fieldId === field;
  });

  // Get conflicts for this field
  const fieldConflicts = conflicts.filter(
    (conflict) => conflict.fieldPath === field,
  );

  // Get recent changes for this field
  const recentChanges = getRecentChanges(field).slice(0, 3);

  // Update local value when prop value changes (from external updates)
  useEffect(() => {
    if (value !== localValue && value !== lastBroadcastValue) {
      setLocalValue(value);
    }
  }, [value]);

  // Handle input changes with debouncing
  const handleInputChange = (newValue: any) => {
    setLocalValue(newValue);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      handleDebouncedChange(newValue);
    }, debounceMs);
  };

  // Handle debounced change
  const handleDebouncedChange = async (newValue: any) => {
    if (newValue === lastBroadcastValue || isLocked) return;

    try {
      setIsUpdating(true);

      // Update parent component
      onChange(newValue);

      // Broadcast change to collaborators
      await broadcastChange(stepId, field, lastBroadcastValue, newValue);

      setLastBroadcastValue(newValue);
    } catch (error) {
      console.error("Failed to broadcast field change:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle focus events
  const handleFocus = async () => {
    setIsFocused(true);

    if (canEditField) {
      // Update presence to show user is editing this field
      await updatePresence({
        cursor: {
          fieldId: field,
          stepId,
        },
      });
    }
  };

  // Handle blur events
  const handleBlur = async () => {
    setIsFocused(false);

    // Clear field cursor when user stops editing
    await updatePresence({
      cursor: {
        fieldId: undefined,
        stepId,
      },
    });

    // Ensure final change is saved
    if (localValue !== lastBroadcastValue && canEditField) {
      handleDebouncedChange(localValue);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Get field styling based on status
  const getFieldClasses = () => {
    let classes = className;

    if (isLocked) {
      classes += " cursor-not-allowed opacity-60";
    } else if (isBeingEdited && !isFocused) {
      classes += " border-yellow-300 bg-yellow-50";
    } else if (isFocused) {
      classes += " border-blue-500 ring-1 ring-blue-500";
    } else if (fieldConflicts.length > 0) {
      classes += " border-red-500 bg-red-50";
    } else if (recentChanges.length > 0) {
      classes += " border-green-300 bg-green-50";
    }

    return classes;
  };

  // Render field based on type
  const renderField = () => {
    const commonProps = {
      ref: inputRef as any,
      value: localValue || "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => handleInputChange(e.target.value),
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      disabled: isLocked,
      className: getFieldClasses(),
      required,
    };

    switch (type) {
      case "textarea":
        return <Textarea {...commonProps} rows={3} />;

      case "select":
        return (
          <Select
            value={localValue || ""}
            onValueChange={(newValue) => {
              handleInputChange(newValue);
            }}
            disabled={isLocked}
            onOpenChange={(open) => {
              if (open) handleFocus();
              else handleBlur();
            }}
          >
            <SelectTrigger className={getFieldClasses()}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        return (
          <Input
            {...commonProps}
            type="number"
            onChange={(e) => handleInputChange(Number(e.target.value))}
          />
        );

      default:
        return <Input {...commonProps} type={type} />;
    }
  };

  return (
    <div className="space-y-2">
      {/* Label with collaboration status */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {showCollaborationInfo && (
            <div className="flex items-center gap-2">
              {/* Field status indicator */}
              {isLocked && (
                <Badge
                  variant="destructive"
                  className="text-xs flex items-center gap-1"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </Badge>
              )}

              {isBeingEdited && !isFocused && (
                <Badge
                  variant="default"
                  className="text-xs flex items-center gap-1"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  Being edited
                </Badge>
              )}

              {/* Active users on this field */}
              {activeFieldUsers.length > 0 && (
                <div className="flex -space-x-1">
                  {activeFieldUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.userId}
                      className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                      title={`${user.userName} is ${isFocused && user.userId === activeUsers.find((u) => u.userId === user.userId)?.userId ? "editing" : "viewing"}`}
                    >
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {activeFieldUsers.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                      +{activeFieldUsers.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Update indicator */}
              {isUpdating && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Field input */}
      <div className="relative">
        {renderField()}

        {/* Real-time change indicator */}
        {showCollaborationInfo &&
          (recentChanges.length > 0 || fieldConflicts.length > 0) && (
            <div className="absolute -top-1 -right-1">
              <RealTimeChangeIndicator
                fieldPath={field}
                compact
                maxChanges={3}
              />
            </div>
          )}
      </div>

      {/* Conflict alerts */}
      {fieldConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Conflict Detected</h4>
            <p className="text-sm">
              This field has conflicting changes. Please resolve the conflict to
              continue.
            </p>
          </div>
        </Alert>
      )}

      {/* Editing notification */}
      {isBeingEdited && !isFocused && activeFieldUsers.length > 0 && (
        <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded border border-yellow-200">
          <div className="flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            <span>
              {activeFieldUsers[0].userName} is currently editing this field
            </span>
          </div>
        </div>
      )}

      {/* Recent changes summary */}
      {showCollaborationInfo &&
        recentChanges.length > 0 &&
        !fieldConflicts.length && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                Last updated by {recentChanges[0].userName}{" "}
                {new Date(recentChanges[0].timestamp).toLocaleTimeString()}
              </span>
              {recentChanges.length > 1 && (
                <span className="text-gray-500">
                  (+{recentChanges.length - 1} more)
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default CollaborativeField;

"use client";

// PHASE 3 FIX: Extracted auto-save status display into focused component
import React from "react";
import { UseSmartAutoSaveReturn } from "@/hooks/useSmartAutoSave";

interface AutoSaveStatusDisplayProps {
  smartAutoSave: UseSmartAutoSaveReturn;
  saveError: string | null;
  clearSaveError: () => void;
  onSaveNow: () => Promise<boolean>;
  className?: string;
}

export function AutoSaveStatusDisplay({
  smartAutoSave,
  saveError,
  clearSaveError,
  onSaveNow,
  className = "",
}: AutoSaveStatusDisplayProps) {
  const getStatusColor = () => {
    if (smartAutoSave.isSaving) return "bg-blue-500 animate-pulse";
    if (smartAutoSave.hasUnsavedChanges) return "bg-amber-500";
    if (saveError) return "bg-red-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (smartAutoSave.isSaving) return "Saving changes...";
    if (smartAutoSave.hasUnsavedChanges) return "Changes pending auto-save";
    if (saveError) return "Save error occurred";
    return "All changes saved automatically";
  };

  return (
    <div
      className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-700">{getStatusText()}</span>
        {smartAutoSave.lastSaveTime && (
          <span className="text-xs text-gray-500">
            Last saved: {smartAutoSave.lastSaveTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {smartAutoSave.hasUnsavedChanges && (
          <button
            onClick={onSaveNow}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            title="Force immediate save"
          >
            Save Now
          </button>
        )}
        {saveError && (
          <button
            onClick={clearSaveError}
            className="text-xs text-red-600 hover:text-red-800 underline"
            title={saveError}
          >
            ⚠️ Clear Error
          </button>
        )}
      </div>
    </div>
  );
}

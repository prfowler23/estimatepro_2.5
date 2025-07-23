"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Loader2,
} from "lucide-react";

interface SaveExitButtonProps {
  onSaveAndExit: () => Promise<boolean>;
  onSaveOnly?: () => Promise<boolean>;
  hasUnsavedChanges: boolean;
  lastSaveTime?: Date | null;
  isSaving?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function SaveExitButton({
  onSaveAndExit,
  onSaveOnly,
  hasUnsavedChanges,
  lastSaveTime,
  isSaving = false,
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
}: SaveExitButtonProps) {
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const formatLastSaveTime = (time: Date | null): string => {
    if (!time) return "Never saved";

    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Saved just now";
    if (diffMins < 60) return `Saved ${diffMins}m ago`;
    if (diffHours < 24) return `Saved ${diffHours}h ago`;
    return `Saved ${time.toLocaleDateString()}`;
  };

  const handleSaveAndExit = async () => {
    setIsPerformingAction(true);
    try {
      await onSaveAndExit();
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!onSaveOnly) return;

    setIsPerformingAction(true);
    try {
      await onSaveOnly();
    } finally {
      setIsPerformingAction(false);
    }
  };

  const getSaveStatus = () => {
    if (isSaving || isPerformingAction) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Saving...",
        badge: null,
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        text: "Unsaved changes",
        badge: (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 ml-2"
          >
            !
          </Badge>
        ),
      };
    }

    return {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      text: formatLastSaveTime(lastSaveTime),
      badge: null,
    };
  };

  const saveStatus = getSaveStatus();
  const isDisabled = disabled || isSaving || isPerformingAction;

  // Simple save and exit button (no dropdown)
  if (!onSaveOnly) {
    return (
      <Button
        onClick={handleSaveAndExit}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
      >
        {saveStatus.icon}
        Save & Exit
        {saveStatus.badge}
      </Button>
    );
  }

  // Dropdown version with multiple save options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isDisabled}
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
        >
          {saveStatus.icon}
          Save & Exit
          {saveStatus.badge}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus.icon}
            <span className="text-text-secondary">{saveStatus.text}</span>
          </div>
        </div>

        <DropdownMenuItem
          onClick={handleSaveAndExit}
          disabled={isDisabled}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <div>
            <div className="font-medium">Save & Exit</div>
            <div className="text-xs text-text-secondary">
              Save your progress and return later
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleSaveOnly}
          disabled={isDisabled}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <div>
            <div className="font-medium">Save Draft</div>
            <div className="text-xs text-text-secondary">
              Save without exiting the workflow
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock className="h-3 w-3" />
            Auto-save every 30 seconds
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SaveExitButton;

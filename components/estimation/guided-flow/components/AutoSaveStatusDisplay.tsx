import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import type { UseSmartAutoSaveReturn } from "@/hooks/useSmartAutoSave";

interface SaveError {
  message?: string;
  code?: string;
  details?: unknown;
}

interface AutoSaveStatusDisplayProps {
  smartAutoSave: UseSmartAutoSaveReturn;
  saveError: SaveError | null;
  clearSaveError: () => void;
  onSaveNow: () => void;
}

export const AutoSaveStatusDisplay = React.memo<AutoSaveStatusDisplayProps>(
  ({ smartAutoSave, saveError, clearSaveError, onSaveNow }) => {
    return (
      <>
        {saveError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Save Error</AlertTitle>
            <AlertDescription>
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    saveError.message || "An unknown error occurred.",
                  ),
                }}
              />
              <button
                onClick={clearSaveError}
                className="ml-2 font-bold"
                aria-label="Dismiss error message"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}
        {smartAutoSave.isSaving && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Saving...</AlertTitle>
          </Alert>
        )}
        {smartAutoSave.lastSaveTime && !smartAutoSave.isSaving && (
          <Alert variant="success" className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>
              Last saved at {smartAutoSave.lastSaveTime.toLocaleTimeString()}
              <button
                onClick={onSaveNow}
                className="ml-2 font-bold"
                aria-label="Save now"
              >
                Save Now
              </button>
            </AlertDescription>
          </Alert>
        )}
      </>
    );
  },
);

AutoSaveStatusDisplay.displayName = "AutoSaveStatusDisplay";

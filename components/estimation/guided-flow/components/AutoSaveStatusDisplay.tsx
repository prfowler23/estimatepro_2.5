import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

interface AutoSaveStatusDisplayProps {
  smartAutoSave: any;
  saveError: any;
  clearSaveError: () => void;
  onSaveNow: () => void;
}

export const AutoSaveStatusDisplay: React.FC<AutoSaveStatusDisplayProps> = ({
  smartAutoSave,
  saveError,
  clearSaveError,
  onSaveNow,
}) => {
  return (
    <>
      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Save Error</AlertTitle>
          <AlertDescription>
            {saveError.message || "An unknown error occurred."}
            <button onClick={clearSaveError} className="ml-2 font-bold">
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
      {smartAutoSave.lastSaved && !smartAutoSave.isSaving && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            Last saved at{" "}
            {new Date(smartAutoSave.lastSaved).toLocaleTimeString()}
            <button onClick={onSaveNow} className="ml-2 font-bold">
              Save Now
            </button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

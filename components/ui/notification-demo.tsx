"use client";

import React from "react";
import { Button } from "./button";
import {
  useSuccessNotification,
  useErrorNotification,
  useWarningNotification,
  useInfoNotification,
  useNotifications,
} from "./standardized-notifications";
import {
  Save,
  AlertTriangle,
  Info,
  RefreshCw,
  MessageCircle,
} from "lucide-react";

export function NotificationDemo() {
  const showSuccess = useSuccessNotification();
  const showError = useErrorNotification();
  const showWarning = useWarningNotification();
  const showInfo = useInfoNotification();
  const { clearAll } = useNotifications();

  return (
    <div className="p-6 space-y-4 border rounded-lg bg-bg-base">
      <h3 className="text-lg font-semibold">Standardized Notifications Demo</h3>
      <p className="text-sm text-text-secondary">
        Test the new standardized notification system with consistent messaging
        and recovery actions.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            showSuccess(
              "Data Saved",
              "Your estimate has been saved successfully.",
              {
                context: { component: "demo", stepId: "save-test" },
                metadata: { timestamp: new Date().toISOString() },
              },
            )
          }
        >
          <Save className="w-4 h-4 mr-1" />
          Success
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            showError(
              "Save Failed",
              "Unable to save your estimate. Please check your connection and try again.",
              {
                severity: "high",
                recoveryActions: [
                  {
                    id: "retry-save",
                    label: "Retry Save",
                    icon: RefreshCw,
                    variant: "primary",
                    async: true,
                    handler: async () => {
                      // Simulate async operation
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      showSuccess(
                        "Retry Successful",
                        "Your estimate has been saved after retry.",
                      );
                    },
                  },
                  {
                    id: "save-locally",
                    label: "Save Locally",
                    variant: "outline",
                    handler: () => {
                      showInfo(
                        "Saved Locally",
                        "Your estimate has been saved to local storage.",
                      );
                    },
                  },
                ],
                context: { component: "demo", stepId: "error-test" },
              },
            )
          }
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Error
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            showWarning(
              "Validation Issue",
              "Some fields may need your attention before proceeding.",
              {
                severity: "medium",
                recoveryActions: [
                  {
                    id: "review-fields",
                    label: "Review Fields",
                    variant: "primary",
                    handler: () => {
                      showInfo(
                        "Review Mode",
                        "Highlighting fields that need attention.",
                      );
                    },
                  },
                ],
              },
            )
          }
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Warning
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            showInfo(
              "Auto-save Active",
              "Your changes are being saved automatically every 30 seconds.",
              {
                duration: 8000,
                context: { component: "demo", stepId: "info-test" },
              },
            )
          }
        >
          <Info className="w-4 h-4 mr-1" />
          Info
        </Button>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Show multiple notifications at once
            showError(
              "Critical Error",
              "Multiple issues detected in your estimate.",
              {
                severity: "critical",
                recoveryActions: [
                  {
                    id: "emergency-save",
                    label: "Emergency Save",
                    icon: Save,
                    variant: "primary",
                    handler: () =>
                      showSuccess(
                        "Emergency Save",
                        "Data saved to backup location.",
                      ),
                  },
                ],
              },
            );

            setTimeout(() => {
              showWarning(
                "Connection Issue",
                "Network connection is unstable.",
              );
            }, 500);

            setTimeout(() => {
              showInfo(
                "Backup Available",
                "A backup copy is available from 5 minutes ago.",
              );
            }, 1000);
          }}
        >
          Test Multiple
        </Button>

        <Button variant="outline" size="sm" onClick={clearAll}>
          Clear All
        </Button>
      </div>
    </div>
  );
}

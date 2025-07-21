"use client";

import React, { useState } from "react";
import { ErrorRecoveryProvider } from "./ErrorRecoveryProvider";
import { SmartErrorNotification } from "./SmartErrorNotification";
import { EnhancedErrorDisplay } from "./EnhancedErrorDisplay";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Wifi,
  Shield,
  Database,
  Clock,
  FileX,
  Calculator,
  Brain,
  CheckCircle,
  RefreshCw,
  Zap,
} from "lucide-react";

export function ErrorRecoveryDemo() {
  const [demoMode, setDemoMode] = useState<
    "notification" | "enhanced" | "integration"
  >("notification");
  const [simulatedError, setSimulatedError] = useState<string>("validation");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    content: "",
  });

  const {
    currentError,
    isRecovering,
    handleError,
    handleAsyncOperation,
    clearError,
    executeRecoveryAction,
    validateAndHandle,
    withErrorHandling,
  } = useErrorHandler({
    stepId: "error-demo",
    stepNumber: 1,
    userId: "demo-user",
    enableAutoRecovery: true,
    maxRetryAttempts: 3,
  });

  const errorTypes = [
    {
      id: "validation",
      name: "Validation Error",
      icon: AlertTriangle,
      description: "Form input validation failure",
    },
    {
      id: "network",
      name: "Network Error",
      icon: Wifi,
      description: "Connection or API failure",
    },
    {
      id: "authentication",
      name: "Auth Error",
      icon: Shield,
      description: "Authentication required",
    },
    {
      id: "database",
      name: "Database Error",
      icon: Database,
      description: "Data save/load failure",
    },
    {
      id: "timeout",
      name: "Timeout Error",
      icon: Clock,
      description: "Operation timeout",
    },
    {
      id: "file_upload",
      name: "File Upload Error",
      icon: FileX,
      description: "File upload failure",
    },
    {
      id: "calculation",
      name: "Calculation Error",
      icon: Calculator,
      description: "Math operation failure",
    },
    {
      id: "ai_service",
      name: "AI Service Error",
      icon: Brain,
      description: "AI analysis failure",
    },
  ];

  const simulateError = async (errorType: string) => {
    const errorScenarios = {
      validation: () => {
        handleError("Please fill in all required fields correctly.", {
          errorType: "validation",
          errorCode: "VALIDATION_FAILED",
          fieldId: "name",
        });
      },
      network: () => {
        handleError(
          "Unable to connect to the server. Please check your internet connection.",
          {
            errorType: "network",
            errorCode: "CONNECTION_FAILED",
          },
        );
      },
      authentication: () => {
        handleError("Your session has expired. Please sign in again.", {
          errorType: "authentication",
          errorCode: "SESSION_EXPIRED",
        });
      },
      database: () => {
        handleError(
          "Failed to save your data. Your work is preserved locally.",
          {
            errorType: "database",
            errorCode: "SAVE_FAILED",
          },
        );
      },
      timeout: () => {
        handleError("The operation took too long to complete.", {
          errorType: "timeout",
          errorCode: "OPERATION_TIMEOUT",
        });
      },
      file_upload: () => {
        handleError("File upload failed. Please check file size and format.", {
          errorType: "file_upload",
          errorCode: "UPLOAD_FAILED",
          fieldId: "file",
        });
      },
      calculation: () => {
        handleError(
          "Error in calculation engine. Please verify your input values.",
          {
            errorType: "calculation",
            errorCode: "MATH_ERROR",
          },
        );
      },
      ai_service: () => {
        handleError("AI analysis service is temporarily unavailable.", {
          errorType: "ai_service",
          errorCode: "AI_SERVICE_DOWN",
        });
      },
    };

    const scenario = errorScenarios[errorType as keyof typeof errorScenarios];
    if (scenario) {
      scenario();
    }
  };

  const simulateAsyncError = withErrorHandling(async () => {
    // Simulate a failing async operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    throw new Error("Simulated async operation failure");
  });

  const handleFormSubmit = async () => {
    // Validate form fields
    if (
      !validateAndHandle(
        formData.name,
        (name) => name.length > 0,
        "Name is required",
      )
    ) {
      return;
    }

    if (
      !validateAndHandle(
        formData.email,
        (email) => email.includes("@"),
        "Valid email is required",
      )
    ) {
      return;
    }

    // Simulate form submission
    const result = await handleAsyncOperation(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Random success/failure for demo
        if (Math.random() > 0.7) {
          throw new Error("Form submission failed");
        }

        return { success: true, id: "demo-123" };
      },
      {
        errorType: "network",
        errorCode: "FORM_SUBMIT_FAILED",
      },
    );

    if (result) {
      alert("Form submitted successfully!");
      setFormData({ name: "", email: "", content: "" });
    }
  };

  return (
    <ErrorRecoveryProvider
      stepId="error-demo"
      stepNumber={1}
      userId="demo-user"
      flowData={{} as any}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 text-blue-500" />
            Error Recovery System Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience intelligent error handling with automatic recovery,
            contextual help, and user-friendly notifications.
          </p>
        </div>

        {/* Controls */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Demo Mode:</label>
                <Select
                  value={demoMode}
                  onValueChange={(value) =>
                    setDemoMode(
                      value as "notification" | "enhanced" | "integration",
                    )
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notification">
                      Smart Notifications
                    </SelectItem>
                    <SelectItem value="enhanced">Enhanced Display</SelectItem>
                    <SelectItem value="integration">
                      Live Integration
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Error Type:</label>
                <Select
                  value={simulatedError}
                  onValueChange={setSimulatedError}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {errorTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => simulateError(simulatedError)}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Simulate Error
              </Button>

              {currentError && (
                <Button
                  onClick={clearError}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Clear Error
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {errorTypes.map((type) => (
                <Badge
                  key={type.id}
                  variant={simulatedError === type.id ? "default" : "outline"}
                  className="text-xs cursor-pointer"
                  onClick={() => setSimulatedError(type.id)}
                >
                  <type.icon className="w-3 h-3 mr-1" />
                  {type.name}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Demo Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {demoMode === "notification" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  Smart Error Notifications
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Smart notifications appear contextually with recovery
                    actions. They auto-hide for non-critical errors and provide
                    multiple recovery paths.
                  </p>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Features:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Contextual positioning (mobile/desktop)</li>
                      <li>Auto-hide for warnings and info</li>
                      <li>Expandable recovery options</li>
                      <li>Progress tracking for actions</li>
                      <li>Help content integration</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <div>
                      <h4 className="font-medium">Try Different Error Types</h4>
                      <p className="text-sm">
                        Each error type shows different recovery options and
                        help content.
                      </p>
                    </div>
                  </Alert>
                </div>
              </Card>
            )}

            {demoMode === "enhanced" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  Enhanced Error Display
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Comprehensive error displays for critical errors with
                    detailed recovery guidance, contextual help, and prevention
                    tips.
                  </p>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Features:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Detailed error analysis</li>
                      <li>Multiple recovery strategies</li>
                      <li>Contextual help integration</li>
                      <li>Prevention tips</li>
                      <li>Technical details (dev mode)</li>
                    </ul>
                  </div>

                  {currentError && (
                    <div className="mt-6">
                      <EnhancedErrorDisplay
                        errorMessage={currentError}
                        isRecovering={isRecovering}
                        onRetry={() => simulateError(simulatedError)}
                        onStartRecovery={async () => {
                          // Simulate auto-recovery
                          await new Promise((resolve) =>
                            setTimeout(resolve, 2000),
                          );
                          clearError();
                        }}
                        recoveryAttempts={0}
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}

            {demoMode === "integration" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  Live Error Integration
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    See how error handling integrates with real form
                    interactions, validation, and async operations.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Name *
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter your name"
                        className={
                          currentError?.helpContent?.content.includes("Name")
                            ? "border-red-300"
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Enter your email"
                        className={
                          currentError?.helpContent?.content.includes("email")
                            ? "border-red-300"
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Message
                      </label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        placeholder="Enter your message"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleFormSubmit} className="flex-1">
                        Submit Form
                      </Button>
                      <Button
                        onClick={simulateAsyncError}
                        variant="outline"
                        className="flex-1"
                      >
                        Test Async Error
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Error Type Reference */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Error Types</h3>
              <div className="space-y-3">
                {errorTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      simulatedError === type.id
                        ? "border-blue-300 bg-blue-50"
                        : "hover:border-gray-300"
                    }`}
                    onClick={() => setSimulatedError(type.id)}
                  >
                    <div className="flex items-center gap-3">
                      <type.icon className="w-4 h-4 text-gray-600" />
                      <div>
                        <h4 className="font-medium text-sm">{type.name}</h4>
                        <p className="text-xs text-gray-600">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Current Error State */}
            {currentError && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Current Error State
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {currentError.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {currentError.category.replace("_", " ")}
                    </Badge>
                    {currentError.isRecoverable && (
                      <Badge className="bg-green-100 text-green-800">
                        Recoverable
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium">{currentError.title}</h4>
                    <p className="text-sm text-gray-600">
                      {currentError.userFriendly}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-2">
                      Recovery Actions:
                    </h5>
                    <div className="space-y-1">
                      {currentError.recoveryActions.map((action) => (
                        <div
                          key={action.id}
                          className="text-xs p-2 bg-gray-50 rounded"
                        >
                          <span className="font-medium">{action.label}</span>
                          <span className="text-gray-600">
                            {" "}
                            - {action.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isRecovering && (
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <div>
                        <h4 className="font-medium">Recovery in Progress</h4>
                        <p className="text-sm">
                          Attempting to resolve the error automatically...
                        </p>
                      </div>
                    </Alert>
                  )}
                </div>
              </Card>
            )}

            {/* System Status */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Error Recovery System</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Auto-Recovery</span>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Help Integration</span>
                  <Badge className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Pattern Learning</span>
                  <Badge className="bg-blue-100 text-blue-800">Learning</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Smart Error Notification */}
        {currentError && demoMode === "notification" && (
          <SmartErrorNotification
            errorMessage={currentError}
            onDismiss={clearError}
            onActionExecute={async (action) => {
              await executeRecoveryAction(action.id);
            }}
            onRetry={() => simulateError(simulatedError)}
            position="top-right"
            autoHide={currentError.severity !== "error"}
            autoHideDelay={8000}
          />
        )}
      </div>
    </ErrorRecoveryProvider>
  );
}

export default ErrorRecoveryDemo;

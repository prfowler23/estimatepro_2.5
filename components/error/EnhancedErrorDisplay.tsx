"use client";

import React, { useState, useEffect } from "react";
import {
  ErrorMessage,
  ErrorRecoveryAction,
} from "@/lib/error/error-recovery-engine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  CheckCircle,
  Clock,
  Lightbulb,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  sanitizeUserMessage,
  sanitizeTechnicalDetails,
  shouldShowTechnicalDetails,
} from "@/lib/utils/error-sanitization";

interface EnhancedErrorDisplayProps {
  errorMessage: ErrorMessage;
  isRecovering?: boolean;
  onRetry?: () => void;
  onStartRecovery?: () => void;
  recoveryAttempts?: number;
  className?: string;
}

export function EnhancedErrorDisplay({
  errorMessage,
  isRecovering = false,
  onRetry,
  onStartRecovery,
  recoveryAttempts = 0,
  className = "",
}: EnhancedErrorDisplayProps) {
  const [selectedAction, setSelectedAction] =
    useState<ErrorRecoveryAction | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    help: true,
    actions: true,
    prevention: false,
    technical: false,
  });
  const [actionResults, setActionResults] = useState<
    Record<string, "success" | "failed">
  >({});

  // Auto-select primary recovery action
  useEffect(() => {
    if (errorMessage.recoveryActions.length > 0 && !selectedAction) {
      setSelectedAction(errorMessage.recoveryActions[0]);
    }
  }, [errorMessage.recoveryActions, selectedAction]);

  const getSeverityIcon = () => {
    switch (errorMessage.severity) {
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (errorMessage.severity) {
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const handleActionExecute = async (action: ErrorRecoveryAction) => {
    if (
      action.requiresConfirmation &&
      !confirm(`Are you sure you want to ${action.label.toLowerCase()}?`)
    ) {
      return;
    }

    setExecutingAction(action.id);

    try {
      await action.execute();
      setActionResults((prev) => ({ ...prev, [action.id]: "success" }));

      // Auto-retry if it's a retry action
      if (action.type === "auto" && onRetry) {
        setTimeout(onRetry, 1000);
      }
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error);
      setActionResults((prev) => ({ ...prev, [action.id]: "failed" }));
    } finally {
      setExecutingAction(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getActionTypeColor = (type: ErrorRecoveryAction["type"]) => {
    switch (type) {
      case "auto":
        return "bg-green-100 text-green-700";
      case "user-action":
        return "bg-blue-100 text-blue-700";
      case "guidance":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getActionTypeIcon = (type: ErrorRecoveryAction["type"]) => {
    switch (type) {
      case "auto":
        return <RefreshCw className="w-3 h-3" />;
      case "user-action":
        return <ArrowRight className="w-3 h-3" />;
      case "guidance":
        return <HelpCircle className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 space-y-6 ${className}`}>
      {/* Main Error Display */}
      <Card className={`p-6 ${getSeverityColor()}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">{getSeverityIcon()}</div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">
                {errorMessage.title}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {errorMessage.category.replace("_", " ")}
                </Badge>
                {errorMessage.isRecoverable && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Recoverable
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-gray-700 mb-4">
              {sanitizeUserMessage(errorMessage.userFriendly)}
            </p>

            {/* Recovery Status */}
            {isRecovering && (
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <div className="text-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="font-medium">Attempting recovery...</span>
                  </div>
                  <p className="text-sm mt-1">
                    Please wait while we try to fix this automatically.
                  </p>
                </div>
              </Alert>
            )}

            {/* Recovery Attempts Counter */}
            {recoveryAttempts > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                Recovery attempts: {recoveryAttempts}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Contextual Help */}
      {errorMessage.helpContent && (
        <Collapsible
          open={expandedSections.help}
          onOpenChange={() => toggleSection("help")}
        >
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      {errorMessage.helpContent.title}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedSections.help ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4">
                <p className="text-gray-700 whitespace-pre-line">
                  {errorMessage.helpContent.content}
                </p>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Recovery Actions */}
      {errorMessage.recoveryActions.length > 0 && (
        <Collapsible
          open={expandedSections.actions}
          onOpenChange={() => toggleSection("actions")}
        >
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900">
                      Recovery Options
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedSections.actions ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 space-y-3">
                {errorMessage.recoveryActions.map((action, index) => (
                  <div
                    key={action.id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedAction?.id === action.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={`text-xs ${getActionTypeColor(action.type)}`}
                          >
                            <div className="flex items-center gap-1">
                              {getActionTypeIcon(action.type)}
                              {action.type === "auto"
                                ? "Automatic"
                                : action.type === "user-action"
                                  ? "Manual"
                                  : "Guidance"}
                            </div>
                          </Badge>
                          <h4 className="font-medium text-gray-900">
                            {action.label}
                          </h4>
                          {action.estimatedTime && (
                            <span className="text-xs text-gray-500">
                              ~{action.estimatedTime}s
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {action.description}
                        </p>

                        {/* Action Result */}
                        {actionResults[action.id] && (
                          <div
                            className={`flex items-center gap-2 text-sm ${
                              actionResults[action.id] === "success"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {actionResults[action.id] === "success" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            {actionResults[action.id] === "success"
                              ? "Action completed successfully"
                              : "Action failed"}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleActionExecute(action)}
                        disabled={executingAction === action.id}
                        size="sm"
                        variant={index === 0 ? "default" : "outline"}
                        className="ml-4"
                      >
                        {executingAction === action.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            {getActionTypeIcon(action.type)}
                            <span className="ml-1">{action.label}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Primary Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {errorMessage.canRetry && onRetry && (
                    <Button onClick={onRetry} className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  {errorMessage.isRecoverable &&
                    onStartRecovery &&
                    !isRecovering && (
                      <Button
                        onClick={onStartRecovery}
                        variant="outline"
                        className="flex-1"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Auto-Recover
                      </Button>
                    )}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Prevention Tips */}
      {errorMessage.preventionTips &&
        errorMessage.preventionTips.length > 0 && (
          <Collapsible
            open={expandedSections.prevention}
            onOpenChange={() => toggleSection("prevention")}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <h3 className="font-semibold text-gray-900">
                        Prevention Tips
                      </h3>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        expandedSections.prevention ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4">
                  <ul className="space-y-2">
                    {errorMessage.preventionTips.map((tip, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

      {/* Technical Details (Development) */}
      {process.env.NODE_ENV === "development" &&
        errorMessage.technicalDetails && (
          <Collapsible
            open={expandedSections.technical}
            onOpenChange={() => toggleSection("technical")}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">
                        Technical Details
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        Development
                      </Badge>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        expandedSections.technical ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4">
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                    Error ID: {errorMessage.id}
                    {"\n"}Category: {errorMessage.category}
                    {"\n"}Type: {errorMessage.severity}
                    {"\n\n"}
                    {errorMessage.technicalDetails}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

      {/* Support Link */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Still need help?</h4>
            <p className="text-sm text-blue-700">
              Contact our support team for personalized assistance.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                "mailto:support@estimatepro.com?subject=Error: " +
                  errorMessage.title,
                "_blank",
              )
            }
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Contact Support
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default EnhancedErrorDisplay;

"use client";

/**
 * Comprehensive Error Recovery Engine
 * Provides intelligent error handling, user-friendly messaging, and automated recovery strategies
 */

import { GuidedFlowData } from "@/lib/types/estimate-types";
import { HelpContextEngine, HelpContext } from "@/lib/help/help-context-engine";

export interface ErrorContext {
  errorType: ErrorType;
  errorCode: string;
  originalError: Error | string;
  stepId: string;
  stepNumber: number;
  fieldId?: string;
  userId: string;
  flowData: GuidedFlowData;
  userBehavior?: {
    previousErrors: string[];
    timeOnStep: number;
    attemptCount: number;
  };
}

export interface ErrorRecoveryAction {
  id: string;
  label: string;
  description: string;
  type: "auto" | "user-action" | "guidance";
  priority: number;
  execute: () => Promise<void> | void;
  requiresConfirmation?: boolean;
  estimatedTime?: number; // seconds
}

export interface ErrorMessage {
  id: string;
  title: string;
  message: string;
  severity: "error" | "warning" | "info";
  category: ErrorCategory;
  isRecoverable: boolean;
  canRetry: boolean;
  userFriendly: string;
  technicalDetails?: string;
  helpContent?: {
    title: string;
    content: string;
    actionable: boolean;
  };
  recoveryActions: ErrorRecoveryAction[];
  preventionTips?: string[];
}

export type ErrorType =
  | "validation"
  | "network"
  | "authentication"
  | "permission"
  | "data_corruption"
  | "ai_service"
  | "file_upload"
  | "calculation"
  | "database"
  | "timeout"
  | "quota_exceeded"
  | "unknown";

export type ErrorCategory =
  | "user_input"
  | "system_error"
  | "external_service"
  | "configuration"
  | "performance"
  | "security";

/**
 * Main Error Recovery Engine
 */
export class ErrorRecoveryEngine {
  private static errorHistory: Map<string, ErrorContext[]> = new Map();
  private static recoveryPatterns: Map<string, number> = new Map();

  /**
   * Process an error and generate appropriate recovery strategies
   */
  static async processError(context: ErrorContext): Promise<ErrorMessage> {
    // Record error for pattern analysis
    this.recordError(context);

    // Analyze error patterns
    const patterns = this.analyzeErrorPatterns(context.userId, context.stepId);

    // Generate base error message
    const baseMessage = this.generateBaseErrorMessage(context);

    // Add recovery actions based on error type and patterns
    const recoveryActions = await this.generateRecoveryActions(
      context,
      patterns,
    );

    // Enhance with contextual help
    const helpContent = await this.generateContextualHelp(context);

    // Add prevention tips based on patterns
    const preventionTips = this.generatePreventionTips(context, patterns);

    return {
      ...baseMessage,
      recoveryActions,
      helpContent,
      preventionTips,
    };
  }

  /**
   * Record error for pattern analysis
   */
  private static recordError(context: ErrorContext): void {
    const userErrors = this.errorHistory.get(context.userId) || [];
    userErrors.push({
      ...context,
      userBehavior: {
        ...context.userBehavior,
        previousErrors: userErrors
          .filter((e) => e.stepId === context.stepId)
          .map((e) => e.errorCode)
          .slice(-5), // Keep last 5 errors
      },
    });

    // Keep only last 50 errors per user
    if (userErrors.length > 50) {
      userErrors.splice(0, userErrors.length - 50);
    }

    this.errorHistory.set(context.userId, userErrors);

    // Update pattern tracking
    const patternKey = `${context.stepId}:${context.errorType}:${context.errorCode}`;
    this.recoveryPatterns.set(
      patternKey,
      (this.recoveryPatterns.get(patternKey) || 0) + 1,
    );
  }

  /**
   * Analyze error patterns for intelligent recovery
   */
  private static analyzeErrorPatterns(
    userId: string,
    stepId: string,
  ): {
    isRepeatedError: boolean;
    errorCount: number;
    commonErrors: string[];
    userStrugglingIndicators: boolean;
  } {
    const userErrors = this.errorHistory.get(userId) || [];
    const stepErrors = userErrors.filter((e) => e.stepId === stepId);
    const recentErrors = stepErrors.slice(-5);

    return {
      isRepeatedError: recentErrors.length > 2,
      errorCount: stepErrors.length,
      commonErrors: this.getMostCommonErrors(recentErrors),
      userStrugglingIndicators:
        stepErrors.length > 3 && recentErrors.length > 1,
    };
  }

  /**
   * Generate base error message based on error type
   */
  private static generateBaseErrorMessage(
    context: ErrorContext,
  ): Omit<ErrorMessage, "recoveryActions" | "helpContent" | "preventionTips"> {
    const errorMessages = {
      validation: {
        title: "Input Validation Error",
        message: "The information provided doesn't meet the required format.",
        severity: "error" as const,
        category: "user_input" as const,
        isRecoverable: true,
        canRetry: true,
        userFriendly: "Please check your input and try again.",
      },
      network: {
        title: "Connection Problem",
        message: "Unable to connect to our servers.",
        severity: "error" as const,
        category: "external_service" as const,
        isRecoverable: true,
        canRetry: true,
        userFriendly: "Please check your internet connection and try again.",
      },
      authentication: {
        title: "Authentication Required",
        message: "You need to sign in to continue.",
        severity: "error" as const,
        category: "security" as const,
        isRecoverable: true,
        canRetry: false,
        userFriendly: "Please sign in to your account to continue.",
      },
      ai_service: {
        title: "AI Service Temporarily Unavailable",
        message: "Our AI analysis service is currently experiencing issues.",
        severity: "warning" as const,
        category: "external_service" as const,
        isRecoverable: true,
        canRetry: true,
        userFriendly:
          "You can continue manually or try AI analysis again later.",
      },
      file_upload: {
        title: "File Upload Failed",
        message: "Unable to upload your file.",
        severity: "error" as const,
        category: "user_input" as const,
        isRecoverable: true,
        canRetry: true,
        userFriendly: "Please check your file size and format, then try again.",
      },
      database: {
        title: "Data Save Error",
        message: "Unable to save your progress.",
        severity: "error" as const,
        category: "system_error" as const,
        isRecoverable: true,
        canRetry: true,
        userFriendly:
          "We're having trouble saving your work. Your data is safe in your browser.",
      },
      quota_exceeded: {
        title: "Usage Limit Reached",
        message: "You've reached your usage limit for this feature.",
        severity: "warning" as const,
        category: "configuration" as const,
        isRecoverable: false,
        canRetry: false,
        userFriendly:
          "Please upgrade your plan or wait until your quota resets.",
      },
    };

    const baseMessage = errorMessages[context.errorType] || {
      title: "Unexpected Error",
      message: "Something went wrong.",
      severity: "error" as const,
      category: "system_error" as const,
      isRecoverable: true,
      canRetry: true,
      userFriendly:
        "Please try again or contact support if the problem persists.",
    };

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...baseMessage,
      technicalDetails:
        typeof context.originalError === "string"
          ? context.originalError
          : context.originalError.message,
    };
  }

  /**
   * Generate contextual recovery actions
   */
  private static async generateRecoveryActions(
    context: ErrorContext,
    patterns: ReturnType<typeof ErrorRecoveryEngine.analyzeErrorPatterns>,
  ): Promise<ErrorRecoveryAction[]> {
    const actions: ErrorRecoveryAction[] = [];

    // Common recovery actions based on error type
    switch (context.errorType) {
      case "validation":
        actions.push(
          {
            id: "fix-validation",
            label: "Fix Input Errors",
            description: "Review and correct the highlighted field errors",
            type: "user-action",
            priority: 1,
            execute: () => {
              // Scroll to first error field
              const errorField = document.querySelector('[data-error="true"]');
              errorField?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            },
          },
          {
            id: "show-examples",
            label: "Show Examples",
            description: "See example values for this field",
            type: "guidance",
            priority: 2,
            execute: () => {
              // Trigger help system to show examples
              HelpContextEngine.triggerHelp(context.stepId, "examples");
            },
          },
        );
        break;

      case "network":
        actions.push(
          {
            id: "retry-connection",
            label: "Retry",
            description: "Try the operation again",
            type: "auto",
            priority: 1,
            execute: () => {
              // Trigger retry of last failed operation
              window.location.reload();
            },
          },
          {
            id: "work-offline",
            label: "Continue Offline",
            description: "Continue working with cached data",
            type: "user-action",
            priority: 2,
            execute: () => {
              // Enable offline mode
              localStorage.setItem("offline-mode", "true");
            },
          },
        );
        break;

      case "ai_service":
        actions.push(
          {
            id: "manual-entry",
            label: "Enter Manually",
            description: "Skip AI analysis and enter information manually",
            type: "user-action",
            priority: 1,
            execute: () => {
              // Switch to manual entry mode
              const event = new CustomEvent("switch-to-manual", {
                detail: { stepId: context.stepId },
              });
              window.dispatchEvent(event);
            },
          },
          {
            id: "retry-ai",
            label: "Retry AI Analysis",
            description: "Try AI analysis again",
            type: "auto",
            priority: 2,
            execute: () => {
              // Retry AI operation
              const event = new CustomEvent("retry-ai-analysis", {
                detail: { stepId: context.stepId },
              });
              window.dispatchEvent(event);
            },
          },
        );
        break;

      case "file_upload":
        actions.push(
          {
            id: "compress-file",
            label: "Compress File",
            description: "Automatically reduce file size",
            type: "auto",
            priority: 1,
            execute: async () => {
              // Trigger file compression
              const event = new CustomEvent("compress-file", {
                detail: { fieldId: context.fieldId },
              });
              window.dispatchEvent(event);
            },
          },
          {
            id: "choose-different-file",
            label: "Choose Different File",
            description: "Select a different file to upload",
            type: "user-action",
            priority: 2,
            execute: () => {
              // Clear file input and reopen file picker
              const fileInput = document.querySelector(
                `input[name="${context.fieldId}"]`,
              ) as HTMLInputElement;
              if (fileInput) {
                fileInput.value = "";
                fileInput.click();
              }
            },
          },
        );
        break;

      case "database":
        actions.push(
          {
            id: "save-locally",
            label: "Save Locally",
            description: "Save your work in browser storage",
            type: "auto",
            priority: 1,
            execute: () => {
              // Save to localStorage
              localStorage.setItem(
                `flow-data-backup-${context.stepId}`,
                JSON.stringify(context.flowData),
              );
            },
          },
          {
            id: "retry-save",
            label: "Retry Save",
            description: "Try saving to database again",
            type: "auto",
            priority: 2,
            execute: () => {
              // Trigger auto-save retry
              const event = new CustomEvent("retry-auto-save", {
                detail: { flowData: context.flowData },
              });
              window.dispatchEvent(event);
            },
          },
        );
        break;
    }

    // Add pattern-based actions
    if (patterns.isRepeatedError) {
      actions.unshift({
        id: "get-help",
        label: "Get Personalized Help",
        description: "Get targeted assistance based on your specific situation",
        type: "guidance",
        priority: 0,
        execute: () => {
          HelpContextEngine.triggerContextualHelp({
            stepId: context.stepId,
            stepNumber: context.stepNumber,
            hasErrors: true,
            formState: "partial",
            userBehavior: {
              timeOnStep: context.userBehavior?.timeOnStep || 0,
              errorCount: patterns.errorCount,
              hesitationIndicators: ["repeated_errors"],
            },
          });
        },
      });
    }

    if (patterns.userStrugglingIndicators) {
      actions.push({
        id: "request-support",
        label: "Contact Support",
        description: "Get help from our support team",
        type: "user-action",
        priority: 10,
        execute: () => {
          // Open support chat or email
          window.open(
            "mailto:support@estimatepro.com?subject=Help with Estimation Flow",
            "_blank",
          );
        },
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate contextual help content for the error
   */
  private static async generateContextualHelp(
    context: ErrorContext,
  ): Promise<ErrorMessage["helpContent"]> {
    try {
      const helpContext: HelpContext = {
        stepId: context.stepId,
        stepNumber: context.stepNumber,
        fieldId: context.fieldId,
        hasErrors: true,
        formState: "partial",
        userBehavior: context.userBehavior,
      };

      // Get contextual help from help engine
      const helpContent = HelpContextEngine.getContextualHelp(
        helpContext,
        { experienceLevel: "intermediate", role: "estimator", preferences: {} }, // Default user profile
        context.flowData,
      );

      if (helpContent.length > 0) {
        const primaryHelp = helpContent[0];
        return {
          title: primaryHelp.title,
          content: primaryHelp.content,
          actionable: true,
        };
      }
    } catch (error) {
      console.error("Error generating contextual help:", error);
    }

    // Fallback help content
    return {
      title: "General Help",
      content: this.getFallbackHelpContent(context.errorType),
      actionable: false,
    };
  }

  /**
   * Generate prevention tips based on error patterns
   */
  private static generatePreventionTips(
    context: ErrorContext,
    patterns: ReturnType<typeof ErrorRecoveryEngine.analyzeErrorPatterns>,
  ): string[] {
    const tips: string[] = [];

    // Common prevention tips by error type
    const preventionTipsByType: Record<ErrorType, string[]> = {
      validation: [
        "Double-check required fields before proceeding",
        "Use the format examples provided",
        "Copy and paste values to avoid typos",
      ],
      network: [
        "Save your work frequently",
        "Check your internet connection stability",
        "Consider working offline if connection is unreliable",
      ],
      authentication: [
        "Keep your session active by interacting with the app",
        "Save your work before long breaks",
        "Use a password manager for easy sign-in",
      ],
      ai_service: [
        "Have manual data ready as backup",
        "Try AI analysis during off-peak hours",
        "Use clear, high-quality photos for better AI results",
      ],
      file_upload: [
        "Compress large files before uploading",
        "Use supported file formats (JPEG, PNG, PDF)",
        "Check file size limits before uploading",
      ],
      database: [
        "Work with a stable internet connection",
        "Save frequently to avoid data loss",
        "Keep browser tabs minimal for better performance",
      ],
      quota_exceeded: [
        "Monitor your usage in account settings",
        "Plan your work within quota limits",
        "Consider upgrading if you frequently hit limits",
      ],
    };

    tips.push(...(preventionTipsByType[context.errorType] || []));

    // Add pattern-specific tips
    if (patterns.isRepeatedError) {
      tips.push("Take a break and return with fresh perspective");
      tips.push("Review the help documentation for this step");
    }

    if (patterns.userStrugglingIndicators) {
      tips.push("Consider using workflow templates to get started");
      tips.push("Watch tutorial videos for step-by-step guidance");
    }

    return tips;
  }

  /**
   * Get most common errors from recent history
   */
  private static getMostCommonErrors(errors: ErrorContext[]): string[] {
    const errorCounts = errors.reduce(
      (counts, error) => {
        counts[error.errorCode] = (counts[error.errorCode] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([code]) => code);
  }

  /**
   * Get fallback help content for error types
   */
  private static getFallbackHelpContent(errorType: ErrorType): string {
    const fallbackContent: Record<ErrorType, string> = {
      validation:
        "Make sure all required fields are filled out correctly. Look for red highlights or error messages next to form fields.",
      network:
        "Check your internet connection and try again. Your work is saved locally and will sync when connection is restored.",
      authentication:
        "Please sign in to your account to continue. Your progress will be saved after signing in.",
      permission:
        "You don't have permission to perform this action. Contact your administrator if you believe this is an error.",
      data_corruption:
        "Some data appears to be corrupted. Try refreshing the page or contact support if the problem persists.",
      ai_service:
        "AI services are temporarily unavailable. You can continue manually or try again later.",
      file_upload:
        "File upload failed. Check that your file is under 10MB and in a supported format (JPEG, PNG, PDF).",
      calculation:
        "There was an error in the calculation. Please verify your input values and try again.",
      database:
        "Unable to save your data. Your work is preserved locally and will be saved when the connection is restored.",
      timeout:
        "The operation took too long. Please try again or break your work into smaller steps.",
      quota_exceeded:
        "You've reached your usage limit. Upgrade your plan or wait for your quota to reset.",
      unknown:
        "An unexpected error occurred. Please try again or contact support if the problem continues.",
    };

    return fallbackContent[errorType] || fallbackContent.unknown;
  }

  /**
   * Clear error history for a user (useful for testing or privacy)
   */
  static clearErrorHistory(userId: string): void {
    this.errorHistory.delete(userId);
  }

  /**
   * Get error statistics for analytics
   */
  static getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    recoveryPatterns: Record<string, number>;
  } {
    const allErrors = Array.from(this.errorHistory.values()).flat();

    const errorsByType = allErrors.reduce(
      (counts, error) => {
        counts[error.errorType] = (counts[error.errorType] || 0) + 1;
        return counts;
      },
      {} as Record<ErrorType, number>,
    );

    const errorsByCategory = allErrors.reduce(
      (counts, error) => {
        const category = this.getErrorCategory(error.errorType);
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      },
      {} as Record<ErrorCategory, number>,
    );

    return {
      totalErrors: allErrors.length,
      errorsByType,
      errorsByCategory,
      recoveryPatterns: Object.fromEntries(this.recoveryPatterns),
    };
  }

  /**
   * Get error category for error type
   */
  private static getErrorCategory(errorType: ErrorType): ErrorCategory {
    const categoryMap: Record<ErrorType, ErrorCategory> = {
      validation: "user_input",
      network: "external_service",
      authentication: "security",
      permission: "security",
      data_corruption: "system_error",
      ai_service: "external_service",
      file_upload: "user_input",
      calculation: "system_error",
      database: "system_error",
      timeout: "performance",
      quota_exceeded: "configuration",
      unknown: "system_error",
    };

    return categoryMap[errorType] || "system_error";
  }
}

export default ErrorRecoveryEngine;

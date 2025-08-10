/**
 * Error Handling Components and Utilities
 * Centralized exports for error boundary system
 */

// Base error boundary and utilities
export {
  BaseErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
} from "./base-error-boundary";

// Specific error boundary components
export { ErrorBoundary } from "./error-boundary";
export {
  ComponentErrorBoundary,
  withComponentErrorBoundary,
} from "./component-error-boundary";
export { GuidedFlowErrorBoundary } from "./guided-flow-error-boundary";

// Types and interfaces
export type {
  ErrorType,
  ErrorSeverity,
  ErrorRecoveryAction,
  ErrorContext,
  ExtendedError,
  ErrorBoundaryState,
  BaseErrorBoundaryProps,
  ErrorRecoveryConfig,
  ErrorLoggingConfig,
  ErrorAnalytics,
  ErrorRecoveryResult,
  ErrorBoundaryFactoryOptions,
  ErrorDetectionUtils,
  ErrorNotificationConfig,
  UseErrorBoundaryReturn,
} from "./types";

// Utility functions
export {
  DEFAULT_ERROR_RECOVERY_CONFIG,
  DEFAULT_ERROR_LOGGING_CONFIG,
  DEFAULT_ERROR_NOTIFICATION_CONFIG,
  isExtendedError,
  isRetryableError,
  detectErrorType,
  determineErrorSeverity,
} from "./types";

// Provider and context hooks
export {
  ErrorProvider,
  useErrorContext,
  useErrorNotification,
} from "./error-provider";

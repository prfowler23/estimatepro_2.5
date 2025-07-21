// Comprehensive error type system for EstimatePro

export enum ErrorType {
  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",

  // Authentication errors
  AUTH_ERROR = "AUTH_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SCHEMA_ERROR = "SCHEMA_ERROR",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",
  CONSTRAINT_ERROR = "CONSTRAINT_ERROR",

  // AI service errors
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  AI_QUOTA_EXCEEDED = "AI_QUOTA_EXCEEDED",
  AI_RATE_LIMIT = "AI_RATE_LIMIT",

  // File/upload errors
  FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR",
  FILE_SIZE_ERROR = "FILE_SIZE_ERROR",
  FILE_TYPE_ERROR = "FILE_TYPE_ERROR",

  // Business logic errors
  CALCULATION_ERROR = "CALCULATION_ERROR",
  WORKFLOW_ERROR = "WORKFLOW_ERROR",
  SERVICE_CONFIG_ERROR = "SERVICE_CONFIG_ERROR",

  // System errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  FEATURE_DISABLED = "FEATURE_DISABLED",
  MAINTENANCE_MODE = "MAINTENANCE_MODE",

  // Component errors
  COMPONENT_ERROR = "COMPONENT_ERROR",
  RENDER_ERROR = "RENDER_ERROR",

  // Unknown errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorContext {
  userId?: string;
  estimateId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
}

export interface EstimateProError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: string;
  context?: ErrorContext;
  originalError?: Error;
  isRetryable?: boolean;
  suggestedAction?: string;
  recoveryOptions?: RecoveryOption[];
}

export interface RecoveryOption {
  type: "retry" | "reload" | "navigate" | "contact_support" | "dismiss";
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export class EstimateProErrorClass extends Error implements EstimateProError {
  public readonly id: string;
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly details?: string;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly isRetryable?: boolean;
  public readonly suggestedAction?: string;
  public readonly recoveryOptions?: RecoveryOption[];

  constructor(params: Omit<EstimateProError, "id"> & { id?: string }) {
    super(params.message);
    this.name = "EstimateProError";
    this.id = params.id || this.generateErrorId();
    this.type = params.type;
    this.severity = params.severity;
    this.code = params.code;
    this.details = params.details;
    this.context = {
      ...params.context,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    this.originalError = params.originalError;
    this.isRetryable = params.isRetryable ?? this.getDefaultRetryability();
    this.suggestedAction = params.suggestedAction;
    this.recoveryOptions = params.recoveryOptions;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EstimateProErrorClass);
    }
  }

  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${randomPart}`;
  }

  private getDefaultRetryability(): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.AI_RATE_LIMIT,
      ErrorType.DATABASE_ERROR,
    ];
    return retryableTypes.includes(this.type);
  }

  public toSerializable(): EstimateProError {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      code: this.code,
      details: this.details,
      context: this.context,
      isRetryable: this.isRetryable,
      suggestedAction: this.suggestedAction,
      recoveryOptions: this.recoveryOptions,
    };
  }
}

// Error factory functions
export function createNetworkError(
  message: string,
  statusCode?: number,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message,
    code: statusCode?.toString(),
    context,
    isRetryable: true,
    suggestedAction: "Check your internet connection and try again",
  });
}

export function createAuthError(
  message: string,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.AUTH_ERROR,
    severity: ErrorSeverity.HIGH,
    message,
    context,
    isRetryable: false,
    suggestedAction: "Please log in again to continue",
  });
}

export function createValidationError(
  message: string,
  fieldName?: string,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    message,
    details: fieldName ? `Field: ${fieldName}` : undefined,
    context,
    isRetryable: false,
    suggestedAction: "Please correct the highlighted fields and try again",
  });
}

export function createAIServiceError(
  message: string,
  quota?: boolean,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: quota ? ErrorType.AI_QUOTA_EXCEEDED : ErrorType.AI_SERVICE_ERROR,
    severity: quota ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    message,
    context,
    isRetryable: !quota,
    suggestedAction: quota
      ? "AI quota exceeded. Please try again later or contact support"
      : "AI service temporarily unavailable. Please try again",
  });
}

export function createCalculationError(
  message: string,
  serviceType?: string,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.CALCULATION_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message,
    details: serviceType ? `Service: ${serviceType}` : undefined,
    context,
    isRetryable: true,
    suggestedAction: "Please check your input values and try again",
  });
}

export function createFileUploadError(
  message: string,
  fileName?: string,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.FILE_UPLOAD_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message,
    details: fileName ? `File: ${fileName}` : undefined,
    context,
    isRetryable: true,
    suggestedAction: "Please check your file and try uploading again",
  });
}

export function createDatabaseError(
  message: string,
  operation?: string,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.DATABASE_ERROR,
    severity: ErrorSeverity.HIGH,
    message,
    details: operation ? `Operation: ${operation}` : undefined,
    context,
    isRetryable: true,
    suggestedAction: "Database temporarily unavailable. Please try again",
  });
}

export function createComponentError(
  message: string,
  componentName?: string,
  originalError?: Error,
  context?: ErrorContext,
): EstimateProErrorClass {
  return new EstimateProErrorClass({
    type: ErrorType.COMPONENT_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message,
    details: componentName ? `Component: ${componentName}` : undefined,
    originalError,
    context,
    isRetryable: true,
    suggestedAction: "Component failed to load. Please refresh the page",
  });
}

// Error classification utility
export function classifyError(error: Error | unknown): EstimateProErrorClass {
  if (error instanceof EstimateProErrorClass) {
    return error;
  }

  if (error instanceof Error) {
    // Classify based on error message patterns
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return createNetworkError(error.message, undefined, {
        stackTrace: error.stack,
      });
    }

    if (message.includes("auth") || message.includes("unauthorized")) {
      return createAuthError(error.message, { stackTrace: error.stack });
    }

    if (message.includes("validation") || message.includes("required")) {
      return createValidationError(error.message, undefined, {
        stackTrace: error.stack,
      });
    }

    // Default to component error for unclassified errors
    return createComponentError(error.message, undefined, error, {
      stackTrace: error.stack,
    });
  }

  // Handle non-Error objects
  return new EstimateProErrorClass({
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: typeof error === "string" ? error : "An unknown error occurred",
    details: typeof error === "object" ? JSON.stringify(error) : String(error),
    isRetryable: false,
  });
}

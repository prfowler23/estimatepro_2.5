/**
 * Specific error types for AI services with better debugging context
 */

export class AIError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    context: Record<string, any> = {},
  ) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class AIConfigurationError extends AIError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, "AI_CONFIGURATION_ERROR", context);
    this.name = "AIConfigurationError";
  }
}

export class AIRateLimitError extends AIError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_RATE_LIMIT_ERROR", context);
    this.name = "AIRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class AIModelError extends AIError {
  public readonly model: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    model: string,
    statusCode?: number,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_MODEL_ERROR", { ...context, model, statusCode });
    this.name = "AIModelError";
    this.model = model;
    this.statusCode = statusCode;
  }
}

export class AIValidationError extends AIError {
  public readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[],
    context: Record<string, any> = {},
  ) {
    super(message, "AI_VALIDATION_ERROR", { ...context, validationErrors });
    this.name = "AIValidationError";
    this.validationErrors = validationErrors;
  }
}

export class AIToolExecutionError extends AIError {
  public readonly toolName: string;
  public readonly toolArgs: any;

  constructor(
    message: string,
    toolName: string,
    toolArgs: any,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_TOOL_EXECUTION_ERROR", {
      ...context,
      toolName,
      toolArgs,
    });
    this.name = "AIToolExecutionError";
    this.toolName = toolName;
    this.toolArgs = toolArgs;
  }
}

export class AISecurityError extends AIError {
  public readonly securityViolation: string;

  constructor(
    message: string,
    securityViolation: string,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_SECURITY_ERROR", { ...context, securityViolation });
    this.name = "AISecurityError";
    this.securityViolation = securityViolation;
  }
}

export class AIConversationError extends AIError {
  public readonly conversationId?: string;
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    conversationId?: string,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_CONVERSATION_ERROR", {
      ...context,
      operation,
      conversationId,
    });
    this.name = "AIConversationError";
    this.conversationId = conversationId;
    this.operation = operation;
  }
}

export class AIPerformanceError extends AIError {
  public readonly duration: number;
  public readonly threshold: number;

  constructor(
    message: string,
    duration: number,
    threshold: number,
    context: Record<string, any> = {},
  ) {
    super(message, "AI_PERFORMANCE_ERROR", { ...context, duration, threshold });
    this.name = "AIPerformanceError";
    this.duration = duration;
    this.threshold = threshold;
  }
}

/**
 * Error factory for creating typed errors with context
 */
export class AIErrorFactory {
  static configuration(
    message: string,
    context: Record<string, any> = {},
  ): AIConfigurationError {
    return new AIConfigurationError(message, context);
  }

  static rateLimit(
    message: string,
    retryAfter?: number,
    context: Record<string, any> = {},
  ): AIRateLimitError {
    return new AIRateLimitError(message, retryAfter, context);
  }

  static model(
    message: string,
    model: string,
    statusCode?: number,
    context: Record<string, any> = {},
  ): AIModelError {
    return new AIModelError(message, model, statusCode, context);
  }

  static validation(
    message: string,
    validationErrors: string[],
    context: Record<string, any> = {},
  ): AIValidationError {
    return new AIValidationError(message, validationErrors, context);
  }

  static toolExecution(
    message: string,
    toolName: string,
    toolArgs: any,
    context: Record<string, any> = {},
  ): AIToolExecutionError {
    return new AIToolExecutionError(message, toolName, toolArgs, context);
  }

  static security(
    message: string,
    securityViolation: string,
    context: Record<string, any> = {},
  ): AISecurityError {
    return new AISecurityError(message, securityViolation, context);
  }

  static conversation(
    message: string,
    operation: string,
    conversationId?: string,
    context: Record<string, any> = {},
  ): AIConversationError {
    return new AIConversationError(message, operation, conversationId, context);
  }

  static performance(
    message: string,
    duration: number,
    threshold: number,
    context: Record<string, any> = {},
  ): AIPerformanceError {
    return new AIPerformanceError(message, duration, threshold, context);
  }
}

/**
 * Type guard to check if error is an AI error
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}

/**
 * Extract context from any error for logging
 */
export function extractErrorContext(error: unknown): Record<string, any> {
  if (isAIError(error)) {
    return {
      type: error.name,
      code: error.code,
      context: error.context,
      timestamp: error.timestamp,
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: "UnknownError",
    value: String(error),
  };
}

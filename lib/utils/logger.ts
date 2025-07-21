/**
 * Production-ready logging utility
 * Replaces console.log statements with proper logging
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private enableDebug: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.isProduction = process.env.NODE_ENV === "production";
    this.enableDebug = process.env.NEXT_PUBLIC_DEBUG === "true";
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (this.isProduction) {
      return level === "warn" || level === "error";
    }

    // In development, log everything except debug unless explicitly enabled
    if (this.isDevelopment) {
      return level !== "debug" || this.enableDebug;
    }

    return true;
  }

  private logToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case "debug":
        console.debug(formattedMessage);
        break;
      case "info":
        console.info(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "error":
        console.error(formattedMessage);
        break;
    }
  }

  private async logToExternal(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): Promise<void> {
    // Only log errors and warnings to external services in production
    if (!this.isProduction || (level !== "error" && level !== "warn")) {
      return;
    }

    try {
      // Send to external logging service (e.g., Sentry, LogRocket, etc.)
      // This is a placeholder - implement based on your monitoring solution
      if (typeof window !== "undefined" && (window as any).Sentry) {
        const sentry = (window as any).Sentry;

        if (level === "error") {
          sentry.captureException(new Error(message), {
            extra: context,
            level: "error",
          });
        } else {
          sentry.captureMessage(message, {
            extra: context,
            level: level,
          });
        }
      }
    } catch (error) {
      // Fallback to console if external logging fails
      console.error("Failed to log to external service:", error);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.logToConsole("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logToConsole("info", message, context);
    this.logToExternal("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logToConsole("warn", message, context);
    this.logToExternal("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.logToConsole("error", message, context);
    this.logToExternal("error", message, context);
  }

  /**
   * Log calculation errors with specific context
   */
  calculationError(error: Error, context: LogContext): void {
    this.error(`Calculation error: ${error.message}`, {
      ...context,
      component: "Calculator",
      error: error.stack,
    });
  }

  /**
   * Log API errors with request context
   */
  apiError(error: Error, context: LogContext): void {
    this.error(`API error: ${error.message}`, {
      ...context,
      component: "API",
      error: error.stack,
    });
  }

  /**
   * Log user actions for analytics
   */
  userAction(action: string, context: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      component: "Analytics",
    });
  }

  /**
   * Log AI operations
   */
  aiOperation(operation: string, context: LogContext): void {
    this.debug(`AI operation: ${operation}`, {
      ...context,
      component: "AI",
    });
  }

  /**
   * Log database operations
   */
  dbOperation(operation: string, context: LogContext): void {
    this.debug(`Database operation: ${operation}`, {
      ...context,
      component: "Database",
    });
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenient methods
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);

// Export specialized logging methods
export const calculationError = logger.calculationError.bind(logger);
export const apiError = logger.apiError.bind(logger);
export const userAction = logger.userAction.bind(logger);
export const aiOperation = logger.aiOperation.bind(logger);
export const dbOperation = logger.dbOperation.bind(logger);

// Development helper - can be removed in production
export const devLog = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] ${message}`, ...args);
  }
};

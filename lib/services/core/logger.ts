/**
 * Logging Service
 * Provides structured logging with different log levels and contextual information
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  userId?: string;
  estimateId?: string;
  service?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private static instance: Logger | null = null;
  private serviceName: string;
  private enabled: boolean;
  private minLevel: LogLevel;
  private logHandlers: Array<(entry: LogEntry) => void> = [];

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.enabled = process.env.NODE_ENV !== "test";
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

    // In production, we might send logs to an external service
    if (process.env.NODE_ENV === "production") {
      this.setupProductionLogging();
    } else {
      this.setupDevelopmentLogging();
    }
  }

  static getLogger(serviceName: string): Logger {
    return new Logger(serviceName);
  }

  private setupProductionLogging(): void {
    // In production, logs would go to a service like DataDog, LogRocket, etc.
    // For now, we'll use structured console output
    this.addHandler((entry) => {
      const logObject = {
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        service: this.serviceName,
        message: entry.message,
        ...entry.context,
      };

      if (entry.error) {
        logObject.error = {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        };
      }

      // Use appropriate console method based on level
      switch (entry.level) {
        case "debug":
          if (process.env.NODE_ENV === "development") {
            console.debug(JSON.stringify(logObject));
          }
          break;
        case "info":
          console.info(JSON.stringify(logObject));
          break;
        case "warn":
          console.warn(JSON.stringify(logObject));
          break;
        case "error":
        case "fatal":
          console.error(JSON.stringify(logObject));
          break;
      }
    });
  }

  private setupDevelopmentLogging(): void {
    // In development, use more readable output
    this.addHandler((entry) => {
      const timestamp = entry.timestamp.toLocaleTimeString();
      const level = entry.level.toUpperCase().padEnd(5);
      const service = `[${this.serviceName}]`.padEnd(25);
      const prefix = `${timestamp} ${level} ${service}`;

      const contextStr = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : "";

      switch (entry.level) {
        case "debug":
          if (process.env.NEXT_PUBLIC_DEBUG === "true") {
            console.debug(`${prefix} ${entry.message}${contextStr}`);
          }
          break;
        case "info":
          console.info(`${prefix} ${entry.message}${contextStr}`);
          break;
        case "warn":
          console.warn(`${prefix} ${entry.message}${contextStr}`);
          break;
        case "error":
        case "fatal":
          console.error(`${prefix} ${entry.message}${contextStr}`);
          if (entry.error) {
            console.error(entry.error);
          }
          break;
      }
    });
  }

  private addHandler(handler: (entry: LogEntry) => void): void {
    this.logHandlers.push(handler);
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: {
        ...context,
        service: this.serviceName,
      },
      error,
      stack: error?.stack,
    };

    this.logHandlers.forEach((handler) => {
      try {
        handler(entry);
      } catch (err) {
        // Prevent logging errors from breaking the application
        console.error("Logger handler error:", err);
      }
    });
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log("error", message, context, err);
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log("fatal", message, context, err);
  }

  /**
   * Log the duration of an operation
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`${operation} completed`, {
        ...context,
        operation,
        duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operation} failed`, error, {
        ...context,
        operation,
        duration,
      });
      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(
      `${this.serviceName}:${additionalContext.operation || "child"}`,
    );

    // Override the log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, context, error) => {
      originalLog(level, message, { ...additionalContext, ...context }, error);
    };

    return childLogger;
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(serviceName: string): Logger {
  return Logger.getLogger(serviceName);
}

/**
 * Default logger instance for quick usage
 */
export const defaultLogger = createLogger("default");

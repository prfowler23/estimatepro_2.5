/**
 * Production-safe logging utility
 * Prevents sensitive information from being exposed in production logs
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  enableInProduction: boolean;
  logLevel: LogLevel;
  sanitizeData: boolean;
  maxMessageLength: number;
}

const defaultConfig: LoggerConfig = {
  enableInProduction: false,
  logLevel: "info",
  sanitizeData: true,
  maxMessageLength: 1000,
};

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && !this.config.enableInProduction) {
      return false;
    }

    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  private sanitize(data: any): any {
    if (!this.config.sanitizeData) return data;

    if (typeof data === "string") {
      // Remove potential sensitive patterns
      return data
        .replace(/password["\s]*[:=]\s*["']?[^"'\s,}]+["']?/gi, "password=***")
        .replace(/token["\s]*[:=]\s*["']?[^"'\s,}]+["']?/gi, "token=***")
        .replace(
          /api[_-]?key["\s]*[:=]\s*["']?[^"'\s,}]+["']?/gi,
          "api_key=***",
        )
        .replace(/secret["\s]*[:=]\s*["']?[^"'\s,}]+["']?/gi, "secret=***")
        .replace(
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
          "***@***.***",
        )
        .substring(0, this.config.maxMessageLength);
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      const sensitiveKeys = [
        "password",
        "token",
        "apiKey",
        "api_key",
        "secret",
        "authorization",
        "auth",
      ];

      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
            sanitized[key] = "***";
          } else {
            sanitized[key] = this.sanitize(data[key]);
          }
        }
      }

      return sanitized;
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (data !== undefined) {
      const sanitizedData = this.sanitize(data);
      return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`;
    }

    return `${prefix} ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (this.shouldLog("error")) {
      const errorData =
        error instanceof Error
          ? {
              message: error.message,
              stack: this.isDevelopment ? error.stack : undefined,
              ...data,
            }
          : { error, ...data };

      console.error(this.formatMessage("error", message, errorData));
    }
  }

  // Group logging for related messages
  group(label: string): void {
    if (this.shouldLog("debug")) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog("debug")) {
      console.groupEnd();
    }
  }

  // Timing utilities
  time(label: string): void {
    if (this.shouldLog("debug")) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog("debug")) {
      console.timeEnd(label);
    }
  }

  // Table logging for structured data
  table(data: any, columns?: string[]): void {
    if (this.shouldLog("debug")) {
      const sanitizedData = this.sanitize(data);
      console.table(sanitizedData, columns);
    }
  }

  // Create a child logger with specific context
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    const originalMethods = ["debug", "info", "warn", "error"] as const;

    originalMethods.forEach((method) => {
      const original = childLogger[method].bind(childLogger);
      (childLogger as any)[method] = (message: string, data?: any) => {
        original(message, { ...context, ...data });
      };
    });

    return childLogger;
  }
}

// Create default logger instance
const logger = new Logger({
  enableInProduction: process.env.ENABLE_PRODUCTION_LOGS === "true",
  logLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

// Export logger instance and class for custom configurations
export { logger, Logger };

// Export individual logging methods for easier imports
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);

// Specialized logging methods
export const logError = error;
export const logWarn = warn;
export const logInfo = info;
export const logDebug = debug;
export const calculationError = (message: string, error?: Error | any) => {
  logger.error(`[CALCULATION] ${message}`, error);
};

// User action logging
export const userAction = (action: string, data?: any) => {
  logger.info(`[USER_ACTION] ${action}`, data);
};

// Development-only debug logging
export const devLog = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === "development") {
    logger.debug(`[DEV] ${message}`, data);
  }
};

// Helper function to replace console.log in existing code
export function replaceConsoleLog(): void {
  if (process.env.NODE_ENV === "production") {
    console.log = logger.info.bind(logger);
    console.warn = logger.warn.bind(logger);
    console.error = logger.error.bind(logger);
    console.debug = logger.debug.bind(logger);
  }
}

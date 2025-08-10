interface LogContext {
  calculatorType?: string;
  error?: string;
  stack?: string;
  componentStack?: string;
  retryCount?: number;
  [key: string]: any;
}

class CalculatorLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  error(message: string, context: LogContext): void {
    const logData = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (this.isDevelopment) {
      // In development, use console for immediate feedback
      console.error(`[Calculator Error] ${message}`, logData);
    }

    // Send to monitoring service (e.g., Sentry, DataDog, etc.)
    this.sendToMonitoring(logData);

    // Store locally for debugging
    this.storeLocally(logData);
  }

  warn(message: string, context?: LogContext): void {
    const logData = {
      level: "warn",
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (this.isDevelopment) {
      console.warn(`[Calculator Warning] ${message}`, logData);
    }

    this.sendToMonitoring(logData);
  }

  info(message: string, context?: LogContext): void {
    const logData = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (this.isDevelopment) {
      console.info(`[Calculator Info] ${message}`, logData);
    }
  }

  private sendToMonitoring(data: any): void {
    // Integration with monitoring service
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(data.message), {
        extra: data,
      });
    }

    // Add other monitoring services as needed
  }

  private storeLocally(data: any): void {
    try {
      // Store recent errors in localStorage for debugging
      const errors = JSON.parse(
        localStorage.getItem("calculator-errors") || "[]",
      );
      errors.push(data);

      // Keep only last 10 errors
      if (errors.length > 10) {
        errors.shift();
      }

      localStorage.setItem("calculator-errors", JSON.stringify(errors));
    } catch (e) {
      // Silently fail if localStorage is not available
    }
  }

  getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem("calculator-errors") || "[]");
    } catch {
      return [];
    }
  }

  clearStoredErrors(): void {
    try {
      localStorage.removeItem("calculator-errors");
    } catch {
      // Silently fail
    }
  }
}

export const calculatorLogger = new CalculatorLogger();

/**
 * Circuit Breaker Pattern Implementation for Supabase Operations
 *
 * Features:
 * - Fail-fast mechanism to prevent cascading failures
 * - Automatic recovery detection and retry logic
 * - Comprehensive metrics and monitoring
 * - Configurable thresholds and timeouts
 * - Integration with existing error handling
 * - Performance monitoring and alerting
 * - Connection pooling optimization
 */

import { z } from "zod";
import type { TypedSupabaseClient } from "./supabase-types";
import { getAdvancedCache } from "../utils/advanced-cache";
import { withPooledClient } from "./server-pooled";

// Circuit breaker states
export enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Blocking requests due to failures
  HALF_OPEN = "half-open", // Testing if service has recovered
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringWindow: number; // Time window for monitoring failures (ms)
  successThreshold: number; // Successes needed to close from half-open
  volumeThreshold: number; // Minimum calls in window before evaluating
  errorRate: number; // Error rate threshold (0-1)
  slowCallThreshold: number; // Milliseconds before considering a call slow
  slowCallRate: number; // Slow call rate threshold (0-1)
  maxRetries: number; // Maximum retry attempts
  retryDelay: number; // Base delay between retries (ms)
  backoffMultiplier: number; // Exponential backoff multiplier
  jitterEnabled: boolean; // Add randomness to prevent thundering herd
}

// Default configuration
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  name: "supabase-circuit-breaker",
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringWindow: 120000, // 2 minutes
  successThreshold: 3,
  volumeThreshold: 10,
  errorRate: 0.5, // 50%
  slowCallThreshold: 5000, // 5 seconds
  slowCallRate: 0.8, // 80%
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
  jitterEnabled: true,
};

// Call result tracking
interface CallResult {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: string;
  operation?: string;
}

// Circuit breaker metrics
interface CircuitBreakerMetrics {
  state: CircuitState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  slowCalls: number;
  blockedCalls: number;
  successRate: number;
  failureRate: number;
  slowCallRate: number;
  avgResponseTime: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateTransitions: Array<{
    from: CircuitState;
    to: CircuitState;
    timestamp: Date;
    reason: string;
  }>;
  windowStats: {
    calls: number;
    failures: number;
    slowCalls: number;
    avgDuration: number;
  };
}

// Circuit breaker events
interface CircuitBreakerEvent {
  type:
    | "state_change"
    | "call_success"
    | "call_failure"
    | "call_blocked"
    | "recovery_attempt";
  timestamp: Date;
  circuitName: string;
  state?: CircuitState;
  previousState?: CircuitState;
  callDuration?: number;
  error?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

// Error types that should trigger circuit breaker
const RETRIABLE_ERRORS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "503",
  "504",
  "429",
] as const;

/**
 * Circuit Breaker implementation with comprehensive monitoring
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private callHistory: CallResult[] = [];
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private stateTransitions: Array<{
    from: CircuitState;
    to: CircuitState;
    timestamp: Date;
    reason: string;
  }> = [];
  private events: CircuitBreakerEvent[] = [];
  private cache = getAdvancedCache();

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicCleanup();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName = "unknown",
    options: {
      timeout?: number;
      retryable?: boolean;
      fallback?: () => Promise<T>;
    } = {},
  ): Promise<T> {
    const startTime = Date.now();

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionTo(CircuitState.HALF_OPEN, "recovery_timeout_reached");
      } else {
        this.recordBlockedCall(operationName);
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name}`,
          this.state,
          this.getMetrics(),
        );
      }
    }

    try {
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation, options.timeout);
      const duration = Date.now() - startTime;

      // Record successful call
      this.recordCallResult({
        timestamp: startTime,
        success: true,
        duration,
        operation: operationName,
      });

      // Handle state transitions for successful calls
      this.handleSuccessfulCall();

      this.emitEvent({
        type: "call_success",
        timestamp: new Date(),
        circuitName: this.config.name,
        state: this.state,
        callDuration: duration,
        operation: operationName,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Record failed call
      this.recordCallResult({
        timestamp: startTime,
        success: false,
        duration,
        error: errorMessage,
        operation: operationName,
      });

      // Handle state transitions for failed calls
      this.handleFailedCall(error, operationName);

      this.emitEvent({
        type: "call_failure",
        timestamp: new Date(),
        circuitName: this.config.name,
        state: this.state,
        callDuration: duration,
        error: errorMessage,
        operation: operationName,
      });

      // Try fallback if available
      if (options.fallback && this.state === CircuitState.OPEN) {
        try {
          return await options.fallback();
        } catch (fallbackError) {
          // If fallback fails, throw original error
          throw error;
        }
      }

      // Retry logic for retriable errors
      if (options.retryable !== false && this.isRetriableError(error)) {
        return await this.retryOperation(operation, operationName, options, 1);
      }

      throw error;
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;

    // Filter calls within monitoring window
    const windowCalls = this.callHistory.filter(
      (call) => call.timestamp >= windowStart,
    );

    const totalCalls = this.callHistory.length;
    const successfulCalls = this.callHistory.filter(
      (call) => call.success,
    ).length;
    const failedCalls = this.callHistory.filter((call) => !call.success).length;
    const slowCalls = this.callHistory.filter(
      (call) => call.duration >= this.config.slowCallThreshold,
    ).length;

    const windowFailures = windowCalls.filter((call) => !call.success).length;
    const windowSlowCalls = windowCalls.filter(
      (call) => call.duration >= this.config.slowCallThreshold,
    ).length;

    const avgResponseTime =
      totalCalls > 0
        ? this.callHistory.reduce((sum, call) => sum + call.duration, 0) /
          totalCalls
        : 0;

    const windowAvgDuration =
      windowCalls.length > 0
        ? windowCalls.reduce((sum, call) => sum + call.duration, 0) /
          windowCalls.length
        : 0;

    return {
      state: this.state,
      totalCalls,
      successfulCalls,
      failedCalls,
      slowCalls,
      blockedCalls: this.events.filter((e) => e.type === "call_blocked").length,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
      failureRate: totalCalls > 0 ? failedCalls / totalCalls : 0,
      slowCallRate: totalCalls > 0 ? slowCalls / totalCalls : 0,
      avgResponseTime,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.callHistory.filter((c) => c.success)[0]?.timestamp
        ? new Date(this.callHistory.filter((c) => c.success)[0].timestamp)
        : undefined,
      stateTransitions: [...this.stateTransitions],
      windowStats: {
        calls: windowCalls.length,
        failures: windowFailures,
        slowCalls: windowSlowCalls,
        avgDuration: windowAvgDuration,
      },
    };
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(reason = "manually_forced"): void {
    this.transitionTo(CircuitState.OPEN, reason);
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClose(reason = "manually_reset"): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.transitionTo(CircuitState.CLOSED, reason);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 50): CircuitBreakerEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all metrics and reset state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.callHistory = [];
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.stateTransitions = [];
    this.events = [];
  }

  // Private methods

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    if (!timeoutMs) {
      return await operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: any,
    attempt: number,
  ): Promise<T> {
    if (attempt > this.config.maxRetries) {
      throw new Error(
        `Max retries (${this.config.maxRetries}) exceeded for ${operationName}`,
      );
    }

    const delay = this.calculateRetryDelay(attempt);
    await this.sleep(delay);

    return this.execute(operation, operationName, {
      ...options,
      retryable: false,
    });
  }

  private calculateRetryDelay(attempt: number): number {
    let delay =
      this.config.retryDelay *
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    if (this.config.jitterEnabled) {
      // Add jitter to prevent thundering herd
      delay += Math.random() * delay * 0.1;
    }

    return Math.min(delay, 30000); // Cap at 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private recordCallResult(result: CallResult): void {
    this.callHistory.push(result);

    // Keep only recent history to prevent memory issues
    const maxHistory = 1000;
    if (this.callHistory.length > maxHistory) {
      this.callHistory = this.callHistory.slice(-maxHistory);
    }
  }

  private recordBlockedCall(operationName: string): void {
    this.emitEvent({
      type: "call_blocked",
      timestamp: new Date(),
      circuitName: this.config.name,
      state: this.state,
      operation: operationName,
    });
  }

  private handleSuccessfulCall(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.successCount = 0;
        this.failureCount = 0;
        this.transitionTo(CircuitState.CLOSED, "success_threshold_reached");
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on successful call
      this.failureCount = 0;
    }
  }

  private handleFailedCall(error: unknown, operationName: string): void {
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state should open the circuit
      this.transitionTo(
        CircuitState.OPEN,
        `failure_in_half_open: ${operationName}`,
      );
      this.setNextAttemptTime();
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;

      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionTo(CircuitState.OPEN, "failure_threshold_exceeded");
        this.setNextAttemptTime();
      }
    }
  }

  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;
    const windowCalls = this.callHistory.filter(
      (call) => call.timestamp >= windowStart,
    );

    // Not enough volume to make a decision
    if (windowCalls.length < this.config.volumeThreshold) {
      return false;
    }

    const failures = windowCalls.filter((call) => !call.success).length;
    const slowCalls = windowCalls.filter(
      (call) => call.duration >= this.config.slowCallThreshold,
    ).length;

    const failureRate = failures / windowCalls.length;
    const slowCallRate = slowCalls / windowCalls.length;

    // Open circuit if failure rate or slow call rate exceeds threshold
    return (
      failureRate >= this.config.errorRate ||
      slowCallRate >= this.config.slowCallRate ||
      this.failureCount >= this.config.failureThreshold
    );
  }

  private shouldAttemptRecovery(): boolean {
    return this.nextAttemptTime
      ? Date.now() >= this.nextAttemptTime.getTime()
      : true;
  }

  private setNextAttemptTime(): void {
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
  }

  private transitionTo(newState: CircuitState, reason: string): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;

    const transition = {
      from: previousState,
      to: newState,
      timestamp: new Date(),
      reason,
    };

    this.stateTransitions.push(transition);

    // Keep only recent transitions
    if (this.stateTransitions.length > 100) {
      this.stateTransitions = this.stateTransitions.slice(-100);
    }

    this.emitEvent({
      type: "state_change",
      timestamp: new Date(),
      circuitName: this.config.name,
      state: newState,
      previousState,
      metadata: { reason },
    });

    console.log(
      `🔄 Circuit breaker ${this.config.name}: ${previousState} → ${newState} (${reason})`,
    );
  }

  private emitEvent(event: CircuitBreakerEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
  }

  private isRetriableError(error: unknown): boolean {
    if (error instanceof Error) {
      const errorString = error.message.toLowerCase();
      return RETRIABLE_ERRORS.some((retriableError) =>
        errorString.includes(retriableError.toLowerCase()),
      );
    }
    return false;
  }

  private startPeriodicCleanup(): void {
    // Clean up old call history and events every 5 minutes
    setInterval(
      () => {
        const cutoffTime = Date.now() - 60 * 60 * 1000; // 1 hour
        this.callHistory = this.callHistory.filter(
          (call) => call.timestamp > cutoffTime,
        );

        // Keep recent events
        this.events = this.events.slice(-200);
        this.stateTransitions = this.stateTransitions.slice(-50);
      },
      5 * 60 * 1000,
    );
  }
}

/**
 * Circuit breaker error class
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly metrics: CircuitBreakerMetrics,
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Circuit breaker factory with pre-configured instances
 */
export class CircuitBreakerFactory {
  private static instances = new Map<string, CircuitBreaker>();

  static getOrCreate(
    name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ): CircuitBreaker {
    if (!this.instances.has(name)) {
      this.instances.set(name, new CircuitBreaker({ ...config, name }));
    }
    return this.instances.get(name)!;
  }

  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.instances);
  }

  static reset(name?: string): void {
    if (name) {
      this.instances.get(name)?.reset();
    } else {
      this.instances.forEach((breaker) => breaker.reset());
    }
  }

  static getGlobalMetrics(): {
    totalBreakers: number;
    healthyBreakers: number;
    unhealthyBreakers: number;
    averageSuccessRate: number;
    totalCalls: number;
  } {
    const breakers = Array.from(this.instances.values());
    const metrics = breakers.map((b) => b.getMetrics());

    return {
      totalBreakers: breakers.length,
      healthyBreakers: breakers.filter((b) => b.isHealthy()).length,
      unhealthyBreakers: breakers.filter((b) => !b.isHealthy()).length,
      averageSuccessRate:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
          : 0,
      totalCalls: metrics.reduce((sum, m) => sum + m.totalCalls, 0),
    };
  }
}

/**
 * Supabase-specific circuit breaker wrapper with connection pooling
 */
export function createSupabaseCircuitBreaker(
  client: TypedSupabaseClient,
  config: Partial<CircuitBreakerConfig> = {},
): {
  client: TypedSupabaseClient;
  breaker: CircuitBreaker;
  execute: <T>(
    operation: () => Promise<T>,
    operationName?: string,
  ) => Promise<T>;
} {
  const breaker = CircuitBreakerFactory.getOrCreate("supabase-main", {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds for database operations
    slowCallThreshold: 3000, // 3 seconds for database calls
    ...config,
  });

  return {
    client,
    breaker,
    execute: <T>(
      operation: () => Promise<T>,
      operationName = "supabase-operation",
    ) => breaker.execute(operation, operationName),
  };
}

/**
 * Supabase circuit breaker with pooled connections for server-side use
 */
export function createPooledSupabaseCircuitBreaker(
  config: Partial<CircuitBreakerConfig> = {},
): {
  breaker: CircuitBreaker;
  execute: <T>(
    operation: (client: TypedSupabaseClient) => Promise<T>,
    operationName?: string,
  ) => Promise<T>;
} {
  const breaker = CircuitBreakerFactory.getOrCreate("supabase-pooled", {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds for database operations
    slowCallThreshold: 3000, // 3 seconds for database calls
    ...config,
  });

  return {
    breaker,
    execute: <T>(
      operation: (client: TypedSupabaseClient) => Promise<T>,
      operationName = "supabase-pooled-operation",
    ) => breaker.execute(() => withPooledClient(operation), operationName),
  };
}

/**
 * Higher-order function to wrap Supabase operations with circuit breaker
 */
export function withCircuitBreaker<TArgs extends any[], TReturn>(
  breaker: CircuitBreaker,
  operationName: string,
) {
  return function <TFunc extends (...args: TArgs) => Promise<TReturn>>(
    fn: TFunc,
  ): TFunc {
    return (async (...args: TArgs): Promise<TReturn> => {
      return breaker.execute(() => fn(...args), operationName, {
        retryable: true,
        timeout: 10000, // 10 second timeout
      });
    }) as TFunc;
  };
}

// Export types
export type {
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerEvent,
  CallResult,
};

// Default export
export default CircuitBreaker;

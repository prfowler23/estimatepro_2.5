/**
 * Enhanced database transaction utilities with type safety and retry logic
 * Provides ACID-compliant operations with automatic rollback support
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { withRetry, RetryResult } from "./retry-logic";
import nullSafetyUtils from "./null-safety";

const { ValidationError } = nullSafetyUtils;

// Enhanced type definitions for database operations
type ValidTableName = keyof Database["public"]["Tables"];
type TableRecord<T extends ValidTableName> =
  Database["public"]["Tables"][T]["Row"];
type TableInsert<T extends ValidTableName> =
  Database["public"]["Tables"][T]["Insert"];
type TableUpdate<T extends ValidTableName> =
  Database["public"]["Tables"][T]["Update"];

// Transaction operation types
type TransactionOperation = "create" | "update" | "delete" | "select";

// Enhanced error types for database operations
export class DatabaseError extends ValidationError {
  constructor(
    message: string,
    public readonly operation?: TransactionOperation,
    public readonly table?: ValidTableName,
    public readonly recordId?: string,
    code?: string,
  ) {
    super(message, `${operation}:${table}:${recordId}`, code);
    this.name = "DatabaseError";
  }
}

export class TransactionError extends DatabaseError {
  constructor(
    message: string,
    public readonly failedOperations: OperationContext[],
  ) {
    super(message, undefined, undefined, undefined, "TRANSACTION_FAILED");
    this.name = "TransactionError";
  }
}

// Enhanced OperationContext with better type safety
export interface OperationContext<T extends ValidTableName = ValidTableName> {
  operation: TransactionOperation;
  table: T;
  recordId?: string;
  originalData?: Partial<TableRecord<T>>;
  newData?: Partial<TableInsert<T> | TableUpdate<T>>;
  timestamp: number;
  userId?: string;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: DatabaseError;
  operationsCompleted: OperationContext[];
  rollbackExecuted: boolean;
  duration: number;
}

export interface BatchOperationResult<T> extends TransactionResult<T[]> {
  partialSuccess: boolean;
  successfulOperations: OperationContext[];
  failedOperations: OperationContext[];
}

/**
 * Basic transaction wrapper with enhanced error handling
 */
export async function withTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  context?: Partial<OperationContext>,
): Promise<TransactionResult<T>> {
  const startTime = Date.now();
  const operationsCompleted: OperationContext[] = [];

  try {
    const result = await operation(supabase);

    return {
      success: true,
      data: result,
      operationsCompleted,
      rollbackExecuted: false,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const dbError =
      error instanceof DatabaseError
        ? error
        : new DatabaseError(
            error instanceof Error ? error.message : "Transaction failed",
            context?.operation,
            context?.table,
            context?.recordId,
            "TRANSACTION_ERROR",
          );

    console.error("Transaction operation error:", dbError);

    return {
      success: false,
      error: dbError,
      operationsCompleted,
      rollbackExecuted: false,
      duration: Date.now() - startTime,
    };
  }
}

// Enhanced transaction wrapper with retry logic and better error handling
export async function withEnhancedTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  options: {
    retries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
    onRollback?: () => Promise<void>;
  } = {},
): Promise<TransactionResult<T>> {
  const { retries = 3, retryDelay = 1000, onRetry, onRollback } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await operation(supabase);
      return {
        success: true,
        data: result,
        operationsCompleted: [],
        rollbackExecuted: false,
        duration: 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (onRetry && attempt < retries) {
        onRetry(attempt, lastError);
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt),
        );
        continue;
      }

      // If this is the final attempt or a non-retryable error, handle rollback
      if (onRollback) {
        try {
          await onRollback();
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError);
        }
      }

      break;
    }
  }

  console.error("Enhanced transaction failed after all retries:", lastError);
  const dbError =
    lastError instanceof DatabaseError
      ? lastError
      : new DatabaseError(
          lastError?.message || "Transaction failed after retries",
          undefined,
          undefined,
          undefined,
          "TRANSACTION_FAILED",
        );

  return {
    success: false,
    error: dbError,
    operationsCompleted: [],
    rollbackExecuted: !!onRollback,
    duration: 0,
  };
}

// Type-safe estimate creation with services
export async function createEstimateWithServices(
  estimateData: TableInsert<"estimates">,
  services: TableInsert<"estimate_services">[],
): Promise<
  TransactionResult<{
    estimate: TableRecord<"estimates">;
    services: TableRecord<"estimate_services">[];
  }>
> {
  let createdEstimateId: string | null = null;

  return withEnhancedTransaction(
    async (supabase) => {
      // Create estimate with type safety
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert(estimateData)
        .select()
        .single();

      if (estimateError || !estimate) {
        throw new DatabaseError(
          `Failed to create estimate: ${estimateError?.message || "No data returned"}`,
          "create",
          "estimates",
          undefined,
          "ESTIMATE_CREATE_FAILED",
        );
      }

      createdEstimateId = estimate.id;

      // Create services with type safety
      const servicesWithEstimateId = services.map((service) => ({
        ...service,
        estimate_id: estimate.id,
      }));

      const { data: createdServices, error: servicesError } = await supabase
        .from("estimate_services")
        .insert(servicesWithEstimateId)
        .select();

      if (servicesError || !createdServices) {
        throw new DatabaseError(
          `Failed to create services: ${servicesError?.message || "No data returned"}`,
          "create",
          "estimate_services",
          estimate.id,
          "SERVICES_CREATE_FAILED",
        );
      }

      return { estimate, services: createdServices };
    },
    {
      retries: 3,
      retryDelay: 1000,
      onRetry: (attempt, error) => {
        console.warn(
          `Estimate creation attempt ${attempt} failed:`,
          error.message,
        );
      },
      onRollback: async () => {
        // Compensating transaction: cleanup created estimate if services failed
        if (createdEstimateId) {
          try {
            await supabase
              .from("estimates")
              .delete()
              .eq("id", createdEstimateId);
            console.log("Rolled back created estimate:", createdEstimateId);
          } catch (rollbackError) {
            console.error(
              "Failed to rollback estimate creation:",
              rollbackError,
            );
          }
        }
      },
    },
  );
}

// Type-safe estimate update with services
export async function updateEstimateWithServices(
  estimateId: string,
  estimateData: TableUpdate<"estimates">,
  services: TableInsert<"estimate_services">[],
): Promise<
  TransactionResult<{
    estimate: TableRecord<"estimates">;
    services: TableRecord<"estimate_services">[];
  }>
> {
  let originalEstimate: TableRecord<"estimates"> | null = null;
  let originalServices: TableRecord<"estimate_services">[] = [];

  return withEnhancedTransaction(
    async (supabase) => {
      // First, backup the original data for rollback
      const { data: currentEstimate } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .single();

      const { data: currentServices } = await supabase
        .from("estimate_services")
        .select("*")
        .eq("estimate_id", estimateId);

      originalEstimate = currentEstimate;
      originalServices = currentServices || [];

      // Update estimate with validation
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .update(estimateData)
        .eq("id", estimateId)
        .select()
        .single();

      if (estimateError || !estimate) {
        throw new DatabaseError(
          `Failed to update estimate: ${estimateError?.message || "No data returned"}`,
          "update",
          "estimates",
          estimateId,
          "ESTIMATE_UPDATE_FAILED",
        );
      }

      // Delete existing services with validation
      const { error: deleteError } = await supabase
        .from("estimate_services")
        .delete()
        .eq("estimate_id", estimateId);

      if (deleteError) {
        throw new DatabaseError(
          `Failed to delete existing services: ${deleteError.message}`,
          "delete",
          "estimate_services",
          estimateId,
          "SERVICES_DELETE_FAILED",
        );
      }

      // Create new services with validation
      const servicesWithEstimateId = services.map((service) => ({
        ...service,
        estimate_id: estimateId,
      }));

      const { data: createdServices, error: servicesError } = await supabase
        .from("estimate_services")
        .insert(servicesWithEstimateId)
        .select();

      if (servicesError || !createdServices) {
        throw new DatabaseError(
          `Failed to create services: ${servicesError?.message || "No data returned"}`,
          "create",
          "estimate_services",
          estimateId,
          "SERVICES_CREATE_FAILED",
        );
      }

      return { estimate, services: createdServices };
    },
    {
      retries: 3,
      retryDelay: 1000,
      onRetry: (attempt, error) => {
        console.warn(
          `Estimate update attempt ${attempt} failed:`,
          error.message,
        );
      },
      onRollback: async () => {
        // Compensating transaction: restore original data
        if (originalEstimate) {
          try {
            // Restore original estimate
            await supabase
              .from("estimates")
              .update(originalEstimate)
              .eq("id", estimateId);

            // Delete any partially created services
            await supabase
              .from("estimate_services")
              .delete()
              .eq("estimate_id", estimateId);

            // Restore original services
            if (originalServices.length > 0) {
              await supabase.from("estimate_services").insert(originalServices);
            }

            console.log("Rolled back estimate update:", estimateId);
          } catch (rollbackError) {
            console.error("Failed to rollback estimate update:", rollbackError);
          }
        }
      },
    },
  );
}

// Type-safe service update
export async function updateService(
  serviceId: string,
  serviceData: TableUpdate<"estimate_services">,
): Promise<TransactionResult<TableRecord<"estimate_services">>> {
  return withTransaction(
    async (client) => {
      const { data: service, error } = await client
        .from("estimate_services")
        .update(serviceData)
        .eq("id", serviceId)
        .select()
        .single();

      if (error || !service) {
        throw new DatabaseError(
          `Failed to update service: ${error?.message || "No data returned"}`,
          "update",
          "estimate_services",
          serviceId,
          "SERVICE_UPDATE_FAILED",
        );
      }

      return service;
    },
    {
      operation: "update",
      table: "estimate_services",
      recordId: serviceId,
      timestamp: Date.now(),
    },
  );
}

// Enhanced batch operations helper with proper rollback support
export async function batchOperation<T>(
  operations: Array<{
    execute: () => Promise<T>;
    context?: OperationContext;
  }>,
  options: {
    continueOnError?: boolean;
    rollbackOnError?: boolean;
    onPartialSuccess?: (results: T[], errors: Error[]) => void;
  } = {},
): Promise<TransactionResult<T[]>> {
  const {
    continueOnError = false,
    rollbackOnError = true,
    onPartialSuccess,
  } = options;
  const results: T[] = [];
  const errors: Error[] = [];
  const completedOperations: OperationContext[] = [];

  return withEnhancedTransaction(
    async (supabase) => {
      for (let i = 0; i < operations.length; i++) {
        try {
          const result = await operations[i].execute();
          results.push(result);

          // Track completed operations for potential rollback
          if (operations[i].context) {
            completedOperations.push(operations[i].context!);
          }
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error(`Operation ${i} failed`);
          errors.push(err);

          if (!continueOnError) {
            throw err;
          }
        }
      }

      if (errors.length > 0 && onPartialSuccess) {
        onPartialSuccess(results, errors);
      }

      if (errors.length > 0 && !continueOnError) {
        throw new Error(
          `Batch operation failed: ${errors.map((e) => e.message).join(", ")}`,
        );
      }

      return results;
    },
    {
      retries: 2,
      retryDelay: 500,
      onRetry: (attempt, error) => {
        console.warn(
          `Batch operation attempt ${attempt} failed:`,
          error.message,
        );
      },
      onRollback: rollbackOnError
        ? async () => {
            // Execute rollback operations in reverse order
            for (let i = completedOperations.length - 1; i >= 0; i--) {
              try {
                await executeRollback(completedOperations[i]);
              } catch (rollbackError) {
                console.error(
                  `Failed to rollback operation ${i}:`,
                  rollbackError,
                );
              }
            }
          }
        : undefined,
    },
  );
}

// Enhanced rollback execution with better type safety
async function executeRollback<T extends ValidTableName>(
  context: OperationContext<T>,
): Promise<void> {
  const { operation, table, recordId, originalData } = context;

  try {
    switch (operation) {
      case "create":
        // Compensate creation by deleting the created record
        if (recordId) {
          const { error } = await (supabase as any)
            .from(table)
            .delete()
            .eq("id", recordId);
          if (error) {
            throw new DatabaseError(
              `Rollback failed: ${error.message}`,
              "delete",
              table,
              recordId,
              "ROLLBACK_DELETE_FAILED",
            );
          }
          console.log(`Rolled back creation of ${table}:${recordId}`);
        }
        break;

      case "update":
        // Compensate update by restoring original data
        if (recordId && originalData) {
          const { error } = await (supabase as any)
            .from(table)
            .update(originalData as any)
            .eq("id", recordId);
          if (error) {
            throw new DatabaseError(
              `Rollback failed: ${error.message}`,
              "update",
              table,
              recordId,
              "ROLLBACK_UPDATE_FAILED",
            );
          }
          console.log(`Rolled back update of ${table}:${recordId}`);
        }
        break;

      case "delete":
        // Compensate deletion by recreating the record
        if (originalData) {
          const { error } = await supabase
            .from(table)
            .insert(originalData as any);
          if (error) {
            throw new DatabaseError(
              `Rollback failed: ${error.message}`,
              "create",
              table,
              undefined,
              "ROLLBACK_CREATE_FAILED",
            );
          }
          console.log(`Rolled back deletion from ${table}`);
        }
        break;

      case "select":
        // No rollback needed for read operations
        console.log(`No rollback needed for select operation on ${table}`);
        break;

      default:
        throw new DatabaseError(
          `Unknown operation type for rollback: ${operation}`,
          operation as any,
          table,
          recordId,
          "UNKNOWN_ROLLBACK_OPERATION",
        );
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Rollback failed for ${operation} on ${table}: ${error}`,
      operation,
      table,
      recordId,
      "ROLLBACK_GENERAL_FAILURE",
    );
  }
}

// Enhanced compensating action factory
export function createCompensatingAction<T extends ValidTableName>(
  operation: TransactionOperation,
  table: T,
  recordId: string,
  originalData?: Partial<TableRecord<T>>,
  userId?: string,
): () => Promise<void> {
  return async () => {
    await executeRollback({
      operation,
      table,
      recordId,
      originalData,
      timestamp: Date.now(),
      userId,
    });
  };
}

// Enhanced operation context factory with type safety
export function createOperationContext<T extends ValidTableName>(
  operation: TransactionOperation,
  table: T,
  recordId?: string,
  originalData?: Partial<TableRecord<T>>,
  newData?: Partial<TableInsert<T> | TableUpdate<T>>,
  userId?: string,
): OperationContext<T> {
  return {
    operation,
    table,
    recordId,
    originalData,
    newData,
    timestamp: Date.now(),
    userId,
  };
}

// Enhanced transaction helper with automatic state tracking
export async function withTransactionAndRollback<T>(
  operations: Array<{
    name: string;
    execute: (client: SupabaseClient) => Promise<T>;
    rollback?: (client: SupabaseClient) => Promise<void>;
  }>,
  options: {
    retries?: number;
    retryDelay?: number;
  } = {},
): Promise<TransactionResult<T[]>> {
  const { retries = 3, retryDelay = 1000 } = options;
  const results: T[] = [];
  const completedOperations: Array<{
    name: string;
    rollback?: (client: SupabaseClient) => Promise<void>;
  }> = [];

  return withEnhancedTransaction(
    async (client) => {
      for (const operation of operations) {
        try {
          const result = await operation.execute(client);
          results.push(result);

          // Track this operation for potential rollback
          if (operation.rollback) {
            completedOperations.push({
              name: operation.name,
              rollback: operation.rollback,
            });
          }
        } catch (error) {
          console.error(`Operation '${operation.name}' failed:`, error);
          throw error;
        }
      }

      return results;
    },
    {
      retries,
      retryDelay,
      onRetry: (attempt, error) => {
        console.warn(`Transaction attempt ${attempt} failed:`, error.message);
      },
      onRollback: async () => {
        // Execute rollback operations in reverse order
        for (let i = completedOperations.length - 1; i >= 0; i--) {
          const { name, rollback } = completedOperations[i];
          if (rollback) {
            try {
              await rollback(supabase);
              console.log(`Successfully rolled back operation: ${name}`);
            } catch (rollbackError) {
              console.error(
                `Failed to rollback operation '${name}':`,
                rollbackError,
              );
            }
          }
        }
      },
    },
  );
}

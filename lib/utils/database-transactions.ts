import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

// Export OperationContext interface for use by other modules
export interface OperationContext {
  operation: "create" | "update" | "delete";
  table: string;
  recordId?: string;
  originalData?: any;
  newData?: any;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function withTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>,
): Promise<TransactionResult<T>> {
  try {
    // Execute operation with the client
    const result = await operation(supabase);
    return { success: true, data: result };
  } catch (error) {
    console.error("Transaction operation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
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
      return { success: true, data: result };
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
  return {
    success: false,
    error: lastError?.message || "Transaction failed after retries",
  };
}

// Atomic estimate creation with services using enhanced transaction support
export async function createEstimateWithServices(
  estimateData: any,
  services: any[],
): Promise<TransactionResult<{ estimate: any; services: any[] }>> {
  let createdEstimateId: string | null = null;

  return withEnhancedTransaction(
    async (supabase) => {
      // Create estimate
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .insert(estimateData)
        .select()
        .single();

      if (estimateError) {
        throw new Error(`Failed to create estimate: ${estimateError.message}`);
      }

      createdEstimateId = estimate.id;

      // Create services
      const servicesWithEstimateId = services.map((service) => ({
        ...service,
        estimate_id: estimate.id,
      }));

      const { data: createdServices, error: servicesError } = await supabase
        .from("estimate_services")
        .insert(servicesWithEstimateId)
        .select();

      if (servicesError) {
        throw new Error(`Failed to create services: ${servicesError.message}`);
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

// Atomic estimate update with services using enhanced transaction support
export async function updateEstimateWithServices(
  estimateId: string,
  estimateData: any,
  services: any[],
): Promise<TransactionResult<{ estimate: any; services: any[] }>> {
  let originalEstimate: any = null;
  let originalServices: any[] = [];

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

      // Update estimate
      const { data: estimate, error: estimateError } = await supabase
        .from("estimates")
        .update(estimateData)
        .eq("id", estimateId)
        .select()
        .single();

      if (estimateError) {
        throw new Error(`Failed to update estimate: ${estimateError.message}`);
      }

      // Delete existing services
      const { error: deleteError } = await supabase
        .from("estimate_services")
        .delete()
        .eq("estimate_id", estimateId);

      if (deleteError) {
        throw new Error(
          `Failed to delete existing services: ${deleteError.message}`,
        );
      }

      // Create new services
      const servicesWithEstimateId = services.map((service) => ({
        ...service,
        estimate_id: estimateId,
      }));

      const { data: createdServices, error: servicesError } = await supabase
        .from("estimate_services")
        .insert(servicesWithEstimateId)
        .select();

      if (servicesError) {
        throw new Error(`Failed to create services: ${servicesError.message}`);
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

// Atomic service update
export async function updateService(
  serviceId: string,
  serviceData: any,
): Promise<TransactionResult<any>> {
  return withTransaction(async (supabase) => {
    const { data: service, error } = await supabase
      .from("estimate_services")
      .update(serviceData)
      .eq("id", serviceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update service: ${error.message}`);
    }

    return service;
  });
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

// Execute rollback for a specific operation context
async function executeRollback(context: OperationContext): Promise<void> {
  const { operation, table, recordId, originalData } = context;

  try {
    switch (operation) {
      case "create":
        // Compensate creation by deleting the created record
        if (recordId) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq("id", recordId);
          if (error) throw error;
          console.log(`Rolled back creation of ${table}:${recordId}`);
        }
        break;

      case "update":
        // Compensate update by restoring original data
        if (recordId && originalData) {
          const { error } = await supabase
            .from(table)
            .update(originalData)
            .eq("id", recordId);
          if (error) throw error;
          console.log(`Rolled back update of ${table}:${recordId}`);
        }
        break;

      case "delete":
        // Compensate deletion by recreating the record
        if (originalData) {
          const { error } = await supabase.from(table).insert(originalData);
          if (error) throw error;
          console.log(`Rolled back deletion from ${table}`);
        }
        break;

      default:
        console.warn(`Unknown operation type for rollback: ${operation}`);
    }
  } catch (error) {
    console.error(`Rollback failed for ${operation} on ${table}:`, error);
    throw error;
  }
}

// Utility function to create compensating actions for common operations
export function createCompensatingAction(
  operation: "create" | "update" | "delete",
  table: string,
  recordId: string,
  originalData?: any,
): () => Promise<void> {
  return async () => {
    await executeRollback({
      operation,
      table,
      recordId,
      originalData,
    });
  };
}

// Helper function to create operation contexts for batch operations
export function createOperationContext(
  operation: "create" | "update" | "delete",
  table: string,
  recordId?: string,
  originalData?: any,
  newData?: any,
): OperationContext {
  return {
    operation,
    table,
    recordId,
    originalData,
    newData,
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

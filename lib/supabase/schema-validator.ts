/**
 * Runtime Schema Validation for Supabase Operations
 *
 * Features:
 * - Dynamic schema validation with Zod
 * - Type-safe database operations
 * - Schema drift detection
 * - Data transformation and sanitization
 * - Performance monitoring for validation
 * - Automatic schema caching and updates
 * - Connection pooling optimization for server-side operations
 */

import { z } from "zod";
import type { Database } from "@/types/supabase";
import type {
  TypedSupabaseClient,
  TableName,
  TableRow,
  TableInsert,
  TableUpdate,
} from "./supabase-types";
import { getAdvancedCache } from "../utils/advanced-cache";
import { withPooledClient } from "./server-pooled";

// Validation result interface
interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: z.ZodError[];
  warnings?: string[];
  transformations?: string[];
  performance: {
    validationTime: number;
    schemaLoadTime?: number;
  };
}

// Schema validation options
interface ValidationOptions {
  strict?: boolean; // Fail on any validation error
  allowUnknown?: boolean; // Allow fields not in schema
  transform?: boolean; // Apply data transformations
  cache?: boolean; // Cache validation results
  logWarnings?: boolean; // Log validation warnings
  performanceLogging?: boolean; // Log performance metrics
}

// Schema metadata
interface SchemaMetadata {
  tableName: string;
  version: string;
  lastUpdated: Date;
  fields: Record<
    string,
    {
      type: string;
      required: boolean;
      nullable: boolean;
      constraints?: string[];
    }
  >;
  relationships: Array<{
    table: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
    foreignKey: string;
  }>;
}

// Schema drift detection result
interface SchemaDriftResult {
  hasDrift: boolean;
  missingFields: string[];
  extraFields: string[];
  typeChanges: Array<{
    field: string;
    expected: string;
    actual: string;
  }>;
  constraintChanges: Array<{
    field: string;
    change: string;
  }>;
  recommendations: string[];
}

// Performance metrics for schema validation
interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  avgValidationTime: number;
  slowValidations: number;
  schemaLoadTime: number;
  cacheHitRate: number;
  lastReset: Date;
}

// Schema validation configuration
interface SchemaValidatorConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  enablePerformanceLogging: boolean;
  slowValidationThreshold: number;
  enableSchemaDriftDetection: boolean;
  driftCheckInterval: number;
  maxValidationErrors: number;
  transformationRules: Record<string, (value: unknown) => unknown>;
}

// Default configuration
const DEFAULT_CONFIG: SchemaValidatorConfig = {
  enableCaching: true,
  cacheTimeout: 30 * 60 * 1000, // 30 minutes
  enablePerformanceLogging: true,
  slowValidationThreshold: 100, // 100ms
  enableSchemaDriftDetection: true,
  driftCheckInterval: 60 * 60 * 1000, // 1 hour
  maxValidationErrors: 50,
  transformationRules: {
    // Common transformations
    trimString: (value: unknown) =>
      typeof value === "string" ? value.trim() : value,
    normalizeEmail: (value: unknown) =>
      typeof value === "string" ? value.toLowerCase().trim() : value,
    parseNumber: (value: unknown) =>
      typeof value === "string" ? Number(value) : value,
    parseDate: (value: unknown) =>
      typeof value === "string" ? new Date(value) : value,
  },
};

// Base schemas for common database types
const BaseSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  url: z.string().url(),
  timestamp: z.coerce.date(),
  json: z.unknown(),
  decimal: z.coerce.number(),
  integer: z.coerce.number().int(),
  boolean: z.coerce.boolean(),
};

/**
 * Runtime Schema Validator with comprehensive validation and monitoring
 */
export class SchemaValidator {
  private client: TypedSupabaseClient;
  private config: SchemaValidatorConfig;
  private cache = getAdvancedCache();
  private schemas = new Map<string, z.ZodSchema>();
  private schemaMetadata = new Map<string, SchemaMetadata>();
  private metrics: ValidationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    avgValidationTime: 0,
    slowValidations: 0,
    schemaLoadTime: 0,
    cacheHitRate: 0,
    lastReset: new Date(),
  };

  constructor(
    client: TypedSupabaseClient,
    config: Partial<SchemaValidatorConfig> = {},
  ) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSchemas();

    if (this.config.enableSchemaDriftDetection) {
      this.startSchemaDriftMonitoring();
    }
  }

  /**
   * Validate data against table schema
   */
  async validate<T extends TableName>(
    tableName: T,
    data: unknown,
    operation: "insert" | "update" | "select" = "insert",
    options: ValidationOptions = {},
  ): Promise<ValidationResult<TableRow<T> | TableInsert<T> | TableUpdate<T>>> {
    const startTime = Date.now();
    this.metrics.totalValidations++;

    try {
      // Check cache first
      if (options.cache !== false && this.config.enableCaching) {
        const cacheKey = this.getCacheKey(tableName, data, operation, options);
        const cachedResult = await this.cache.get<ValidationResult>(cacheKey);

        if (cachedResult) {
          this.updateCacheHitMetrics();
          return cachedResult as ValidationResult<any>;
        }
      }

      // Load or get schema
      const schema = await this.getSchema(tableName, operation);
      if (!schema) {
        throw new Error(`Schema not found for table: ${tableName}`);
      }

      // Apply transformations if enabled
      let transformedData = data;
      const transformations: string[] = [];

      if (options.transform !== false) {
        const transformResult = this.applyTransformations(data, tableName);
        transformedData = transformResult.data;
        transformations.push(...transformResult.transformations);
      }

      // Validate data
      const validationResult = schema.safeParse(transformedData);
      const validationTime = Date.now() - startTime;

      // Update performance metrics
      this.updatePerformanceMetrics(validationTime);

      // Handle validation results
      if (validationResult.success) {
        this.metrics.successfulValidations++;

        const result: ValidationResult<any> = {
          success: true,
          data: validationResult.data,
          transformations:
            transformations.length > 0 ? transformations : undefined,
          performance: { validationTime },
        };

        // Cache successful results
        if (options.cache !== false && this.config.enableCaching) {
          const cacheKey = this.getCacheKey(
            tableName,
            data,
            operation,
            options,
          );
          await this.cache.set(cacheKey, result, {
            ttl: this.config.cacheTimeout,
            tags: [tableName, "validation"],
          });
        }

        return result;
      } else {
        this.metrics.failedValidations++;

        const errors = validationResult.error ? [validationResult.error] : [];
        const warnings = this.generateWarnings(data, schema, options);

        if (options.logWarnings && warnings.length > 0) {
          console.warn(
            `Schema validation warnings for ${tableName}:`,
            warnings,
          );
        }

        const result: ValidationResult<any> = {
          success: false,
          errors,
          warnings,
          transformations:
            transformations.length > 0 ? transformations : undefined,
          performance: { validationTime },
        };

        // Don't cache failed validations
        return result;
      }
    } catch (error) {
      this.metrics.failedValidations++;
      const validationTime = Date.now() - startTime;
      this.updatePerformanceMetrics(validationTime);

      return {
        success: false,
        errors: [
          new z.ZodError([
            {
              code: "custom",
              message: error instanceof Error ? error.message : String(error),
              path: [],
            },
          ]),
        ],
        performance: { validationTime },
      };
    }
  }

  /**
   * Validate and transform data for insert operations
   */
  async validateInsert<T extends TableName>(
    tableName: T,
    data: unknown,
    options: ValidationOptions = {},
  ): Promise<ValidationResult<TableInsert<T>>> {
    return this.validate(tableName, data, "insert", {
      strict: true,
      transform: true,
      ...options,
    });
  }

  /**
   * Validate and transform data for update operations
   */
  async validateUpdate<T extends TableName>(
    tableName: T,
    data: unknown,
    options: ValidationOptions = {},
  ): Promise<ValidationResult<TableUpdate<T>>> {
    return this.validate(tableName, data, "update", {
      allowUnknown: true,
      transform: true,
      ...options,
    });
  }

  /**
   * Validate query results from select operations
   */
  async validateSelect<T extends TableName>(
    tableName: T,
    data: unknown,
    options: ValidationOptions = {},
  ): Promise<ValidationResult<TableRow<T>>> {
    return this.validate(tableName, data, "select", {
      allowUnknown: true,
      ...options,
    }) as Promise<ValidationResult<TableRow<T>>>;
  }

  /**
   * Detect schema drift between database and application schemas
   */
  async detectSchemaDrift<T extends TableName>(
    tableName: T,
  ): Promise<SchemaDriftResult> {
    try {
      // Use pooled connections for server environments when available
      const executeQuery = async (client: TypedSupabaseClient) => {
        return await client
          .from("information_schema.columns" as any)
          .select("*")
          .eq("table_name", tableName);
      };

      // Try to use pooled connection for better performance
      let dbSchema: any;
      try {
        // If we're in a server environment, use pooled connections
        if (typeof window === "undefined" && typeof process !== "undefined") {
          const result = await withPooledClient(executeQuery);
          dbSchema = result.data;
        } else {
          // Use the provided client for browser environments
          const result = await executeQuery(this.client);
          dbSchema = result.data;
        }
      } catch (poolError) {
        // Fallback to direct client usage
        const result = await executeQuery(this.client);
        dbSchema = result.data;
      }

      // Get application schema metadata
      const appSchemaMetadata = this.schemaMetadata.get(tableName);

      if (!appSchemaMetadata || !dbSchema) {
        return {
          hasDrift: false,
          missingFields: [],
          extraFields: [],
          typeChanges: [],
          constraintChanges: [],
          recommendations: ["Unable to compare schemas - insufficient data"],
        };
      }

      // Compare schemas
      const dbFields = new Set(dbSchema.map((col: any) => col.column_name));
      const appFields = new Set(Object.keys(appSchemaMetadata.fields));

      const missingFields = Array.from(appFields).filter(
        (field) => !dbFields.has(field),
      );
      const extraFields = Array.from(dbFields).filter(
        (field) => !appFields.has(field as string),
      );

      const typeChanges: Array<{
        field: string;
        expected: string;
        actual: string;
      }> = [];

      // Check for type mismatches
      for (const [fieldName, fieldMeta] of Object.entries(
        appSchemaMetadata.fields,
      )) {
        const dbColumn = dbSchema.find(
          (col: any) => col.column_name === fieldName,
        );
        if (dbColumn && dbColumn.data_type !== fieldMeta.type) {
          typeChanges.push({
            field: fieldName,
            expected: fieldMeta.type,
            actual: dbColumn.data_type,
          });
        }
      }

      const hasDrift =
        missingFields.length > 0 ||
        extraFields.length > 0 ||
        typeChanges.length > 0;

      const recommendations: string[] = [];
      if (missingFields.length > 0) {
        recommendations.push(
          `Add missing fields to database: ${missingFields.join(", ")}`,
        );
      }
      if (extraFields.length > 0) {
        recommendations.push(
          `Update application schema to include: ${extraFields.join(", ")}`,
        );
      }
      if (typeChanges.length > 0) {
        recommendations.push(
          `Review type mismatches and update schema accordingly`,
        );
      }

      return {
        hasDrift,
        missingFields,
        extraFields: extraFields as string[],
        typeChanges,
        constraintChanges: [], // TODO: Implement constraint checking
        recommendations,
      };
    } catch (error) {
      console.error(`Schema drift detection failed for ${tableName}:`, error);
      return {
        hasDrift: false,
        missingFields: [],
        extraFields: [],
        typeChanges: [],
        constraintChanges: [],
        recommendations: [`Schema drift detection failed: ${error}`],
      };
    }
  }

  /**
   * Get validation performance metrics
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset validation metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      avgValidationTime: 0,
      slowValidations: 0,
      schemaLoadTime: 0,
      cacheHitRate: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Clear schema cache
   */
  async clearSchemaCache(): Promise<void> {
    this.schemas.clear();
    this.schemaMetadata.clear();
    await this.cache.invalidate("schema:*", { type: "pattern" });
    await this.cache.invalidate("validation:*", { type: "pattern" });
  }

  // Private methods

  private async initializeSchemas(): Promise<void> {
    const startTime = Date.now();

    try {
      // Initialize schemas for common tables
      await this.loadSchema("estimates");
      await this.loadSchema("profiles");
      await this.loadSchema("estimate_services");

      this.metrics.schemaLoadTime = Date.now() - startTime;
    } catch (error) {
      console.error("Failed to initialize schemas:", error);
    }
  }

  private async getSchema<T extends TableName>(
    tableName: T,
    operation: "insert" | "update" | "select",
  ): Promise<z.ZodSchema | null> {
    const schemaKey = `${tableName}_${operation}`;

    // Check memory cache first
    if (this.schemas.has(schemaKey)) {
      return this.schemas.get(schemaKey)!;
    }

    // Load schema from cache or database
    return await this.loadSchema(tableName, operation);
  }

  private async loadSchema<T extends TableName>(
    tableName: T,
    operation: "insert" | "update" | "select" = "insert",
  ): Promise<z.ZodSchema | null> {
    const cacheKey = `schema:${tableName}:${operation}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cachedSchema = await this.cache.get<any>(cacheKey);
      if (cachedSchema) {
        return cachedSchema;
      }
    }

    try {
      // Generate schema based on table name and operation
      const schema = this.createSchemaForTable(tableName, operation);

      if (schema) {
        // Cache the schema
        this.schemas.set(`${tableName}_${operation}`, schema);

        if (this.config.enableCaching) {
          await this.cache.set(cacheKey, schema, {
            ttl: this.config.cacheTimeout,
            tags: ["schema", tableName],
          });
        }
      }

      return schema;
    } catch (error) {
      console.error(`Failed to load schema for ${tableName}:`, error);
      return null;
    }
  }

  private createSchemaForTable(
    tableName: string,
    operation: "insert" | "update" | "select",
  ): z.ZodSchema | null {
    // Define schemas for known tables
    const tableSchemas: Record<string, Record<string, z.ZodSchema>> = {
      estimates: {
        insert: z.object({
          customer_name: z.string().min(1).max(255),
          customer_email: BaseSchemas.email.optional(),
          customer_phone: BaseSchemas.phone.optional(),
          property_address: z.string().min(1).max(500),
          services: z.array(z.string()).min(1),
          total_amount: BaseSchemas.decimal.min(0),
          status: z.enum([
            "draft",
            "sent",
            "approved",
            "rejected",
            "completed",
          ]),
          notes: z.string().max(2000).optional(),
          expires_at: BaseSchemas.timestamp.optional(),
          created_by: BaseSchemas.uuid,
        }),
        update: z.object({
          customer_name: z.string().min(1).max(255).optional(),
          customer_email: BaseSchemas.email.optional(),
          customer_phone: BaseSchemas.phone.optional(),
          property_address: z.string().min(1).max(500).optional(),
          services: z.array(z.string()).min(1).optional(),
          total_amount: BaseSchemas.decimal.min(0).optional(),
          status: z
            .enum(["draft", "sent", "approved", "rejected", "completed"])
            .optional(),
          notes: z.string().max(2000).optional(),
          expires_at: BaseSchemas.timestamp.optional(),
          updated_at: BaseSchemas.timestamp.optional(),
        }),
        select: z.object({
          id: BaseSchemas.uuid,
          customer_name: z.string(),
          customer_email: z.string().nullable(),
          customer_phone: z.string().nullable(),
          property_address: z.string(),
          services: z.array(z.string()),
          total_amount: z.number(),
          status: z.string(),
          notes: z.string().nullable(),
          expires_at: z.date().nullable(),
          created_at: z.date(),
          updated_at: z.date(),
          created_by: z.string(),
        }),
      },

      profiles: {
        insert: z.object({
          id: BaseSchemas.uuid,
          email: BaseSchemas.email,
          full_name: z.string().min(1).max(255),
          company_name: z.string().max(255).optional(),
          phone: BaseSchemas.phone.optional(),
          address: z.string().max(500).optional(),
          avatar_url: BaseSchemas.url.optional(),
          role: z.enum(["admin", "user"]).default("user"),
        }),
        update: z.object({
          email: BaseSchemas.email.optional(),
          full_name: z.string().min(1).max(255).optional(),
          company_name: z.string().max(255).optional(),
          phone: BaseSchemas.phone.optional(),
          address: z.string().max(500).optional(),
          avatar_url: BaseSchemas.url.optional(),
          role: z.enum(["admin", "user"]).optional(),
          updated_at: BaseSchemas.timestamp.optional(),
        }),
        select: z.object({
          id: z.string(),
          email: z.string(),
          full_name: z.string(),
          company_name: z.string().nullable(),
          phone: z.string().nullable(),
          address: z.string().nullable(),
          avatar_url: z.string().nullable(),
          role: z.string(),
          created_at: z.date(),
          updated_at: z.date(),
        }),
      },

      estimate_services: {
        insert: z.object({
          estimate_id: BaseSchemas.uuid,
          service_type: z.string().min(1).max(100),
          service_name: z.string().min(1).max(255),
          description: z.string().max(1000).optional(),
          quantity: BaseSchemas.decimal.min(0),
          unit_price: BaseSchemas.decimal.min(0),
          total_price: BaseSchemas.decimal.min(0),
          labor_hours: BaseSchemas.decimal.min(0).optional(),
          materials_cost: BaseSchemas.decimal.min(0).optional(),
          markup_percentage: BaseSchemas.decimal.min(0).max(100).optional(),
        }),
        update: z.object({
          service_type: z.string().min(1).max(100).optional(),
          service_name: z.string().min(1).max(255).optional(),
          description: z.string().max(1000).optional(),
          quantity: BaseSchemas.decimal.min(0).optional(),
          unit_price: BaseSchemas.decimal.min(0).optional(),
          total_price: BaseSchemas.decimal.min(0).optional(),
          labor_hours: BaseSchemas.decimal.min(0).optional(),
          materials_cost: BaseSchemas.decimal.min(0).optional(),
          markup_percentage: BaseSchemas.decimal.min(0).max(100).optional(),
        }),
        select: z.object({
          id: z.string(),
          estimate_id: z.string(),
          service_type: z.string(),
          service_name: z.string(),
          description: z.string().nullable(),
          quantity: z.number(),
          unit_price: z.number(),
          total_price: z.number(),
          labor_hours: z.number().nullable(),
          materials_cost: z.number().nullable(),
          markup_percentage: z.number().nullable(),
          created_at: z.date(),
          updated_at: z.date(),
        }),
      },
    };

    return tableSchemas[tableName]?.[operation] || null;
  }

  private applyTransformations(
    data: unknown,
    tableName: string,
  ): { data: unknown; transformations: string[] } {
    const transformations: string[] = [];

    if (!data || typeof data !== "object") {
      return { data, transformations };
    }

    const transformedData: any = { ...data };

    // Apply field-specific transformations
    for (const [key, value] of Object.entries(transformedData)) {
      // Trim strings
      if (typeof value === "string" && value.trim() !== value) {
        transformedData[key] = value.trim();
        transformations.push(`Trimmed whitespace from ${key}`);
      }

      // Normalize emails
      if (key.includes("email") && typeof value === "string") {
        const normalized = value.toLowerCase().trim();
        if (normalized !== value) {
          transformedData[key] = normalized;
          transformations.push(`Normalized email in ${key}`);
        }
      }

      // Parse dates
      if (key.includes("_at") && typeof value === "string") {
        try {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            transformedData[key] = parsed;
            transformations.push(`Parsed date in ${key}`);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }

    return { data: transformedData, transformations };
  }

  private generateWarnings(
    data: unknown,
    schema: z.ZodSchema,
    options: ValidationOptions,
  ): string[] {
    const warnings: string[] = [];

    // Check for potentially unsafe data patterns
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      // Check for potentially dangerous SQL patterns
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
          if (value.includes("DROP TABLE") || value.includes("DELETE FROM")) {
            warnings.push(`Potentially dangerous SQL detected in ${key}`);
          }

          if (value.length > 10000) {
            warnings.push(
              `Unusually large string value in ${key} (${value.length} chars)`,
            );
          }
        }
      }
    }

    return warnings;
  }

  private getCacheKey(
    tableName: string,
    data: unknown,
    operation: string,
    options: ValidationOptions,
  ): string {
    const hash = this.simpleHash(JSON.stringify({ data, operation, options }));
    return `validation:${tableName}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private updatePerformanceMetrics(validationTime: number): void {
    // Update average validation time
    const totalTime =
      this.metrics.avgValidationTime * (this.metrics.totalValidations - 1) +
      validationTime;
    this.metrics.avgValidationTime = totalTime / this.metrics.totalValidations;

    // Track slow validations
    if (validationTime > this.config.slowValidationThreshold) {
      this.metrics.slowValidations++;

      if (this.config.enablePerformanceLogging) {
        console.warn(`Slow schema validation detected: ${validationTime}ms`);
      }
    }
  }

  private updateCacheHitMetrics(): void {
    const totalRequests = this.metrics.totalValidations;
    const cacheHits =
      Math.round(this.metrics.cacheHitRate * (totalRequests - 1)) + 1;
    this.metrics.cacheHitRate = cacheHits / totalRequests;
  }

  private startSchemaDriftMonitoring(): void {
    // Periodically check for schema drift
    setInterval(async () => {
      try {
        const tables = ["estimates", "profiles", "estimate_services"];

        for (const table of tables) {
          const driftResult = await this.detectSchemaDrift(table as any);

          if (driftResult.hasDrift) {
            console.warn(`Schema drift detected for ${table}:`, driftResult);
          }
        }
      } catch (error) {
        console.error("Schema drift monitoring failed:", error);
      }
    }, this.config.driftCheckInterval);
  }
}

// Singleton instance
let schemaValidatorInstance: SchemaValidator | null = null;

/**
 * Get the global schema validator instance
 */
export function getSchemaValidator(
  client: TypedSupabaseClient,
): SchemaValidator {
  if (!schemaValidatorInstance) {
    schemaValidatorInstance = new SchemaValidator(client);
  }
  return schemaValidatorInstance;
}

/**
 * Higher-order function for adding schema validation to operations
 */
export function withSchemaValidation<TArgs extends any[], TReturn>(
  validator: SchemaValidator,
  tableName: string,
  operation: "insert" | "update" | "select",
) {
  return function <
    TFunc extends (data: any, ...args: TArgs) => Promise<TReturn>,
  >(fn: TFunc): TFunc {
    return (async (data: any, ...args: TArgs): Promise<TReturn> => {
      // Validate data before operation
      const validationResult = await validator.validate(
        tableName as TableName,
        data,
        operation,
      );

      if (!validationResult.success) {
        throw new Error(
          `Schema validation failed: ${validationResult.errors?.map((e) => e.message).join(", ")}`,
        );
      }

      // Execute operation with validated data
      return fn(validationResult.data, ...args);
    }) as TFunc;
  };
}

// Export types
export type {
  ValidationResult,
  ValidationOptions,
  SchemaMetadata,
  SchemaDriftResult,
  ValidationMetrics,
  SchemaValidatorConfig,
};

// Default export
export default SchemaValidator;

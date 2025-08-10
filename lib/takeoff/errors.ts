/**
 * Custom error classes for takeoff services
 */

/**
 * Base error class for all takeoff-related errors
 */
export class TakeoffError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "TakeoffError";
  }
}

/**
 * Error for invalid measurement data
 */
export class MeasurementValidationError extends TakeoffError {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly warnings?: string[],
  ) {
    super(message, "MEASUREMENT_VALIDATION_ERROR", { errors, warnings });
    this.name = "MeasurementValidationError";
  }
}

/**
 * Error for import operations
 */
export class ImportError extends TakeoffError {
  constructor(
    message: string,
    public readonly fileType: string,
    public readonly lineNumber?: number,
    public readonly fieldName?: string,
  ) {
    super(message, "IMPORT_ERROR", { fileType, lineNumber, fieldName });
    this.name = "ImportError";
  }
}

/**
 * Error for export operations
 */
export class ExportError extends TakeoffError {
  constructor(
    message: string,
    public readonly format: string,
    public readonly reason?: string,
  ) {
    super(message, "EXPORT_ERROR", { format, reason });
    this.name = "ExportError";
  }
}

/**
 * Error for file format issues
 */
export class FileFormatError extends TakeoffError {
  constructor(
    message: string,
    public readonly expectedFormat: string,
    public readonly actualFormat?: string,
  ) {
    super(message, "FILE_FORMAT_ERROR", { expectedFormat, actualFormat });
    this.name = "FileFormatError";
  }
}

/**
 * Error for data parsing issues
 */
export class ParseError extends TakeoffError {
  constructor(
    message: string,
    public readonly input: any,
    public readonly expectedType: string,
  ) {
    super(message, "PARSE_ERROR", { input, expectedType });
    this.name = "ParseError";
  }
}

/**
 * Error for calculation issues
 */
export class CalculationError extends TakeoffError {
  constructor(
    message: string,
    public readonly calculation: string,
    public readonly values: Record<string, any>,
  ) {
    super(message, "CALCULATION_ERROR", { calculation, values });
    this.name = "CalculationError";
  }
}

/**
 * Error for service requirement violations
 */
export class ServiceRequirementError extends TakeoffError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly missingRequirements: string[],
  ) {
    super(message, "SERVICE_REQUIREMENT_ERROR", {
      service,
      missingRequirements,
    });
    this.name = "ServiceRequirementError";
  }
}

/**
 * Error for data quality issues
 */
export class DataQualityError extends TakeoffError {
  constructor(
    message: string,
    public readonly qualityIssues: Array<{
      field: string;
      issue: string;
      severity: "low" | "medium" | "high" | "critical";
    }>,
  ) {
    super(message, "DATA_QUALITY_ERROR", { qualityIssues });
    this.name = "DataQualityError";
  }
}

/**
 * Helper function to create user-friendly error messages
 */
export function formatErrorMessage(error: Error): string {
  if (error instanceof TakeoffError) {
    switch (error.code) {
      case "MEASUREMENT_VALIDATION_ERROR":
        return `Validation failed: ${error.message}`;
      case "IMPORT_ERROR":
        return `Import failed: ${error.message}`;
      case "EXPORT_ERROR":
        return `Export failed: ${error.message}`;
      case "FILE_FORMAT_ERROR":
        return `Invalid file format: ${error.message}`;
      case "PARSE_ERROR":
        return `Failed to parse data: ${error.message}`;
      case "CALCULATION_ERROR":
        return `Calculation error: ${error.message}`;
      case "SERVICE_REQUIREMENT_ERROR":
        return `Service requirements not met: ${error.message}`;
      case "DATA_QUALITY_ERROR":
        return `Data quality issues found: ${error.message}`;
      default:
        return error.message;
    }
  }

  return error.message || "An unexpected error occurred";
}

/**
 * Type guard to check if error is a TakeoffError
 */
export function isTakeoffError(error: unknown): error is TakeoffError {
  return error instanceof TakeoffError;
}

/**
 * Type guard to check if error has recoverable data
 */
export function hasRecoverableData(error: unknown): boolean {
  if (!isTakeoffError(error)) return false;

  return ["IMPORT_ERROR", "PARSE_ERROR", "DATA_QUALITY_ERROR"].includes(
    error.code,
  );
}

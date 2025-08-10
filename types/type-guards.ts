/**
 * Type guard functions for runtime type validation
 * Provides type-safe runtime checks for critical types
 */

import type {
  CalculationResult,
  CalculationMetadata,
  CalculationValidation,
} from "./calculations";
import type { EstimateItem, EstimateDocument } from "./estimate";

/**
 * Check if a value is a valid CalculationResult
 * @param value The value to check
 * @returns Type predicate for CalculationResult
 */
export function isCalculationResult(
  value: unknown,
): value is CalculationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result.total === "number" &&
    result.breakdown !== null &&
    typeof result.breakdown === "object" &&
    (result.metadata === undefined || isCalculationMetadata(result.metadata)) &&
    (result.validation === undefined ||
      isCalculationValidation(result.validation))
  );
}

/**
 * Check if a value is valid CalculationMetadata
 * @param value The value to check
 * @returns Type predicate for CalculationMetadata
 */
export function isCalculationMetadata(
  value: unknown,
): value is CalculationMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Record<string, unknown>;

  return (
    metadata.calculatedAt instanceof Date &&
    typeof metadata.version === "string" &&
    (metadata.source === undefined || typeof metadata.source === "string")
  );
}

/**
 * Check if a value is valid CalculationValidation
 * @param value The value to check
 * @returns Type predicate for CalculationValidation
 */
export function isCalculationValidation(
  value: unknown,
): value is CalculationValidation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const validation = value as Record<string, unknown>;

  return (
    typeof validation.isValid === "boolean" &&
    (validation.errors === undefined ||
      (Array.isArray(validation.errors) &&
        validation.errors.every((e) => typeof e === "string"))) &&
    (validation.warnings === undefined ||
      (Array.isArray(validation.warnings) &&
        validation.warnings.every((w) => typeof w === "string")))
  );
}

/**
 * Check if a value is a valid EstimateItem
 * @param value The value to check
 * @returns Type predicate for EstimateItem
 */
export function isEstimateItem(value: unknown): value is EstimateItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.description === "string" &&
    typeof item.quantity === "number" &&
    typeof item.unitPrice === "number" &&
    typeof item.unit === "string" &&
    typeof item.discount === "number" &&
    typeof item.tax === "number" &&
    typeof item.total === "number"
  );
}

/**
 * Check if a value is a valid EstimateDocument
 * @param value The value to check
 * @returns Type predicate for EstimateDocument
 */
export function isEstimateDocument(value: unknown): value is EstimateDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const doc = value as Record<string, unknown>;

  // Check required fields
  const hasRequiredFields =
    typeof doc.id === "string" &&
    typeof doc.estimateNumber === "string" &&
    ["draft", "sent", "accepted", "rejected", "expired"].includes(
      doc.status as string,
    ) &&
    doc.createdAt instanceof Date &&
    doc.updatedAt instanceof Date &&
    doc.validUntil instanceof Date &&
    typeof doc.clientName === "string" &&
    typeof doc.clientEmail === "string" &&
    typeof doc.clientPhone === "string" &&
    typeof doc.clientAddress === "string" &&
    typeof doc.projectName === "string" &&
    typeof doc.projectAddress === "string" &&
    typeof doc.projectDescription === "string" &&
    Array.isArray(doc.items) &&
    typeof doc.subtotal === "number" &&
    typeof doc.discountAmount === "number" &&
    typeof doc.discountPercent === "number" &&
    typeof doc.taxAmount === "number" &&
    typeof doc.taxPercent === "number" &&
    typeof doc.total === "number";

  if (!hasRequiredFields) {
    return false;
  }

  // Check items array
  const items = doc.items as unknown[];
  if (!items.every(isEstimateItem)) {
    return false;
  }

  // Check optional fields
  const hasValidOptionalFields =
    (doc.clientCompany === undefined ||
      typeof doc.clientCompany === "string") &&
    (doc.notes === undefined || typeof doc.notes === "string") &&
    (doc.terms === undefined || typeof doc.terms === "string") &&
    (doc.paymentTerms === undefined || typeof doc.paymentTerms === "string");

  return hasValidOptionalFields;
}

/**
 * Create a safe parser that returns null on invalid input
 * @param guard The type guard function
 * @returns A safe parser function
 */
export function createSafeParser<T>(
  guard: (value: unknown) => value is T,
): (value: unknown) => T | null {
  return (value: unknown): T | null => {
    return guard(value) ? value : null;
  };
}

// Export safe parsers for common types
export const parseCalculationResult = createSafeParser(isCalculationResult);
export const parseEstimateItem = createSafeParser(isEstimateItem);
export const parseEstimateDocument = createSafeParser(isEstimateDocument);

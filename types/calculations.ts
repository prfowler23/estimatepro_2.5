/**
 * Result of a calculation operation
 * Contains the total value and a detailed breakdown
 */
export interface CalculationResult {
  /** The total calculated value */
  total: number;
  /** Breakdown of the calculation by category */
  breakdown: Record<string, number>;
  /** Optional metadata about the calculation */
  metadata?: CalculationMetadata;
  /** Optional validation information */
  validation?: CalculationValidation;
}

/**
 * Metadata for tracking calculation details
 */
export interface CalculationMetadata {
  /** When the calculation was performed */
  calculatedAt: Date;
  /** Version of the calculation algorithm */
  version: string;
  /** Optional source of the calculation */
  source?: string;
}

/**
 * Validation information for calculation results
 */
export interface CalculationValidation {
  /** Whether the calculation is valid */
  isValid: boolean;
  /** Any validation errors encountered */
  errors?: string[];
  /** Any warnings about the calculation */
  warnings?: string[];
}

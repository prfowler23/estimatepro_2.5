/**
 * Central export point for all utility modules
 * Organized by category for better discoverability
 *
 * Recent improvements:
 * - Enhanced type safety with proper generics
 * - LRU cache implementation with memory management
 * - Improved retry logic with jitter and circuit breakers
 * - Unified rate limiting with multiple algorithms
 * - Better error handling with structured error types
 * - Comprehensive null safety utilities
 */

// Core utilities
export * from "./cn";
// Export specific functions from calculations to avoid conflicts with format.ts
export {
  calculateSquareFootage,
  calculateArea,
  calculatePerimeter,
  calculateVolume,
  calculateDistance,
  roundToDecimal,
} from "./calculations";
// Import specific functions from validation to avoid conflicts
export {
  validateEmail,
  validatePhone,
  validateUrl,
  validatePasswordStrength,
  validators,
} from "./validation";

// Formatting utilities (includes formatCurrency from currency.ts)
export * from "./format";

// Performance utilities
export * from "./debounce";
export * from "./cache";
export * from "./retry-logic";

// Security utilities
// Note: Some modules have conflicting exports (e.g., sanitizeUrl, validate)
// Import specific functions from these modules to avoid conflicts
export {
  sanitizeHtml,
  sanitizeText,
  sanitizeUserInput,
} from "./input-sanitization";
export { sanitizeFilePath } from "./path-sanitization";
export { validateImageUrl } from "./url-validation";
export { validateFileType, validateFileSize } from "./file-validation";
export * from "./calculator-security";

// Database utilities
export * from "./database-optimization";
export * from "./database-query-optimization";
export * from "./database-transactions";
export * from "./null-safety";

// Unified rate limiting utilities (replaces rate-limit.ts and rate-limiter.ts)
export {
  createRateLimiter,
  withRateLimit,
  rateLimitConfigs,
  rateLimitHelpers,
  createUserRateLimit,
  getRateLimitInfo,
  resetRateLimit,
  InMemoryStore,
  SlidingWindowStore,
  RateLimitError,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitInfo,
  type RateLimitStore,
  type RateLimitStoreValue,
} from "./unified-rate-limiter";

// Image and file utilities
export * from "./image-optimization";

// Server-side utilities
export * from "./server-cache";
export * from "./logger";

// Comparison utilities
export * from "./deep-compare";

// Service utilities
export * from "./service-type-mapper";

// OAuth utilities
export * from "./oauth-encryption";

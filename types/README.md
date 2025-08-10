# Type System Documentation

## Overview

This directory contains TypeScript type definitions for the EstimatePro application. The types are organized into two main categories:

1. **Database Types** - Generated from Supabase schema
2. **Application Types** - Business logic and domain types

## Directory Structure

```
types/
├── calculations.ts      # Calculation result types with validation
├── database.ts         # Database table type helpers and aliases
├── estimate.ts         # Estimate document and item types
├── index.ts           # Main export file
├── jest.d.ts          # Jest testing type extensions
├── sentry.d.ts        # Sentry error tracking types
├── service-worker.d.ts # Service worker API types
├── supabase.ts        # Generated Supabase database types
├── type-guards.ts     # Runtime type validation functions
└── README.md          # This file
```

## Type Organization

### Database Types (`/types/`)

- **Purpose**: Database-centric types from Supabase
- **Files**: `supabase.ts`, `database.ts`
- **Usage**: Database operations, queries, and schema validation

### Application Types (`/lib/types/`)

- **Purpose**: Business logic and feature-specific types
- **Location**: `../lib/types/`
- **Usage**: Application state, API contracts, and domain models

## Key Types

### Estimate Types

After resolving naming conflicts, we now have clear type distinctions:

- `EstimateRow` - Database record from Supabase tables
- `EstimateDocument` - UI/legacy model for client presentation
- `EstimateStoreState` - Store state for estimation workflow

### Type Aliases

For clarity, we provide semantic aliases:

```typescript
type DatabaseEstimate = EstimateRow; // Database record
type UIEstimate = EstimateDocument; // UI model
type StoreEstimate = EstimateStoreState; // Store state
```

### Calculation Types

Enhanced calculation result types with metadata and validation:

```typescript
interface CalculationResult {
  total: number;
  breakdown: Record<string, number>;
  metadata?: CalculationMetadata;
  validation?: CalculationValidation;
}
```

## Type Guards

Runtime type validation functions are available for critical types:

```typescript
import {
  isCalculationResult,
  isEstimateDocument,
  parseCalculationResult,
} from "@/types";

// Type guard usage
if (isCalculationResult(data)) {
  // data is now typed as CalculationResult
  console.log(data.total);
}

// Safe parser usage
const result = parseCalculationResult(unknownData);
if (result) {
  // result is CalculationResult
} else {
  // Invalid data
}
```

## Import Guidelines

### For Database Types

```typescript
import type { Database, Tables } from "@/types/supabase";
import type { EstimateRow } from "@/types/database";
```

### For Application Types

```typescript
import type { ServiceCalculationResult, BuildingData } from "@/lib/types";
```

### For Type Guards

```typescript
import { isEstimateDocument, parseCalculationResult } from "@/types";
```

## Best Practices

1. **Use Type-Only Imports**: Prefer `import type` for type definitions
2. **Avoid `any`**: All `any` types have been replaced with `unknown` or specific types
3. **Document Complex Types**: All exported types include JSDoc comments
4. **Runtime Validation**: Use type guards for external data validation
5. **Semantic Naming**: Use clear, descriptive names for types

## Type Safety Improvements

Recent improvements include:

- Replaced all `any` types with `unknown` or specific types
- Added comprehensive JSDoc documentation
- Created type guards for runtime validation
- Enhanced interfaces with metadata and validation
- Resolved naming conflicts between database and application types

## Migration Notes

If you're updating from the old type system:

1. Replace `Estimate` imports with the appropriate specific type
2. Use type guards for runtime validation of external data
3. Update imports to use the correct path (`@/types` vs `@/lib/types`)

## Contributing

When adding new types:

1. Add JSDoc comments for all exported types
2. Create corresponding type guards for runtime validation
3. Follow the established naming conventions
4. Update this README if adding new categories

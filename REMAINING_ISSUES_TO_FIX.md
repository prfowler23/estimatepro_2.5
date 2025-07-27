# Remaining TypeScript Issues to Fix

## Summary

After implementing Phase 1 fixes:

- ✅ Generated fresh Supabase types
- ✅ Created missing database table migrations
- ✅ Fixed Next.js 15 route handler async params
- ✅ Fixed service layer type references

## Remaining Issues

### 1. Facade Analysis API Routes (Critical)

The facade analysis API routes are using methods that don't exist on the FacadeAnalysisService:

- `getFacadeAnalysis()` - doesn't exist (use `getByEstimateId()` instead)
- `getImages()` - doesn't exist
- `updateFacadeAnalysis()` - doesn't exist
- `deleteFacadeAnalysis()` - doesn't exist
- `createFacadeAnalysis()` - doesn't exist (use `createAnalysis()` instead)
- `calculateAggregatedMeasurements()` - doesn't exist (use `calculateMeasurements()` instead)

**Affected files:**

- `/app/api/facade-analysis/[id]/route.ts`
- `/app/api/facade-analysis/[id]/analyze/route.ts`
- `/app/api/facade-analysis/[id]/images/route.ts`
- `/app/api/facade-analysis/route.ts`

### 2. Facade Analysis Test Type Issues

Test file has incorrect types for:

- `building_type: "commercial"` should be one of: "office" | "retail" | "residential" | "industrial" | "mixed-use" | "institutional"
- `materials_identified` structure doesn't match FacadeMaterial type

**Affected file:**

- `__tests__/facade-analysis-service.test.ts`

### 3. Dashboard Page Component Props

Dashboard components are using incorrect prop names:

- `userName` should be handled differently
- `onNavigate` should be `navigateTo`
- Analytics data structure doesn't match expected shape

**Affected file:**

- `/app/dashboard/page.tsx`

### 4. Missing Dependencies

- `@types/uuid` package needs to be installed

### 5. Non-critical Route Handler Issues

Some route handlers without dynamic params are showing type errors in `.next/types`:

- `/app/api/ai/auto-estimate/route.ts`
- `/app/api/integrations/quickbooks/sync/route.ts`
- `/app/api/pdf/process/route.ts`

These may be Next.js 15 type generation issues that don't affect runtime.

## Recommended Actions

1. **Fix Facade Analysis Service Methods**: Either update the service to add the missing methods or update all API routes to use existing methods
2. **Fix Test Types**: Update test files to use correct enum values and type structures
3. **Fix Dashboard Props**: Update dashboard components to use correct prop interfaces
4. **Install Missing Types**: `npm install --save-dev @types/uuid`
5. **Consider Disabling Facade Routes**: If facade analysis isn't ready for production, consider commenting out these routes temporarily

## Notes

- The application is designed to work with fallback data when database tables are missing
- Many issues are related to the facade analysis feature which appears to be partially implemented
- The core estimation workflow should still function despite these TypeScript errors

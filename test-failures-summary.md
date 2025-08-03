# Test Failures Summary - Day 1

## Overall Status

- **Test Suites**: 8 failed, 4 passed, 12 total
- **Tests**: 30 failed, 2 skipped, 75 passed, 107 total
- **Time**: 6.69s

## Failed Test Suites

### 1. MaterialBreakdown Component (`__tests__/components/calculator/MaterialBreakdown.test.tsx`)

**Issue**: Multiple elements with same text "25.0%" and "500 sq ft"
**Root Cause**: Component renders multiple materials with same values
**Fix**: Use data-testid attributes for unique element selection

### 2. RealTimePricingService (`__tests__/services/real-time-pricing-service.test.ts`)

**Multiple Issues**:

- Debouncing test timeout (done() not called)
- Dependency tracking not working as expected
- Confidence scoring returning "low" instead of "high"/"medium"
- Risk adjustments not being applied
- Complexity adjustments not being applied

### 3. AI Assistant Route (`app/api/ai/assistant/route.test.ts`)

**Issue**: `createClient` mock not properly set up
**Error**: Cannot read properties of undefined (reading 'mockReturnValue')
**Fix**: Need to properly mock Supabase client

### 4. Health API Route (`__tests__/api/health.test.ts`)

**Issue**: `createClient` mock not properly set up (same as AI Assistant)
**All 12 tests failing with same error**

### 5. AI Service (`__tests__/services/ai-service.test.ts`)

**Issue**: Multiple test failures related to AI config and mocking

### 6. Session Recovery Service (`__tests__/services/session-recovery-service.test.ts`)

**Issue**: Test failures (specific errors not shown in summary)

### 7. Estimate Business Service (`__tests__/services/estimate-business-service.test.ts`)

**Issue**: Test failures (specific errors not shown in summary)

### 8. Estimates API (`__tests__/api/estimates.test.ts`)

**Issue**: Test failures (specific errors not shown in summary)

## Priority Fixes

1. **Mock Setup Issues** (affects multiple test suites)
   - Fix Supabase `createClient` mocking
   - Fix AI config mocking

2. **MaterialBreakdown** - Simple fix with data-testid

3. **RealTimePricingService** - Complex timing and logic issues

4. **Others** - Need to investigate specific failures

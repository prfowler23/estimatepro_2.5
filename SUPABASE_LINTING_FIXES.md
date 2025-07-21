# Supabase Database Linting Fixes

This document explains the Supabase database linting errors you're experiencing and provides comprehensive fixes.

## Issues Detected

### 1. Auth RLS Initialization Plan (Performance Warning)

**Problem**: RLS policies using `auth.uid()` calls are being re-evaluated for each row, causing performance issues at scale.

**Affected Tables**: 67 policies across multiple tables including:

- `profiles`, `estimates`, `estimate_services`, `service_rates`
- `analytics_events`, `ai_analysis_results`, `estimation_flows`
- `integrations`, `audit_events`, `compliance_reports`, etc.

**Solution**: Wrap `auth.uid()` calls in `(select auth.uid())` to cache the result.

### 2. Multiple Permissive Policies (Performance Warning)

**Problem**: Multiple permissive RLS policies for the same role and action cause all policies to be executed for every query.

**Examples**:

- `estimates` table has duplicate INSERT policies: "Users can create quotes" and "Users can insert estimates"
- `ai_analysis_results` table has duplicate INSERT policies for multiple roles
- `audit_events` table has duplicate policies: "Service can create audit events" and "Users can create their own audit events"

**Solution**: Consolidate duplicate policies into single, comprehensive policies.

### 3. Duplicate Index (Performance Warning)

**Problem**: Identical indexes exist with different names, wasting storage and maintenance overhead.

**Examples**:

- `estimates` table: `idx_estimates_created_by` and `idx_quotes_created_by`
- `estimates` table: `idx_estimates_status` and `idx_quotes_status`

**Solution**: Drop the old `idx_quotes_*` indexes and keep the newer `idx_estimates_*` versions.

## How to Fix

### Option 1: Automated Script (Recommended)

1. **Run the Node.js script**:

```bash
node scripts/apply-linting-fixes.js
```

This script will:

- Apply all the fixes automatically
- Show progress and results
- Verify the fixes were successful

### Option 2: Manual SQL Execution

1. **Open Supabase SQL Editor**:
   - Go to your Supabase Dashboard
   - Navigate to "Database" > "SQL Editor"

2. **Execute the fix script**:
   - Copy the contents of `fix-supabase-linting-errors.sql`
   - Paste into the SQL Editor
   - Click "Run"

### Option 3: Copy Individual Fixes

If you prefer to apply fixes incrementally, here are the key changes:

#### Fix Auth UID Performance

Replace all instances of:

```sql
-- BEFORE (slow)
USING (auth.uid() = user_id)

-- AFTER (optimized)
USING ((select auth.uid()) = user_id)
```

#### Remove Duplicate Policies

Example for estimates table:

```sql
-- Drop all duplicate policies
DROP POLICY IF EXISTS "Users can view own quotes" ON public.estimates;
DROP POLICY IF EXISTS "Users can view own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can view their own estimates" ON public.estimates;

-- Create single, optimized policy
CREATE POLICY "Users can view own estimates" ON public.estimates
    FOR SELECT USING ((select auth.uid()) = created_by);
```

#### Remove Duplicate Indexes

```sql
-- Remove old quote indexes (duplicates)
DROP INDEX IF EXISTS idx_quotes_created_by;
DROP INDEX IF EXISTS idx_quotes_status;
-- Keep the estimates indexes (they're identical but newer)
```

## Verification

After applying the fixes:

1. **Run the verification function**:

```sql
SELECT * FROM public.verify_linting_fixes();
```

2. **Check Supabase Database Linter**:
   - Go to Supabase Dashboard > Database > Database Linter
   - Run the linter again
   - All warnings should be resolved

## Expected Results

After applying these fixes, you should see:

✅ **Auth RLS Initialization Plan**: All 67 warnings resolved  
✅ **Multiple Permissive Policies**: All 28 warnings resolved  
✅ **Duplicate Index**: All 2 warnings resolved

## Performance Impact

These fixes will provide:

- **Improved query performance**: `auth.uid()` calls are now cached per query instead of per row
- **Reduced policy overhead**: Single policies instead of multiple duplicate policies
- **Storage savings**: Duplicate indexes removed
- **Better maintenance**: Cleaner, more organized RLS policy structure

## Troubleshooting

### If the script fails:

1. Check your environment variables are set correctly in `.env.local`
2. Ensure you have the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
3. Try running the SQL manually in the Supabase SQL Editor

### If some policies already exist:

The script uses `DROP POLICY IF EXISTS` so it's safe to run multiple times.

### If you see permission errors:

Make sure you're using the service role key, not the anon key.

## Files Created/Modified

- `fix-supabase-linting-errors.sql` - Main SQL fix script
- `scripts/apply-linting-fixes.js` - Automated application script
- `SUPABASE_LINTING_FIXES.md` - This documentation

## Next Steps

1. Apply the fixes using your preferred method
2. Run the Supabase Database Linter to verify all issues are resolved
3. Monitor your application performance for improvements
4. Consider setting up a regular schedule to run the database linter to catch future issues early

---

**Note**: These fixes are safe to apply and won't affect your application functionality. They only optimize performance and clean up duplicate configurations.

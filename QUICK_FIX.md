# Quick Fix for Auto-Save Errors

## Problem

You're getting these errors:

- `GET .../estimation_flows?select=version%2Clast_modified&estimate_id=eq.temp-estimate-1752551721627 406 (Not Acceptable)`
- `POST .../estimation_flows 400 (Bad Request)`
- `Error: Save failed` in auto-save-service.ts

## Immediate Solution

### Step 1: Run the Database Migration

1. **Open your Supabase Dashboard** at https://supabase.com/dashboard
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy the entire contents** of `migration_fix_estimation_flows_schema.sql`
4. **Paste and Run** the SQL commands

### Step 2: Key SQL Commands (If you want to run piece by piece)

If you prefer to run commands individually, here are the most critical ones:

```sql
-- 1. Add missing user_id column
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Add missing flow_data column
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '{}';

-- 3. Add auto-save columns
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();

-- 4. Fix RLS policies
DROP POLICY IF EXISTS "Users can view own estimation flows" ON estimation_flows;
CREATE POLICY "Users can view own estimation flows"
  ON estimation_flows FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert estimation flows" ON estimation_flows;
CREATE POLICY "Users can insert estimation flows"
  ON estimation_flows FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own estimation flows" ON estimation_flows;
CREATE POLICY "Users can update own estimation flows"
  ON estimation_flows FOR UPDATE
  USING (user_id = auth.uid());
```

### Step 3: Test the Fix

1. **Restart your development server**: `npm run dev`
2. **Open the guided estimation flow** in your browser
3. **Check the browser console** - auto-save errors should be gone
4. **Test creating a new estimate** - it should save automatically

## What This Fixes

- ✅ Adds missing `user_id` column for proper Row Level Security
- ✅ Adds `flow_data` JSONB column for centralized data storage
- ✅ Adds `version` and `last_modified` columns for auto-save tracking
- ✅ Fixes RLS policies so users can only access their own data
- ✅ Resolves 406/400 HTTP errors in auto-save operations

## Verification

After running the migration, you should see:

- No more 406/400 errors in browser console
- Auto-save messages showing successful saves
- Estimation flow data persisting between page refreshes

## If You Still Have Issues

1. **Clear browser cache** completely
2. **Check authentication** - make sure you're logged in
3. **Check browser console** for any JavaScript errors
4. **Verify the migration ran** by checking if the new columns exist in Supabase

The auto-save system should work perfectly after this fix!

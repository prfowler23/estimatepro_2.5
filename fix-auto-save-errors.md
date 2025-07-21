# Fix Auto-Save Database Errors

This document outlines the solution for the 406 (Not Acceptable) and 400 (Bad Request) errors occurring in the estimation_flows auto-save system.

## Problem Summary

The auto-save system was failing with these errors:

- `GET https://...supabase.co/rest/v1/estimation_flows?select=version%2Clast_modified&estimate_id=eq.temp-estimate-1752551721627 406 (Not Acceptable)`
- `POST https://...supabase.co/rest/v1/estimation_flows 400 (Bad Request)`
- `Error: Save failed` in `auto-save-service.ts:232`

## Root Cause

1. **Schema Mismatch**: The `estimation_flows` table structure didn't match what the auto-save service expected
2. **Missing Columns**: Required columns like `flow_data`, `user_id`, and proper `estimate_id` UUID were missing
3. **RLS Issues**: Row Level Security policies were not properly configured for user access
4. **Data Type Issues**: `estimate_id` was TEXT instead of UUID, causing foreign key constraint issues

## Solution Files Created

### 1. Database Migration Script

- **File**: `migration_fix_estimation_flows_schema.sql`
- **Purpose**: Comprehensive database schema fix
- **Key Changes**:
  - Recreates `estimation_flows` table with correct structure
  - Adds `flow_data` JSONB column for centralized data storage
  - Changes `estimate_id` from TEXT to UUID
  - Adds required `user_id` column with foreign key to `auth.users`
  - Fixes RLS policies for proper access control
  - Creates supporting tables for version control and conflict resolution
  - Adds helper functions for handling temporary estimate IDs

### 2. Migration Runner Script

- **File**: `scripts/fix-estimation-flows-schema.js`
- **Purpose**: Node.js script to execute the migration safely
- **Features**:
  - Tests database connectivity
  - Backs up existing data
  - Executes migration with detailed progress reporting
  - Verifies new schema structure
  - Tests basic operations

### 3. Updated Validation Schemas

- **File**: `lib/schemas/api-validation.ts` (updated)
- **Changes**:
  - Updated `estimationFlowSchema` to match new database structure
  - Added `autoSaveSchema` for auto-save specific operations
  - Added support for both legacy and new data fields

## How to Apply the Fix

### Step 1: Backup Your Data (Recommended)

```bash
# Create a backup of your current database (if you have important data)
# This is done automatically by the migration script, but manual backup is recommended for production
```

### Step 2: Run the Migration

```bash
# Make sure you're in the project root directory
cd /home/prfowler/estimatepro

# Install dependencies if needed
npm install

# Run the migration script
node scripts/fix-estimation-flows-schema.js
```

### Step 3: Verify the Fix

1. **Check Migration Output**: The script will show detailed progress and any errors
2. **Start Your Application**: `npm run dev`
3. **Test Auto-Save**:
   - Navigate to the guided estimation flow
   - Create a new estimate
   - Check browser console for auto-save operations
   - Verify no 406/400 errors appear

### Step 4: Monitor for Issues

- Check browser console for any remaining errors
- Verify that estimation flow data persists correctly
- Test the complete guided estimation workflow

## What the Migration Does

### Database Changes

1. **Drops and recreates** `estimation_flows` table with correct structure
2. **Adds required columns**:
   - `flow_data` JSONB - centralized data storage
   - `user_id` UUID - required for RLS
   - `estimate_id` UUID - proper foreign key reference
   - Auto-save columns (version, last_modified, etc.)

3. **Creates supporting tables**:
   - `estimation_flow_versions` - version control
   - `estimation_flow_conflicts` - conflict resolution
   - `estimation_flow_auto_save_state` - auto-save state management

4. **Fixes RLS policies** for proper user access control

5. **Adds helper functions**:
   - `get_or_create_estimate_for_temp_id()` - handles temporary estimate IDs
   - `handle_temp_estimate_auto_save()` - main auto-save function

### Code Changes

1. **Updated validation schemas** to match new database structure
2. **Added auto-save specific validation** for handling temporary estimate IDs
3. **Maintained backward compatibility** with existing code patterns

## Expected Outcomes

After applying this fix:

- ✅ Auto-save operations should work without 406/400 errors
- ✅ Estimation flow data should persist correctly
- ✅ Version control and conflict resolution should be available
- ✅ Proper user access control via RLS
- ✅ Support for both temporary and permanent estimate IDs

## Troubleshooting

### If Migration Fails

1. **Check Database Permissions**: Ensure your `SUPABASE_SERVICE_ROLE_KEY` has admin permissions
2. **Check Environment Variables**: Verify `.env.local` contains correct Supabase credentials
3. **Check Database Connection**: Test connection to Supabase from your environment
4. **Manual Migration**: If automated migration fails, run the SQL manually in Supabase SQL Editor

### If Auto-Save Still Fails

1. **Clear Browser Cache**: Old cached code might still be running
2. **Check Authentication**: Ensure user is properly authenticated
3. **Check Network Tab**: Look for specific error messages in network requests
4. **Check Console Errors**: Look for JavaScript errors that might prevent auto-save

### Common Issues

- **Foreign Key Errors**: Ensure `estimates` table exists and has proper structure
- **RLS Errors**: Verify user authentication is working correctly
- **Version Conflicts**: Clear browser storage to reset auto-save state

## Rollback Instructions

If you need to rollback the changes:

1. The migration creates a backup table `estimation_flows_backup`
2. You can restore from this backup if needed
3. Contact your database administrator for assistance with complex rollbacks

## Files Modified/Created

### New Files:

- `migration_fix_estimation_flows_schema.sql`
- `scripts/fix-estimation-flows-schema.js`
- `fix-auto-save-errors.md` (this file)

### Modified Files:

- `lib/schemas/api-validation.ts` - Updated validation schemas

### Database Objects Created:

- `estimation_flows` table (recreated)
- `estimation_flow_versions` table
- `estimation_flow_conflicts` table
- `estimation_flow_auto_save_state` table
- Helper functions for auto-save operations
- RLS policies for all tables
- Indexes for performance

## Support

If you encounter issues:

1. Check the migration script output for specific error messages
2. Verify your Supabase configuration and permissions
3. Test with a fresh browser session to eliminate cache issues
4. Check the application logs for additional error details

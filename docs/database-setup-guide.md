# Database Setup Guide for EstimatePro

## Issue Summary

The EstimatePro application is experiencing database-related errors because required tables (`estimation_flows` and `customers`) are missing from the Supabase database.

## Errors Fixed

### 1. Template Selector Infinite Re-render ✅

**Issue**: Maximum update depth exceeded error in `template-selector.tsx`
**Cause**: Array dependency in useEffect causing infinite re-renders
**Fix**: Changed dependency from `services` array to `services.join(',')` string

### 2. Database 404 Errors ✅

**Issue**: `estimation_flows` table not found (404 errors)
**Cause**: Required tables missing from database
**Solution**: Created SQL script to set up missing tables

## Required Database Setup

### Step 1: Create Missing Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Run this in Supabase Dashboard -> SQL Editor
```

Then copy and paste the contents of `/scripts/create-essential-tables.sql`

### Step 2: Verify Setup

Run the verification script:

```bash
node scripts/create-tables-direct.js
```

This will:

- Check which tables exist
- Display SQL needed for missing tables
- Provide step-by-step instructions

### Step 3: Test Application

After creating the tables:

1. Restart your development server
2. Try creating a new guided estimation
3. Verify auto-save functionality works

## Tables Created

### `customers`

- Stores customer contact information
- Links to estimation flows

### `estimation_flows`

- Main table for guided estimation data
- Stores step-by-step progress
- Includes auto-save and version control
- JSONB fields for flexible data storage

## Error Handling Improvements

### Auto-Save Service ✅

- Added better error handling for missing tables
- Graceful fallback when conflict detection fails
- Clear error messages when database isn't configured

### Template Selector ✅

- Fixed infinite re-render loop
- Optimized dependency array in useEffect

## Next Steps

1. **Database Migration**: Run the SQL script in Supabase
2. **Verification**: Test the application after migration
3. **Monitor**: Check for any remaining issues

## Files Modified

- `components/estimation/guided-flow/template-selector.tsx` - Fixed re-render issue
- `lib/services/auto-save-service.ts` - Added error handling
- `scripts/create-essential-tables.sql` - New migration script
- `scripts/create-tables-direct.js` - Database verification script

## Testing Checklist

After running the migration:

- [ ] Template selector loads without errors
- [ ] Guided estimation flow can be started
- [ ] Auto-save works without 404 errors
- [ ] No infinite re-render warnings in console
- [ ] Database tables exist with correct structure

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify environment variables are set
3. Ensure Supabase service role key has proper permissions
4. Run the verification script to check table status

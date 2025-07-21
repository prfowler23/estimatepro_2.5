# Security Fix Instructions

## Quick Fix for SQL Syntax Error

The security fix script needs to be run in parts to avoid SQL syntax errors in Supabase.

## Step-by-Step Instructions

### Option 1: Run in Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard** → Go to SQL Editor

2. **Run Part 1** - Copy and paste contents of `fix-database-security-simple.sql`
   - Removes problematic views
   - Creates secure replacement functions
   - Click "Run" button

3. **Run Part 2** - Copy and paste contents of `fix-database-security-part2.sql`
   - Fixes RLS policies with user_metadata
   - Enables RLS on missing table
   - Click "Run" button

4. **Run Part 3** - Copy and paste contents of `fix-database-security-part3.sql`
   - Adds comprehensive RLS policies
   - Click "Run" button

5. **Run Part 4** - Copy and paste contents of `fix-database-security-part4.sql`
   - Creates verification function
   - Click "Run" button

6. **Verify Fixes** - Run this query:
   ```sql
   SELECT * FROM verify_security_fixes();
   ```

### Option 2: Command Line (if you have direct database access)

```bash
# Run each part separately
psql "$SUPABASE_DB_URL" -f fix-database-security-simple.sql
psql "$SUPABASE_DB_URL" -f fix-database-security-part2.sql
psql "$SUPABASE_DB_URL" -f fix-database-security-part3.sql
psql "$SUPABASE_DB_URL" -f fix-database-security-part4.sql

# Verify
psql "$SUPABASE_DB_URL" -c "SELECT * FROM verify_security_fixes();"
```

## What Each Part Does

### Part 1: `fix-database-security-simple.sql`

- ✅ Removes 3 SECURITY DEFINER views
- ✅ Creates secure replacement functions
- ✅ Grants proper permissions

### Part 2: `fix-database-security-part2.sql`

- ✅ Enables RLS on estimation_flows_backup
- ✅ Fixes 6 RLS policies using user_metadata
- ✅ Replaces with secure profiles table joins

### Part 3: `fix-database-security-part3.sql`

- ✅ Enables RLS on core tables
- ✅ Creates comprehensive RLS policies
- ✅ Ensures data isolation by user

### Part 4: `fix-database-security-part4.sql`

- ✅ Creates verification function
- ✅ Allows checking if fixes worked

## Expected Results

After running all parts, the verification should show:

| Check Name                     | Status   | Details                    |
| ------------------------------ | -------- | -------------------------- |
| Security Definer Views         | ✅ FIXED | Problematic views removed  |
| RLS on estimation_flows_backup | ✅ FIXED | RLS enabled                |
| user_metadata in RLS           | ✅ FIXED | No insecure references     |
| Secure Functions Created       | ✅ FIXED | Replacement functions work |

## Update Your Application Code

After fixing the database, update your application:

```typescript
// Replace these view calls:
const { data } = await supabase.from("service_type_stats").select("*");
const { data } = await supabase.from("quote_summary").select("*");
const { data } = await supabase.from("integration_health_view").select("*");

// With these function calls:
const { data } = await supabase.rpc("get_service_type_stats");
const { data } = await supabase.rpc("get_quote_summary");
const { data } = await supabase.rpc("get_integration_health");
```

## Troubleshooting

**If you get "relation does not exist" errors:**

- Some tables may not exist in your database
- Comment out or skip the failing statements
- The core security fixes will still work

**If you get "policy already exists" errors:**

- This is normal - the script uses `DROP POLICY IF EXISTS`
- The fixes will still apply correctly

**If functions fail to create:**

- Check that the referenced tables exist
- Verify you have the correct permissions
- Try running the function creation statements individually

## Need Help?

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Run the verification function to see what worked
3. You can run parts of the script individually
4. Contact support with the specific error message

All security vulnerabilities will be resolved once these fixes are applied successfully.

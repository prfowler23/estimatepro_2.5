# Database Security Fixes

This document outlines the security vulnerabilities found by Supabase linter and their resolutions.

## Issues Identified

### 1. Security Definer Views (3 instances)

**Risk Level**: HIGH
**Issue**: Views using `SECURITY DEFINER` bypass Row Level Security (RLS) and user permissions.

**Affected Views**:

- `public.service_type_stats`
- `public.quote_summary`
- `public.integration_health_view`

**Solution**: Replaced with `SECURITY INVOKER` functions that respect user permissions.

### 2. RLS Disabled (1 instance)

**Risk Level**: HIGH
**Issue**: Table exposed to PostgREST without RLS protection.

**Affected Table**:

- `public.estimation_flows_backup`

**Solution**: Enabled RLS and added user-specific access policy.

### 3. Insecure user_metadata References (6 instances)

**Risk Level**: HIGH  
**Issue**: RLS policies referencing `user_metadata` which is user-editable and insecure.

**Affected Tables**:

- `public.performance_logs`
- `public.performance_alerts` (2 policies)
- `public.cache_performance`
- `public.query_performance`
- `public.system_resources`
- `public.performance_config`

**Solution**: Replaced with secure `profiles` table joins for role checking.

## Security Fixes Applied

### 1. Secure Function Replacements

#### get_service_type_stats()

```sql
-- Replaces: service_type_stats view
-- Security: SECURITY INVOKER, user-specific data only
-- Note: Uses quote_id foreign key and created_by for user filtering
SELECT * FROM get_service_type_stats();
```

#### get_quote_summary()

```sql
-- Replaces: quote_summary view
-- Security: SECURITY INVOKER, user's quotes only
-- Note: Uses quote_id foreign key and created_by for user filtering
SELECT * FROM get_quote_summary();
```

#### get_integration_health()

```sql
-- Replaces: integration_health_view
-- Security: SECURITY INVOKER, admin access only
SELECT * FROM get_integration_health();
```

### 2. RLS Policy Updates

All RLS policies now use secure patterns:

```sql
-- SECURE: Check user ownership (estimates table uses created_by)
USING (created_by = auth.uid())

-- SECURE: Check admin role via profiles table
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
```

Instead of insecure `user_metadata` references:

```sql
-- INSECURE - DON'T USE
auth.jwt() ->> 'user_metadata')::jsonb ->> 'role'
```

### 3. Comprehensive RLS Coverage

Added RLS policies for all core tables:

- `estimates` - user ownership
- `estimate_services` - via estimate ownership
- `estimation_flows` - user ownership
- `measurements` - via estimate ownership
- `analytics_events` - user ownership
- `estimation_flows_backup` - user ownership

## How to Apply Fixes

### Option 1: Automated Script (Recommended)

```bash
# Set your database URL
export SUPABASE_DB_URL='postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres'

# Run the fix script
./scripts/apply-security-fixes.sh
```

### Option 2: Node.js Script

```bash
# Ensure environment variables are set in .env.local
node scripts/run-security-fixes.js
```

### Option 3: Manual Application

1. Copy contents of `fix-database-security.sql`
2. Paste into Supabase SQL Editor
3. Execute the script

## Verification

After applying fixes, verify they worked:

```sql
-- Run the verification function
SELECT * FROM verify_security_fixes();
```

Expected results:

- ✅ Security Definer Views: FIXED
- ✅ RLS on estimation_flows_backup: FIXED
- ✅ user_metadata in RLS: FIXED
- ✅ Secure Functions Created: FIXED

## Application Code Updates Required

Update your application code to use the new secure functions:

### Before (Insecure):

```typescript
// DON'T USE - These views have been removed
const { data } = await supabase.from("service_type_stats").select("*");
const { data } = await supabase.from("quote_summary").select("*");
const { data } = await supabase.from("integration_health_view").select("*");
```

### After (Secure):

```typescript
// USE THESE - Secure function calls
// These functions respect RLS and filter data by user ownership
const { data } = await supabase.rpc("get_service_type_stats");
const { data } = await supabase.rpc("get_quote_summary");
const { data } = await supabase.rpc("get_integration_health");
```

### Important Schema Notes:

- `estimates` table uses `created_by` column for user ownership
- `estimate_services` table uses `quote_id` as foreign key to estimates
- Functions filter data based on `created_by = auth.uid()` pattern

## Security Benefits

1. **Data Isolation**: Users can only access their own data
2. **Admin Protection**: Admin functions require verified admin role
3. **RLS Enforcement**: All data access respects Row Level Security
4. **No Privilege Escalation**: Functions use caller's permissions
5. **Audit Trail**: All access is logged and auditable

## Testing Checklist

After applying fixes, verify:

- [ ] Regular users can only see their own estimates/quotes
- [ ] Admin users can access admin functions
- [ ] No unauthorized data access possible
- [ ] Application functionality unchanged
- [ ] Supabase linter shows no security errors
- [ ] Performance impact is minimal

## Rollback Plan

If issues arise, you can temporarily restore functionality by:

1. Creating temporary views (not recommended for production):

```sql
-- TEMPORARY ONLY - Not secure
CREATE VIEW temp_quote_summary AS
SELECT * FROM get_quote_summary();
```

2. Update application code incrementally
3. Test thoroughly before removing temporary views

## Additional Security Recommendations

1. **Regular Security Audits**: Run Supabase linter monthly
2. **Access Monitoring**: Monitor unusual access patterns
3. **Role Management**: Regularly review user roles and permissions
4. **Backup Verification**: Ensure backups maintain security constraints
5. **Environment Separation**: Use different databases for dev/staging/prod

## Support

For issues with these security fixes:

1. Check the verification function results
2. Review Supabase logs for errors
3. Test with a fresh database instance
4. Consult the troubleshooting section in the script output

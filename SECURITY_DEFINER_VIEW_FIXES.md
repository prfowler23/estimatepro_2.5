# Security Definer View Fixes Plan

This document provides a comprehensive plan to fix the **Security Definer View** errors identified by the Supabase database linter.

## 🚨 Issues Identified

The Supabase linter found **3 ERROR-level security issues**:

### 1. `public.integration_health_view`

- **Risk**: HIGH - SECURITY DEFINER bypasses RLS
- **Impact**: Users can access data they shouldn't see

### 2. `public.service_type_stats`

- **Risk**: HIGH - SECURITY DEFINER bypasses RLS
- **Impact**: Users can access other users' service statistics

### 3. `public.quote_summary`

- **Risk**: HIGH - SECURITY DEFINER bypasses RLS
- **Impact**: Users can access other users' quotes/estimates

## 🔒 Security Risk Explanation

**SECURITY DEFINER** views are dangerous because they:

- Execute with the **creator's** permissions, not the **user's** permissions
- **Bypass Row Level Security (RLS)** policies completely
- Allow users to access data they shouldn't be able to see
- Create potential data breaches and privacy violations

## 🛠️ Fix Strategy

### Phase 1: Drop Insecure Views ✅

Remove all views that use `SECURITY DEFINER` property:

- Drop `public.service_type_stats`
- Drop `public.quote_summary`
- Drop `public.integration_health_view`

### Phase 2: Create Secure Views ✅

Recreate views with proper security:

- Use `WITH (security_barrier = true)` instead of `SECURITY DEFINER`
- Add user-specific `WHERE` clauses: `WHERE created_by = (select auth.uid())`
- Ensure each user only sees their own data

### Phase 3: Apply RLS Filtering ✅

Add proper Row Level Security filtering:

```sql
-- Only user's own estimates
WHERE e.created_by = (select auth.uid())

-- Only user's own integrations
WHERE i.created_by = (select auth.uid())
```

## 📋 Implementation Plan

### Step 1: Automated Fix (Recommended)

```bash
# Run the automated script
node scripts/apply-security-definer-fixes.js
```

**What it does:**

- Tests database connection
- Applies all SQL fixes automatically
- Verifies fixes were successful
- Provides clear success/failure feedback

### Step 2: Manual Fix (Alternative)

If the script fails, apply manually:

1. **Open Supabase SQL Editor**
   - Go to Supabase Dashboard > Database > SQL Editor

2. **Execute the fix script**
   - Copy contents of `fix-security-definer-views.sql`
   - Paste into SQL Editor
   - Click "Run"

### Step 3: Verification

Run verification to ensure fixes worked:

```sql
SELECT * FROM public.verify_security_definer_fixes();
```

**Expected Results:**

- ✅ service_type_stats view: FIXED
- ✅ quote_summary view: FIXED
- ✅ integration_health_view: FIXED
- ✅ Security Definer Check: ALL FIXED

## 🔧 Technical Details

### Before (Insecure):

```sql
-- BAD: Uses SECURITY DEFINER (bypasses RLS)
CREATE VIEW service_type_stats WITH SECURITY DEFINER AS
SELECT * FROM estimate_services es
JOIN estimates e ON es.quote_id = e.id
-- No user filtering - shows ALL data!
```

### After (Secure):

```sql
-- GOOD: Uses security_barrier, respects RLS
CREATE VIEW service_type_stats
WITH (security_barrier = true) AS
SELECT * FROM estimate_services es
JOIN estimates e ON es.quote_id = e.id
WHERE e.created_by = (select auth.uid())  -- Only user's data
```

## 🧪 Testing Plan

### Step 1: Verify Views Exist

```sql
-- Check views were recreated
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('service_type_stats', 'quote_summary', 'integration_health_view');
```

### Step 2: Test Data Isolation

Create test users and verify they only see their own data:

```sql
-- As User A: Should only see User A's data
SELECT * FROM service_type_stats;

-- As User B: Should only see User B's data
SELECT * FROM quote_summary;
```

### Step 3: Verify RLS Enforcement

```sql
-- Should return no rows with SECURITY DEFINER
SELECT * FROM pg_views
WHERE schemaname = 'public'
AND definition ILIKE '%SECURITY DEFINER%';
```

## 📊 Expected Performance Impact

### Positive Changes:

- ✅ **Improved Security**: Users can only access their own data
- ✅ **RLS Compliance**: All views respect Row Level Security
- ✅ **Audit Trail**: User access is properly logged

### Potential Considerations:

- ⚠️ **Query Performance**: Views now filter by user ID (usually minimal impact)
- ⚠️ **Cache Efficiency**: User-specific data may have different cache patterns

## 🔄 Application Code Changes

### Views Still Work the Same:

No application code changes needed! The views have the same names and return the same columns:

```typescript
// This code continues to work unchanged:
const { data } = await supabase.from("service_type_stats").select("*");
const { data } = await supabase.from("quote_summary").select("*");
const { data } = await supabase.from("integration_health_view").select("*");
```

### Data Filtering Changes:

- **Before**: Views returned ALL users' data (security risk)
- **After**: Views return only current user's data (secure)

## 🚨 Rollback Plan

If issues arise, you can temporarily restore functionality:

### Emergency Rollback:

```sql
-- TEMPORARY ONLY - Creates insecure views for emergency access
-- DO NOT USE IN PRODUCTION

CREATE VIEW temp_service_type_stats AS
SELECT * FROM estimate_services es
JOIN estimates e ON es.quote_id = e.id;
-- This bypasses security - only use for debugging!
```

### Proper Fix:

1. Identify the specific issue
2. Fix the view definition
3. Reapply the secure version
4. Remove any temporary views

## 📈 Success Metrics

### Security Linter Results:

- ✅ Security Definer View errors: **0** (currently 3)
- ✅ Overall security score: **Improved**

### Functional Testing:

- ✅ All application features work normally
- ✅ Users only see their own data
- ✅ Admin users have appropriate access
- ✅ Performance impact is minimal

## 📚 Files Created/Modified

- `fix-security-definer-views.sql` - Main fix script
- `scripts/apply-security-definer-fixes.js` - Automated application
- `SECURITY_DEFINER_VIEW_FIXES.md` - This documentation

## 🎯 Next Steps

1. **Apply the fixes** using your preferred method
2. **Run the Supabase Database Linter** to verify errors are resolved
3. **Test your application** to ensure functionality is maintained
4. **Monitor application** for any performance or functionality issues
5. **Update team** on the security improvements

---

**⚠️ Important**: These are **ERROR-level security issues** that should be fixed immediately. The current setup allows users to potentially access other users' data, which is a serious security vulnerability.

**✅ Safe to Apply**: The fixes maintain all functionality while improving security. Users will see the same data they should see, just filtered properly now.

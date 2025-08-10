# Performance Optimization & Storage Setup Guide

This guide contains the SQL scripts and instructions for optimizing your EstimatePro database performance and setting up storage buckets.

## 🚀 Performance Optimization

### Step 1: Apply Custom Indexes

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- CUSTOM PERFORMANCE INDEXES FOR CORE TABLES
-- ============================================

-- Estimates table indexes
CREATE INDEX IF NOT EXISTS idx_estimates_status_created
ON estimates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimates_customer_name
ON estimates(customer_name);

CREATE INDEX IF NOT EXISTS idx_estimates_quote_number
ON estimates(quote_number);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by_status
ON estimates(created_by, status);

CREATE INDEX IF NOT EXISTS idx_estimates_total_price
ON estimates(total_price DESC) WHERE total_price > 0;

-- Estimation flows table indexes
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id
ON estimation_flows(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id
ON estimation_flows(estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_status_step
ON estimation_flows(status, current_step);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_status
ON estimation_flows(user_id, status);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name
ON profiles(full_name);

-- Analytics events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
ON analytics_events(session_id);

-- Workflow analytics table indexes
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_flow_created
ON workflow_analytics(flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_flow
ON workflow_analytics(user_id, flow_id);

-- Service rates table indexes
CREATE INDEX IF NOT EXISTS idx_service_rates_service_type
ON service_rates(service_type);

CREATE INDEX IF NOT EXISTS idx_service_rates_active
ON service_rates(is_active) WHERE is_active = true;

-- AI analysis results table indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_entity_type
ON ai_analysis_results(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_created
ON ai_analysis_results(created_at DESC);

-- Integration sync logs table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration
ON integration_sync_logs(integration_id, created_at DESC);

-- Composite indexes for common joins
CREATE INDEX IF NOT EXISTS idx_estimates_services_join
ON estimate_services(quote_id);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_draft_status
ON estimates(created_at DESC) WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_estimates_approved_status
ON estimates(approved_at DESC) WHERE status = 'approved';

-- Text search indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_estimates_customer_search
ON estimates USING gin(to_tsvector('english', customer_name || ' ' || COALESCE(company_name, '')));

-- Function-based indexes
CREATE INDEX IF NOT EXISTS idx_estimates_month_year
ON estimates(DATE_TRUNC('month', created_at));
```

### Step 2: Apply Performance Monitoring Migration

Also run the performance monitoring migration from `sql/migrations/18-add-performance-optimization.sql` in your Supabase SQL Editor. This adds:

- Performance monitoring tables
- Query performance tracking
- Cache performance statistics
- Automatic anomaly detection
- Performance dashboard views

### Expected Performance Improvements

**Before optimization:**

- Average query time: 127-145ms
- Slowest queries: 300ms+

**After optimization:**

- Expected average: <50ms
- Most queries: <100ms

## 🪣 Storage Buckets Setup

### Step 1: Buckets Already Created

The following buckets have been created:

- ✅ **photos** - Public, 10MB limit, for estimate photos
- ✅ **documents** - Private, 50MB limit, for PDFs and reports
- ✅ **avatars** - Public, 5MB limit, for profile pictures

### Step 2: Apply Bucket Policies

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- STORAGE BUCKET POLICIES AND HELPER FUNCTIONS
-- ============================================

-- Policy for photos bucket (public read, authenticated upload)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos'
  AND auth.uid() = owner
);

-- Policy for documents bucket (private, authenticated only)
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);

-- Policy for avatars bucket (public read, user-specific write)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Helper function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
  bucket_name TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  max_size BIGINT;
  allowed_types TEXT[];
BEGIN
  -- Set limits based on bucket
  CASE bucket_name
    WHEN 'photos' THEN
      max_size := 10485760; -- 10MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    WHEN 'documents' THEN
      max_size := 52428800; -- 50MB
      allowed_types := ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    WHEN 'avatars' THEN
      max_size := 5242880; -- 5MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png'];
    ELSE
      RETURN FALSE;
  END CASE;

  -- Check file size
  IF file_size > max_size THEN
    RETURN FALSE;
  END IF;

  -- Check mime type
  IF NOT (mime_type = ANY(allowed_types)) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_file_upload TO authenticated;
```

## 📝 Usage in Your Application

### Uploading Files

```javascript
// Upload estimate photo
const { data, error } = await supabase.storage
  .from("photos")
  .upload(`estimates/${estimateId}/${fileName}`, file);

// Upload document
const { data, error } = await supabase.storage
  .from("documents")
  .upload(`${userId}/${fileName}`, file);

// Upload avatar
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.jpg`, file);
```

### Getting Public URLs

```javascript
// Get public photo URL
const { data } = supabase.storage
  .from("photos")
  .getPublicUrl(`estimates/${estimateId}/${fileName}`);

// Get signed URL for private document (1 hour expiry)
const { data, error } = await supabase.storage
  .from("documents")
  .createSignedUrl(`${userId}/${fileName}`, 3600);
```

## 🧪 Testing Your Setup

### Test Performance Improvements

Run this query to check new performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM estimates
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 10;
```

### Test Storage Uploads

1. Try uploading a test image to the photos bucket
2. Try uploading a PDF to the documents bucket
3. Try uploading a profile picture to avatars bucket

## 🎯 Verification Checklist

- [ ] All indexes created successfully
- [ ] Performance monitoring tables created
- [ ] Average query time < 100ms
- [ ] Photos bucket allows public viewing
- [ ] Documents bucket requires authentication
- [ ] File uploads work in all buckets
- [ ] RLS policies are properly enforced

## 🛠️ Troubleshooting

### Performance Issues

- Run `ANALYZE;` to update table statistics
- Check for missing indexes with `pg_stat_user_indexes`
- Monitor slow queries in performance_logs table

### Storage Issues

- Verify bucket policies are applied
- Check file size and type restrictions
- Ensure authentication is working
- Check CORS settings if browser uploads fail

## 📊 Monitoring

After implementation, monitor:

- Query performance in `query_performance` table
- Storage usage in Supabase dashboard
- Error rates in `performance_logs` table
- Cache hit rates in `cache_performance` table

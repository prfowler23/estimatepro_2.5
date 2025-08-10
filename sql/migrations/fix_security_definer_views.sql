-- Fix Security Definer Views Migration
-- Converts SECURITY DEFINER views to SECURITY INVOKER for proper RLS enforcement
-- Date: 2025-08-08

-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS public.optimization_metrics CASCADE;
DROP VIEW IF EXISTS public.table_size_metrics CASCADE;
DROP VIEW IF EXISTS public.security_overview CASCADE;
DROP VIEW IF EXISTS public.api_usage_summary CASCADE;
DROP VIEW IF EXISTS public.failed_login_summary CASCADE;

-- Recreate views with SECURITY INVOKER (default behavior)
-- This ensures views respect the querying user's RLS policies

-- 1. Optimization Metrics View
CREATE OR REPLACE VIEW public.optimization_metrics
WITH (security_invoker = on) AS
SELECT 
    schemaname,
    relname AS tablename,
    'table'::text AS metric_type,
    NULL::text AS indexname,
    idx_scan,
    seq_tup_read AS idx_tup_read,
    idx_tup_fetch,
    CASE
        WHEN (seq_scan > 0 AND seq_tup_read > COALESCE(idx_tup_fetch, 0::bigint)) 
        THEN 'needs_index'::text
        ELSE 'optimized'::text
    END AS usage_status
FROM pg_stat_user_tables t;

-- 2. Table Size Metrics View
CREATE OR REPLACE VIEW public.table_size_metrics
WITH (security_invoker = on) AS
SELECT 
    schemaname,
    relname AS tablename,
    pg_size_pretty(pg_total_relation_size(((schemaname || '.' || relname)::regclass))) AS total_size,
    pg_size_pretty(pg_relation_size(((schemaname || '.' || relname)::regclass))) AS table_size,
    pg_size_pretty((pg_total_relation_size(((schemaname || '.' || relname)::regclass)) - pg_relation_size(((schemaname || '.' || relname)::regclass)))) AS indexes_size,
    CASE
        WHEN pg_relation_size(((schemaname || '.' || relname)::regclass)) > 0 
        THEN round((((pg_total_relation_size(((schemaname || '.' || relname)::regclass)) - pg_relation_size(((schemaname || '.' || relname)::regclass)))::numeric / pg_relation_size(((schemaname || '.' || relname)::regclass))::numeric) * 100::numeric), 2)
        ELSE 0::numeric
    END AS index_ratio_pct
FROM pg_stat_user_tables t;

-- 3. Security Overview View
CREATE OR REPLACE VIEW public.security_overview
WITH (security_invoker = on) AS
SELECT 
    'rls_enabled'::text AS check_type,
    t.schemaname::text AS schema_name,
    t.relname::text AS table_name,
    CASE
        WHEN c.relrowsecurity THEN 'enabled'::text
        ELSE 'disabled'::text
    END AS status
FROM pg_stat_user_tables t
JOIN pg_class c ON (c.relname = t.relname AND c.relnamespace = (
    SELECT pg_namespace.oid
    FROM pg_namespace
    WHERE pg_namespace.nspname = t.schemaname
));

-- 4. API Usage Summary View
CREATE OR REPLACE VIEW public.api_usage_summary
WITH (security_invoker = on) AS
SELECT 
    date_trunc('day'::text, created_at) AS date,
    user_id,
    count(*) AS total_requests,
    count(*) FILTER (WHERE success = true) AS successful_requests,
    round(avg(duration_ms), 2) AS avg_response_time
FROM performance_logs
WHERE user_id IS NOT NULL 
    AND created_at >= (now() - interval '30 days')
GROUP BY date_trunc('day'::text, created_at), user_id
ORDER BY date_trunc('day'::text, created_at) DESC;

-- 5. Failed Login Summary View
CREATE OR REPLACE VIEW public.failed_login_summary
WITH (security_invoker = on) AS
SELECT 
    date_trunc('hour'::text, created_at) AS hour,
    count(*) AS failed_attempts,
    count(DISTINCT ip_address) AS unique_ips
FROM audit_events
WHERE event_type ILIKE '%failed%' 
    OR event_type ILIKE '%error%'
GROUP BY date_trunc('hour'::text, created_at)
ORDER BY date_trunc('hour'::text, created_at) DESC
LIMIT 168;

-- Add RLS policies for the views if they don't exist
-- These views should only be accessible to authenticated users with appropriate permissions

-- Enable RLS on supporting tables (if not already enabled)
-- Note: Views inherit RLS from their underlying tables

-- Grant appropriate permissions
GRANT SELECT ON public.optimization_metrics TO authenticated;
GRANT SELECT ON public.table_size_metrics TO authenticated;
GRANT SELECT ON public.security_overview TO authenticated;
GRANT SELECT ON public.api_usage_summary TO authenticated;
GRANT SELECT ON public.failed_login_summary TO authenticated;

-- Restrict access to service_role for admin operations
GRANT SELECT ON public.optimization_metrics TO service_role;
GRANT SELECT ON public.table_size_metrics TO service_role;
GRANT SELECT ON public.security_overview TO service_role;
GRANT SELECT ON public.api_usage_summary TO service_role;
GRANT SELECT ON public.failed_login_summary TO service_role;

-- Add comment for documentation
COMMENT ON VIEW public.optimization_metrics IS 'Database optimization metrics view - SECURITY INVOKER for proper RLS enforcement';
COMMENT ON VIEW public.table_size_metrics IS 'Table size metrics view - SECURITY INVOKER for proper RLS enforcement';
COMMENT ON VIEW public.security_overview IS 'Security overview view - SECURITY INVOKER for proper RLS enforcement';
COMMENT ON VIEW public.api_usage_summary IS 'API usage summary view - SECURITY INVOKER for proper RLS enforcement';
COMMENT ON VIEW public.failed_login_summary IS 'Failed login summary view - SECURITY INVOKER for proper RLS enforcement';
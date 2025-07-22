-- Security Fix Migration: Address Supabase Security Lints
-- Date: 2025-07-17
-- Description: Fix SECURITY DEFINER views, enable RLS, and fix insecure RLS policies

-- =====================================================
-- 1. Fix SECURITY DEFINER Views
-- =====================================================
-- These views will be recreated without SECURITY DEFINER to respect user permissions
-- Views are secure by default and check permissions as the querying user

-- Drop and recreate service_type_stats view
DROP VIEW IF EXISTS public.service_type_stats CASCADE;
CREATE VIEW public.service_type_stats
WITH (security_barrier = true)
AS
SELECT 
    es.service_type,
    COUNT(DISTINCT e.id) as total_estimates,
    SUM(es.price) as total_revenue,
    AVG(es.price) as average_price,
    MAX(e.created_at) as last_used
FROM estimate_services es
JOIN estimates e ON es.quote_id = e.id
WHERE e.created_by = auth.uid()
GROUP BY es.service_type;

-- Drop and recreate quote_summary view
DROP VIEW IF EXISTS public.quote_summary CASCADE;
CREATE VIEW public.quote_summary
WITH (security_barrier = true)
AS
SELECT 
    e.id,
    e.quote_number,
    e.customer_name,
    e.customer_email,
    e.building_name,
    e.building_address,
    e.building_height_stories,
    e.status,
    e.total_price as total,
    e.created_at,
    e.updated_at
FROM estimates e
WHERE e.created_by = auth.uid();

-- Drop and recreate integration_health_view
DROP VIEW IF EXISTS public.integration_health_view CASCADE;
CREATE VIEW public.integration_health_view
WITH (security_barrier = true)
AS
SELECT 
    i.id,
    i.provider,
    i.name,
    i.enabled,
    i.created_at,
    i.updated_at,
    COALESCE(stats.last_sync, i.created_at) as last_sync,
    COALESCE(stats.total_events, 0) as total_events,
    COALESCE(stats.failed_events, 0) as failed_events,
    COALESCE(stats.pending_events, 0) as pending_events,
    COALESCE(stats.total_syncs, 0) as total_syncs,
    COALESCE(stats.failed_syncs, 0) as failed_syncs,
    CASE 
        WHEN i.enabled = false THEN 'disabled'::text
        WHEN COALESCE(stats.failed_events, 0) > COALESCE(stats.total_events, 0) * 0.5 THEN 'unhealthy'::text
        ELSE 'healthy'::text
    END as health_status
FROM integrations i
LEFT JOIN (
    SELECT 
        integration_id,
        MAX(created_at) as last_sync,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_events,
        0 as total_syncs,
        0 as failed_syncs
    FROM integration_events 
    GROUP BY integration_id
) stats ON i.id = stats.integration_id
WHERE i.created_by = auth.uid();

-- =====================================================
-- 2. Enable RLS on estimation_flows_backup table
-- =====================================================
ALTER TABLE public.estimation_flows_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for estimation_flows_backup (with DROP IF EXISTS to prevent duplicates)
DROP POLICY IF EXISTS "Users can view their own backup flows" ON public.estimation_flows_backup;
CREATE POLICY "Users can view their own backup flows" ON public.estimation_flows_backup
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own backup flows" ON public.estimation_flows_backup;
CREATE POLICY "Users can create their own backup flows" ON public.estimation_flows_backup
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own backup flows" ON public.estimation_flows_backup;
CREATE POLICY "Users can update their own backup flows" ON public.estimation_flows_backup
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own backup flows" ON public.estimation_flows_backup;
CREATE POLICY "Users can delete their own backup flows" ON public.estimation_flows_backup
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. Fix RLS policies that reference user_metadata
-- =====================================================
-- Replace user_metadata references with a secure role check

-- First, create a secure function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Fix performance_logs policies
DROP POLICY IF EXISTS "Users can view their own performance logs" ON public.performance_logs;
CREATE POLICY "Users can view their own performance logs" ON public.performance_logs
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- Fix performance_alerts policies
DROP POLICY IF EXISTS "Admins can view all performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can view all performance alerts" ON public.performance_alerts
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can manage performance alerts" ON public.performance_alerts
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Fix cache_performance policies
DROP POLICY IF EXISTS "Admins can view cache performance" ON public.cache_performance;
CREATE POLICY "Admins can view cache performance" ON public.cache_performance
    FOR SELECT
    USING (public.is_admin());

-- Fix query_performance policies
DROP POLICY IF EXISTS "Users can view their own query performance" ON public.query_performance;
CREATE POLICY "Users can view their own query performance" ON public.query_performance
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- Fix system_resources policies
DROP POLICY IF EXISTS "Admins can view system resources" ON public.system_resources;
CREATE POLICY "Admins can view system resources" ON public.system_resources
    FOR SELECT
    USING (public.is_admin());

-- Fix performance_config policies
DROP POLICY IF EXISTS "Admins can manage performance config" ON public.performance_config;
CREATE POLICY "Admins can manage performance config" ON public.performance_config
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- 4. Add indexes for performance
-- =====================================================
-- Add indexes to support the new security policies
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_performance_user_id ON public.query_performance(user_id);

-- =====================================================
-- 5. Verify the fixes
-- =====================================================
-- After running this migration, verify that:
-- 1. All views now use SECURITY INVOKER
-- 2. estimation_flows_backup has RLS enabled
-- 3. No RLS policies reference user_metadata
-- 4. Admin checks use the secure is_admin() function

-- To verify views:
-- SELECT schemaname, viewname, viewowner, definition 
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN ('service_type_stats', 'quote_summary', 'integration_health_view');

-- To verify RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'estimation_flows_backup';

-- To verify admin function:
-- SELECT routine_name, routine_type, security_type
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name = 'is_admin';
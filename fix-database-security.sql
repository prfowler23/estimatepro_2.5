-- Database Security Fixes for Supabase Linter Issues
-- This script addresses all security vulnerabilities identified by Supabase linter

-- =======================
-- 1. Fix Security Definer Views
-- =======================

-- Drop problematic views that use SECURITY DEFINER
DROP VIEW IF EXISTS public.service_type_stats;
DROP VIEW IF EXISTS public.quote_summary;
DROP VIEW IF EXISTS public.integration_health_view;

-- Create secure functions instead of views
-- These functions respect RLS and user permissions

-- Replace service_type_stats view with secure function
CREATE OR REPLACE FUNCTION get_service_type_stats()
RETURNS TABLE (
    service_type TEXT,
    count BIGINT,
    avg_price NUMERIC,
    total_revenue NUMERIC
) 
SECURITY INVOKER  -- Uses caller's permissions, not definer's
LANGUAGE sql
AS $$
    SELECT 
        s.service_type,
        COUNT(*) as count,
        AVG(s.price) as avg_price,
        SUM(s.price) as total_revenue
    FROM estimate_services s
    JOIN estimates e ON s.quote_id = e.id  -- Fixed: quote_id is the actual column name
    WHERE e.created_by = auth.uid()  -- Only user's own data
    GROUP BY s.service_type;
$$;

-- Replace quote_summary view with secure function
CREATE OR REPLACE FUNCTION get_quote_summary()
RETURNS TABLE (
    id UUID,
    customer_name TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
SECURITY INVOKER
LANGUAGE sql
AS $$
    SELECT 
        e.id,
        e.customer_name,
        COALESCE(SUM(es.price), 0) as total_amount,
        e.status,
        e.created_at,
        e.updated_at
    FROM estimates e
    LEFT JOIN estimate_services es ON e.id = es.quote_id  -- Fixed: quote_id is the actual column name
    WHERE e.created_by = auth.uid()  -- Only user's own quotes
    GROUP BY e.id, e.customer_name, e.status, e.created_at, e.updated_at;
$$;

-- Replace integration_health_view with secure function (admin only)
CREATE OR REPLACE FUNCTION get_integration_health()
RETURNS TABLE (
    integration_name TEXT,
    status TEXT,
    last_sync TIMESTAMPTZ,
    error_count BIGINT,
    health_score NUMERIC
)
SECURITY INVOKER
LANGUAGE sql
AS $$
    SELECT 
        i.name as integration_name,
        i.status,
        i.last_sync,
        COALESCE(COUNT(il.id) FILTER (WHERE il.level = 'ERROR'), 0) as error_count,
        CASE 
            WHEN i.status = 'active' AND COALESCE(COUNT(il.id) FILTER (WHERE il.level = 'ERROR'), 0) = 0 THEN 100
            WHEN i.status = 'active' THEN 75
            ELSE 0
        END as health_score
    FROM integrations i
    LEFT JOIN integration_logs il ON i.id = il.integration_id 
        AND il.created_at > NOW() - INTERVAL '24 hours'
    WHERE EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )  -- Admin only access
    GROUP BY i.id, i.name, i.status, i.last_sync;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_service_type_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_quote_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_integration_health() TO authenticated;

-- =======================
-- 2. Enable RLS on Missing Table
-- =======================

-- Enable RLS on estimation_flows_backup table
ALTER TABLE public.estimation_flows_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for estimation_flows_backup
CREATE POLICY "Users can access their own estimation flow backups"
    ON public.estimation_flows_backup
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- =======================
-- 3. Fix RLS Policies Using user_metadata
-- =======================

-- Fix performance_logs RLS policy
DROP POLICY IF EXISTS "Users can view their own performance logs" ON public.performance_logs;
CREATE POLICY "Users can view their own performance logs"
    ON public.performance_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Fix performance_alerts RLS policies
DROP POLICY IF EXISTS "Admins can view all performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can view all performance alerts"
    ON public.performance_alerts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can manage performance alerts"
    ON public.performance_alerts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Fix cache_performance RLS policy
DROP POLICY IF EXISTS "Admins can view cache performance" ON public.cache_performance;
CREATE POLICY "Admins can view cache performance"
    ON public.cache_performance
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Fix query_performance RLS policy
DROP POLICY IF EXISTS "Users can view their own query performance" ON public.query_performance;
CREATE POLICY "Users can view their own query performance"
    ON public.query_performance
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Fix system_resources RLS policy
DROP POLICY IF EXISTS "Admins can view system resources" ON public.system_resources;
CREATE POLICY "Admins can view system resources"
    ON public.system_resources
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Fix performance_config RLS policy
DROP POLICY IF EXISTS "Admins can manage performance config" ON public.performance_config;
CREATE POLICY "Admins can manage performance config"
    ON public.performance_config
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =======================
-- 4. Additional Security Improvements
-- =======================

-- Ensure all tables have RLS enabled
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Add comprehensive RLS policies if they don't exist
DO $$
BEGIN
    -- Estimates policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimates' AND policyname = 'Users can manage their own estimates') THEN
        CREATE POLICY "Users can manage their own estimates"
            ON public.estimates
            FOR ALL
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;

    -- Estimate services policies  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimate_services' AND policyname = 'Users can manage their estimate services') THEN
        CREATE POLICY "Users can manage their estimate services"
            ON public.estimate_services
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM estimates 
                    WHERE estimates.id = estimate_services.quote_id 
                    AND estimates.created_by = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM estimates 
                    WHERE estimates.id = estimate_services.quote_id 
                    AND estimates.created_by = auth.uid()
                )
            );
    END IF;

    -- Estimation flows policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'estimation_flows' AND policyname = 'Users can manage their own flows') THEN
        CREATE POLICY "Users can manage their own flows"
            ON public.estimation_flows
            FOR ALL
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;

    -- Measurements policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'measurements' AND policyname = 'Users can manage their measurements') THEN
        CREATE POLICY "Users can manage their measurements"
            ON public.measurements
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM estimates 
                    WHERE estimates.id = measurements.estimate_id 
                    AND estimates.created_by = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM estimates 
                    WHERE estimates.id = measurements.estimate_id 
                    AND estimates.created_by = auth.uid()
                )
            );
    END IF;

    -- Analytics events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Users can manage their analytics') THEN
        CREATE POLICY "Users can manage their analytics"
            ON public.analytics_events
            FOR ALL
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;
END $$;

-- =======================
-- Security Verification
-- =======================

-- Create a function to verify security fixes
CREATE OR REPLACE FUNCTION verify_security_fixes()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if problematic views are removed
    RETURN QUERY
    SELECT 
        'Security Definer Views'::TEXT,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name IN ('service_type_stats', 'quote_summary', 'integration_health_view')) 
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'Problematic SECURITY DEFINER views removed'::TEXT;

    -- Check if RLS is enabled on estimation_flows_backup
    RETURN QUERY
    SELECT 
        'RLS on estimation_flows_backup'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'estimation_flows_backup' AND rowsecurity = true)
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'RLS enabled on estimation_flows_backup table'::TEXT;

    -- Check if user_metadata references are removed from RLS policies
    RETURN QUERY
    SELECT 
        'user_metadata in RLS'::TEXT,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE definition LIKE '%user_metadata%'
            )
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'No RLS policies reference user_metadata'::TEXT;

    -- Check if secure functions exist
    RETURN QUERY
    SELECT 
        'Secure Functions Created'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name IN ('get_service_type_stats', 'get_quote_summary', 'get_integration_health'))
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'Secure replacement functions created'::TEXT;
END $$;

GRANT EXECUTE ON FUNCTION verify_security_fixes() TO authenticated;

-- Run verification
SELECT * FROM verify_security_fixes();

COMMENT ON FUNCTION verify_security_fixes() IS 'Verifies that all database security fixes have been applied correctly';
COMMENT ON FUNCTION get_service_type_stats() IS 'Secure replacement for service_type_stats view - respects user permissions';
COMMENT ON FUNCTION get_quote_summary() IS 'Secure replacement for quote_summary view - user-specific data only';
COMMENT ON FUNCTION get_integration_health() IS 'Secure replacement for integration_health_view - admin access only';
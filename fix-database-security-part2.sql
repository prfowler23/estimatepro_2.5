-- EstimatePro Database Security Fixes - Part 2
-- RLS Fixes and Policies

-- ===========================================
-- PART 3: Enable RLS on Missing Table
-- ===========================================

ALTER TABLE public.estimation_flows_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own estimation flow backups"
    ON public.estimation_flows_backup
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- ===========================================
-- PART 4: Fix RLS Policies Using user_metadata
-- ===========================================

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
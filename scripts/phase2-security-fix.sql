[dotenv@17.2.0] injecting env (15) from .env.local (tip: 🔐 encrypt with dotenvx: https://dotenvx.com)
-- Supabase Security Migration SQL
-- Run these commands in the Supabase SQL Editor
-- ==================================
-- Phase: 2
-- Migrations to include: 1

-- ========================================
-- Fix SECURITY DEFINER views (Critical)
-- From: 20250124_fix_security_definer_views.sql
-- ========================================

-- Fix SECURITY DEFINER Views (Security Fix)
-- These views currently have SECURITY DEFINER which bypasses RLS policies
-- We need to recreate them without SECURITY DEFINER to respect row-level security

-- Drop and recreate service_type_stats view without SECURITY DEFINER
DROP VIEW IF EXISTS public.service_type_stats CASCADE;
CREATE VIEW public.service_type_stats AS
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

-- Drop and recreate quote_summary view without SECURITY DEFINER
DROP VIEW IF EXISTS public.quote_summary CASCADE;
CREATE VIEW public.quote_summary AS
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

-- Drop and recreate integration_health_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.integration_health_view CASCADE;
CREATE VIEW public.integration_health_view AS
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

-- Grant appropriate permissions to the views
GRANT SELECT ON public.service_type_stats TO authenticated;
GRANT SELECT ON public.quote_summary TO authenticated;
GRANT SELECT ON public.integration_health_view TO authenticated;

-- ========================================
-- End of migration script
-- ========================================

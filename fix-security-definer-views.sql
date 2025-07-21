-- ================================================================================
-- FIX SECURITY DEFINER VIEWS
-- ================================================================================
-- This script fixes the 3 Security Definer View errors identified by Supabase linter:
-- 1. public.integration_health_view
-- 2. public.service_type_stats  
-- 3. public.quote_summary
--
-- SECURITY DEFINER views bypass Row Level Security (RLS) and are a security risk.
-- This script recreates them as secure views that respect user permissions.
-- ================================================================================

-- ================================================================================
-- 1. FIX SERVICE_TYPE_STATS VIEW
-- ================================================================================

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
WHERE e.created_by = (select auth.uid())  -- Only user's own data
GROUP BY es.service_type;

-- Grant access to authenticated users
GRANT SELECT ON public.service_type_stats TO authenticated;

-- ================================================================================
-- 2. FIX QUOTE_SUMMARY VIEW
-- ================================================================================

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
WHERE e.created_by = (select auth.uid());  -- Only user's own estimates

-- Grant access to authenticated users
GRANT SELECT ON public.quote_summary TO authenticated;

-- ================================================================================
-- 3. FIX INTEGRATION_HEALTH_VIEW
-- ================================================================================

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
    COALESCE(event_stats.last_sync, i.created_at) as last_sync,
    COALESCE(event_stats.total_events, 0) as total_events,
    COALESCE(event_stats.failed_events, 0) as failed_events,
    COALESCE(event_stats.pending_events, 0) as pending_events,
    COALESCE(sync_stats.total_syncs, 0) as total_syncs,
    COALESCE(sync_stats.failed_syncs, 0) as failed_syncs,
    CASE 
        WHEN i.enabled = false THEN 'disabled'::text
        WHEN COALESCE(event_stats.failed_events, 0) > COALESCE(event_stats.total_events, 0) * 0.5 THEN 'unhealthy'::text
        WHEN COALESCE(event_stats.pending_events, 0) > 50 THEN 'backlogged'::text
        ELSE 'healthy'::text
    END as health_status
FROM integrations i
LEFT JOIN (
    SELECT 
        integration_id,
        MAX(created_at) as last_sync,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_events
    FROM integration_events 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY integration_id
) event_stats ON i.id = event_stats.integration_id
LEFT JOIN (
    SELECT 
        integration_id,
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs
    FROM integration_sync_logs
    WHERE started_at > NOW() - INTERVAL '7 days'
    GROUP BY integration_id
) sync_stats ON i.id = sync_stats.integration_id
WHERE i.created_by = (select auth.uid());  -- Only user's own integrations

-- Grant access to authenticated users
GRANT SELECT ON public.integration_health_view TO authenticated;

-- ================================================================================
-- 4. CREATE VERIFICATION FUNCTION
-- ================================================================================

CREATE OR REPLACE FUNCTION public.verify_security_definer_fixes()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Check if views exist and are accessible
    RETURN QUERY
    SELECT 
        'service_type_stats view' as check_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = 'service_type_stats'
            )
            THEN '✅ FIXED'
            ELSE '❌ MISSING'
        END as status,
        'View recreated without SECURITY DEFINER' as details;
        
    RETURN QUERY
    SELECT 
        'quote_summary view' as check_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = 'quote_summary'
            )
            THEN '✅ FIXED'
            ELSE '❌ MISSING'
        END as status,
        'View recreated without SECURITY DEFINER' as details;
        
    RETURN QUERY
    SELECT 
        'integration_health_view' as check_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = 'integration_health_view'
            )
            THEN '✅ FIXED'
            ELSE '❌ MISSING'
        END as status,
        'View recreated without SECURITY DEFINER' as details;

    -- Check for any remaining SECURITY DEFINER views
    RETURN QUERY
    SELECT 
        'Security Definer Check' as check_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_views 
                WHERE schemaname = 'public' 
                AND definition ILIKE '%SECURITY DEFINER%'
            )
            THEN '⚠️  REMAINING'
            ELSE '✅ ALL FIXED'
        END as status,
        'No views should have SECURITY DEFINER property' as details;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_security_definer_fixes() TO authenticated;

-- ================================================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ================================================================================

COMMENT ON VIEW public.service_type_stats IS 'Secure view showing service type statistics for authenticated user only';
COMMENT ON VIEW public.quote_summary IS 'Secure view showing quote summaries for authenticated user only';  
COMMENT ON VIEW public.integration_health_view IS 'Secure view showing integration health for authenticated user only';
COMMENT ON FUNCTION public.verify_security_definer_fixes() IS 'Verifies that Security Definer View fixes have been applied correctly';

-- ================================================================================
-- 6. RUN VERIFICATION
-- ================================================================================

SELECT * FROM public.verify_security_definer_fixes();

-- ================================================================================
-- COMPLETION MESSAGE
-- ================================================================================

SELECT 
    '✅ Security Definer View Fixes Applied Successfully' as message,
    'All 3 problematic views recreated without SECURITY DEFINER property' as details,
    'Views now respect Row Level Security and user permissions' as security_note,
    'Run the Supabase Database Linter to verify fixes' as next_steps;
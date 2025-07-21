-- Fix SECURITY DEFINER Views
-- This script recreates the 3 problematic views without SECURITY DEFINER

-- Fix 1: service_type_stats view
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

-- Fix 2: quote_summary view
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

-- Fix 3: integration_health_view
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
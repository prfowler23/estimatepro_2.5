-- EstimatePro Database Security Fixes
-- Run each section separately in Supabase SQL Editor

-- ===========================================
-- PART 1: Remove Security Definer Views
-- ===========================================

DROP VIEW IF EXISTS public.service_type_stats;
DROP VIEW IF EXISTS public.quote_summary;
DROP VIEW IF EXISTS public.integration_health_view;

-- ===========================================
-- PART 2: Create Secure Functions
-- ===========================================

CREATE OR REPLACE FUNCTION get_service_type_stats()
RETURNS TABLE (
    service_type TEXT,
    count BIGINT,
    avg_price NUMERIC,
    total_revenue NUMERIC
) 
SECURITY INVOKER
LANGUAGE sql
AS $$
    SELECT 
        s.service_type,
        COUNT(*) as count,
        AVG(s.price) as avg_price,
        SUM(s.price) as total_revenue
    FROM estimate_services s
    JOIN estimates e ON s.quote_id = e.id
    WHERE e.created_by = auth.uid()
    GROUP BY s.service_type;
$$;

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
    LEFT JOIN estimate_services es ON e.id = es.quote_id
    WHERE e.created_by = auth.uid()
    GROUP BY e.id, e.customer_name, e.status, e.created_at, e.updated_at;
$$;

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
    )
    GROUP BY i.id, i.name, i.status, i.last_sync;
$$;

GRANT EXECUTE ON FUNCTION get_service_type_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_quote_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_integration_health() TO authenticated;
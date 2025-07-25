-- Optimized SQL functions for complex analytics queries
-- Run this in Supabase SQL Editor after deploying indexes

-- Monthly revenue aggregation function
CREATE OR REPLACE FUNCTION get_monthly_revenue_optimized(months_back INTEGER DEFAULT 12)
RETURNS TABLE(
  month TEXT,
  revenue NUMERIC,
  estimates INTEGER,
  avg_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(date_trunc('month', e.created_at), 'Mon YYYY') as month,
    COALESCE(SUM(e.total_price), 0) as revenue,
    COUNT(*)::INTEGER as estimates,
    COALESCE(AVG(e.total_price), 0) as avg_value
  FROM estimates e
  WHERE e.status = 'approved'
    AND e.created_at >= (CURRENT_DATE - INTERVAL '1 month' * months_back)
  GROUP BY date_trunc('month', e.created_at)
  ORDER BY date_trunc('month', e.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Service metrics aggregation function
CREATE OR REPLACE FUNCTION get_service_metrics_optimized()
RETURNS TABLE(
  service_type TEXT,
  total_quotes INTEGER,
  approved_quotes INTEGER,
  total_revenue NUMERIC,
  avg_price NUMERIC,
  avg_hours NUMERIC,
  conversion_rate NUMERIC,
  monthly_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH service_stats AS (
    SELECT 
      es.service_type,
      COUNT(*) as total_quotes,
      COUNT(*) FILTER (WHERE e.status = 'approved') as approved_quotes,
      COALESCE(SUM(es.price) FILTER (WHERE e.status = 'approved'), 0) as total_revenue,
      COALESCE(AVG(es.price) FILTER (WHERE e.status = 'approved'), 0) as avg_price,
      COALESCE(AVG(es.total_hours), 0) as avg_hours,
      COUNT(*) FILTER (WHERE e.created_at >= date_trunc('month', CURRENT_DATE) AND e.status = 'approved') as current_month_approved,
      COUNT(*) FILTER (WHERE e.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
                          AND e.created_at < date_trunc('month', CURRENT_DATE) 
                          AND e.status = 'approved') as last_month_approved
    FROM estimate_services es
    JOIN estimates e ON es.estimate_id = e.id
    GROUP BY es.service_type
  )
  SELECT 
    ss.service_type,
    ss.total_quotes,
    ss.approved_quotes,
    ss.total_revenue,
    ss.avg_price,
    ss.avg_hours,
    CASE 
      WHEN ss.total_quotes > 0 THEN (ss.approved_quotes::NUMERIC / ss.total_quotes * 100)
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN ss.last_month_approved > 0 THEN 
        ((ss.current_month_approved - ss.last_month_approved)::NUMERIC / ss.last_month_approved * 100)
      ELSE 0 
    END as monthly_growth
  FROM service_stats ss
  ORDER BY ss.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Full-text search function
CREATE OR REPLACE FUNCTION full_text_search_estimates(
  search_query TEXT,
  status_filter TEXT DEFAULT NULL,
  user_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  quote_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  company_name TEXT,
  building_name TEXT,
  building_address TEXT,
  total_price NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.quote_number,
    e.customer_name,
    e.customer_email,
    e.company_name,
    e.building_name,
    e.building_address,
    e.total_price,
    e.status,
    e.created_at,
    ts_rank(
      to_tsvector('english', 
        coalesce(e.customer_name, '') || ' ' || 
        coalesce(e.company_name, '') || ' ' || 
        coalesce(e.building_name, '') || ' ' || 
        coalesce(e.building_address, '') || ' ' ||
        coalesce(e.quote_number, '')
      ),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM estimates e
  WHERE to_tsvector('english', 
          coalesce(e.customer_name, '') || ' ' || 
          coalesce(e.company_name, '') || ' ' || 
          coalesce(e.building_name, '') || ' ' || 
          coalesce(e.building_address, '') || ' ' ||
          coalesce(e.quote_number, '')
        ) @@ plainto_tsquery('english', search_query)
    AND (status_filter IS NULL OR e.status = status_filter)
    AND (user_id_filter IS NULL OR e.created_by = user_id_filter)
  ORDER BY rank DESC, e.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
-- Performance-optimized database indexes for query optimization
-- Run this in Supabase SQL Editor to improve query performance

-- Core estimates table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_status_date 
ON estimates(created_by, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_status_date 
ON estimates(status, created_at DESC) WHERE status IN ('approved', 'sent', 'rejected');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_date_range 
ON estimates USING BRIN(created_at) WITH (pages_per_range = 128);

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_fulltext 
ON estimates USING gin(
  to_tsvector('english', 
    coalesce(customer_name, '') || ' ' || 
    coalesce(company_name, '') || ' ' || 
    coalesce(building_name, '') || ' ' || 
    coalesce(building_address, '') || ' ' ||
    coalesce(quote_number, '')
  )
);

-- Estimate services indexes for joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_type 
ON estimate_services(estimate_id, service_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_type_price 
ON estimate_services(service_type, price DESC) WHERE price > 0;

-- Analytics optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_monthly_revenue 
ON estimates(date_trunc('month', created_at), status, total_price) 
WHERE status = 'approved';

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_user_search 
ON estimates(created_by, customer_name, building_name) 
WHERE status != 'draft';

-- Partial indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_active 
ON estimates(status, updated_at DESC) 
WHERE status IN ('sent', 'approved');

-- Statistics optimization
ANALYZE estimates;
ANALYZE estimate_services;
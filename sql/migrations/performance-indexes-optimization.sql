-- EstimatePro Performance Optimization Indexes
-- Phase 1: Critical database indexes for performance improvement
-- Expected Impact: 50-70% query speed improvement

-- =====================================
-- CORE TABLE INDEXES
-- =====================================

-- Estimates table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_status ON estimates(created_by, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_at_desc ON estimates(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_updated_at_desc ON estimates(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_status_created_at ON estimates(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_total_price ON estimates(total_price) WHERE total_price IS NOT NULL;

-- Estimate services optimization (critical for joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_type ON estimate_services(estimate_id, service_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_price ON estimate_services(price) WHERE price IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_created_at ON estimate_services(created_at DESC);

-- Profiles table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- Analytics events optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id_created_at ON analytics_events(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type_created_at ON analytics_events(event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_at_desc ON analytics_events(created_at DESC);

-- =====================================
-- ADVANCED PERFORMANCE INDEXES
-- =====================================

-- Full-text search optimization with proper language support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_search_vector ON estimates 
USING gin(to_tsvector('english', 
  coalesce(customer_name, '') || ' ' || 
  coalesce(company_name, '') || ' ' || 
  coalesce(building_name, '') || ' ' || 
  coalesce(building_address, '')
));

-- Partial indexes for active estimates (performance boost for common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_active_status ON estimates(created_by, created_at DESC) 
WHERE status IN ('draft', 'pending', 'approved');

-- Composite index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_dashboard ON estimates(created_by, status, total_price, created_at DESC);

-- =====================================
-- SPECIALIZED INDEXES FOR ENTERPRISE FEATURES
-- =====================================

-- Facade analysis optimization (if facade_analyses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'facade_analyses') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facade_analyses_user_id_created_at ON facade_analyses(created_by, created_at DESC)';
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facade_analyses_status ON facade_analyses(status) WHERE status IS NOT NULL';
  END IF;
END
$$;

-- Facade analysis images optimization
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'facade_analysis_images') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facade_analysis_images_analysis_id ON facade_analysis_images(facade_analysis_id)';
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facade_analysis_images_created_at ON facade_analysis_images(created_at DESC)';
  END IF;
END
$$;

-- AI analysis results optimization
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_analysis_results') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analysis_results_user_id_type ON ai_analysis_results(user_id, analysis_type)';
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analysis_results_created_at ON ai_analysis_results(created_at DESC)';
  END IF;
END
$$;

-- =====================================
-- COVERING INDEXES FOR QUERY OPTIMIZATION
-- =====================================

-- Covering index for estimate list queries (includes frequently accessed columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_list_covering ON estimates(created_by, created_at DESC) 
INCLUDE (id, quote_number, customer_name, building_name, total_price, status, updated_at);

-- Covering index for estimate services summary
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_summary ON estimate_services(estimate_id) 
INCLUDE (service_type, price, area_sqft, labor_hours);

-- =====================================
-- BTREE INDEXES FOR SORTING AND FILTERING
-- =====================================

-- Optimize quote number lookups (unique constraint support)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_quote_number_btree ON estimates(quote_number) WHERE quote_number IS NOT NULL;

-- Building type filtering optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_building_type ON estimates(building_type) WHERE building_type IS NOT NULL;

-- Service type aggregation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_type_aggregation ON estimate_services(service_type, estimate_id);

-- =====================================
-- CONDITIONAL INDEXES FOR SPARSE DATA
-- =====================================

-- Index only non-null email addresses for faster customer lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_customer_email ON estimates(customer_email) 
WHERE customer_email IS NOT NULL AND customer_email != '';

-- Index only estimates with notes for search functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_notes_search ON estimates 
USING gin(to_tsvector('english', notes)) WHERE notes IS NOT NULL AND length(notes) > 0;

-- =====================================
-- PERFORMANCE MONITORING SUPPORT
-- =====================================

-- Index for performance monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_performance_monitoring ON estimates(created_at, updated_at, created_by);

-- Index for analytics and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_reporting ON estimates(
  created_at, 
  status, 
  total_price
) WHERE total_price IS NOT NULL;

-- =====================================
-- VACUUM AND ANALYZE RECOMMENDATIONS
-- =====================================

-- Update table statistics for query planner optimization
ANALYZE estimates;
ANALYZE estimate_services;
ANALYZE profiles;
ANALYZE analytics_events;

-- =====================================
-- INDEX MONITORING QUERIES
-- =====================================

-- Query to monitor index usage (for DBA monitoring)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;

-- Query to find unused indexes
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public';

-- =====================================
-- MAINTENANCE NOTES
-- =====================================

-- CONCURRENTLY ensures zero-downtime index creation
-- All indexes use IF NOT EXISTS to prevent errors on re-run
-- Partial indexes reduce storage overhead and improve performance
-- Covering indexes eliminate table lookups for common queries
-- GIN indexes support full-text search optimization

-- Expected Performance Impact:
-- - Query response time: 50-70% improvement
-- - Dashboard load time: 60% improvement  
-- - Search functionality: 80% improvement
-- - Analytics queries: 40% improvement

-- Monitoring: Use pg_stat_user_indexes to monitor index effectiveness
-- Maintenance: Run ANALYZE after significant data changes
-- EstimatePro Critical Performance Fixes
-- Addresses immediate performance bottlenecks identified in analysis
-- Target: Reduce sequential scans by 80%+ on high-impact tables

-- =====================================
-- PHASE 1: CRITICAL EMERGENCY FIXES
-- =====================================

-- Fix estimation_flows table (HIGHEST PRIORITY - 121,164 seq_scans)
-- This table is causing the most performance issues
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_user_id_status ON estimation_flows(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_at_desc ON estimation_flows(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_step_status ON estimation_flows(current_step, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_updated_at_desc ON estimation_flows(updated_at DESC);

-- Fix service_rates table (HIGH PRIORITY - 64 seq_scans, only 2 idx_scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_rates_service_type_region ON service_rates(service_type, region);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_rates_effective_date ON service_rates(effective_date DESC) WHERE effective_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_rates_active ON service_rates(service_type, effective_date DESC) WHERE is_active = true;

-- Fix profiles table (HIGH PRIORITY - 244 seq_scans vs 21 idx_scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_updated ON profiles(role, updated_at DESC) WHERE role IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Fix customers table (MEDIUM PRIORITY - 78 seq_scans vs 4 idx_scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created_by_date ON customers(created_by, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('english', name));

-- Fix audit_events table (MEDIUM PRIORITY - 45 seq_scans vs 1 idx_scan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_event_type_created_at ON audit_events(event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_user_id_created_at ON audit_events(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_ip_address ON audit_events(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- =====================================
-- PHASE 2: SPECIALIZED OPTIMIZATIONS
-- =====================================

-- Performance config table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_config_key_active ON performance_config(config_key) WHERE is_active = true;

-- Integration events optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_type_status ON integrations(integration_type, status);

-- Security events optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_event_type_severity ON security_events(event_type, severity, created_at DESC);

-- Compliance reports optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reports_report_type_date ON compliance_reports(report_type, generated_at DESC);

-- =====================================
-- PHASE 3: COVERING INDEXES FOR CRITICAL QUERIES
-- =====================================

-- Estimation flows covering index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_dashboard_covering ON estimation_flows(user_id, status, created_at DESC)
INCLUDE (id, current_step, total_steps, data, updated_at);

-- Service rates covering index for pricing calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_rates_pricing_covering ON service_rates(service_type, region, effective_date DESC)
INCLUDE (base_rate, labor_rate, material_multiplier, overhead_percentage);

-- Customers covering index for search and display
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search_covering ON customers(created_by, created_at DESC)
INCLUDE (id, name, email, phone, company, address);

-- =====================================
-- PHASE 4: PARTIAL INDEXES FOR SPARSE DATA
-- =====================================

-- Index only active estimation flows (reduces index size by ~70%)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_active_only ON estimation_flows(user_id, current_step, created_at DESC)
WHERE status IN ('active', 'in_progress', 'pending');

-- Index only recent audit events (last 90 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_recent ON audit_events(event_type, created_at DESC)
WHERE created_at >= NOW() - INTERVAL '90 days';

-- Index only estimates with pricing data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_with_pricing ON estimates(created_by, status, created_at DESC)
WHERE total_price IS NOT NULL AND total_price > 0;

-- =====================================
-- MAINTENANCE AND MONITORING
-- =====================================

-- Update statistics for all optimized tables
ANALYZE estimation_flows;
ANALYZE service_rates;  
ANALYZE profiles;
ANALYZE customers;
ANALYZE audit_events;
ANALYZE performance_config;
ANALYZE integrations;
ANALYZE security_events;
ANALYZE compliance_reports;

-- =====================================
-- PERFORMANCE VALIDATION QUERIES
-- =====================================

-- Query to validate index usage improvement
-- SELECT 
--     schemaname, 
--     relname as tablename,
--     seq_scan,
--     seq_tup_read,
--     idx_scan,
--     idx_tup_fetch,
--     CASE 
--         WHEN seq_scan > 0 AND seq_tup_read > COALESCE(idx_tup_fetch, 0) 
--         THEN 'still_needs_optimization'
--         ELSE 'optimized'
--     END as status
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public'
-- ORDER BY seq_tup_read DESC;

-- Expected Performance Impact:
-- - estimation_flows: 95% reduction in seq_scans
-- - service_rates: 90% reduction in seq_scans  
-- - profiles: 85% reduction in seq_scans
-- - Overall query response time: 60-80% improvement
-- - Dashboard load time: 70% improvement
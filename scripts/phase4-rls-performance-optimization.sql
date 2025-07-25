-- Phase 4: RLS Performance Optimization and Index Cleanup
-- This migration addresses the RLS performance issues and duplicate indexes identified in the audit
-- Note: CREATE INDEX CONCURRENTLY cannot run inside transactions, so each operation is separate

-- Drop duplicate indexes identified in the audit
-- These were found to be exact duplicates causing unnecessary overhead

-- Check if duplicate indexes exist before dropping them
DROP INDEX IF EXISTS idx_estimates_user_id_duplicate;
DROP INDEX IF EXISTS idx_estimate_services_estimate_id_duplicate;
DROP INDEX IF EXISTS idx_profiles_auth_user_id_duplicate;

-- Optimize RLS policies for better performance
-- Add composite indexes to support RLS filtering

-- Estimates table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_status_created_at 
ON estimates (created_by, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_updated_at 
ON estimates (created_by, updated_at DESC);

-- Estimate services table optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_service_type 
ON estimate_services (estimate_id, service_type);

-- Profiles table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_user_id_active 
ON profiles (auth_user_id) WHERE active = true;

-- Analytics events table optimization (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id_created_at 
        ON analytics_events (user_id, created_at DESC);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type_created_at 
        ON analytics_events (event_type, created_at DESC);
    END IF;
END $$;

-- Estimation flows table optimization (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_status 
        ON estimation_flows (created_by, status);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_updated_at 
        ON estimation_flows (created_by, updated_at DESC);
    END IF;
END $$;

-- Add missing foreign key indexes for better join performance
-- These support the relationships but may be missing optimized indexes

-- Foreign key support for estimate_services -> estimates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_btree 
ON estimate_services USING btree (estimate_id);

-- Foreign key support for profiles -> auth.users  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_user_id_btree 
ON profiles USING btree (auth_user_id);

-- Optimize RLS policy performance by adding partial indexes for common queries

-- Index for active estimates only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_active_by_user 
ON estimates (created_by, created_at DESC) 
WHERE status IN ('draft', 'sent');

-- Index for recent estimates (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_recent_by_user 
ON estimates (created_by, created_at DESC) 
WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- Update table statistics to help query planner
ANALYZE estimates;
ANALYZE estimate_services;
ANALYZE profiles;

-- Analyze analytics_events if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ANALYZE analytics_events;
    END IF;
END $$;

-- Analyze estimation_flows if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows') THEN
        ANALYZE estimation_flows;
    END IF;
END $$;

-- Log the completion (run this separately if audit_log table exists)
-- INSERT INTO audit_log (event_type, table_name, details, created_at)
-- VALUES (
--     'migration_applied',
--     'multiple',
--     '{"migration": "phase4-rls-performance-optimization", "description": "Applied RLS performance optimizations and index cleanup", "indexes_added": 12, "duplicate_indexes_removed": 3}',
--     NOW()
-- ) ON CONFLICT DO NOTHING;

-- Performance verification queries (run these after migration to verify improvements)
-- 
-- Query 1: Check for remaining duplicate indexes
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;
--
-- Query 2: Verify RLS policy performance 
-- EXPLAIN ANALYZE SELECT * FROM estimates WHERE created_by = auth.uid() LIMIT 10;
--
-- Query 3: Check index usage
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_tup_read DESC;
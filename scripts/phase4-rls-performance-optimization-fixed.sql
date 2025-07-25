-- Phase 4: RLS Performance Optimization and Index Cleanup (FIXED VERSION)
-- This migration addresses the RLS performance issues and duplicate indexes identified in the audit
-- FIXED: Separated transaction-dependent operations from CREATE INDEX CONCURRENTLY operations

-- Step 1: Drop duplicate indexes (these can be dropped without CONCURRENTLY)
-- These were found to be exact duplicates causing unnecessary overhead
DROP INDEX IF EXISTS idx_estimates_user_id_duplicate;
DROP INDEX IF EXISTS idx_estimate_services_estimate_id_duplicate;
DROP INDEX IF EXISTS idx_profiles_auth_user_id_duplicate;

-- Step 2: Create all concurrent indexes (NO TRANSACTIONS, each runs independently)
-- Optimize RLS policies for better performance with composite indexes to support RLS filtering

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

-- Step 3: Handle optional tables with conditional index creation (REQUIRES TRANSACTIONS)
-- Analytics events table optimization (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        -- Note: These will need to be run separately if the table exists
        -- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id_created_at 
        -- ON analytics_events (user_id, created_at DESC);
        
        -- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type_created_at 
        -- ON analytics_events (event_type, created_at DESC);
        
        -- For now, we'll just log that the table exists
        RAISE NOTICE 'analytics_events table exists - indexes should be created separately';
    END IF;
END $$;

-- Estimation flows table optimization (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows') THEN
        -- Note: These will need to be run separately if the table exists
        -- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_status 
        -- ON estimation_flows (created_by, status);
        
        -- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_updated_at 
        -- ON estimation_flows (created_by, updated_at DESC);
        
        -- For now, we'll just log that the table exists
        RAISE NOTICE 'estimation_flows table exists - indexes should be created separately';
    END IF;
END $$;

-- Step 4: Update table statistics to help query planner (can be in transactions)
ANALYZE estimates;
ANALYZE estimate_services;
ANALYZE profiles;

-- Analyze optional tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ANALYZE analytics_events;
    END IF;
END $$;

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
--     '{"migration": "phase4-rls-performance-optimization-fixed", "description": "Applied RLS performance optimizations and index cleanup with transaction fixes", "indexes_added": 8, "duplicate_indexes_removed": 3}',
--     NOW()
-- ) ON CONFLICT DO NOTHING;
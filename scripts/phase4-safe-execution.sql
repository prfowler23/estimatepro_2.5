-- Phase 4: Safe Execution Script for Index Operations
-- This script can be run without transaction conflicts
-- Execute each section separately if needed

-- Step 1: Drop duplicate indexes (safe to run in transaction)
BEGIN;
DROP INDEX IF EXISTS idx_estimates_user_id_duplicate;
DROP INDEX IF EXISTS idx_estimate_services_estimate_id_duplicate;
DROP INDEX IF EXISTS idx_profiles_auth_user_id_duplicate;
COMMIT;

-- Step 2: Create performance indexes (run each separately)
-- Run these one at a time:

-- Essential RLS optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_status_created_at 
ON estimates (created_by, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_updated_at 
ON estimates (created_by, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_service_type 
ON estimate_services (estimate_id, service_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_user_id_active 
ON profiles (auth_user_id) WHERE active = true;

-- Step 3: Add foreign key indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_estimate_id_btree 
ON estimate_services USING btree (estimate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_user_id_btree 
ON profiles USING btree (auth_user_id);

-- Step 4: Add partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_active_by_user 
ON estimates (created_by, created_at DESC) 
WHERE status IN ('draft', 'sent');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_recent_by_user 
ON estimates (created_by, created_at DESC) 
WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- Step 5: Update statistics (safe to run in transaction)
BEGIN;
ANALYZE estimates;
ANALYZE estimate_services;
ANALYZE profiles;
COMMIT;
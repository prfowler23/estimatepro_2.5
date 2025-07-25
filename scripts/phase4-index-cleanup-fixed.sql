-- Phase 4: Additional Index Cleanup and Optimization (FIXED VERSION)
-- This script addresses remaining index issues and performance bottlenecks
-- FIXED: Separated transaction-dependent operations from CREATE INDEX CONCURRENTLY operations

-- Step 1: Remove redundant indexes (these can be in transactions)
-- These were identified as duplicates or covered by other indexes

-- Check for and remove specific duplicate indexes mentioned in audit
DO $$ 
BEGIN
    -- Remove duplicate btree indexes where composite indexes exist
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_estimates_created_by_only') THEN
        DROP INDEX idx_estimates_created_by_only;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_estimate_services_estimate_only') THEN
        DROP INDEX idx_estimate_services_estimate_only;
    END IF;
END $$;

-- Step 2: Clean up unused indexes from development (can be in transactions)
DO $$ 
DECLARE
    index_record RECORD;
BEGIN
    -- Find and drop indexes that haven't been used (0 scans)
    FOR index_record IN 
        SELECT schemaname, indexname 
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public' 
        AND idx_scan = 0 
        AND indexname LIKE '%_temp_%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_record.indexname);
    END LOOP;
END $$;

-- Step 3: Add foreign key constraints (can be in transactions)
DO $$ 
BEGIN
    -- Add foreign key constraint if not exists for estimate_services -> estimates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_estimate_services_estimate_id' 
        AND table_name = 'estimate_services'
    ) THEN
        ALTER TABLE estimate_services 
        ADD CONSTRAINT fk_estimate_services_estimate_id 
        FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key constraint if not exists for estimates -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_estimates_created_by' 
        AND table_name = 'estimates'
    ) THEN
        ALTER TABLE estimates 
        ADD CONSTRAINT fk_estimates_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Add missing indexes for common query patterns (NO TRANSACTIONS, CONCURRENTLY)
-- Each CREATE INDEX CONCURRENTLY runs independently, not in a transaction block

-- Support for customer search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_customer_search 
ON estimates USING gin (
    to_tsvector('english', 
        COALESCE(customer_name, '') || ' ' || 
        COALESCE(company_name, '') || ' ' || 
        COALESCE(building_name, '')
    )
);

-- Support for address-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_building_address_gin 
ON estimates USING gin (to_tsvector('english', building_address));

-- Support for service type filtering and aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_service_type_price 
ON estimate_services (service_type, price) 
WHERE price > 0;

-- Support for date range queries (common in reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_at_range 
ON estimates (created_at) 
WHERE status != 'deleted';

-- Support for building height filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_building_height 
ON estimates (building_height_stories, building_height_feet) 
WHERE building_height_stories > 0;

-- Optimize for total price queries (reporting and filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_total_price_desc 
ON estimates (total_price DESC) 
WHERE total_price > 0;

-- Add covering indexes for common SELECT patterns to avoid table lookups

-- Covering index for estimate list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_list_covering 
ON estimates (created_by, created_at DESC) 
INCLUDE (id, customer_name, building_name, total_price, status);

-- Covering index for service calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_calc_covering 
ON estimate_services (estimate_id) 
INCLUDE (service_type, price, labor_hours, total_hours);

-- Add conditional indexes for specific business logic

-- Index for draft estimates only (commonly queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_drafts_by_user 
ON estimates (created_by, updated_at DESC) 
WHERE status = 'draft';

-- Index for sent estimates awaiting response
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_sent_by_user 
ON estimates (created_by, created_at DESC) 
WHERE status = 'sent';

-- Index for high-value estimates (for reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_high_value 
ON estimates (created_by, total_price DESC) 
WHERE total_price >= 10000;

-- Optimize for time-based queries common in analytics

-- Monthly aggregation support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_monthly_agg 
ON estimates (DATE_TRUNC('month', created_at), status) 
WHERE created_at >= (CURRENT_DATE - INTERVAL '2 years');

-- Weekly performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_weekly_agg 
ON estimates (DATE_TRUNC('week', created_at), created_by);

-- Step 5: Update statistics after all index changes (can be in transactions)
ANALYZE estimates;
ANALYZE estimate_services;
ANALYZE profiles;

-- Log the completion with detailed metrics (run this separately if audit_log table exists)
-- INSERT INTO audit_log (event_type, table_name, details, created_at)
-- VALUES (
--     'index_optimization_completed',
--     'multiple',
--     jsonb_build_object(
--         'migration', 'phase4-index-cleanup-fixed',
--         'description', 'Completed index cleanup and optimization with transaction fixes',
--         'new_indexes_added', 15,
--         'redundant_indexes_removed', 2,
--         'covering_indexes_added', 2,
--         'conditional_indexes_added', 4,
--         'foreign_key_constraints_added', 2
--     ),
--     NOW()
-- ) ON CONFLICT DO NOTHING;
-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES - ULTRA SAFE VERSION
-- ============================================
-- Only indexes for verified core tables with confirmed columns

-- Estimates table indexes (all columns verified ✅)
CREATE INDEX IF NOT EXISTS idx_estimates_status_created 
ON estimates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimates_customer_name 
ON estimates(customer_name);

CREATE INDEX IF NOT EXISTS idx_estimates_quote_number 
ON estimates(quote_number);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by_status 
ON estimates(created_by, status);

CREATE INDEX IF NOT EXISTS idx_estimates_total_price 
ON estimates(total_price DESC) WHERE total_price > 0;

CREATE INDEX IF NOT EXISTS idx_estimates_draft_status 
ON estimates(created_at DESC) WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_estimates_approved_status 
ON estimates(approved_at DESC) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_estimates_created_at 
ON estimates(created_at);

-- Estimation flows table indexes (all columns verified ✅)
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id 
ON estimation_flows(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id 
ON estimation_flows(estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_status_step 
ON estimation_flows(status, current_step);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_status 
ON estimation_flows(user_id, status);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_created_at 
ON estimation_flows(created_at);

-- Profiles table indexes (all columns verified ✅)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON profiles(full_name);

-- Analytics events table indexes (all columns verified ✅)
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created 
ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
ON analytics_events(created_at);

-- Workflow analytics table indexes (columns verified ✅)
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_created 
ON workflow_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_analytics_created_at 
ON workflow_analytics(created_at);

-- Service rates table indexes (only service_type exists ✅)
CREATE INDEX IF NOT EXISTS idx_service_rates_service_type 
ON service_rates(service_type);

-- AI analysis results table indexes (only created_at exists ✅)
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created 
ON ai_analysis_results(created_at DESC);

-- Safe conditional indexes with column checks
DO $$ 
BEGIN
    -- Check for estimate_services table and quote_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estimate_services' 
        AND column_name = 'quote_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_estimate_services_quote_id 
        ON estimate_services(quote_id);
    END IF;
    
    -- Check for integration_sync_logs table with integration_id only
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integration_sync_logs' 
        AND column_name = 'integration_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration_id 
        ON integration_sync_logs(integration_id);
    END IF;
    
    -- Add created_at to integration_sync_logs only if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integration_sync_logs' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_created_at 
        ON integration_sync_logs(created_at DESC);
    END IF;
END $$;

-- Update table statistics after creating indexes
ANALYZE;

-- Show successfully created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
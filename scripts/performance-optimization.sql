-- EstimatePro Performance Optimization Script
-- Generated: 2025-07-21T20:12:20.258Z
-- 
-- Run this script in Supabase SQL Editor for best results


-- ============================================
-- CUSTOM PERFORMANCE INDEXES FOR CORE TABLES
-- ============================================

-- Estimates table indexes
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

-- Estimation flows table indexes
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id 
ON estimation_flows(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id 
ON estimation_flows(estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_status_step 
ON estimation_flows(status, current_step);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_status 
ON estimation_flows(user_id, status);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON profiles(full_name);

-- Analytics events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created 
ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
ON analytics_events(session_id);

-- Workflow analytics table indexes
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_flow_created 
ON workflow_analytics(flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_flow 
ON workflow_analytics(user_id, flow_id);

-- Service rates table indexes
CREATE INDEX IF NOT EXISTS idx_service_rates_service_type 
ON service_rates(service_type);

CREATE INDEX IF NOT EXISTS idx_service_rates_active 
ON service_rates(is_active) WHERE is_active = true;

-- AI analysis results table indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_entity_type 
ON ai_analysis_results(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_created 
ON ai_analysis_results(created_at DESC);

-- Integration sync logs table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration 
ON integration_sync_logs(integration_id, created_at DESC);

-- Composite indexes for common joins
CREATE INDEX IF NOT EXISTS idx_estimates_services_join 
ON estimate_services(quote_id);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_draft_status 
ON estimates(created_at DESC) WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_estimates_approved_status 
ON estimates(approved_at DESC) WHERE status = 'approved';

-- Text search indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_estimates_customer_search 
ON estimates USING gin(to_tsvector('english', customer_name || ' ' || COALESCE(company_name, '')));

-- Function-based indexes
CREATE INDEX IF NOT EXISTS idx_estimates_month_year 
ON estimates(DATE_TRUNC('month', created_at));


-- Note: After creating these indexes, also run the migration file:
-- sql/migrations/18-add-performance-optimization.sql

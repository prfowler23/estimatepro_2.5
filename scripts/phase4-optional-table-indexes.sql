-- Phase 4: Optional Table Indexes (Run separately if tables exist)
-- This script creates indexes for optional tables that may or may not exist
-- Run this ONLY if the analytics_events or estimation_flows tables exist

-- Analytics events table indexes (run only if table exists)
-- Check first: SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id_created_at 
ON analytics_events (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type_created_at 
ON analytics_events (event_type, created_at DESC);

-- Estimation flows table indexes (run only if table exists)  
-- Check first: SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_status 
ON estimation_flows (created_by, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_created_by_updated_at 
ON estimation_flows (created_by, updated_at DESC);

-- Update statistics for optional tables
ANALYZE analytics_events;
ANALYZE estimation_flows;
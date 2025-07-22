-- Performance Optimization Database Schema
-- Additional database structures for performance monitoring and caching

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_name VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('api', 'database', 'cache', 'ai', 'calculation', 'component')),
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance alerts table
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'critical')),
  metric_name VARCHAR(100) NOT NULL,
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache performance table
CREATE TABLE IF NOT EXISTS cache_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  eviction_count INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  hit_rate NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN total_requests > 0 THEN hit_count::NUMERIC / total_requests::NUMERIC
      ELSE 0
    END
  ) STORED,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query performance tracking table
CREATE TABLE IF NOT EXISTS query_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  query_hash VARCHAR(64) NOT NULL, -- Hash of the query for identification
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER NOT NULL DEFAULT 0,
  rows_examined INTEGER NOT NULL DEFAULT 0,
  index_used BOOLEAN NOT NULL DEFAULT false,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  query_plan JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- System resource monitoring table
CREATE TABLE IF NOT EXISTS system_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpu_usage NUMERIC NOT NULL,
  memory_usage NUMERIC NOT NULL,
  memory_total NUMERIC NOT NULL,
  disk_usage NUMERIC NOT NULL,
  active_connections INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time NUMERIC NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance configuration table
CREATE TABLE IF NOT EXISTS performance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('cache', 'monitoring', 'alert', 'optimization')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default performance configuration
INSERT INTO performance_config (setting_name, setting_value, setting_type) VALUES
  ('cache_default_ttl', '{"value": 300000, "unit": "ms"}', 'cache'),
  ('cache_max_size', '{"value": 1000, "unit": "entries"}', 'cache'),
  ('monitoring_enabled', '{"value": true}', 'monitoring'),
  ('alert_response_time_warning', '{"value": 1000, "unit": "ms"}', 'alert'),
  ('alert_response_time_critical', '{"value": 5000, "unit": "ms"}', 'alert'),
  ('alert_error_rate_warning', '{"value": 0.05, "unit": "percent"}', 'alert'),
  ('alert_error_rate_critical', '{"value": 0.1, "unit": "percent"}', 'alert'),
  ('optimization_lazy_loading', '{"value": true}', 'optimization'),
  ('optimization_query_caching', '{"value": true}', 'optimization'),
  ('optimization_compression', '{"value": true}', 'optimization')
ON CONFLICT (setting_name) DO NOTHING;

-- Performance statistics functions
CREATE OR REPLACE FUNCTION get_performance_stats(
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '1 hour',
  end_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_operations INTEGER,
  avg_duration NUMERIC,
  min_duration INTEGER,
  max_duration INTEGER,
  error_rate NUMERIC,
  operations_by_type JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_operations,
    AVG(duration_ms)::NUMERIC as avg_duration,
    MIN(duration_ms)::INTEGER as min_duration,
    MAX(duration_ms)::INTEGER as max_duration,
    (COUNT(*) FILTER (WHERE NOT success)::NUMERIC / COUNT(*)::NUMERIC) as error_rate,
    jsonb_object_agg(
      operation_type,
      jsonb_build_object(
        'count', type_count,
        'avg_duration', type_avg_duration,
        'error_rate', type_error_rate
      )
    ) as operations_by_type
  FROM performance_logs
  CROSS JOIN (
    SELECT 
      operation_type,
      COUNT(*) as type_count,
      AVG(duration_ms) as type_avg_duration,
      (COUNT(*) FILTER (WHERE NOT success)::NUMERIC / COUNT(*)::NUMERIC) as type_error_rate
    FROM performance_logs
    WHERE created_at BETWEEN start_time AND end_time
    GROUP BY operation_type
  ) type_stats
  WHERE created_at BETWEEN start_time AND end_time;
END;
$$;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
  threshold_ms INTEGER DEFAULT 1000,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  table_name VARCHAR(100),
  query_hash VARCHAR(64),
  avg_execution_time NUMERIC,
  execution_count INTEGER,
  last_executed TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qp.table_name,
    qp.query_hash,
    AVG(qp.execution_time_ms)::NUMERIC as avg_execution_time,
    COUNT(*)::INTEGER as execution_count,
    MAX(qp.executed_at) as last_executed
  FROM query_performance qp
  WHERE qp.execution_time_ms > threshold_ms
  GROUP BY qp.table_name, qp.query_hash
  ORDER BY avg_execution_time DESC
  LIMIT limit_count;
END;
$$;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  cache_type VARCHAR(50),
  total_keys INTEGER,
  avg_hit_rate NUMERIC,
  total_requests INTEGER,
  total_hits INTEGER,
  total_misses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.cache_type,
    COUNT(*)::INTEGER as total_keys,
    AVG(cp.hit_rate)::NUMERIC as avg_hit_rate,
    SUM(cp.total_requests)::INTEGER as total_requests,
    SUM(cp.hit_count)::INTEGER as total_hits,
    SUM(cp.miss_count)::INTEGER as total_misses
  FROM cache_performance cp
  GROUP BY cp.cache_type
  ORDER BY avg_hit_rate DESC;
END;
$$;

-- Function to cleanup old performance data
CREATE OR REPLACE FUNCTION cleanup_performance_data(
  retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Clean up performance logs
  DELETE FROM performance_logs WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up resolved alerts older than retention period
  DELETE FROM performance_alerts 
  WHERE resolved = true AND created_at < cutoff_date;
  
  -- Clean up old query performance data
  DELETE FROM query_performance WHERE executed_at < cutoff_date;
  
  -- Clean up old system resource data
  DELETE FROM system_resources WHERE timestamp < cutoff_date;
  
  -- Clean up unused cache performance entries
  DELETE FROM cache_performance WHERE last_accessed < cutoff_date;
  
  RETURN deleted_count;
END;
$$;

-- Function to detect performance anomalies
CREATE OR REPLACE FUNCTION detect_performance_anomalies(
  check_period_minutes INTEGER DEFAULT 60,
  threshold_multiplier NUMERIC DEFAULT 2.0
)
RETURNS TABLE (
  operation_type VARCHAR(50),
  operation_name VARCHAR(255),
  current_avg_duration NUMERIC,
  historical_avg_duration NUMERIC,
  anomaly_ratio NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_performance AS (
    SELECT 
      operation_type,
      operation_name,
      AVG(duration_ms) as current_avg
    FROM performance_logs
    WHERE created_at >= NOW() - (check_period_minutes || ' minutes')::INTERVAL
    GROUP BY operation_type, operation_name
  ),
  historical_performance AS (
    SELECT 
      operation_type,
      operation_name,
      AVG(duration_ms) as historical_avg
    FROM performance_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND created_at < NOW() - (check_period_minutes || ' minutes')::INTERVAL
    GROUP BY operation_type, operation_name
  )
  SELECT 
    r.operation_type,
    r.operation_name,
    r.current_avg,
    h.historical_avg,
    (r.current_avg / h.historical_avg) as anomaly_ratio,
    CASE 
      WHEN r.current_avg / h.historical_avg > threshold_multiplier * 2 THEN 'CRITICAL'
      WHEN r.current_avg / h.historical_avg > threshold_multiplier THEN 'WARNING'
      ELSE 'NORMAL'
    END as severity
  FROM recent_performance r
  JOIN historical_performance h ON r.operation_type = h.operation_type 
    AND r.operation_name = h.operation_name
  WHERE r.current_avg / h.historical_avg > threshold_multiplier
  ORDER BY anomaly_ratio DESC;
END;
$$;

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_created 
ON performance_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_logs_type_created 
ON performance_logs(operation_type, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_logs_duration_created 
ON performance_logs(duration_ms DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_user_operation 
ON performance_logs(user_id, operation_type, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved_created 
ON performance_alerts(resolved, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_type_created 
ON performance_alerts(alert_type, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved 
ON performance_alerts(resolved, alert_type, created_at);

CREATE INDEX IF NOT EXISTS idx_cache_performance_type_rate 
ON cache_performance(cache_type, hit_rate DESC);

CREATE INDEX IF NOT EXISTS idx_cache_performance_accessed 
ON cache_performance(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_table_time 
ON query_performance(table_name, execution_time_ms DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_hash_executed 
ON query_performance(query_hash, executed_at);

CREATE INDEX IF NOT EXISTS idx_query_performance_slow 
ON query_performance(execution_time_ms DESC, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_resources_timestamp 
ON system_resources(timestamp DESC);

-- Enable Row Level Security (RLS) for performance tables
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance tables
CREATE POLICY "Users can view their own performance logs" ON performance_logs
  FOR SELECT USING (auth.uid() = user_id OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can view all performance alerts" ON performance_alerts
  FOR SELECT USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can manage performance alerts" ON performance_alerts
  FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can view cache performance" ON cache_performance
  FOR SELECT USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Users can view their own query performance" ON query_performance
  FOR SELECT USING (auth.uid() = user_id OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can view system resources" ON system_resources
  FOR SELECT USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can manage performance config" ON performance_config
  FOR ALL USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- Create materialized view for performance dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_dashboard_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  operation_type,
  COUNT(*) as operation_count,
  AVG(duration_ms) as avg_duration,
  MIN(duration_ms) as min_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) FILTER (WHERE NOT success) as error_count,
  (COUNT(*) FILTER (WHERE NOT success)::NUMERIC / COUNT(*)::NUMERIC) as error_rate
FROM performance_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), operation_type;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_dashboard_stats_unique 
ON performance_dashboard_stats(hour, operation_type);

-- Function to refresh performance dashboard stats
CREATE OR REPLACE FUNCTION refresh_performance_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY performance_dashboard_stats;
END;
$$;

-- Create a trigger to auto-refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_performance_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh if the insert is for recent data
  IF NEW.created_at >= NOW() - INTERVAL '8 hours' THEN
    PERFORM pg_notify('refresh_performance_stats', 'refresh');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER performance_logs_refresh_trigger
  AFTER INSERT ON performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_performance_stats();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_alerts TO authenticated;
GRANT SELECT ON cache_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON query_performance TO authenticated;
GRANT SELECT ON system_resources TO authenticated;
GRANT SELECT ON performance_config TO authenticated;
GRANT SELECT ON performance_dashboard_stats TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_performance_data TO authenticated;
GRANT EXECUTE ON FUNCTION detect_performance_anomalies TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_performance_dashboard_stats TO authenticated;
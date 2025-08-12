-- Error Monitoring Database Schema
-- Tables for comprehensive error tracking, analytics, and resolution management

-- Error logs table for storing all error reports
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id TEXT NOT NULL UNIQUE, -- Client-generated error ID
  message TEXT NOT NULL,
  stack_trace TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'user_input', 'network', 'database', 'authentication', 
    'permission', 'calculation', 'ai_service', 'integration',
    'performance', 'cache', 'system'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- User and session context
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  page TEXT,
  component TEXT,
  action TEXT,
  user_agent TEXT,
  url TEXT,
  session_id TEXT,
  build_version TEXT,
  
  -- Error metadata
  frequency INTEGER DEFAULT 1,
  affected_users INTEGER DEFAULT 1,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN (
    'open', 'investigating', 'resolved', 'wont_fix'
  )),
  tags TEXT[] DEFAULT '{}',
  
  -- Performance data (JSON)
  performance_data JSONB DEFAULT '{}',
  
  -- Recovery data (JSON)
  recovery_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Error alerts table for critical error notifications
CREATE TABLE IF NOT EXISTS error_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  -- Alert status
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'acknowledged')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error patterns table for identifying recurring issues
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_signature TEXT NOT NULL UNIQUE, -- Hash of message + category + context
  message_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Pattern statistics
  occurrence_count INTEGER DEFAULT 1,
  affected_users_count INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Resolution information
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN (
    'open', 'investigating', 'resolved', 'wont_fix'
  )),
  resolution_notes TEXT,
  resolution_priority INTEGER DEFAULT 3 CHECK (resolution_priority BETWEEN 1 AND 5),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error resolutions table for tracking fix history
CREATE TABLE IF NOT EXISTS error_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern_id UUID REFERENCES error_patterns(id) ON DELETE CASCADE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  resolution_type TEXT NOT NULL CHECK (resolution_type IN (
    'code_fix', 'configuration_change', 'infrastructure_fix',
    'user_education', 'external_dependency', 'wont_fix'
  )),
  resolution_description TEXT NOT NULL,
  resolution_time_minutes INTEGER,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error analytics summary table for performance
CREATE TABLE IF NOT EXISTS error_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time period
  date_hour TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Aggregated metrics
  total_errors INTEGER DEFAULT 0,
  unique_errors INTEGER DEFAULT 0,
  critical_errors INTEGER DEFAULT 0,
  high_errors INTEGER DEFAULT 0,
  medium_errors INTEGER DEFAULT 0,
  low_errors INTEGER DEFAULT 0,
  
  -- Category breakdown (JSON)
  errors_by_category JSONB DEFAULT '{}',
  
  -- User impact
  affected_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_resolution_time_minutes DECIMAL,
  auto_recovery_rate DECIMAL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date_hour)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolution_status ON error_logs(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id);

CREATE INDEX IF NOT EXISTS idx_error_patterns_category ON error_patterns(category);
CREATE INDEX IF NOT EXISTS idx_error_patterns_status ON error_patterns(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_patterns_last_seen ON error_patterns(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_error_alerts_created_at ON error_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_alerts_user_id ON error_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_error_alerts_status ON error_alerts(status);

CREATE INDEX IF NOT EXISTS idx_error_analytics_date_hour ON error_analytics_summary(date_hour DESC);

-- Row Level Security (RLS) policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs
CREATE POLICY "Users can view their own errors" ON error_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own errors" ON error_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all errors" ON error_logs
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'email' IN (
      'admin@estimatepro.com',
      'support@estimatepro.com'
    )
  );

-- RLS Policies for error_alerts
CREATE POLICY "Users can view their own alerts" ON error_alerts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create alerts" ON error_alerts
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can acknowledge their alerts" ON error_alerts
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for error_patterns (admin only)
CREATE POLICY "Admins can manage error patterns" ON error_patterns
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'email' IN (
      'admin@estimatepro.com',
      'support@estimatepro.com'
    )
  );

-- RLS Policies for error_resolutions (admin only)
CREATE POLICY "Admins can manage error resolutions" ON error_resolutions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'email' IN (
      'admin@estimatepro.com',
      'support@estimatepro.com'
    )
  );

-- RLS Policies for analytics summary (read-only for authenticated users)
CREATE POLICY "Authenticated users can view analytics" ON error_analytics_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert analytics" ON error_analytics_summary
  FOR INSERT WITH CHECK (TRUE);

-- Functions for error analytics
CREATE OR REPLACE FUNCTION update_error_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hourly analytics summary
  INSERT INTO error_analytics_summary (
    date_hour,
    total_errors,
    unique_errors,
    critical_errors,
    high_errors,
    medium_errors,
    low_errors,
    errors_by_category,
    affected_users
  )
  VALUES (
    date_trunc('hour', NEW.created_at),
    1,
    1,
    CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'high' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'medium' THEN 1 ELSE 0 END,
    CASE WHEN NEW.severity = 'low' THEN 1 ELSE 0 END,
    jsonb_build_object(NEW.category, 1),
    CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END
  )
  ON CONFLICT (date_hour) DO UPDATE SET
    total_errors = error_analytics_summary.total_errors + 1,
    unique_errors = error_analytics_summary.unique_errors + 1,
    critical_errors = error_analytics_summary.critical_errors + 
      CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
    high_errors = error_analytics_summary.high_errors + 
      CASE WHEN NEW.severity = 'high' THEN 1 ELSE 0 END,
    medium_errors = error_analytics_summary.medium_errors + 
      CASE WHEN NEW.severity = 'medium' THEN 1 ELSE 0 END,
    low_errors = error_analytics_summary.low_errors + 
      CASE WHEN NEW.severity = 'low' THEN 1 ELSE 0 END,
    errors_by_category = COALESCE(error_analytics_summary.errors_by_category, '{}'::jsonb) ||
      jsonb_build_object(
        NEW.category, 
        COALESCE((error_analytics_summary.errors_by_category ->> NEW.category)::integer, 0) + 1
      ),
    affected_users = error_analytics_summary.affected_users + 
      CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics updates
CREATE TRIGGER trigger_update_error_analytics
  AFTER INSERT ON error_logs
  FOR EACH ROW EXECUTE FUNCTION update_error_analytics_summary();

-- Function to cleanup old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete error logs older than 90 days, except critical errors
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity != 'critical';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete critical errors older than 1 year
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND severity = 'critical';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Cleanup old analytics summaries (keep 1 year)
  DELETE FROM error_analytics_summary 
  WHERE date_hour < NOW() - INTERVAL '1 year';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get error trends
CREATE OR REPLACE FUNCTION get_error_trends(
  p_time_range INTERVAL DEFAULT INTERVAL '24 hours',
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  hour_bucket TIMESTAMP WITH TIME ZONE,
  total_errors BIGINT,
  critical_errors BIGINT,
  categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', el.created_at) as hour_bucket,
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE el.severity = 'critical') as critical_errors,
    jsonb_object_agg(el.category, COUNT(*)) as categories
  FROM error_logs el
  WHERE el.created_at >= NOW() - p_time_range
    AND (p_user_id IS NULL OR el.user_id = p_user_id)
  GROUP BY date_trunc('hour', el.created_at)
  ORDER BY hour_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
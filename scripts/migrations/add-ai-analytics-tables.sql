-- AI Analytics Events Table
-- Stores detailed analytics for every AI interaction
CREATE TABLE IF NOT EXISTS ai_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  response_time INTEGER NOT NULL, -- in milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  features_used JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_ai_analytics_user_id (user_id),
  INDEX idx_ai_analytics_timestamp (timestamp),
  INDEX idx_ai_analytics_endpoint (endpoint),
  INDEX idx_ai_analytics_model (model),
  INDEX idx_ai_analytics_success (success)
);

-- AI Usage Summary View
-- Provides aggregated analytics for dashboard
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(tokens_used) as total_tokens,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN success THEN 0 ELSE 1 END)::FLOAT / COUNT(*) as error_rate,
  jsonb_object_agg(
    model, 
    COUNT(*) FILTER (WHERE model IS NOT NULL)
  ) as model_usage
FROM ai_analytics_events
GROUP BY DATE_TRUNC('hour', timestamp);

-- AI User Stats View
-- Provides per-user analytics
CREATE OR REPLACE VIEW ai_user_stats AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(DISTINCT e.id) as total_requests,
  COALESCE(SUM(e.tokens_used), 0) as total_tokens_used,
  COALESCE(AVG(e.response_time), 0) as avg_response_time,
  MAX(e.timestamp) as last_active,
  jsonb_object_agg(
    e.endpoint,
    COUNT(*) FILTER (WHERE e.endpoint IS NOT NULL)
  ) as endpoint_usage
FROM auth.users u
LEFT JOIN ai_conversations c ON u.id = c.user_id
LEFT JOIN ai_analytics_events e ON u.id = e.user_id
GROUP BY u.id;

-- Function to cleanup old analytics
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_analytics_events
  WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ai_analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analytics
CREATE POLICY "Users can view own analytics" ON ai_analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert analytics
CREATE POLICY "Service role can insert analytics" ON ai_analytics_events
  FOR INSERT WITH CHECK (true);

-- Service role can delete for cleanup
CREATE POLICY "Service role can delete analytics" ON ai_analytics_events
  FOR DELETE USING (true);

-- Grant permissions
GRANT SELECT ON ai_analytics_events TO authenticated;
GRANT SELECT ON ai_usage_summary TO authenticated;
GRANT SELECT ON ai_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics TO service_role;
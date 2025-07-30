-- AI Analytics Queue Table
-- Persistent queue for analytics events to prevent data loss
CREATE TABLE IF NOT EXISTS ai_analytics_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Index for efficient queue processing
  INDEX idx_ai_analytics_queue_unprocessed (created_at) WHERE processed_at IS NULL
);

-- Function to process analytics queue
CREATE OR REPLACE FUNCTION process_analytics_queue(batch_size INTEGER DEFAULT 50)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  queue_record RECORD;
BEGIN
  -- Process unprocessed events in batches
  FOR queue_record IN 
    SELECT id, event_data
    FROM ai_analytics_queue
    WHERE processed_at IS NULL
    ORDER BY created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Insert into main analytics table
      INSERT INTO ai_analytics_events (
        user_id,
        conversation_id,
        timestamp,
        endpoint,
        model,
        tokens_used,
        response_time,
        success,
        error,
        features_used,
        metadata
      ) VALUES (
        (queue_record.event_data->>'userId')::UUID,
        (queue_record.event_data->>'conversationId')::UUID,
        (queue_record.event_data->>'timestamp')::TIMESTAMPTZ,
        queue_record.event_data->>'endpoint',
        queue_record.event_data->>'model',
        (queue_record.event_data->>'tokensUsed')::INTEGER,
        (queue_record.event_data->>'responseTime')::INTEGER,
        (queue_record.event_data->>'success')::BOOLEAN,
        queue_record.event_data->>'error',
        queue_record.event_data->'features',
        queue_record.event_data->'metadata'
      );
      
      -- Mark as processed
      UPDATE ai_analytics_queue
      SET processed_at = NOW()
      WHERE id = queue_record.id;
      
      processed_count := processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Update retry count and error message
      UPDATE ai_analytics_queue
      SET 
        retry_count = retry_count + 1,
        error_message = SQLERRM
      WHERE id = queue_record.id;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for processed queue items
CREATE OR REPLACE FUNCTION cleanup_analytics_queue(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_analytics_queue
  WHERE processed_at IS NOT NULL
    AND processed_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ai_analytics_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access the queue
CREATE POLICY "Service role full access" ON ai_analytics_queue
  FOR ALL USING (auth.uid() IS NULL); -- Service role has no auth.uid()

-- Grant permissions
GRANT ALL ON ai_analytics_queue TO service_role;
GRANT EXECUTE ON FUNCTION process_analytics_queue TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_analytics_queue TO service_role;
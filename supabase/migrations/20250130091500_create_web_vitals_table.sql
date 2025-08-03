-- Create web_vitals table for storing Core Web Vitals metrics
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(10) NOT NULL CHECK (metric_name IN ('CLS', 'FCP', 'LCP', 'TTFB', 'INP', 'FID')),
  value NUMERIC NOT NULL,
  rating VARCHAR(20) CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  delta NUMERIC,
  metric_id VARCHAR(255) NOT NULL,
  navigation_type VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Add index for common queries
  INDEX idx_web_vitals_created_at (created_at DESC),
  INDEX idx_web_vitals_metric_name (metric_name)
);

-- Add RLS policies
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for web vitals (client-side reporting)
CREATE POLICY "Allow anonymous inserts" ON web_vitals
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read web vitals
CREATE POLICY "Authenticated users can read" ON web_vitals
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create a function to clean up old web vitals (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_web_vitals()
RETURNS void AS $$
BEGIN
  DELETE FROM web_vitals
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This needs to be set up in Supabase dashboard or via SQL editor with appropriate permissions
-- SELECT cron.schedule('cleanup-web-vitals', '0 2 * * *', 'SELECT cleanup_old_web_vitals();');
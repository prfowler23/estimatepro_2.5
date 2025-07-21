-- Minimal Auto-Save Fix for estimation_flows table
-- Run this in Supabase SQL Editor to fix 406/400 errors

-- Add missing columns required by auto-save service
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '{}';
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE estimation_flows ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW();

-- Enable Row Level Security
ALTER TABLE estimation_flows ENABLE ROW LEVEL SECURITY;

-- Fix RLS policies for proper user access
DROP POLICY IF EXISTS "Users can view own estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can insert estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can update own estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can delete own estimation flows" ON estimation_flows;

CREATE POLICY "Users can view own estimation flows" 
  ON estimation_flows FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert estimation flows" 
  ON estimation_flows FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own estimation flows" 
  ON estimation_flows FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own estimation flows" 
  ON estimation_flows FOR DELETE 
  USING (user_id = auth.uid());

-- Add trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_estimation_flows_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimation_flows_timestamp_trigger ON estimation_flows;
CREATE TRIGGER update_estimation_flows_timestamp_trigger
    BEFORE UPDATE ON estimation_flows
    FOR EACH ROW
    EXECUTE FUNCTION update_estimation_flows_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id ON estimation_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_last_modified ON estimation_flows(last_modified DESC);

-- Success message
SELECT 'Auto-save fix applied successfully! Test your application now.' as status;
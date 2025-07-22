-- Simple auto-save table for estimation flows
-- This provides the minimal schema needed for the auto-save service

-- Check if estimation_flows table exists and add missing columns
ALTER TABLE estimation_flows 
ADD COLUMN IF NOT EXISTS flow_data JSONB,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create basic version control table (optional)
CREATE TABLE IF NOT EXISTS estimation_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id TEXT DEFAULT 'anonymous',
  step_id VARCHAR(50),
  change_description TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create basic conflict table (optional)
CREATE TABLE IF NOT EXISTS estimation_flow_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT NOT NULL,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflicted_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id ON estimation_flows(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_version ON estimation_flows(version);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_last_modified ON estimation_flows(last_modified);

-- Enable RLS (if not already enabled)
ALTER TABLE estimation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_conflicts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (adjust based on your auth setup)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Enable all for estimation_flows" ON estimation_flows;
  DROP POLICY IF EXISTS "Enable all for estimation_flow_versions" ON estimation_flow_versions;
  DROP POLICY IF EXISTS "Enable all for estimation_flow_conflicts" ON estimation_flow_conflicts;
  
  -- Create new policies
  CREATE POLICY "Enable all for estimation_flows" ON estimation_flows FOR ALL USING (true);
  CREATE POLICY "Enable all for estimation_flow_versions" ON estimation_flow_versions FOR ALL USING (true);
  CREATE POLICY "Enable all for estimation_flow_conflicts" ON estimation_flow_conflicts FOR ALL USING (true);
END $$;

COMMENT ON TABLE estimation_flows IS 'Enhanced estimation flows table with auto-save support';
COMMENT ON TABLE estimation_flow_versions IS 'Version history for estimation flows';
COMMENT ON TABLE estimation_flow_conflicts IS 'Conflict resolution data for concurrent editing';
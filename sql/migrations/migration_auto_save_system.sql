-- Migration for Enhanced Auto-Save System with Conflict Resolution
-- Creates tables for version control, conflict resolution, and auto-save state management

-- =============================================
-- ADD VERSION CONTROL TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS estimation_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID,
  step_id VARCHAR(50),
  change_description TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_versions_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE,
    
  -- Unique constraint for estimate + version
  CONSTRAINT unique_estimate_version 
    UNIQUE (estimate_id, version)
);

-- =============================================
-- ADD CONFLICT RESOLUTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS estimation_flow_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflicted_fields TEXT[] DEFAULT '{}',
  resolution_strategy VARCHAR(50),
  resolved_data JSONB,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_conflicts_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE
);

-- =============================================
-- UPDATE ESTIMATION_FLOWS TABLE
-- =============================================
-- Add auto-save related columns to existing table
ALTER TABLE estimation_flows 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS device_info JSONB,
ADD COLUMN IF NOT EXISTS auto_save_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS save_interval INTEGER DEFAULT 30000, -- milliseconds
ADD COLUMN IF NOT EXISTS last_auto_save TIMESTAMP,
ADD COLUMN IF NOT EXISTS conflict_detected BOOLEAN DEFAULT false;

-- =============================================
-- ADD AUTO-SAVE STATE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS estimation_flow_auto_save_state (
  estimate_id UUID PRIMARY KEY,
  last_saved TIMESTAMP DEFAULT NOW(),
  is_dirty BOOLEAN DEFAULT false,
  is_saving BOOLEAN DEFAULT false,
  save_error TEXT,
  conflict_detected BOOLEAN DEFAULT false,
  local_version INTEGER DEFAULT 1,
  server_version INTEGER DEFAULT 1,
  last_save_attempt TIMESTAMP,
  session_id VARCHAR(255),
  
  -- Foreign key constraint
  CONSTRAINT fk_auto_save_state_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE
);

-- =============================================
-- ADD INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for version control
CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_estimate_id 
  ON estimation_flow_versions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_timestamp 
  ON estimation_flow_versions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_user_id 
  ON estimation_flow_versions(user_id);

-- Indexes for conflict resolution
CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_estimate_id 
  ON estimation_flow_conflicts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_created_at 
  ON estimation_flow_conflicts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_resolved_at 
  ON estimation_flow_conflicts(resolved_at);

-- Indexes for enhanced estimation_flows
CREATE INDEX IF NOT EXISTS idx_estimation_flows_version 
  ON estimation_flows(version);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_last_modified 
  ON estimation_flows(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_conflict_detected 
  ON estimation_flows(conflict_detected) 
  WHERE conflict_detected = true;

-- =============================================
-- ADD RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE estimation_flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_auto_save_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for version control
CREATE POLICY "Users can view own estimation flow versions" 
  ON estimation_flow_versions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_versions.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert estimation flow versions" 
  ON estimation_flow_versions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_versions.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

-- RLS policies for conflict resolution
CREATE POLICY "Users can view own estimation flow conflicts" 
  ON estimation_flow_conflicts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_conflicts.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own estimation flow conflicts" 
  ON estimation_flow_conflicts FOR ALL USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_conflicts.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

-- RLS policies for auto-save state
CREATE POLICY "Users can manage own auto-save state" 
  ON estimation_flow_auto_save_state FOR ALL USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_auto_save_state.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

-- =============================================
-- ADD FUNCTIONS FOR AUTO-SAVE MANAGEMENT
-- =============================================

-- Function to increment version number
CREATE OR REPLACE FUNCTION increment_estimation_flow_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = COALESCE(OLD.version, 0) + 1;
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment version on updates
DROP TRIGGER IF EXISTS auto_increment_version_trigger ON estimation_flows;
CREATE TRIGGER auto_increment_version_trigger
    BEFORE UPDATE ON estimation_flows
    FOR EACH ROW
    WHEN (OLD.flow_data IS DISTINCT FROM NEW.flow_data)
    EXECUTE FUNCTION increment_estimation_flow_version();

-- Function to clean up old versions
CREATE OR REPLACE FUNCTION cleanup_old_estimation_flow_versions(
    p_estimate_id UUID,
    p_max_versions INTEGER DEFAULT 50
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH versions_to_delete AS (
        SELECT id
        FROM estimation_flow_versions
        WHERE estimate_id = p_estimate_id
        ORDER BY version DESC
        OFFSET p_max_versions
    )
    DELETE FROM estimation_flow_versions
    WHERE id IN (SELECT id FROM versions_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to detect conflicts
CREATE OR REPLACE FUNCTION detect_estimation_flow_conflict(
    p_estimate_id UUID,
    p_local_version INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    server_version INTEGER;
BEGIN
    SELECT version INTO server_version
    FROM estimation_flows
    WHERE id = p_estimate_id;
    
    RETURN COALESCE(server_version, 1) > p_local_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest auto-save state
CREATE OR REPLACE FUNCTION get_auto_save_state(p_estimate_id UUID)
RETURNS TABLE(
    last_saved TIMESTAMP,
    is_dirty BOOLEAN,
    is_saving BOOLEAN,
    save_error TEXT,
    conflict_detected BOOLEAN,
    local_version INTEGER,
    server_version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ass.last_saved,
        ass.is_dirty,
        ass.is_saving,
        ass.save_error,
        ass.conflict_detected,
        ass.local_version,
        ef.version as server_version
    FROM estimation_flow_auto_save_state ass
    LEFT JOIN estimation_flows ef ON ef.id = ass.estimate_id
    WHERE ass.estimate_id = p_estimate_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update auto-save state
CREATE OR REPLACE FUNCTION update_auto_save_state(
    p_estimate_id UUID,
    p_last_saved TIMESTAMP DEFAULT NULL,
    p_is_dirty BOOLEAN DEFAULT NULL,
    p_is_saving BOOLEAN DEFAULT NULL,
    p_save_error TEXT DEFAULT NULL,
    p_conflict_detected BOOLEAN DEFAULT NULL,
    p_local_version INTEGER DEFAULT NULL,
    p_last_save_attempt TIMESTAMP DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO estimation_flow_auto_save_state (
        estimate_id, 
        last_saved, 
        is_dirty, 
        is_saving, 
        save_error, 
        conflict_detected, 
        local_version, 
        last_save_attempt, 
        session_id
    )
    VALUES (
        p_estimate_id,
        COALESCE(p_last_saved, NOW()),
        COALESCE(p_is_dirty, false),
        COALESCE(p_is_saving, false),
        p_save_error,
        COALESCE(p_conflict_detected, false),
        COALESCE(p_local_version, 1),
        p_last_save_attempt,
        p_session_id
    )
    ON CONFLICT (estimate_id) DO UPDATE SET
        last_saved = COALESCE(EXCLUDED.last_saved, estimation_flow_auto_save_state.last_saved),
        is_dirty = COALESCE(EXCLUDED.is_dirty, estimation_flow_auto_save_state.is_dirty),
        is_saving = COALESCE(EXCLUDED.is_saving, estimation_flow_auto_save_state.is_saving),
        save_error = EXCLUDED.save_error,
        conflict_detected = COALESCE(EXCLUDED.conflict_detected, estimation_flow_auto_save_state.conflict_detected),
        local_version = COALESCE(EXCLUDED.local_version, estimation_flow_auto_save_state.local_version),
        last_save_attempt = EXCLUDED.last_save_attempt,
        session_id = COALESCE(EXCLUDED.session_id, estimation_flow_auto_save_state.session_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADD CONFLICT RESOLUTION VIEWS
-- =============================================

-- View for active conflicts
CREATE OR REPLACE VIEW active_estimation_flow_conflicts AS
SELECT 
    c.*,
    e.quote_number as estimate_number,
    e.customer_name,
    p.full_name as user_name
FROM estimation_flow_conflicts c
JOIN estimates e ON e.id = c.estimate_id
LEFT JOIN profiles p ON p.id = e.created_by
WHERE c.resolved_at IS NULL
ORDER BY c.created_at DESC;

-- View for version history with user details
CREATE OR REPLACE VIEW estimation_flow_version_history AS
SELECT 
    v.*,
    e.quote_number as estimate_number,
    e.customer_name,
    p.full_name as user_name
FROM estimation_flow_versions v
JOIN estimates e ON e.id = v.estimate_id
LEFT JOIN profiles p ON p.id = v.user_id
ORDER BY v.estimate_id, v.version DESC;

-- =============================================
-- ADD SAMPLE DATA CLEANUP JOBS
-- =============================================

-- Create a function to run periodic cleanup
CREATE OR REPLACE FUNCTION run_auto_save_cleanup()
RETURNS INTEGER AS $$
DECLARE
    total_cleaned INTEGER := 0;
    estimate_record RECORD;
BEGIN
    -- Clean up old versions for all estimates
    FOR estimate_record IN 
        SELECT DISTINCT estimate_id 
        FROM estimation_flow_versions
    LOOP
        total_cleaned := total_cleaned + cleanup_old_estimation_flow_versions(estimate_record.estimate_id, 50);
    END LOOP;
    
    -- Clean up resolved conflicts older than 30 days
    DELETE FROM estimation_flow_conflicts
    WHERE resolved_at IS NOT NULL 
    AND resolved_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS total_cleaned = total_cleaned + ROW_COUNT;
    
    RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Note: To set up automatic cleanup, you would create a cron job or use pg_cron extension:
-- SELECT cron.schedule('auto-save-cleanup', '0 2 * * *', 'SELECT run_auto_save_cleanup();');

COMMENT ON TABLE estimation_flow_versions IS 'Version control for estimation flow data with complete history tracking';
COMMENT ON TABLE estimation_flow_conflicts IS 'Conflict resolution data for concurrent editing scenarios';
COMMENT ON TABLE estimation_flow_auto_save_state IS 'Real-time auto-save state tracking for each estimation flow';
COMMENT ON FUNCTION cleanup_old_estimation_flow_versions IS 'Removes old versions beyond the specified limit to manage storage';
COMMENT ON FUNCTION detect_estimation_flow_conflict IS 'Detects version conflicts between local and server data';
COMMENT ON FUNCTION run_auto_save_cleanup IS 'Periodic cleanup function for auto-save system maintenance';
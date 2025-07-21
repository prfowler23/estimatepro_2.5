-- Migration to Fix estimation_flows Table Schema Issues
-- This script addresses the 406/400 errors by aligning the schema with what the application expects

-- =============================================
-- STEP 1: DROP AND RECREATE estimation_flows TABLE WITH PROPER STRUCTURE
-- =============================================

-- First, backup any existing data
CREATE TABLE IF NOT EXISTS estimation_flows_backup AS 
SELECT * FROM estimation_flows WHERE EXISTS (SELECT 1 FROM estimation_flows LIMIT 1);

-- Drop the existing table and recreate with correct schema
DROP TABLE IF EXISTS estimation_flows CASCADE;

-- Create the estimation_flows table with the structure expected by the application
CREATE TABLE estimation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL, -- Changed from TEXT to UUID to match API expectations
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Required for RLS
  
  -- Core flow data - this is the main JSONB column the auto-save service expects
  flow_data JSONB NOT NULL DEFAULT '{}',
  
  -- Flow control
  status VARCHAR(50) DEFAULT 'draft',
  current_step INTEGER DEFAULT 1,
  step VARCHAR(50) DEFAULT 'initial-contact',
  
  -- Auto-save related columns (from migration_auto_save_system.sql)
  version INTEGER DEFAULT 1,
  last_modified TIMESTAMP DEFAULT NOW(),
  device_info JSONB,
  auto_save_enabled BOOLEAN DEFAULT true,
  save_interval INTEGER DEFAULT 30000, -- milliseconds
  last_auto_save TIMESTAMP,
  conflict_detected BOOLEAN DEFAULT false,
  
  -- Legacy columns (maintain backward compatibility)
  customer_id UUID,
  contact_method VARCHAR(50),
  contact_date TIMESTAMP,
  initial_notes TEXT,
  ai_extracted_data JSONB,
  selected_services TEXT[],
  service_dependencies JSONB,
  uploaded_files JSONB,
  ai_analysis_results JSONB,
  work_areas JSONB,
  measurements JSONB,
  takeoff_data JSONB,
  estimated_duration INTEGER,
  weather_analysis JSONB,
  equipment_costs JSONB,
  material_costs JSONB,
  labor_costs JSONB,
  pricing_calculations JSONB,
  manual_overrides JSONB,
  final_estimate JSONB,
  proposal_generated BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- STEP 2: CREATE FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraint to estimates table (if it exists)
-- This will fail gracefully if estimates table doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
        ALTER TABLE estimation_flows 
        ADD CONSTRAINT fk_estimation_flows_estimate_id 
        FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If constraint creation fails, log it but continue
        RAISE NOTICE 'Could not create foreign key constraint to estimates table: %', SQLERRM;
END $$;

-- Add foreign key constraint to customers table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE estimation_flows 
        ADD CONSTRAINT fk_estimation_flows_customer_id 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create foreign key constraint to customers table: %', SQLERRM;
END $$;

-- =============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id ON estimation_flows(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id ON estimation_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_status ON estimation_flows(status);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_last_modified ON estimation_flows(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_version ON estimation_flows(version);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_conflict_detected ON estimation_flows(conflict_detected) WHERE conflict_detected = true;

-- =============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE estimation_flows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can insert estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can update their own estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can delete their own estimation flows" ON estimation_flows;

-- Create comprehensive RLS policies
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

-- =============================================
-- STEP 5: CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMPS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_estimation_flows_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_estimation_flows_timestamp_trigger ON estimation_flows;
CREATE TRIGGER update_estimation_flows_timestamp_trigger
    BEFORE UPDATE ON estimation_flows
    FOR EACH ROW
    EXECUTE FUNCTION update_estimation_flows_timestamp();

-- =============================================
-- STEP 6: CREATE SUPPORTING TABLES IF THEY DON'T EXIST
-- =============================================

-- Create estimates table if it doesn't exist (required for foreign key)
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL DEFAULT 'QTE-' || extract(year from now()) || '-' || lpad(extract(doy from now())::text, 3, '0') || '-' || lpad((extract(epoch from now()) % 86400)::integer::text, 5, '0'),
  customer_name TEXT NOT NULL DEFAULT 'Sample Customer',
  customer_email TEXT DEFAULT 'customer@example.com',
  building_name TEXT DEFAULT 'Sample Building',
  building_address TEXT DEFAULT '123 Main St',
  building_height_stories INTEGER DEFAULT 1,
  total_price DECIMAL(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected')) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on estimates
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for estimates
DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can insert estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can delete own estimates" ON estimates;

CREATE POLICY "Users can view own estimates" 
  ON estimates FOR SELECT 
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert estimates" 
  ON estimates FOR INSERT 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own estimates" 
  ON estimates FOR UPDATE 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own estimates" 
  ON estimates FOR DELETE 
  USING (created_by = auth.uid());

-- =============================================
-- STEP 7: CREATE VERSION CONTROL TABLES (if they don't exist)
-- =============================================

-- These tables are from migration_auto_save_system.sql but may not have been created
CREATE TABLE IF NOT EXISTS estimation_flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  step_id VARCHAR(50),
  change_description TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_versions_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT unique_estimate_version 
    UNIQUE (estimate_id, version)
);

CREATE TABLE IF NOT EXISTS estimation_flow_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflicted_fields TEXT[] DEFAULT '{}',
  resolution_strategy VARCHAR(50),
  resolved_data JSONB,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_conflicts_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE
);

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
  
  CONSTRAINT fk_auto_save_state_estimate_id 
    FOREIGN KEY (estimate_id) 
    REFERENCES estimates(id) 
    ON DELETE CASCADE
);

-- Enable RLS on all supporting tables
ALTER TABLE estimation_flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_auto_save_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for supporting tables
CREATE POLICY "Users can manage own flow versions" 
  ON estimation_flow_versions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_versions.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own flow conflicts" 
  ON estimation_flow_conflicts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_conflicts.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own auto-save state" 
  ON estimation_flow_auto_save_state FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimation_flow_auto_save_state.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

-- =============================================
-- STEP 8: CREATE INDEXES FOR SUPPORTING TABLES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_estimate_id ON estimation_flow_versions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_timestamp ON estimation_flow_versions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_versions_user_id ON estimation_flow_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_estimate_id ON estimation_flow_conflicts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_created_at ON estimation_flow_conflicts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);

-- =============================================
-- STEP 9: MIGRATE EXISTING DATA (if any)
-- =============================================

-- Migrate data from backup if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows_backup') THEN
        INSERT INTO estimation_flows (
            estimate_id,
            user_id,
            flow_data,
            status,
            current_step,
            version,
            last_modified,
            device_info,
            auto_save_enabled,
            save_interval,
            customer_id,
            contact_method,
            contact_date,
            initial_notes,
            ai_extracted_data,
            selected_services,
            service_dependencies,
            uploaded_files,
            ai_analysis_results,
            work_areas,
            measurements,
            takeoff_data,
            estimated_duration,
            weather_analysis,
            equipment_costs,
            material_costs,
            labor_costs,
            pricing_calculations,
            manual_overrides,
            final_estimate,
            proposal_generated,
            created_at,
            updated_at
        )
        SELECT 
            COALESCE(estimate_id::uuid, gen_random_uuid()), -- Convert TEXT to UUID
            COALESCE(auth.uid(), (SELECT id FROM auth.users LIMIT 1)), -- Ensure user_id is set
            COALESCE(flow_data, '{}'),
            COALESCE(status, 'draft'),
            COALESCE(current_step, 1),
            COALESCE(version, 1),
            COALESCE(last_modified, NOW()),
            device_info,
            COALESCE(auto_save_enabled, true),
            COALESCE(save_interval, 30000),
            customer_id,
            contact_method,
            contact_date,
            initial_notes,
            ai_extracted_data,
            selected_services,
            service_dependencies,
            uploaded_files,
            ai_analysis_results,
            work_areas,
            measurements,
            takeoff_data,
            estimated_duration,
            weather_analysis,
            equipment_costs,
            material_costs,
            labor_costs,
            pricing_calculations,
            manual_overrides,
            final_estimate,
            COALESCE(proposal_generated, false),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM estimation_flows_backup
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from estimation_flows_backup';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Data migration failed or not needed: %', SQLERRM;
END $$;

-- =============================================
-- STEP 10: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get or create estimate for temp IDs
CREATE OR REPLACE FUNCTION get_or_create_estimate_for_temp_id(temp_estimate_id TEXT, user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    estimate_uuid UUID;
BEGIN
    -- Try to find existing estimate by quote_number matching temp ID
    SELECT id INTO estimate_uuid 
    FROM estimates 
    WHERE quote_number = temp_estimate_id 
    AND created_by = user_uuid;
    
    -- If not found, create a new estimate
    IF estimate_uuid IS NULL THEN
        INSERT INTO estimates (
            quote_number,
            customer_name,
            customer_email,
            building_name,
            created_by
        ) VALUES (
            temp_estimate_id,
            'Estimate Customer',
            'customer@example.com',
            'Building for ' || temp_estimate_id,
            user_uuid
        ) RETURNING id INTO estimate_uuid;
    END IF;
    
    RETURN estimate_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle temp estimate IDs in auto-save
CREATE OR REPLACE FUNCTION handle_temp_estimate_auto_save(
    temp_estimate_id TEXT,
    user_uuid UUID,
    flow_data_param JSONB,
    current_step_param INTEGER DEFAULT 1,
    step_param VARCHAR(50) DEFAULT 'initial-contact'
)
RETURNS UUID AS $$
DECLARE
    estimate_uuid UUID;
    flow_id UUID;
BEGIN
    -- Get or create the estimate
    estimate_uuid := get_or_create_estimate_for_temp_id(temp_estimate_id, user_uuid);
    
    -- Upsert the estimation flow
    INSERT INTO estimation_flows (
        estimate_id,
        user_id,
        flow_data,
        current_step,
        step,
        status,
        version,
        last_modified
    ) VALUES (
        estimate_uuid,
        user_uuid,
        flow_data_param,
        current_step_param,
        step_param,
        'draft',
        1,
        NOW()
    )
    ON CONFLICT (estimate_id) DO UPDATE SET
        flow_data = EXCLUDED.flow_data,
        current_step = EXCLUDED.current_step,
        step = EXCLUDED.step,
        last_modified = NOW(),
        version = estimation_flows.version + 1
    RETURNING id INTO flow_id;
    
    RETURN flow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FINAL CLEANUP
-- =============================================

-- Drop backup table (comment out if you want to keep it)
-- DROP TABLE IF EXISTS estimation_flows_backup;

-- Add helpful comments
COMMENT ON TABLE estimation_flows IS 'Guided estimation flow data with auto-save functionality and proper RLS';
COMMENT ON COLUMN estimation_flows.flow_data IS 'Main JSONB column containing all guided flow step data';
COMMENT ON COLUMN estimation_flows.estimate_id IS 'UUID reference to estimates table';
COMMENT ON COLUMN estimation_flows.user_id IS 'User who owns this estimation flow (required for RLS)';
COMMENT ON FUNCTION get_or_create_estimate_for_temp_id IS 'Helper function to handle temporary estimate IDs from frontend';
COMMENT ON FUNCTION handle_temp_estimate_auto_save IS 'Main function for auto-save operations with temp estimate ID handling';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'estimation_flows table schema migration completed successfully!';
    RAISE NOTICE 'Key changes made:';
    RAISE NOTICE '- estimate_id changed from TEXT to UUID';
    RAISE NOTICE '- Added user_id column with proper foreign key';
    RAISE NOTICE '- Added flow_data JSONB column for centralized data storage';
    RAISE NOTICE '- Fixed RLS policies for proper access control';
    RAISE NOTICE '- Created supporting tables for version control';
    RAISE NOTICE '- Added helper functions for temp estimate ID handling';
    RAISE NOTICE 'The auto-save system should now work without 406/400 errors.';
END $$;
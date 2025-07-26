-- Missing Tables Migration
-- Run this in Supabase SQL Editor

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vendor Information
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('equipment', 'material', 'both')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Business Details
  business_hours JSONB DEFAULT '{}',
  payment_terms TEXT,
  minimum_order NUMERIC(10,2),
  delivery_radius INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  -- Metadata
  tags JSONB DEFAULT '[]',
  pricing_tiers JSONB DEFAULT '{}',
  certifications JSONB DEFAULT '[]'
);

-- Create indexes
CREATE INDEX idx_vendors_type ON vendors(type);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);
CREATE INDEX idx_vendors_name ON vendors(name);

-- Create estimation_flow_states table
CREATE TABLE IF NOT EXISTS estimation_flow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Flow State
  current_step TEXT NOT NULL,
  flow_type TEXT CHECK (flow_type IN ('guided', 'quick', 'template')),
  flow_data JSONB DEFAULT '{}',
  
  -- Progress Tracking
  completed_steps JSONB DEFAULT '[]',
  step_validations JSONB DEFAULT '{}',
  
  -- Session Management
  session_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Recovery Data
  recovery_data JSONB DEFAULT '{}',
  last_auto_save TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_estimation_flow_states_estimate_id ON estimation_flow_states(estimate_id);
CREATE INDEX idx_estimation_flow_states_user_id ON estimation_flow_states(user_id);
CREATE INDEX idx_estimation_flow_states_session_id ON estimation_flow_states(session_id);
CREATE INDEX idx_estimation_flow_states_expires_at ON estimation_flow_states(expires_at);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flow_states ENABLE ROW LEVEL SECURITY;

-- Policies for vendors (public read, admin write)
CREATE POLICY "Anyone can view active vendors"
  ON vendors FOR SELECT
  USING (is_active = TRUE);
  
CREATE POLICY "Admins can insert vendors"
  ON vendors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
  
CREATE POLICY "Admins can update vendors"
  ON vendors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
  
CREATE POLICY "Admins can delete vendors"
  ON vendors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for estimation_flow_states
CREATE POLICY "Users can view their own flow states"
  ON estimation_flow_states FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create flow states"
  ON estimation_flow_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own flow states"
  ON estimation_flow_states FOR UPDATE
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own flow states"
  ON estimation_flow_states FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_estimation_flow_states_updated_at
  BEFORE UPDATE ON estimation_flow_states
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
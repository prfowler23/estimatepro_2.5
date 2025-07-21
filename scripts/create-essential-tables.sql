-- Essential tables for EstimatePro Guided Estimation Flow
-- Run this in Supabase SQL Editor

-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create estimation_flows table
CREATE TABLE IF NOT EXISTS estimation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id TEXT NOT NULL, -- Link to temporary estimate IDs
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'draft',
  current_step INTEGER DEFAULT 1,
  
  -- Step 1: Initial Contact
  contact_method VARCHAR(50),
  contact_date TIMESTAMP,
  initial_notes TEXT,
  ai_extracted_data JSONB,
  
  -- Step 2: Scope/Details  
  selected_services TEXT[],
  service_dependencies JSONB,
  
  -- Step 3: Files/Photos
  uploaded_files JSONB,
  ai_analysis_results JSONB,
  
  -- Step 4: Area of Work Map
  work_areas JSONB,
  measurements JSONB,
  
  -- Step 5: Takeoff
  takeoff_data JSONB,
  
  -- Step 6: Duration
  estimated_duration INTEGER,
  weather_analysis JSONB,
  
  -- Step 7: Expenses
  equipment_costs JSONB,
  material_costs JSONB,
  labor_costs JSONB,
  
  -- Step 8: Pricing
  pricing_calculations JSONB,
  manual_overrides JSONB,
  
  -- Step 9: Summary
  final_estimate JSONB,
  proposal_generated BOOLEAN DEFAULT FALSE,
  
  -- Auto-save enhancements
  version INTEGER DEFAULT 1,
  last_modified TIMESTAMP DEFAULT NOW(),
  device_info JSONB,
  auto_save_enabled BOOLEAN DEFAULT TRUE,
  save_interval INTEGER DEFAULT 30,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimation_flows_estimate_id ON estimation_flows(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_customer_id ON estimation_flows(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_status ON estimation_flows(status);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_last_modified ON estimation_flows(last_modified);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flows ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth setup)
CREATE POLICY "Users can read their own customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Users can insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own customers" ON customers FOR UPDATE USING (true);

CREATE POLICY "Users can read their own estimation flows" ON estimation_flows FOR SELECT USING (true);
CREATE POLICY "Users can insert estimation flows" ON estimation_flows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own estimation flows" ON estimation_flows FOR UPDATE USING (true);

-- Sample data for testing
INSERT INTO customers (name, email, phone, company_name)
VALUES 
  ('John Doe', 'john@example.com', '555-0123', 'ABC Corp'),
  ('Jane Smith', 'jane@example.com', '555-0456', 'XYZ Inc')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE estimation_flows IS 'Stores guided estimation flow data and auto-save state';
COMMENT ON TABLE customers IS 'Customer information for estimates';
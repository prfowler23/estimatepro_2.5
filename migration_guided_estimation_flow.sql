-- EstimatePro Guided Estimation Flow Migration
-- Migration to add estimation_flows table and update quotes to estimates

-- =============================================
-- ADD CUSTOMERS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADD ESTIMATION_FLOWS TABLE
-- =============================================
CREATE TABLE estimation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  
  -- Step 8: Pricing
  pricing_calculations JSONB,
  manual_overrides JSONB,
  
  -- Step 9: Summary
  final_estimate JSONB,
  proposal_generated BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- RENAME QUOTES TABLE TO ESTIMATES
-- =============================================
ALTER TABLE quotes RENAME TO estimates;

-- =============================================
-- ADD FLOW REFERENCE TO ESTIMATES
-- =============================================
ALTER TABLE estimates 
ADD COLUMN estimation_flow_id UUID REFERENCES estimation_flows(id);

-- =============================================
-- UPDATE RELATED TABLES AND CONSTRAINTS
-- =============================================

-- Update quote_services foreign key reference
ALTER TABLE quote_services 
DROP CONSTRAINT quote_services_quote_id_fkey,
ADD CONSTRAINT quote_services_estimate_id_fkey 
FOREIGN KEY (quote_id) REFERENCES estimates(id) ON DELETE CASCADE;

-- Update ai_analysis_results foreign key reference  
ALTER TABLE ai_analysis_results
DROP CONSTRAINT ai_analysis_results_quote_id_fkey,
ADD CONSTRAINT ai_analysis_results_estimate_id_fkey
FOREIGN KEY (quote_id) REFERENCES estimates(id) ON DELETE CASCADE;

-- =============================================
-- UPDATE INDEXES
-- =============================================
DROP INDEX IF EXISTS idx_quotes_status;
DROP INDEX IF EXISTS idx_quotes_created_by;
DROP INDEX IF EXISTS idx_quotes_created_at;

CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_created_by ON estimates(created_by);
CREATE INDEX idx_estimates_created_at ON estimates(created_at);
CREATE INDEX idx_estimation_flows_customer_id ON estimation_flows(customer_id);
CREATE INDEX idx_estimation_flows_status ON estimation_flows(status);
CREATE INDEX idx_estimates_flow_id ON estimates(estimation_flow_id);

-- =============================================
-- UPDATE RLS POLICIES
-- =============================================

-- Drop old quote policies
DROP POLICY IF EXISTS "Users can view own quotes" ON estimates;
DROP POLICY IF EXISTS "Users can create quotes" ON estimates;
DROP POLICY IF EXISTS "Users can update own quotes" ON estimates;

-- Create new estimate policies
CREATE POLICY "Users can view own estimates" ON estimates FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create estimates" ON estimates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own estimates" ON estimates FOR UPDATE USING (auth.uid() = created_by);

-- Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_flows ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for customers
CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create customers" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update customers" ON customers FOR UPDATE USING (auth.role() = 'authenticated');

-- Add RLS policies for estimation_flows
CREATE POLICY "Users can view own estimation flows" ON estimation_flows FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM estimates 
    WHERE estimates.estimation_flow_id = estimation_flows.id 
    AND estimates.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create estimation flows" ON estimation_flows FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own estimation flows" ON estimation_flows FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM estimates 
    WHERE estimates.estimation_flow_id = estimation_flows.id 
    AND estimates.created_by = auth.uid()
  )
);

-- =============================================
-- UPDATE FUNCTIONS
-- =============================================

-- Update quote number generation function to work with estimates
CREATE OR REPLACE FUNCTION generate_estimate_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'EST-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 86400)::INTEGER::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function
CREATE OR REPLACE FUNCTION set_estimate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_estimate_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS set_quote_number_trigger ON estimates;
CREATE TRIGGER set_estimate_number_trigger
    BEFORE INSERT ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION set_estimate_number();

-- Update triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimation_flows_updated_at BEFORE UPDATE ON estimation_flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the quote total calculation function to work with estimates
CREATE OR REPLACE FUNCTION calculate_estimate_total(estimate_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(price), 0) INTO total_amount
    FROM quote_services
    WHERE quote_id = estimate_id_param;
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function for estimate totals
CREATE OR REPLACE FUNCTION update_estimate_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE estimates SET total_price = calculate_estimate_total(OLD.quote_id) WHERE id = OLD.quote_id;
        RETURN OLD;
    ELSE
        UPDATE estimates SET total_price = calculate_estimate_total(NEW.quote_id) WHERE id = NEW.quote_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update trigger
DROP TRIGGER IF EXISTS update_quote_total_on_service_change ON quote_services;
CREATE TRIGGER update_estimate_total_on_service_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_services
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_total();

-- =============================================
-- UPDATE VIEWS
-- =============================================

-- Drop old views
DROP VIEW IF EXISTS quote_summary;

-- Create new estimate summary view
CREATE OR REPLACE VIEW estimate_summary AS
SELECT 
    e.id,
    e.quote_number as estimate_number,
    e.customer_name,
    e.customer_email,
    e.building_name,
    e.building_address,
    e.status,
    e.total_price,
    e.created_at,
    e.sent_at,
    e.approved_at,
    e.estimation_flow_id,
    p.full_name as created_by_name,
    COUNT(qs.id) as service_count
FROM estimates e
LEFT JOIN profiles p ON e.created_by = p.id
LEFT JOIN quote_services qs ON e.id = qs.quote_id
GROUP BY e.id, p.full_name;
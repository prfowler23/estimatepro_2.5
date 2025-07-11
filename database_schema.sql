-- EstimatePro Comprehensive Database Schema
-- Supabase PostgreSQL Database Schema

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('admin', 'sales', 'viewer')) DEFAULT 'viewer',
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- QUOTES TABLE
-- =============================================
CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  company_name TEXT,
  building_name TEXT NOT NULL,
  building_address TEXT NOT NULL,
  building_height_stories INTEGER NOT NULL,
  building_height_feet INTEGER,
  building_type TEXT,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected')) DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUOTE_SERVICES TABLE
-- =============================================
CREATE TABLE quote_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN (
    'GR', 'WC', 'PW', 'PWS', 'FC', 'FR', 'HD', 'SW', 'PD', 'GRC', 'BR'
  )),
  area_sqft DECIMAL(10,2),
  glass_sqft DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  labor_hours DECIMAL(8,2),
  setup_hours DECIMAL(8,2),
  rig_hours DECIMAL(8,2),
  total_hours DECIMAL(8,2),
  crew_size INTEGER DEFAULT 2,
  equipment_type TEXT,
  equipment_days INTEGER,
  equipment_cost DECIMAL(10,2),
  calculation_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICE_RATES TABLE
-- =============================================
CREATE TABLE service_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('raleigh', 'charlotte', 'greensboro')),
  base_rate DECIMAL(8,2) NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('per_hour', 'per_sqft', 'per_window', 'per_frame', 'per_space')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_type, location, effective_date)
);

-- =============================================
-- ANALYTICS_EVENTS TABLE
-- =============================================
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI_ANALYSIS_RESULTS TABLE
-- =============================================
CREATE TABLE ai_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('facade', 'building_measurement', 'material_detection')),
  image_url TEXT,
  analysis_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_quote_services_quote_id ON quote_services(quote_id);
CREATE INDEX idx_quote_services_service_type ON quote_services(service_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data unless admin)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own quotes" ON quotes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create quotes" ON quotes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own quotes" ON quotes FOR UPDATE USING (auth.uid() = created_by);

-- Quote services follow the same pattern as quotes
CREATE POLICY "Users can view own quote services" ON quote_services FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create quote services" ON quote_services FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update own quote services" ON quote_services FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

-- Service rates are readable by all authenticated users
CREATE POLICY "Authenticated users can view service rates" ON service_rates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage service rates" ON service_rates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Analytics events - users can only see their own
CREATE POLICY "Users can view own analytics events" ON analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create analytics events" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI analysis results follow quote permissions
CREATE POLICY "Users can view own AI analysis results" ON ai_analysis_results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = ai_analysis_results.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create AI analysis results" ON ai_analysis_results FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = ai_analysis_results.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate quote number function
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'QTE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 86400)::INTEGER::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate quote number on insert
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_quote_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set quote number
CREATE TRIGGER set_quote_number_trigger
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_number();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default service rates for all locations
INSERT INTO service_rates (service_type, location, base_rate, unit_type) VALUES
-- Raleigh rates
('GR', 'raleigh', 45.00, 'per_hour'),
('WC', 'raleigh', 35.00, 'per_hour'),
('PW', 'raleigh', 0.75, 'per_sqft'),
('PWS', 'raleigh', 0.85, 'per_sqft'),
('FC', 'raleigh', 125.00, 'per_frame'),
('FR', 'raleigh', 85.00, 'per_frame'),
('HD', 'raleigh', 65.00, 'per_hour'),
('SW', 'raleigh', 25.00, 'per_window'),
('PD', 'raleigh', 55.00, 'per_hour'),
('GRC', 'raleigh', 95.00, 'per_hour'),
('BR', 'raleigh', 75.00, 'per_hour'),

-- Charlotte rates
('GR', 'charlotte', 48.00, 'per_hour'),
('WC', 'charlotte', 38.00, 'per_hour'),
('PW', 'charlotte', 0.80, 'per_sqft'),
('PWS', 'charlotte', 0.90, 'per_sqft'),
('FC', 'charlotte', 135.00, 'per_frame'),
('FR', 'charlotte', 90.00, 'per_frame'),
('HD', 'charlotte', 68.00, 'per_hour'),
('SW', 'charlotte', 28.00, 'per_window'),
('PD', 'charlotte', 58.00, 'per_hour'),
('GRC', 'charlotte', 100.00, 'per_hour'),
('BR', 'charlotte', 80.00, 'per_hour'),

-- Greensboro rates
('GR', 'greensboro', 42.00, 'per_hour'),
('WC', 'greensboro', 32.00, 'per_hour'),
('PW', 'greensboro', 0.70, 'per_sqft'),
('PWS', 'greensboro', 0.80, 'per_sqft'),
('FC', 'greensboro', 115.00, 'per_frame'),
('FR', 'greensboro', 80.00, 'per_frame'),
('HD', 'greensboro', 62.00, 'per_hour'),
('SW', 'greensboro', 22.00, 'per_window'),
('PD', 'greensboro', 52.00, 'per_hour'),
('GRC', 'greensboro', 90.00, 'per_hour'),
('BR', 'greensboro', 70.00, 'per_hour');

-- ========================================
-- UTILITY VIEWS
-- ========================================

-- View for quote summary with totals
CREATE OR REPLACE VIEW quote_summary AS
SELECT 
    q.id,
    q.quote_number,
    q.customer_name,
    q.customer_email,
    q.building_name,
    q.building_address,
    q.status,
    q.total_price,
    q.created_at,
    q.sent_at,
    q.approved_at,
    p.full_name as created_by_name,
    COUNT(qs.id) as service_count
FROM quotes q
LEFT JOIN profiles p ON q.created_by = p.id
LEFT JOIN quote_services qs ON q.id = qs.quote_id
GROUP BY q.id, p.full_name;

-- View for service type statistics
CREATE OR REPLACE VIEW service_type_stats AS
SELECT 
    service_type,
    COUNT(*) as usage_count,
    AVG(price) as avg_price,
    SUM(price) as total_revenue,
    AVG(total_hours) as avg_hours
FROM quote_services
GROUP BY service_type;

-- Function to calculate total price for a quote
CREATE OR REPLACE FUNCTION calculate_quote_total(quote_id_param UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(price), 0) INTO total_amount
    FROM quote_services
    WHERE quote_id = quote_id_param;
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update quote total when services change
CREATE OR REPLACE FUNCTION update_quote_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE quotes SET total_price = calculate_quote_total(OLD.quote_id) WHERE id = OLD.quote_id;
        RETURN OLD;
    ELSE
        UPDATE quotes SET total_price = calculate_quote_total(NEW.quote_id) WHERE id = NEW.quote_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update quote totals
CREATE TRIGGER update_quote_total_on_service_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_services
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_total();

-- Additional RLS policies for quote services DELETE
CREATE POLICY "Users can delete quote services" ON quote_services FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.created_by = auth.uid()
  )
);

-- Additional RLS policies for AI analysis results
CREATE POLICY "Users can insert AI analysis results" ON ai_analysis_results FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = ai_analysis_results.quote_id 
    AND quotes.created_by = auth.uid()
  )
);
-- EstimatePro Database Setup Script
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  company_name TEXT,
  
  -- Building information
  building_name TEXT NOT NULL,
  building_address TEXT NOT NULL,
  building_height_stories INTEGER NOT NULL DEFAULT 1,
  building_height_feet INTEGER,
  building_type TEXT,
  
  -- Quote details
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User reference (for RLS)
  user_id UUID REFERENCES auth.users(id)
);

-- Create quote_services table
CREATE TABLE IF NOT EXISTS quote_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Service details
  service_type TEXT NOT NULL,
  service_name TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Calculation details (JSON storage for flexibility)
  calculation_details JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_customer_email ON quotes(customer_email);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_quote_services_quote_id ON quote_services(quote_id);
CREATE INDEX idx_quote_services_service_type ON quote_services(service_type);

-- Create a function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the last quote number for the current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)), 0)
  INTO last_number
  FROM quotes
  WHERE quote_number LIKE 'EST-' || current_year || '-%';
  
  -- Generate new quote number
  new_number := 'EST-' || current_year || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quote numbers
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_number();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotes
-- Policy: Users can see all quotes (for now, adjust as needed)
CREATE POLICY "Enable read access for all users" ON quotes
FOR SELECT
USING (true);

-- Policy: Users can insert quotes
CREATE POLICY "Enable insert for all users" ON quotes
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own quotes
CREATE POLICY "Enable update for all users" ON quotes
FOR UPDATE
USING (true);

-- Policy: Users can delete their own quotes
CREATE POLICY "Enable delete for all users" ON quotes
FOR DELETE
USING (true);

-- Create RLS policies for quote_services
-- Policy: Users can see services for quotes they can see
CREATE POLICY "Enable read access for all users" ON quote_services
FOR SELECT
USING (true);

-- Policy: Users can insert services
CREATE POLICY "Enable insert for all users" ON quote_services
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update services
CREATE POLICY "Enable update for all users" ON quote_services
FOR UPDATE
USING (true);

-- Policy: Users can delete services
CREATE POLICY "Enable delete for all users" ON quote_services
FOR DELETE
USING (true);

-- Sample data (optional - remove in production)
-- INSERT INTO quotes (customer_name, customer_email, customer_phone, building_name, building_address, status, total_price)
-- VALUES 
-- ('John Doe', 'john@example.com', '555-0123', 'Doe Tower', '123 Main St', 'approved', 150000),
-- ('Jane Smith', 'jane@example.com', '555-0124', 'Smith Building', '456 Oak Ave', 'sent', 85000);

-- Helpful views for analytics
CREATE OR REPLACE VIEW quote_summary AS
SELECT 
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_quotes,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_quotes,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_quotes,
  SUM(CASE WHEN status = 'approved' THEN total_price ELSE 0 END) as total_revenue,
  AVG(CASE WHEN status = 'approved' THEN total_price END) as avg_quote_value
FROM quotes;

-- Grant permissions for the views
GRANT SELECT ON quote_summary TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Tables created: quotes, quote_services';
  RAISE NOTICE 'RLS policies enabled (currently permissive - update for production)';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update RLS policies to use auth.uid() when authentication is implemented';
  RAISE NOTICE '2. Add your Supabase URL and anon key to .env.local';
END $$;
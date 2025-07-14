-- EstimatePro Guided Estimation Flow Rollback Migration
-- Rollback script to revert guided estimation flow changes

-- =============================================
-- ROLLBACK FUNCTIONS AND TRIGGERS
-- =============================================

-- Drop new functions
DROP FUNCTION IF EXISTS generate_estimate_number();
DROP FUNCTION IF EXISTS set_estimate_number();
DROP FUNCTION IF EXISTS calculate_estimate_total(UUID);
DROP FUNCTION IF EXISTS update_estimate_total();

-- =============================================
-- ROLLBACK TRIGGERS
-- =============================================

-- Drop new triggers
DROP TRIGGER IF EXISTS set_estimate_number_trigger ON estimates;
DROP TRIGGER IF EXISTS update_estimate_total_on_service_change ON quote_services;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_estimation_flows_updated_at ON estimation_flows;

-- =============================================
-- ROLLBACK VIEWS
-- =============================================

-- Drop new views
DROP VIEW IF EXISTS estimate_summary;

-- Recreate original quote summary view
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

-- =============================================
-- ROLLBACK RLS POLICIES
-- =============================================

-- Drop new RLS policies
DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can create estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can view all customers" ON customers;
DROP POLICY IF EXISTS "Users can create customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can view own estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can create estimation flows" ON estimation_flows;
DROP POLICY IF EXISTS "Users can update own estimation flows" ON estimation_flows;

-- =============================================
-- ROLLBACK INDEXES
-- =============================================

-- Drop new indexes
DROP INDEX IF EXISTS idx_estimates_status;
DROP INDEX IF EXISTS idx_estimates_created_by;
DROP INDEX IF EXISTS idx_estimates_created_at;
DROP INDEX IF EXISTS idx_estimation_flows_customer_id;
DROP INDEX IF EXISTS idx_estimation_flows_status;
DROP INDEX IF EXISTS idx_estimates_flow_id;

-- =============================================
-- ROLLBACK TABLE STRUCTURE CHANGES
-- =============================================

-- Remove flow reference from estimates table
ALTER TABLE estimates DROP COLUMN IF EXISTS estimation_flow_id;

-- =============================================
-- ROLLBACK FOREIGN KEY CONSTRAINTS
-- =============================================

-- Restore original quote_services foreign key
ALTER TABLE quote_services 
DROP CONSTRAINT IF EXISTS quote_services_estimate_id_fkey,
ADD CONSTRAINT quote_services_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;

-- Restore original ai_analysis_results foreign key
ALTER TABLE ai_analysis_results
DROP CONSTRAINT IF EXISTS ai_analysis_results_estimate_id_fkey,
ADD CONSTRAINT ai_analysis_results_quote_id_fkey
FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;

-- =============================================
-- ROLLBACK TABLE RENAME
-- =============================================

-- Rename estimates table back to quotes
ALTER TABLE estimates RENAME TO quotes;

-- =============================================
-- ROLLBACK NEW TABLES
-- =============================================

-- Drop new tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS estimation_flows;
DROP TABLE IF EXISTS customers;

-- =============================================
-- RESTORE ORIGINAL INDEXES
-- =============================================

CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- =============================================
-- RESTORE ORIGINAL RLS POLICIES
-- =============================================

-- Restore original quote policies
CREATE POLICY "Users can view own quotes" ON quotes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create quotes" ON quotes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own quotes" ON quotes FOR UPDATE USING (auth.uid() = created_by);

-- =============================================
-- RESTORE ORIGINAL FUNCTIONS AND TRIGGERS
-- =============================================

-- Restore original quote number generation function
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'QTE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 86400)::INTEGER::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Restore original trigger function
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_quote_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Restore original trigger
CREATE TRIGGER set_quote_number_trigger
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_number();

-- Restore original quote total calculation function
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

-- Restore original trigger function for quote totals
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

-- Restore original trigger
CREATE TRIGGER update_quote_total_on_service_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_services
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_total();

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify rollback completed successfully
DO $$ 
BEGIN
    -- Check that quotes table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        RAISE EXCEPTION 'Rollback failed: quotes table does not exist';
    END IF;
    
    -- Check that estimates table does not exist  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
        RAISE EXCEPTION 'Rollback failed: estimates table still exists';
    END IF;
    
    -- Check that new tables do not exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimation_flows') THEN
        RAISE EXCEPTION 'Rollback failed: estimation_flows table still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        RAISE EXCEPTION 'Rollback failed: customers table still exists';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully';
END $$;
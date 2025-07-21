-- Add equipment and materials management tables
-- This replaces hardcoded data with dynamic database tables

-- Equipment Types and Categories
CREATE TABLE equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Database
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    manufacturer TEXT,
    model TEXT,
    daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    replacement_cost DECIMAL(10,2),
    specifications JSONB DEFAULT '{}',
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'unavailable', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Vendors
CREATE TABLE equipment_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    website TEXT,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Vendor Pricing
CREATE TABLE equipment_vendor_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES equipment_vendors(id) ON DELETE CASCADE,
    daily_rate DECIMAL(10,2),
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    minimum_rental_days INTEGER DEFAULT 1,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    pickup_fee DECIMAL(10,2) DEFAULT 0,
    damage_waiver_rate DECIMAL(5,4) DEFAULT 0, -- Percentage
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(equipment_id, vendor_id)
);

-- Materials Categories
CREATE TABLE materials_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials Database
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES materials_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    sku TEXT,
    unit_of_measure TEXT NOT NULL, -- gallon, liter, pound, etc.
    cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
    coverage_rate DECIMAL(10,2), -- coverage per unit (sq ft per gallon, etc.)
    dilution_ratio TEXT, -- e.g., "1:10", "concentrate"
    safety_data_sheet_url TEXT,
    environmental_impact_rating TEXT CHECK (environmental_impact_rating IN ('low', 'medium', 'high')),
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials Vendors
CREATE TABLE materials_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    website TEXT,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials Vendor Pricing
CREATE TABLE materials_vendor_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES materials_vendors(id) ON DELETE CASCADE,
    cost_per_unit DECIMAL(10,4) NOT NULL,
    minimum_quantity DECIMAL(10,2) DEFAULT 1,
    bulk_discount_threshold DECIMAL(10,2),
    bulk_discount_rate DECIMAL(5,4), -- Percentage discount
    lead_time_days INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, vendor_id)
);

-- Market Analysis Data
CREATE TABLE market_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    state_code TEXT,
    country_code TEXT DEFAULT 'US',
    cost_of_living_multiplier DECIMAL(4,3) DEFAULT 1.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor Analysis
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES market_regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('budget', 'standard', 'premium', 'luxury')),
    market_share DECIMAL(5,2) CHECK (market_share >= 0 AND market_share <= 100),
    average_pricing_multiplier DECIMAL(4,3) DEFAULT 1.000,
    strengths TEXT[],
    weaknesses TEXT[],
    website TEXT,
    contact_info JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor Service Pricing
CREATE TABLE competitor_service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- references ServiceType enum
    base_price DECIMAL(10,2),
    price_per_sqft DECIMAL(10,4),
    price_per_hour DECIMAL(10,2),
    minimum_price DECIMAL(10,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT, -- where the pricing data came from
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competitor_id, service_type)
);

-- Insert initial data
INSERT INTO equipment_categories (name, description) VALUES
    ('Lifts', 'Aerial work platforms and scissor lifts'),
    ('Pressure Equipment', 'Pressure washers and related equipment'),
    ('Cleaning Equipment', 'General cleaning tools and equipment'),
    ('Safety Equipment', 'Safety harnesses, helmets, and protective gear');

INSERT INTO materials_categories (name, description) VALUES
    ('Cleaning Chemicals', 'Chemical cleaning solutions and detergents'),
    ('Sealers & Coatings', 'Protective sealers and coating materials'),
    ('Restoration Materials', 'Materials for glass and surface restoration'),
    ('Safety Materials', 'Safety-related consumable materials');

INSERT INTO market_regions (name, state_code, cost_of_living_multiplier) VALUES
    ('Raleigh-Durham', 'NC', 0.95),
    ('Charlotte', 'NC', 1.05),
    ('Greensboro', 'NC', 0.90),
    ('Atlanta', 'GA', 1.10),
    ('Richmond', 'VA', 1.00);

-- Create indexes for performance
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_equipment_vendor_pricing_equipment ON equipment_vendor_pricing(equipment_id);
CREATE INDEX idx_equipment_vendor_pricing_vendor ON equipment_vendor_pricing(vendor_id);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_vendor_pricing_material ON materials_vendor_pricing(material_id);
CREATE INDEX idx_materials_vendor_pricing_vendor ON materials_vendor_pricing(vendor_id);
CREATE INDEX idx_competitors_region ON competitors(region_id);
CREATE INDEX idx_competitor_service_pricing_competitor ON competitor_service_pricing(competitor_id);
CREATE INDEX idx_competitor_service_pricing_service ON competitor_service_pricing(service_type);

-- Enable RLS on all tables
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_vendor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_vendor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_service_pricing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (read access for authenticated users, admin write access)
CREATE POLICY "Allow read access" ON equipment_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON equipment_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON equipment_vendor_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON materials_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON materials_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON materials_vendor_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON market_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON competitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access" ON competitor_service_pricing FOR SELECT TO authenticated USING (true);

-- Add admin write policies (would need to be restricted to admin users in production)
CREATE POLICY "Allow admin write access" ON equipment_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON equipment FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON equipment_vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON equipment_vendor_pricing FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON materials_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON materials_vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON materials_vendor_pricing FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON market_regions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON competitors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write access" ON competitor_service_pricing FOR ALL TO authenticated USING (true);
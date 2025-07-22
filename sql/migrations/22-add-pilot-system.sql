-- Pilot Certification System
-- Complete drone pilot management with certifications, flight logs, and compliance

-- Pilot certifications table
CREATE TABLE IF NOT EXISTS pilot_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic pilot information
  license_number TEXT UNIQUE NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'Part 107' CHECK (license_type IN ('Part 107', 'Part 61', 'Commercial', 'Private')),
  
  -- Certification details
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT DEFAULT 'FAA',
  
  -- Flight experience
  total_flight_hours DECIMAL(10,2) DEFAULT 0,
  hours_last_90_days DECIMAL(10,2) DEFAULT 0,
  hours_last_30_days DECIMAL(10,2) DEFAULT 0,
  
  -- Medical and fitness
  last_medical_exam DATE,
  medical_expiry_date DATE,
  medical_class TEXT CHECK (medical_class IN ('Class 1', 'Class 2', 'Class 3', 'BasicMed', 'N/A')),
  
  -- Additional certifications
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of additional certifications
  endorsements TEXT[] DEFAULT ARRAY[]::TEXT[], -- Special endorsements
  ratings TEXT[] DEFAULT ARRAY[]::TEXT[], -- Instrument, multi-engine, etc.
  
  -- Restrictions and limitations
  restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  operational_limitations JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_current BOOLEAN DEFAULT true, -- Current on all requirements
  suspension_reason TEXT,
  suspension_start_date DATE,
  suspension_end_date DATE,
  
  -- Insurance
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry_date DATE,
  insurance_coverage_amount DECIMAL(12,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, license_number),
  INDEX (user_id),
  INDEX (expiry_date),
  INDEX (is_active, is_current),
  INDEX (license_number)
);

-- Flight log table
CREATE TABLE IF NOT EXISTS pilot_flight_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id UUID REFERENCES pilot_certifications(user_id) ON DELETE CASCADE,
  
  -- Flight identification
  flight_date DATE NOT NULL,
  flight_number TEXT,
  tail_number TEXT, -- Drone identifier
  
  -- Flight details
  departure_location TEXT NOT NULL,
  arrival_location TEXT,
  flight_purpose TEXT NOT NULL CHECK (flight_purpose IN ('Commercial', 'Training', 'Maintenance', 'Recreation', 'Emergency')),
  
  -- Time tracking
  departure_time TIME,
  arrival_time TIME,
  flight_time_hours DECIMAL(5,2) NOT NULL, -- Actual flight time
  duty_time_hours DECIMAL(5,2), -- Total duty time including pre/post flight
  
  -- Flight conditions
  weather_conditions TEXT,
  visibility_miles DECIMAL(4,1),
  wind_speed_knots DECIMAL(4,1),
  wind_direction INTEGER CHECK (wind_direction >= 0 AND wind_direction <= 360),
  temperature_fahrenheit INTEGER,
  
  -- Operations
  day_operations BOOLEAN DEFAULT true,
  night_operations BOOLEAN DEFAULT false,
  instrument_operations BOOLEAN DEFAULT false,
  cross_country BOOLEAN DEFAULT false,
  
  -- Crew and passengers
  crew_members JSONB DEFAULT '[]', -- Array of crew member details
  passengers INTEGER DEFAULT 0,
  
  -- Aircraft/Drone details
  aircraft_make TEXT,
  aircraft_model TEXT,
  aircraft_registration TEXT,
  total_aircraft_time DECIMAL(10,2), -- Total time on this aircraft
  
  -- Performance metrics
  landings_day INTEGER DEFAULT 0,
  landings_night INTEGER DEFAULT 0,
  approaches INTEGER DEFAULT 0,
  holds INTEGER DEFAULT 0,
  
  -- Special circumstances
  incident_occurred BOOLEAN DEFAULT false,
  incident_description TEXT,
  violations BOOLEAN DEFAULT false,
  violation_description TEXT,
  
  -- Flight review and training
  flight_review BOOLEAN DEFAULT false,
  instructor_name TEXT,
  instructor_certificate_number TEXT,
  training_received TEXT,
  
  -- Endorsements earned during flight
  endorsements_earned TEXT[],
  
  -- Remarks
  remarks TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX (pilot_id, flight_date DESC),
  INDEX (flight_date DESC),
  INDEX (flight_purpose),
  INDEX (tail_number, flight_date DESC),
  INDEX (departure_location, arrival_location)
);

-- Recurrent training records
CREATE TABLE IF NOT EXISTS pilot_training_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id UUID REFERENCES pilot_certifications(user_id) ON DELETE CASCADE,
  
  -- Training details
  training_type TEXT NOT NULL CHECK (training_type IN ('Initial', 'Recurrent', 'Upgrade', 'Emergency', 'Remedial')),
  training_category TEXT NOT NULL CHECK (training_category IN ('Ground', 'Flight', 'Simulator', 'Computer Based', 'Classroom')),
  course_name TEXT NOT NULL,
  
  -- Training organization
  training_provider TEXT NOT NULL,
  instructor_name TEXT,
  instructor_certificate_number TEXT,
  training_location TEXT,
  
  -- Dates and duration
  start_date DATE NOT NULL,
  completion_date DATE,
  training_hours DECIMAL(5,2),
  
  -- Results
  passed BOOLEAN DEFAULT false,
  score DECIMAL(5,2), -- Percentage score
  certificate_number TEXT,
  certificate_expiry_date DATE,
  
  -- Training content
  subjects_covered TEXT[],
  competencies_achieved TEXT[],
  areas_for_improvement TEXT[],
  
  -- Documentation
  certificate_url TEXT,
  training_record_url TEXT,
  
  -- Status
  is_current BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES pilot_training_records(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX (pilot_id, completion_date DESC),
  INDEX (training_type, training_category),
  INDEX (certificate_expiry_date),
  INDEX (is_current)
);

-- Equipment type ratings (for different drone types)
CREATE TABLE IF NOT EXISTS pilot_equipment_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id UUID REFERENCES pilot_certifications(user_id) ON DELETE CASCADE,
  
  -- Equipment details
  equipment_category TEXT NOT NULL CHECK (equipment_category IN ('Multirotor', 'Fixed Wing', 'Helicopter', 'Hybrid VTOL', 'Balloon', 'Airship')),
  equipment_class TEXT, -- Specific class within category
  manufacturer TEXT,
  model TEXT,
  max_takeoff_weight DECIMAL(8,2), -- in pounds
  
  -- Rating details
  rating_date DATE NOT NULL,
  expiry_date DATE,
  check_ride_examiner TEXT,
  certificate_number TEXT,
  
  -- Operational limitations
  operational_limitations TEXT[],
  weather_limitations JSONB DEFAULT '{}',
  payload_limitations DECIMAL(8,2),
  
  -- Proficiency requirements
  required_flight_hours_annual DECIMAL(5,2) DEFAULT 0,
  required_flight_hours_quarterly DECIMAL(5,2) DEFAULT 0,
  last_proficiency_check DATE,
  next_proficiency_due DATE,
  
  -- Status
  is_current BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pilot_id, equipment_category, model),
  INDEX (pilot_id, is_current),
  INDEX (equipment_category, equipment_class),
  INDEX (expiry_date),
  INDEX (next_proficiency_due)
);

-- Compliance tracking and alerts
CREATE TABLE IF NOT EXISTS pilot_compliance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id UUID REFERENCES pilot_certifications(user_id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('Certification Expiry', 'Medical Expiry', 'Training Due', 'Currency Lapse', 'Insurance Expiry', 'Equipment Rating Expiry')),
  alert_level TEXT NOT NULL CHECK (alert_level IN ('Info', 'Warning', 'Critical', 'Grounding')) DEFAULT 'Info',
  
  -- Alert content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Timing
  due_date DATE,
  alert_date DATE DEFAULT CURRENT_DATE,
  days_until_due INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Follow-up
  next_review_date DATE,
  recurrence_interval INTERVAL, -- For recurring alerts
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX (pilot_id, is_active, alert_level),
  INDEX (alert_type, due_date),
  INDEX (alert_date DESC),
  INDEX (days_until_due)
);

-- Enable Row Level Security
ALTER TABLE pilot_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_flight_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_equipment_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Pilot certifications
CREATE POLICY "Users can view their own pilot certifications" ON pilot_certifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own pilot certifications" ON pilot_certifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all pilot certifications" ON pilot_certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all pilot certifications" ON pilot_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Flight log
CREATE POLICY "Pilots can manage their own flight logs" ON pilot_flight_log
  FOR ALL USING (pilot_id = auth.uid());

CREATE POLICY "Admins can view all flight logs" ON pilot_flight_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Training records
CREATE POLICY "Pilots can manage their own training records" ON pilot_training_records
  FOR ALL USING (pilot_id = auth.uid());

CREATE POLICY "Admins can view all training records" ON pilot_training_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Equipment ratings
CREATE POLICY "Pilots can view their own equipment ratings" ON pilot_equipment_ratings
  FOR SELECT USING (pilot_id = auth.uid());

CREATE POLICY "Admins can manage all equipment ratings" ON pilot_equipment_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Compliance alerts
CREATE POLICY "Pilots can view their own compliance alerts" ON pilot_compliance_alerts
  FOR SELECT USING (pilot_id = auth.uid());

CREATE POLICY "Pilots can acknowledge their own alerts" ON pilot_compliance_alerts
  FOR UPDATE USING (pilot_id = auth.uid());

CREATE POLICY "Admins can manage all compliance alerts" ON pilot_compliance_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions for pilot system

-- Function to calculate current flight hours
CREATE OR REPLACE FUNCTION calculate_pilot_currency(p_pilot_id UUID)
RETURNS TABLE (
  total_hours DECIMAL(10,2),
  hours_30_days DECIMAL(10,2),
  hours_90_days DECIMAL(10,2),
  last_flight_date DATE,
  is_current BOOLEAN
) AS $$
DECLARE
  v_total_hours DECIMAL(10,2);
  v_hours_30 DECIMAL(10,2);
  v_hours_90 DECIMAL(10,2);
  v_last_flight DATE;
  v_is_current BOOLEAN;
BEGIN
  -- Calculate total flight hours
  SELECT COALESCE(SUM(flight_time_hours), 0)
  INTO v_total_hours
  FROM pilot_flight_log
  WHERE pilot_id = p_pilot_id;
  
  -- Calculate hours in last 30 days
  SELECT COALESCE(SUM(flight_time_hours), 0)
  INTO v_hours_30
  FROM pilot_flight_log
  WHERE pilot_id = p_pilot_id
    AND flight_date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Calculate hours in last 90 days
  SELECT COALESCE(SUM(flight_time_hours), 0)
  INTO v_hours_90
  FROM pilot_flight_log
  WHERE pilot_id = p_pilot_id
    AND flight_date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- Get last flight date
  SELECT MAX(flight_date)
  INTO v_last_flight
  FROM pilot_flight_log
  WHERE pilot_id = p_pilot_id;
  
  -- Determine currency (flew within last 90 days with minimum 3 hours)
  v_is_current := (v_hours_90 >= 3.0 AND v_last_flight >= CURRENT_DATE - INTERVAL '90 days');
  
  RETURN QUERY SELECT v_total_hours, v_hours_30, v_hours_90, v_last_flight, v_is_current;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check pilot compliance
CREATE OR REPLACE FUNCTION check_pilot_compliance(p_pilot_id UUID)
RETURNS TABLE (
  compliance_status TEXT,
  issues TEXT[],
  warnings TEXT[],
  next_action_due DATE,
  next_action_type TEXT
) AS $$
DECLARE
  cert_record pilot_certifications%ROWTYPE;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_status TEXT := 'Compliant';
  v_next_date DATE;
  v_next_type TEXT;
  currency_data RECORD;
BEGIN
  -- Get pilot certification
  SELECT * INTO cert_record
  FROM pilot_certifications
  WHERE user_id = p_pilot_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'Not Certified', ARRAY['No active pilot certification found'], ARRAY[]::TEXT[], NULL::DATE, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check license expiry
  IF cert_record.expiry_date < CURRENT_DATE THEN
    v_issues := array_append(v_issues, 'Pilot license has expired');
    v_status := 'Non-Compliant';
  ELSIF cert_record.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN
    v_warnings := array_append(v_warnings, 'Pilot license expires within 30 days');
    IF v_status = 'Compliant' THEN v_status := 'Warning'; END IF;
  END IF;
  
  -- Check medical expiry
  IF cert_record.medical_expiry_date IS NOT NULL THEN
    IF cert_record.medical_expiry_date < CURRENT_DATE THEN
      v_issues := array_append(v_issues, 'Medical certificate has expired');
      v_status := 'Non-Compliant';
    ELSIF cert_record.medical_expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN
      v_warnings := array_append(v_warnings, 'Medical certificate expires within 60 days');
      IF v_status = 'Compliant' THEN v_status := 'Warning'; END IF;
    END IF;
  END IF;
  
  -- Check currency
  SELECT * INTO currency_data FROM calculate_pilot_currency(p_pilot_id);
  
  IF NOT currency_data.is_current THEN
    v_warnings := array_append(v_warnings, 'Pilot not current - requires recent flight experience');
    IF v_status = 'Compliant' THEN v_status := 'Warning'; END IF;
  END IF;
  
  -- Determine next action
  SELECT MIN(due_date), alert_type
  INTO v_next_date, v_next_type
  FROM pilot_compliance_alerts
  WHERE pilot_id = p_pilot_id AND is_active = true AND due_date >= CURRENT_DATE;
  
  RETURN QUERY SELECT v_status, v_issues, v_warnings, v_next_date, v_next_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate compliance alerts
CREATE OR REPLACE FUNCTION generate_pilot_compliance_alerts()
RETURNS void AS $$
DECLARE
  pilot_rec RECORD;
  alert_date DATE;
BEGIN
  -- Clear old alerts
  DELETE FROM pilot_compliance_alerts WHERE due_date < CURRENT_DATE - INTERVAL '30 days';
  
  -- Generate alerts for all active pilots
  FOR pilot_rec IN 
    SELECT * FROM pilot_certifications WHERE is_active = true
  LOOP
    -- License expiry alerts
    IF pilot_rec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN
      INSERT INTO pilot_compliance_alerts (pilot_id, alert_type, alert_level, title, description, due_date, days_until_due)
      VALUES (
        pilot_rec.user_id,
        'Certification Expiry',
        CASE WHEN pilot_rec.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Critical' ELSE 'Warning' END,
        'Pilot License Expiring Soon',
        'Your pilot license expires on ' || pilot_rec.expiry_date::text || '. Please renew before expiration.',
        pilot_rec.expiry_date,
        pilot_rec.expiry_date - CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Medical expiry alerts
    IF pilot_rec.medical_expiry_date IS NOT NULL AND 
       pilot_rec.medical_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN
      INSERT INTO pilot_compliance_alerts (pilot_id, alert_type, alert_level, title, description, due_date, days_until_due)
      VALUES (
        pilot_rec.user_id,
        'Medical Expiry',
        CASE WHEN pilot_rec.medical_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Critical' ELSE 'Warning' END,
        'Medical Certificate Expiring Soon',
        'Your medical certificate expires on ' || pilot_rec.medical_expiry_date::text || '. Please renew before expiration.',
        pilot_rec.medical_expiry_date,
        pilot_rec.medical_expiry_date - CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update pilot currency when flight log changes
CREATE OR REPLACE FUNCTION update_pilot_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- Update pilot certification with current hours
  UPDATE pilot_certifications
  SET 
    total_flight_hours = (
      SELECT COALESCE(SUM(flight_time_hours), 0)
      FROM pilot_flight_log
      WHERE pilot_id = COALESCE(NEW.pilot_id, OLD.pilot_id)
    ),
    hours_last_90_days = (
      SELECT COALESCE(SUM(flight_time_hours), 0)
      FROM pilot_flight_log
      WHERE pilot_id = COALESCE(NEW.pilot_id, OLD.pilot_id)
        AND flight_date >= CURRENT_DATE - INTERVAL '90 days'
    ),
    hours_last_30_days = (
      SELECT COALESCE(SUM(flight_time_hours), 0)
      FROM pilot_flight_log
      WHERE pilot_id = COALESCE(NEW.pilot_id, OLD.pilot_id)
        AND flight_date >= CURRENT_DATE - INTERVAL '30 days'
    ),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.pilot_id, OLD.pilot_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_pilot_currency_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pilot_flight_log
  FOR EACH ROW
  EXECUTE FUNCTION update_pilot_currency();

-- Sample data
INSERT INTO pilot_certifications (
  user_id, 
  license_number, 
  license_type, 
  issue_date, 
  expiry_date, 
  certifications,
  total_flight_hours
) 
SELECT 
  id,
  'FAA-' || substr(id::text, 1, 8),
  'Part 107',
  CURRENT_DATE - INTERVAL '1 year',
  CURRENT_DATE + INTERVAL '2 years',
  ARRAY['Part 107', 'Visual Observer'],
  CASE 
    WHEN role = 'admin' THEN 150.5
    WHEN role = 'sales' THEN 75.0
    ELSE 0.0
  END
FROM profiles
WHERE role IN ('admin', 'sales')
ON CONFLICT (user_id, license_number) DO NOTHING;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pilot_certifications_user_active ON pilot_certifications(user_id, is_active, is_current);
CREATE INDEX IF NOT EXISTS idx_pilot_flight_log_pilot_date ON pilot_flight_log(pilot_id, flight_date DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_training_current ON pilot_training_records(pilot_id, is_current, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_alerts_active ON pilot_compliance_alerts(pilot_id, is_active, alert_level, due_date);
CREATE INDEX IF NOT EXISTS idx_pilot_equipment_current ON pilot_equipment_ratings(pilot_id, is_current, expiry_date);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
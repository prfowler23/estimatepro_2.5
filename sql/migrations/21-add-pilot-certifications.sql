-- Add pilot certification fields to profiles table
-- This enables proper drone pilot license management

-- Add pilot certification columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS drone_pilot_license VARCHAR(50),
ADD COLUMN IF NOT EXISTS part_107_expiry DATE,
ADD COLUMN IF NOT EXISTS pilot_certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS flight_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_medical_exam DATE,
ADD COLUMN IF NOT EXISTS is_certified_pilot BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.drone_pilot_license IS 'FAA Part 107 Remote Pilot License Number';
COMMENT ON COLUMN profiles.part_107_expiry IS 'Expiry date for Part 107 certification';
COMMENT ON COLUMN profiles.pilot_certifications IS 'Array of pilot certifications and endorsements';
COMMENT ON COLUMN profiles.flight_hours IS 'Total logged flight hours';
COMMENT ON COLUMN profiles.last_medical_exam IS 'Date of last medical examination if required';
COMMENT ON COLUMN profiles.is_certified_pilot IS 'Quick flag for certified drone pilots';

-- Update the RLS policy for profiles table to include new columns
-- (The existing RLS policies should automatically cover the new columns)

-- Create index for efficient pilot lookups
CREATE INDEX IF NOT EXISTS idx_profiles_certified_pilot 
ON profiles (is_certified_pilot) 
WHERE is_certified_pilot = true;

-- Create index for license number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_pilot_license 
ON profiles (drone_pilot_license) 
WHERE drone_pilot_license IS NOT NULL;
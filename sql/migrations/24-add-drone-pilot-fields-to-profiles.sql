-- Migration: Add drone pilot fields to profiles table
-- File: 24-add-drone-pilot-fields-to-profiles.sql
-- Date: 2025-07-24
-- Purpose: Fix critical schema mismatch - frontend expects drone pilot fields that don't exist

-- Add missing drone pilot fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS drone_pilot_license TEXT NULL,
ADD COLUMN IF NOT EXISTS part_107_expiry TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS pilot_certifications JSONB NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS flight_hours INTEGER NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_medical_exam TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS is_certified_pilot BOOLEAN NULL DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_certified_pilot 
ON profiles(is_certified_pilot) 
WHERE is_certified_pilot = true;

CREATE INDEX IF NOT EXISTS idx_profiles_part_107_expiry 
ON profiles(part_107_expiry) 
WHERE part_107_expiry IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.drone_pilot_license IS 'FAA Part 107 drone pilot license number';
COMMENT ON COLUMN profiles.part_107_expiry IS 'Expiration date of Part 107 certification';
COMMENT ON COLUMN profiles.pilot_certifications IS 'Array of additional pilot certifications (JSON)';
COMMENT ON COLUMN profiles.flight_hours IS 'Total logged flight hours';
COMMENT ON COLUMN profiles.last_medical_exam IS 'Date of last medical examination';
COMMENT ON COLUMN profiles.is_certified_pilot IS 'Whether user is a certified drone pilot';
-- ============================================
-- FIX RLS POLICIES - CRITICAL SECURITY UPDATE
-- ============================================
-- This script enables Row Level Security (RLS) on all unprotected tables
-- and creates appropriate policies to ensure data isolation
-- 
-- IMPORTANT: Review and adjust user_id column names as needed
-- ============================================

-- 1. PROFILES TABLE
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. ESTIMATES TABLE
-- ============================================
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can create own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
DROP POLICY IF EXISTS "Users can delete own estimates" ON estimates;

-- Create new policies
CREATE POLICY "Users can view own estimates" ON estimates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own estimates" ON estimates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own estimates" ON estimates
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own estimates" ON estimates
  FOR DELETE USING (auth.uid() = user_id);

-- 3. ESTIMATE_SERVICES TABLE
-- ============================================
ALTER TABLE estimate_services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view services for own estimates" ON estimate_services;
DROP POLICY IF EXISTS "Users can create services for own estimates" ON estimate_services;
DROP POLICY IF EXISTS "Users can update services for own estimates" ON estimate_services;
DROP POLICY IF EXISTS "Users can delete services for own estimates" ON estimate_services;

-- Create new policies (via estimate ownership)
CREATE POLICY "Users can view services for own estimates" ON estimate_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_services.estimate_id 
      AND estimates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create services for own estimates" ON estimate_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_services.estimate_id 
      AND estimates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update services for own estimates" ON estimate_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_services.estimate_id 
      AND estimates.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_services.estimate_id 
      AND estimates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete services for own estimates" ON estimate_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_services.estimate_id 
      AND estimates.user_id = auth.uid()
    )
  );

-- 4. ANALYTICS_EVENTS TABLE
-- ============================================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can create own analytics" ON analytics_events;

-- Create new policies
CREATE POLICY "Users can view own analytics" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No update/delete for analytics (append-only)

-- 5. FACADE_ANALYSES TABLE
-- ============================================
ALTER TABLE facade_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own facade analyses" ON facade_analyses;
DROP POLICY IF EXISTS "Users can create own facade analyses" ON facade_analyses;
DROP POLICY IF EXISTS "Users can update own facade analyses" ON facade_analyses;
DROP POLICY IF EXISTS "Users can delete own facade analyses" ON facade_analyses;

-- Create new policies
CREATE POLICY "Users can view own facade analyses" ON facade_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own facade analyses" ON facade_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facade analyses" ON facade_analyses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own facade analyses" ON facade_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- 6. FACADE_ANALYSIS_IMAGES TABLE
-- ============================================
ALTER TABLE facade_analysis_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view images for own analyses" ON facade_analysis_images;
DROP POLICY IF EXISTS "Users can create images for own analyses" ON facade_analysis_images;
DROP POLICY IF EXISTS "Users can update images for own analyses" ON facade_analysis_images;
DROP POLICY IF EXISTS "Users can delete images for own analyses" ON facade_analysis_images;

-- Create new policies (via facade_analyses ownership)
CREATE POLICY "Users can view images for own analyses" ON facade_analysis_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM facade_analyses 
      WHERE facade_analyses.id = facade_analysis_images.analysis_id 
      AND facade_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create images for own analyses" ON facade_analysis_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM facade_analyses 
      WHERE facade_analyses.id = facade_analysis_images.analysis_id 
      AND facade_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images for own analyses" ON facade_analysis_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM facade_analyses 
      WHERE facade_analyses.id = facade_analysis_images.analysis_id 
      AND facade_analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facade_analyses 
      WHERE facade_analyses.id = facade_analysis_images.analysis_id 
      AND facade_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for own analyses" ON facade_analysis_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM facade_analyses 
      WHERE facade_analyses.id = facade_analysis_images.analysis_id 
      AND facade_analyses.user_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify RLS is enabled:

/*
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 
  'estimates', 
  'estimate_services', 
  'analytics_events', 
  'facade_analyses', 
  'facade_analysis_images'
);

-- Check policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. This script assumes 'user_id' column exists in tables
-- 2. Adjust column names if different in your schema
-- 3. Test thoroughly with different user contexts
-- 4. Consider adding organization-level policies if multi-tenant
-- 5. Add service role bypass policies if needed for admin operations
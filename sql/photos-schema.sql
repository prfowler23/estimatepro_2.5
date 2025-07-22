-- Photos and Photo Analysis Schema
-- This creates the complete database structure for photo storage and AI analysis

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Photos table for storing uploaded files
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size < 50000000), -- 50MB max
  CONSTRAINT valid_mime_type CHECK (mime_type LIKE 'image/%'),
  CONSTRAINT valid_file_name CHECK (char_length(file_name) > 0)
);

-- Photo analysis results table
CREATE TABLE IF NOT EXISTS photo_analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  processing_time_ms INTEGER,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add unique constraint to prevent duplicate analysis
  UNIQUE(photo_id, analysis_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photos_estimate_id ON photos(estimate_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_photo_id ON photo_analysis_results(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_type ON photo_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_processed_at ON photo_analysis_results(processed_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analysis_results ENABLE ROW LEVEL SECURITY;

-- Photos RLS policies
CREATE POLICY "Users can view their own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Photo analysis results RLS policies
CREATE POLICY "Users can view analysis of their photos" ON photo_analysis_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_analysis_results.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analysis results" ON photo_analysis_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_analysis_results.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analysis of their photos" ON photo_analysis_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_analysis_results.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete analysis of their photos" ON photo_analysis_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photos 
      WHERE photos.id = photo_analysis_results.photo_id 
      AND photos.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photo_analysis_results TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE ON SCHEMA public TO authenticated;
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function runMigration() {
  try {
    console.log("🚀 Starting facade analysis migration...");

    // Create facade_analyses table
    const { error: facadeError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS facade_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
          created_by UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Building Information
          building_address TEXT,
          building_type TEXT CHECK (building_type IN ('office', 'retail', 'residential', 'industrial', 'mixed-use', 'institutional')),
          building_height_stories INTEGER,
          building_height_feet NUMERIC(10,2),
          
          -- Measurements
          total_facade_sqft NUMERIC(10,2),
          total_glass_sqft NUMERIC(10,2),
          net_facade_sqft NUMERIC(10,2),
          glass_to_facade_ratio NUMERIC(5,2),
          
          -- Material Breakdown
          materials JSONB DEFAULT '[]',
          facade_complexity TEXT CHECK (facade_complexity IN ('simple', 'moderate', 'complex')),
          
          -- Ground Surfaces
          sidewalk_sqft NUMERIC(10,2),
          covered_walkway_sqft NUMERIC(10,2),
          parking_spaces INTEGER,
          parking_sqft NUMERIC(10,2),
          loading_dock_sqft NUMERIC(10,2),
          
          -- Analysis Metadata
          confidence_level NUMERIC(5,2),
          ai_model_version TEXT DEFAULT 'v8.0',
          image_sources JSONB DEFAULT '[]',
          validation_notes TEXT,
          manual_adjustments JSONB DEFAULT '{}',
          
          -- Flags
          requires_field_verification BOOLEAN DEFAULT FALSE,
          has_covered_areas BOOLEAN DEFAULT FALSE,
          is_historic_building BOOLEAN DEFAULT FALSE
        );
        
        -- Create indexes
        CREATE INDEX idx_facade_analyses_estimate_id ON facade_analyses(estimate_id);
        CREATE INDEX idx_facade_analyses_created_by ON facade_analyses(created_by);
        CREATE INDEX idx_facade_analyses_building_type ON facade_analyses(building_type);
        
        -- Create facade_analysis_images table
        CREATE TABLE IF NOT EXISTS facade_analysis_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          facade_analysis_id UUID REFERENCES facade_analyses(id) ON DELETE CASCADE,
          uploaded_by UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          
          image_url TEXT NOT NULL,
          image_type TEXT CHECK (image_type IN ('aerial', 'ground', 'drone', 'satellite')),
          view_angle TEXT CHECK (view_angle IN ('front', 'rear', 'left', 'right', 'oblique', 'top')),
          
          -- Analysis Results
          ai_analysis_results JSONB DEFAULT '{}',
          detected_elements JSONB DEFAULT '[]',
          confidence_scores JSONB DEFAULT '{}',
          
          metadata JSONB DEFAULT '{}'
        );
        
        CREATE INDEX idx_facade_analysis_images_facade_id ON facade_analysis_images(facade_analysis_id);
        
        -- Create RLS policies
        ALTER TABLE facade_analyses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE facade_analysis_images ENABLE ROW LEVEL SECURITY;
        
        -- Policies for facade_analyses
        CREATE POLICY "Users can view their own facade analyses"
          ON facade_analyses FOR SELECT
          USING (auth.uid() = created_by);
          
        CREATE POLICY "Users can create facade analyses"
          ON facade_analyses FOR INSERT
          WITH CHECK (auth.uid() = created_by);
          
        CREATE POLICY "Users can update their own facade analyses"
          ON facade_analyses FOR UPDATE
          USING (auth.uid() = created_by);
          
        CREATE POLICY "Users can delete their own facade analyses"
          ON facade_analyses FOR DELETE
          USING (auth.uid() = created_by);
          
        -- Policies for facade_analysis_images
        CREATE POLICY "Users can view images for their analyses"
          ON facade_analysis_images FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM facade_analyses
              WHERE facade_analyses.id = facade_analysis_images.facade_analysis_id
              AND facade_analyses.created_by = auth.uid()
            )
          );
          
        CREATE POLICY "Users can upload images to their analyses"
          ON facade_analysis_images FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM facade_analyses
              WHERE facade_analyses.id = facade_analysis_images.facade_analysis_id
              AND facade_analyses.created_by = auth.uid()
            )
          );
          
        CREATE POLICY "Users can update their own images"
          ON facade_analysis_images FOR UPDATE
          USING (auth.uid() = uploaded_by);
          
        CREATE POLICY "Users can delete their own images"
          ON facade_analysis_images FOR DELETE
          USING (auth.uid() = uploaded_by);
      `,
    });

    if (facadeError) {
      console.error("❌ Error creating facade analysis tables:", facadeError);
      throw facadeError;
    }

    console.log("✅ Facade analysis tables created successfully");
    console.log("✅ RLS policies applied successfully");
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();

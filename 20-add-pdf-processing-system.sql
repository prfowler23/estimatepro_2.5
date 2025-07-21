-- Add PDF processing system tables and functionality
-- This migration adds tables for PDF processing history and caching

-- PDF Processing History Table
CREATE TABLE IF NOT EXISTS pdf_processing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    pages_processed INTEGER NOT NULL DEFAULT 0,
    text_extracted BOOLEAN NOT NULL DEFAULT false,
    images_found INTEGER NOT NULL DEFAULT 0,
    measurements_found INTEGER NOT NULL DEFAULT 0,
    building_analysis JSONB,
    processing_options JSONB,
    processing_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDF Processing Cache Table (for caching expensive operations)
CREATE TABLE IF NOT EXISTS pdf_processing_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL,
    processing_options_hash TEXT NOT NULL,
    extracted_text TEXT,
    images_data JSONB,
    measurements JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_user_id ON pdf_processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_created_at ON pdf_processing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_history_filename ON pdf_processing_history(filename);

CREATE INDEX IF NOT EXISTS idx_pdf_processing_cache_file_hash ON pdf_processing_cache(file_hash);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_cache_expires_at ON pdf_processing_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_cache_processing_options_hash ON pdf_processing_cache(processing_options_hash);

-- Row Level Security Policies
ALTER TABLE pdf_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_processing_cache ENABLE ROW LEVEL SECURITY;

-- PDF Processing History Policies
CREATE POLICY "Users can view their own PDF processing history" ON pdf_processing_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF processing history" ON pdf_processing_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF processing history" ON pdf_processing_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF processing history" ON pdf_processing_history
    FOR DELETE USING (auth.uid() = user_id);

-- PDF Processing Cache Policies (shared cache with access control)
CREATE POLICY "Users can view PDF processing cache" ON pdf_processing_cache
    FOR SELECT USING (true); -- Cache is shared but doesn't contain sensitive data

CREATE POLICY "Service role can manage PDF processing cache" ON pdf_processing_cache
    FOR ALL USING (current_setting('role') = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pdf_processing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pdf_processing_history_updated_at
    BEFORE UPDATE ON pdf_processing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_processing_history_updated_at();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_pdf_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pdf_processing_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cache access tracking
CREATE OR REPLACE FUNCTION update_pdf_cache_access(cache_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE pdf_processing_cache
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get PDF processing statistics for a user
CREATE OR REPLACE FUNCTION get_user_pdf_processing_stats(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_files_processed', COUNT(*),
        'total_pages_processed', COALESCE(SUM(pages_processed), 0),
        'total_images_found', COALESCE(SUM(images_found), 0),
        'total_measurements_found', COALESCE(SUM(measurements_found), 0),
        'average_file_size', COALESCE(AVG(file_size), 0),
        'files_with_text', COUNT(*) FILTER (WHERE text_extracted = true),
        'files_with_measurements', COUNT(*) FILTER (WHERE measurements_found > 0),
        'files_with_images', COUNT(*) FILTER (WHERE images_found > 0),
        'most_recent_processing', MAX(created_at),
        'processing_success_rate', 
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    (COUNT(*) FILTER (WHERE pages_processed > 0)::FLOAT / COUNT(*)::FLOAT) * 100
                ELSE 0 
            END
    )
    INTO stats
    FROM pdf_processing_history
    WHERE user_id = target_user_id;

    RETURN COALESCE(stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search PDF processing history
CREATE OR REPLACE FUNCTION search_pdf_processing_history(
    target_user_id UUID,
    search_term TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    file_size INTEGER,
    pages_processed INTEGER,
    text_extracted BOOLEAN,
    images_found INTEGER,
    measurements_found INTEGER,
    building_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.filename,
        h.file_size,
        h.pages_processed,
        h.text_extracted,
        h.images_found,
        h.measurements_found,
        h.building_analysis,
        h.created_at
    FROM pdf_processing_history h
    WHERE h.user_id = target_user_id
        AND (search_term IS NULL OR h.filename ILIKE '%' || search_term || '%')
    ORDER BY h.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_processing_history TO authenticated;
GRANT SELECT ON pdf_processing_cache TO authenticated;
GRANT ALL ON pdf_processing_cache TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_expired_pdf_cache() TO service_role;
GRANT EXECUTE ON FUNCTION update_pdf_cache_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pdf_processing_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_pdf_processing_history(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE pdf_processing_history IS 'Stores history of PDF processing operations for user tracking and analytics';
COMMENT ON TABLE pdf_processing_cache IS 'Caches PDF processing results to avoid reprocessing identical files';

COMMENT ON FUNCTION cleanup_expired_pdf_cache() IS 'Removes expired cache entries to keep the cache table clean';
COMMENT ON FUNCTION update_pdf_cache_access(UUID) IS 'Updates access tracking for cache entries';
COMMENT ON FUNCTION get_user_pdf_processing_stats(UUID) IS 'Returns comprehensive PDF processing statistics for a user';
COMMENT ON FUNCTION search_pdf_processing_history(UUID, TEXT, INTEGER, INTEGER) IS 'Searches PDF processing history with optional text filtering';

-- ============================================
-- STORAGE BUCKET POLICIES AND HELPER FUNCTIONS
-- ============================================

-- Policy for photos bucket (public read, authenticated upload)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);

-- Policy for documents bucket (private, authenticated only)
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner
);

-- Policy for avatars bucket (public read, user-specific write)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Helper function to get signed URL for private files
CREATE OR REPLACE FUNCTION get_signed_url(
  bucket_name TEXT,
  file_path TEXT,
  expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- This is a placeholder - actual implementation would use Supabase's signing mechanism
  -- In practice, you'd call this from your application using the Supabase client
  signed_url := format('%s/storage/v1/object/sign/%s/%s?token=TEMP&expires=%s',
    current_setting('app.settings.supabase_url', true),
    bucket_name,
    file_path,
    extract(epoch from now() + (expires_in || ' seconds')::interval)::text
  );
  
  RETURN signed_url;
END;
$$;

-- Helper function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
  bucket_name TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  max_size BIGINT;
  allowed_types TEXT[];
BEGIN
  -- Set limits based on bucket
  CASE bucket_name
    WHEN 'photos' THEN
      max_size := 10485760; -- 10MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    WHEN 'documents' THEN
      max_size := 52428800; -- 50MB
      allowed_types := ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    WHEN 'avatars' THEN
      max_size := 5242880; -- 5MB
      allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png'];
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Check file size
  IF file_size > max_size THEN
    RETURN FALSE;
  END IF;
  
  -- Check mime type
  IF NOT (mime_type = ANY(allowed_types)) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files(
  retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This would identify and remove files not referenced in any tables
  -- Implementation depends on your specific use case
  
  -- Example: Clean up temporary upload files older than retention_days
  DELETE FROM storage.objects
  WHERE bucket_id IN ('photos', 'documents', 'avatars')
    AND created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND name LIKE 'temp/%';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_signed_url TO authenticated;
GRANT EXECUTE ON FUNCTION validate_file_upload TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_files TO authenticated;

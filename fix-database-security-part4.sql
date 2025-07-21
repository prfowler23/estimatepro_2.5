-- EstimatePro Database Security Fixes - Part 4
-- Verification Function

-- ===========================================
-- PART 6: Security Verification Function
-- ===========================================

CREATE OR REPLACE FUNCTION verify_security_fixes()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if problematic views are removed
    RETURN QUERY
    SELECT 
        'Security Definer Views'::TEXT,
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name IN ('service_type_stats', 'quote_summary', 'integration_health_view')) 
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'Problematic SECURITY DEFINER views removed'::TEXT;

    -- Check if RLS is enabled on estimation_flows_backup
    RETURN QUERY
    SELECT 
        'RLS on estimation_flows_backup'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'estimation_flows_backup' AND rowsecurity = true)
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'RLS enabled on estimation_flows_backup table'::TEXT;

    -- Check if user_metadata references are removed from RLS policies
    RETURN QUERY
    SELECT 
        'user_metadata in RLS'::TEXT,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE definition LIKE '%user_metadata%'
            )
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'No RLS policies reference user_metadata'::TEXT;

    -- Check if secure functions exist
    RETURN QUERY
    SELECT 
        'Secure Functions Created'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name IN ('get_service_type_stats', 'get_quote_summary', 'get_integration_health'))
            THEN 'FIXED'::TEXT
            ELSE 'FAILED'::TEXT
        END,
        'Secure replacement functions created'::TEXT;
END $$;

GRANT EXECUTE ON FUNCTION verify_security_fixes() TO authenticated;
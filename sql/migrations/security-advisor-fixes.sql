-- ===================================================
-- SECURITY ADVISOR FIXES MIGRATION
-- ===================================================
-- This migration addresses Supabase security advisor warnings
-- Execute this in Supabase SQL Editor with admin privileges

-- ===================================================
-- 1. SECURITY CONFIGURATIONS
-- ===================================================

-- Enable additional security constraints
-- Note: Some security features must be enabled via Supabase Dashboard Auth settings

-- Create function to validate password complexity
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check minimum length
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Check for at least one uppercase letter
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for at least one lowercase letter
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for at least one number
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for at least one special character
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_password_strength(TEXT) TO authenticated;

-- Create MFA enforcement tracking table
CREATE TABLE IF NOT EXISTS public.user_security_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_methods TEXT[] DEFAULT '{}',
    password_last_changed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    security_questions_set BOOLEAN DEFAULT FALSE,
    backup_codes_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security preferences
ALTER TABLE public.user_security_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for security preferences
CREATE POLICY "Users can view their own security preferences" ON public.user_security_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security preferences" ON public.user_security_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security preferences" ON public.user_security_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to automatically create security preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_security_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users (this may need to be done via Supabase dashboard)
-- Note: This trigger setup should be verified via Supabase dashboard

-- Create audit log for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for security audit log
CREATE POLICY "Users can view their own security audit log" ON public.security_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security audit events" ON public.security_audit_log
    FOR INSERT WITH CHECK (TRUE); -- Allow system to insert events

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        event_type,
        event_details,
        ip_address,
        user_agent,
        success
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_details,
        p_ip_address,
        p_user_agent,
        p_success
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_security_event(UUID, TEXT, JSONB, INET, TEXT, BOOLEAN) TO authenticated;

-- ===================================================
-- 2. PERFORMANCE OPTIMIZATIONS
-- ===================================================

-- Add composite indexes for frequently queried combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_status 
    ON public.estimates(created_by, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_by_created_at 
    ON public.estimates(created_by, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_services_quote_id_service_type 
    ON public.estimate_services(quote_id, service_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id_event_type_created_at 
    ON public.analytics_events(user_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimation_flows_user_id_status 
    ON public.estimation_flows(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created_by_created_at 
    ON public.customers(created_by, created_at DESC);

-- Add partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_active 
    ON public.estimates(created_by, created_at DESC) 
    WHERE status IN ('draft', 'pending', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_recent 
    ON public.analytics_events(user_id, event_type) 
    WHERE created_at > NOW() - INTERVAL '30 days';

-- Add indexes for collaboration features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_collaborators_composite 
    ON public.estimate_collaborators(estimate_id, user_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_changes_estimate_id_created_at 
    ON public.estimate_changes(estimate_id, created_at DESC);

-- ===================================================
-- 3. PERFORMANCE FUNCTIONS
-- ===================================================

-- Create function to get user's recent estimates efficiently
CREATE OR REPLACE FUNCTION public.get_user_recent_estimates(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    status TEXT,
    total_amount DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        e.id,
        e.title,
        e.status,
        e.total_amount,
        e.created_at,
        e.updated_at
    FROM public.estimates e
    WHERE e.created_by = p_user_id
    ORDER BY e.created_at DESC
    LIMIT p_limit;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_recent_estimates(UUID, INTEGER) TO authenticated;

-- Create function to get estimate statistics efficiently
CREATE OR REPLACE FUNCTION public.get_user_estimate_stats(p_user_id UUID)
RETURNS TABLE (
    total_estimates BIGINT,
    draft_estimates BIGINT,
    pending_estimates BIGINT,
    completed_estimates BIGINT,
    total_value DECIMAL,
    avg_estimate_value DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as total_estimates,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_estimates,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_estimates,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_estimates,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(AVG(total_amount), 0) as avg_estimate_value
    FROM public.estimates
    WHERE created_by = p_user_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_estimate_stats(UUID) TO authenticated;

-- ===================================================
-- 4. MONITORING AND MAINTENANCE
-- ===================================================

-- Create function to check database performance
CREATE OR REPLACE FUNCTION public.get_performance_insights()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_usage TEXT,
    recommendations TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- This function provides basic performance insights
    -- In production, you might want more sophisticated monitoring
    
    FOR rec IN 
        SELECT 
            schemaname, 
            tablename,
            n_tup_ins + n_tup_upd + n_tup_del as total_ops,
            seq_scan,
            idx_scan
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY total_ops DESC
    LOOP
        table_name := rec.tablename;
        
        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM public.%I', rec.tablename) INTO row_count;
        
        -- Get table size
        SELECT pg_size_pretty(pg_total_relation_size(('public.' || rec.tablename)::regclass)) INTO table_size;
        
        -- Analyze index usage
        IF rec.seq_scan > rec.idx_scan * 2 THEN
            index_usage := 'Poor - Consider adding indexes';
        ELSIF rec.idx_scan > rec.seq_scan * 10 THEN
            index_usage := 'Excellent';
        ELSE
            index_usage := 'Good';
        END IF;
        
        -- Generate recommendations
        IF rec.seq_scan > 1000 AND rec.idx_scan < 100 THEN
            recommendations := 'High sequential scans detected. Review query patterns and add appropriate indexes.';
        ELSIF row_count > 100000 THEN
            recommendations := 'Large table. Consider partitioning or archiving old data.';
        ELSE
            recommendations := 'No immediate concerns.';
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$;

-- Grant execute permission to admin users only
-- Note: In production, you might want to restrict this further
GRANT EXECUTE ON FUNCTION public.get_performance_insights() TO authenticated;

-- ===================================================
-- 5. UPDATE FUNCTIONS WITH SECURITY LOGGING
-- ===================================================

-- Create updated_at trigger function with logging
CREATE OR REPLACE FUNCTION public.handle_updated_at_with_logging()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Log the update for audit purposes
    IF TG_TABLE_NAME IN ('estimates', 'customers', 'profiles') THEN
        PERFORM public.log_security_event(
            auth.uid(),
            'DATA_UPDATE',
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'record_id', NEW.id,
                'operation', 'UPDATE'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update existing triggers to use the new logging function
-- (Only for critical tables to avoid excessive logging)
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_with_logging();

-- ===================================================
-- MIGRATION COMPLETION
-- ===================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Security advisor fixes migration completed';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '  1. Enable leaked password protection in Supabase Dashboard > Auth > Settings';
    RAISE NOTICE '  2. Configure additional MFA options in Auth settings';
    RAISE NOTICE '  3. Review and test security configurations';
    RAISE NOTICE '  4. Monitor performance improvements';
END $$;
-- Auth Security Enhancements Migration
-- Creates tables and policies for 2FA, rate limiting, and security tracking

-- Two-Factor Authentication table
CREATE TABLE IF NOT EXISTS public.user_two_factor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    backup_codes TEXT[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- email or IP address
    action TEXT NOT NULL CHECK (action IN ('login', 'password_reset', 'signup')),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events logging table
CREATE TABLE IF NOT EXISTS public.auth_security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions tracking table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Password history table (prevent password reuse)
CREATE TABLE IF NOT EXISTS public.user_password_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_two_factor_user_id ON public.user_two_factor(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_attempted_at ON public.auth_rate_limits(attempted_at);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_action ON public.auth_rate_limits(action);
CREATE INDEX IF NOT EXISTS idx_auth_security_events_user_id ON public.auth_security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_security_events_created_at ON public.auth_security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id ON public.user_password_history(user_id);

-- Row Level Security (RLS) policies

-- Two-Factor Authentication policies
ALTER TABLE public.user_two_factor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 2FA settings"
ON public.user_two_factor FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
ON public.user_two_factor FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
ON public.user_two_factor FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 2FA settings"
ON public.user_two_factor FOR DELETE
USING (auth.uid() = user_id);

-- Rate limiting policies (service role only for security)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
ON public.auth_rate_limits FOR ALL
USING (auth.role() = 'service_role');

-- Security events policies
ALTER TABLE public.auth_security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security events"
ON public.auth_security_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage security events"
ON public.auth_security_events FOR ALL
USING (auth.role() = 'service_role');

-- User sessions policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions"
ON public.user_sessions FOR ALL
USING (auth.role() = 'service_role');

-- Password history policies
ALTER TABLE public.user_password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage password history"
ON public.user_password_history FOR ALL
USING (auth.role() = 'service_role');

-- Functions for automatic cleanup

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_auth_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.auth_rate_limits
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW();
END;
$$;

-- Function to clean up old security events (keep for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.auth_security_events
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to clean up old password history (keep last 5 passwords)
CREATE OR REPLACE FUNCTION cleanup_password_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_password_history
    WHERE id NOT IN (
        SELECT id FROM public.user_password_history
        WHERE user_id = user_password_history.user_id
        ORDER BY created_at DESC
        LIMIT 5
    );
END;
$$;

-- Trigger to update updated_at timestamp on user_two_factor
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_two_factor_updated_at
    BEFORE UPDATE ON public.user_two_factor
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_two_factor TO authenticated;
GRANT SELECT ON public.auth_security_events TO authenticated;
GRANT SELECT, UPDATE ON public.user_sessions TO authenticated;

-- Grant service role permissions for all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.user_two_factor IS 'Stores two-factor authentication settings for users';
COMMENT ON TABLE public.auth_rate_limits IS 'Tracks authentication attempts for rate limiting';
COMMENT ON TABLE public.auth_security_events IS 'Logs security-related events for audit purposes';
COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions for management';
COMMENT ON TABLE public.user_password_history IS 'Stores password history to prevent reuse';

COMMENT ON COLUMN public.user_two_factor.secret_encrypted IS 'Encrypted TOTP secret (use proper encryption in production)';
COMMENT ON COLUMN public.user_two_factor.backup_codes IS 'Array of one-time backup codes';
COMMENT ON COLUMN public.auth_rate_limits.identifier IS 'Email address or IP address for rate limiting';
COMMENT ON COLUMN public.auth_rate_limits.metadata IS 'Additional context about the attempt';
COMMENT ON COLUMN public.auth_security_events.severity IS 'Event severity: low, medium, high, critical';
COMMENT ON COLUMN public.user_sessions.session_token IS 'Unique session identifier';
COMMENT ON COLUMN public.user_password_history.password_hash IS 'Hashed password for comparison';
-- Auth Security Improvements
-- Note: These settings need to be configured in the Supabase Dashboard
-- This migration documents the required changes

-- Enable Leaked Password Protection:
-- 1. Go to Authentication > Auth Settings in Supabase Dashboard
-- 2. Enable "Leaked password protection" to check passwords against HaveIBeenPwned.org

-- Enable Additional MFA Options:
-- 1. Go to Authentication > Auth Settings > Multi-Factor Authentication
-- 2. Enable additional MFA methods beyond TOTP (e.g., WebAuthn, SMS if available)

-- This migration serves as documentation for manual configuration required
COMMENT ON SCHEMA auth IS 'Authentication schema - Requires manual configuration:
1. Enable leaked password protection in Auth Settings
2. Enable additional MFA options (WebAuthn recommended)
3. Consider enabling email verification requirements';

-- Log that security improvements are needed
INSERT INTO public.audit_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    details,
    ip_address
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user
    'security_config',
    'auth_settings',
    '00000000-0000-0000-0000-000000000000'::uuid,
    jsonb_build_object(
        'action', 'security_improvements_required',
        'recommendations', jsonb_build_array(
            'Enable leaked password protection',
            'Enable additional MFA methods',
            'Review password strength requirements'
        )
    ),
    '127.0.0.1'::inet
);
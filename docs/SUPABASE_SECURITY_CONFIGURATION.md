# Supabase Dashboard Security Configuration Guide

## Overview

This guide covers the manual security configuration steps that must be performed in the Supabase Dashboard to complete the enterprise-grade security implementation for EstimatePro 2.5.

## Prerequisites

- Admin access to Supabase Dashboard for EstimatePro project
- Project URL: [Your project URL from SUPABASE_URL env var]
- Service role access for configuration changes

## Manual Configuration Steps

### 1. Enable Leaked Password Protection

**Purpose**: Prevent users from using compromised passwords from known data breaches.

**Steps**:

1. Navigate to **Authentication** → **Settings** in Supabase Dashboard
2. Scroll to **Security** section
3. Locate **Leaked Password Protection**
4. Toggle **Enable leaked password protection** to ON
5. Configure settings:
   - **Block signup with leaked passwords**: ✅ Enable
   - **Block password reset with leaked passwords**: ✅ Enable
   - **Notify users when leaked password detected**: ✅ Enable
6. Click **Save** to apply changes

**Validation**: Test with a known leaked password (e.g., "password123") - signup should be blocked with appropriate error message.

### 2. Configure Multi-Factor Authentication (MFA) Settings

**Purpose**: Enforce enterprise-grade MFA policies and configure backup options.

#### 2.1 Enable MFA Enforcement

1. Navigate to **Authentication** → **Settings**
2. Scroll to **Multi-Factor Authentication** section
3. Configure MFA settings:
   - **Enable MFA**: ✅ ON
   - **MFA enforcement**: Select "Required for all users" or "Optional" (recommended: Optional for gradual rollout)
   - **Max enrolled factors per user**: 3
   - **Factor types allowed**:
     - ✅ TOTP (Time-based One-Time Password)
     - ✅ Phone (if SMS provider configured)

#### 2.2 Configure TOTP Settings

1. Under **TOTP Configuration**:
   - **Issuer name**: "EstimatePro"
   - **Period**: 30 seconds (default)
   - **Digits**: 6 (default)
   - **Algorithm**: SHA-1 (default)

#### 2.3 Backup Code Configuration

1. Under **Recovery Codes**:
   - **Enable recovery codes**: ✅ ON
   - **Number of codes to generate**: 8
   - **Code length**: 6 characters
   - **Allow code reuse**: ❌ OFF

### 3. Configure Session and Security Policies

#### 3.1 Session Management

1. Navigate to **Authentication** → **Settings**
2. Under **Session Management**:
   - **Session timeout**: 24 hours (recommended)
   - **Refresh token rotation**: ✅ Enable
   - **Refresh token reuse interval**: 10 seconds

#### 3.2 Password Policy

1. Under **Password Policy**:
   - **Minimum length**: 8 characters
   - **Require uppercase**: ✅ Enable
   - **Require lowercase**: ✅ Enable
   - **Require numbers**: ✅ Enable
   - **Require special characters**: ✅ Enable
   - **Prevent common passwords**: ✅ Enable

### 4. Email Security Configuration

**Purpose**: Secure email communications and prevent spoofing.

1. Navigate to **Authentication** → **Settings**
2. Under **Email** section:
   - **Secure email links**: ✅ Enable
   - **Double confirm email changes**: ✅ Enable
   - **Email OTP expiry**: 3600 seconds (1 hour)

### 5. Rate Limiting Configuration

**Purpose**: Prevent brute force attacks and abuse.

1. Navigate to **Authentication** → **Rate Limiting**
2. Configure rate limits:
   - **Sign in attempts**: 5 per hour per IP
   - **Sign up attempts**: 3 per hour per IP
   - **Password reset attempts**: 3 per hour per email
   - **Email confirmation requests**: 3 per hour per email

### 6. Configure Audit Logging

**Purpose**: Track security events and authentication activities.

1. Navigate to **Settings** → **Logs**
2. Configure log retention:
   - **Auth logs retention**: 90 days (maximum available)
   - **Realtime logs retention**: 30 days
   - **Database logs retention**: 7 days

### 7. Database Security Validation

**Purpose**: Verify RLS policies and security functions are properly configured.

1. Navigate to **SQL Editor**
2. Run validation queries:

```sql
-- Verify RLS is enabled on critical tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'estimates', 'facade_analyses', 'audit_logs');

-- Check auth security functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name LIKE '%security%';

-- Verify MFA factors table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'auth'
AND table_name = 'mfa_factors';
```

### 8. Security Headers Configuration

**Purpose**: Configure additional security headers for web requests.

1. Navigate to **Edge Functions** (if using custom auth)
2. Or configure in your Next.js middleware for additional headers:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`

## Validation and Testing

### 1. Test MFA Flow

1. Create a test user account
2. Enable TOTP using the MFASetup component
3. Generate backup codes
4. Test login with MFA challenge
5. Test backup code usage

### 2. Test Password Security

1. Attempt signup with leaked password - should be blocked
2. Test password strength requirements
3. Verify password reset flow with MFA

### 3. Test Rate Limiting

1. Attempt multiple failed login attempts
2. Verify rate limiting kicks in after configured attempts
3. Test from different IP addresses

### 4. Audit Log Verification

1. Perform various auth actions (login, signup, MFA setup)
2. Check **Authentication** → **Logs** for recorded events
3. Verify sensitive actions are logged

## Post-Configuration Checklist

- [ ] Leaked password protection enabled and tested
- [ ] MFA enforcement configured (Optional recommended for initial rollout)
- [ ] TOTP settings configured with "EstimatePro" issuer
- [ ] Backup codes enabled (8 codes, 6 characters each)
- [ ] Session timeout set to 24 hours with refresh token rotation
- [ ] Strong password policy enabled (8+ chars, mixed case, numbers, symbols)
- [ ] Rate limiting configured for all auth endpoints
- [ ] Audit logging enabled with 90-day retention
- [ ] RLS policies verified on all critical tables
- [ ] Test user MFA flow completed successfully

## Security Monitoring

### Ongoing Security Tasks

1. **Weekly**: Review authentication logs for suspicious activity
2. **Monthly**: Audit MFA enrollment rates and backup code usage
3. **Quarterly**: Review and update password policies
4. **As needed**: Investigate failed login patterns and potential attacks

### Key Metrics to Monitor

- Failed login attempt patterns
- MFA enrollment percentage
- Password reset frequency
- Backup code usage rates
- Rate limiting triggers

## Troubleshooting

### Common Issues

1. **MFA enrollment fails**
   - Check TOTP configuration settings
   - Verify time synchronization on user devices
   - Ensure QR code is generated correctly

2. **Leaked password protection too restrictive**
   - Consider temporarily lowering sensitivity
   - Provide clear user guidance on password requirements

3. **Rate limiting too aggressive**
   - Adjust limits based on legitimate user patterns
   - Consider IP whitelisting for office networks

### Support Resources

- Supabase Documentation: https://supabase.com/docs/guides/auth
- Security Best Practices: https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts
- MFA Implementation: https://supabase.com/docs/guides/auth/auth-mfa

## Completion

Once all steps are completed and validated:

1. Document completion date and configured settings
2. Share access credentials with security team
3. Schedule first security review in 30 days
4. Update monitoring dashboards to include new security metrics

**Configuration completed by**: **\*\*\*\***\_**\*\*\*\***
**Date**: **\*\*\*\***\_**\*\*\*\***
**Validated by**: **\*\*\*\***\_**\*\*\*\***

## Security Contact

For questions or issues with this configuration:

- Technical Lead: [Contact information]
- Security Team: [Contact information]
- Supabase Support: https://supabase.com/support

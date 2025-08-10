# Security Configuration Guide - EstimatePro

This guide covers the complete security configuration for EstimatePro, including database-level security, authentication enhancements, and manual dashboard configuration steps.

## Overview

### ✅ Completed Security Infrastructure

**Applied Database Migrations:**

- ✅ `20250202000000_auth_security_enhancements` - Complete auth security infrastructure
- ✅ `fix_function_search_path_security` - Fixed function security vulnerabilities

**Security Tables Created:**

- ✅ `user_two_factor` - Two-factor authentication settings with RLS policies
- ✅ `auth_rate_limits` - Authentication attempt tracking for rate limiting
- ✅ `auth_security_events` - Security event logging and audit trail
- ✅ `user_sessions` - Active session management with RLS policies
- ✅ `user_password_history` - Password history to prevent reuse

**Security Functions Deployed:**

- ✅ `cleanup_auth_rate_limits()` - Automatic cleanup of old rate limit records (24h retention)
- ✅ `cleanup_expired_sessions()` - Automatic cleanup of expired sessions
- ✅ `cleanup_old_security_events()` - 90-day retention for security events
- ✅ `cleanup_password_history()` - Keep last 5 passwords per user
- ✅ All functions secured with `SET search_path = public` to prevent injection attacks

**Row Level Security (RLS):**

- ✅ Comprehensive RLS policies on all security tables
- ✅ Users can only access their own data (2FA settings, security events, sessions)
- ✅ Service role has administrative access for rate limiting and security management

### ⚠️ Manual Configuration Required

**Remaining Security Issues:**

1. Leaked Password Protection Disabled (WARN) - **Dashboard configuration needed**
2. Insufficient MFA Options (WARN) - **Dashboard configuration needed**

## Phase 1: Enable Leaked Password Protection

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your EstimatePro project
3. Navigate to **Authentication** > **Settings**

### Step 2: Enable Password Protection Features

1. Scroll to **Password Settings** section
2. Enable **"Check for breached passwords"**
   - Toggle ON "Prevent sign-ups with breached passwords"
   - This integrates with HaveIBeenPwned.org database
3. Configure **Password Requirements**:
   - Minimum length: 8 characters (recommended: 12+)
   - Require uppercase letters: YES
   - Require lowercase letters: YES
   - Require numbers: YES
   - Require special characters: YES

### Step 3: Test Password Protection

```bash
# Test with known compromised password
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
-H 'apikey: your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "email": "test@example.com",
  "password": "password123"
}'

# Should return error about compromised password
```

## Phase 2: Configure Multi-Factor Authentication (MFA)

### Step 1: Enable MFA Options in Dashboard

1. In **Authentication** > **Settings**
2. Scroll to **Multi-Factor Authentication** section
3. Enable the following options:

#### TOTP (Time-based One-Time Password)

- Toggle ON "Enable TOTP"
- Set TOTP issuer name: "EstimatePro"
- Maximum enrollment attempts: 3

#### Email-based MFA (Backup Option)

- Toggle ON "Enable Email OTP"
- Configure email template for MFA codes
- Set code expiry: 10 minutes

#### Phone/SMS MFA (Optional - requires Twilio)

- Toggle ON "Enable Phone authentication" (if SMS provider configured)
- Note: Requires additional Twilio configuration

### Step 2: Configure MFA Enforcement Rules

1. Navigate to **Authentication** > **Policies**
2. Set MFA enforcement level:
   - **Optional**: Users can choose to enable MFA
   - **Required**: All users must enable MFA (recommended for production)
   - **Conditional**: Required for admin users or sensitive operations

### Step 3: Update Authentication Flow in Application

#### Frontend MFA Integration

```typescript
// lib/auth/mfa-service.ts
import { createClient } from "@/lib/supabase/client";

export class MFAService {
  private supabase = createClient();

  async enrollTOTP() {
    try {
      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("MFA enrollment failed:", error);
      throw error;
    }
  }

  async verifyTOTP(factorId: string, challengeId: string, code: string) {
    try {
      const { data, error } = await this.supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("MFA verification failed:", error);
      throw error;
    }
  }

  async getUserMFAFactors() {
    try {
      const { data, error } = await this.supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Failed to get MFA factors:", error);
      throw error;
    }
  }
}
```

#### Create MFA Enrollment Component

```typescript
// components/auth/MFAEnrollment.tsx
'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { MFAService } from '@/lib/auth/mfa-service'

export function MFAEnrollment() {
  const [qrCode, setQRCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [challengeId, setChallengeId] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')

  const mfaService = new MFAService()

  useEffect(() => {
    enrollMFA()
  }, [])

  const enrollMFA = async () => {
    try {
      const enrollment = await mfaService.enrollTOTP()
      setQRCode(enrollment.totp.qr_code)
      setSecret(enrollment.totp.secret)
      setFactorId(enrollment.id)
    } catch (error) {
      console.error('MFA enrollment failed:', error)
    }
  }

  const verifyAndComplete = async () => {
    try {
      await mfaService.verifyTOTP(factorId, challengeId, verificationCode)
      // MFA setup complete
      window.location.reload()
    } catch (error) {
      console.error('MFA verification failed:', error)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Set Up Two-Factor Authentication</h2>

      {qrCode && (
        <div className="mb-4">
          <p className="mb-2">Scan this QR code with your authenticator app:</p>
          <QRCodeSVG value={qrCode} size={200} />
          <p className="text-sm text-gray-600 mt-2">
            Or enter this secret manually: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Enter verification code from your authenticator app:
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter 6-digit code"
        />
      </div>

      <button
        onClick={verifyAndComplete}
        disabled={verificationCode.length !== 6}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        Verify and Complete Setup
      </button>
    </div>
  )
}
```

## Phase 3: Application-Level Security Enhancements

### Step 1: Apply Database Migration

```bash
# Apply the security fixes migration
psql -h your-db-host -U postgres -d your-db-name -f sql/migrations/security-advisor-fixes.sql
```

### Step 2: Update Authentication Middleware

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if MFA is required and configured
  if (user && !request.nextUrl.pathname.startsWith("/auth/mfa")) {
    const { data: factors } = await supabase.auth.mfa.listFactors();

    // If no MFA factors are enrolled and MFA is required
    if (!factors?.all?.length) {
      return NextResponse.redirect(new URL("/auth/mfa/setup", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Step 3: Update User Settings Page

Add MFA management to user settings:

```typescript
// components/settings/SecuritySettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { MFAService } from '@/lib/auth/mfa-service'
import { Button } from '@/components/ui/button'

export function SecuritySettings() {
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const mfaService = new MFAService()

  useEffect(() => {
    loadMFAFactors()
  }, [])

  const loadMFAFactors = async () => {
    try {
      const factors = await mfaService.getUserMFAFactors()
      setMfaFactors(factors?.all || [])
    } catch (error) {
      console.error('Failed to load MFA factors:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">
          Secure your account with additional verification methods.
        </p>
      </div>

      <div className="space-y-4">
        {mfaFactors.length > 0 ? (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-700">✓ Two-factor authentication is enabled</p>
            <p className="text-sm text-green-600">
              You have {mfaFactors.length} authentication method(s) configured.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-700">⚠ Two-factor authentication is not set up</p>
            <p className="text-sm text-yellow-600">
              Enable 2FA to secure your account against unauthorized access.
            </p>
            <Button className="mt-2" onClick={() => window.location.href = '/auth/mfa/setup'}>
              Set Up 2FA
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

## Phase 4: Testing and Validation

### Test Security Configurations

1. **Test Password Protection:**

   ```bash
   # Try to register with a weak/breached password
   # Should be rejected
   ```

2. **Test MFA Flow:**
   - Register new user
   - Verify MFA enrollment is required/optional as configured
   - Test TOTP code verification
   - Test backup methods

3. **Test Security Audit Logging:**
   ```sql
   -- Check security events are being logged
   SELECT * FROM public.security_audit_log ORDER BY created_at DESC LIMIT 10;
   ```

### Monitor Performance Improvements

1. **Check Database Performance:**

   ```sql
   -- Run the performance insights function
   SELECT * FROM public.get_performance_insights();
   ```

2. **Monitor Query Performance:**
   ```sql
   -- Check index usage
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC;
   ```

## Configuration Checklist

### Supabase Dashboard Configuration

- [ ] Leaked password protection enabled
- [ ] Password complexity requirements set
- [ ] TOTP MFA enabled
- [ ] Email MFA enabled as backup
- [ ] MFA enforcement level configured

### Database Configuration

- [ ] Security migration applied
- [ ] New indexes created
- [ ] Security audit logging enabled
- [ ] Performance functions created

### Application Configuration

- [ ] MFA enrollment component implemented
- [ ] Security settings page updated
- [ ] Middleware updated for MFA checks
- [ ] Testing completed

### Monitoring Setup

- [ ] Security event monitoring
- [ ] Performance monitoring
- [ ] Failed login attempt tracking
- [ ] Database performance alerts

## Next Steps

1. Apply the database migration
2. Configure Supabase Dashboard settings
3. Deploy application updates
4. Test all security features
5. Monitor performance improvements
6. Set up ongoing security monitoring

## Security Notes

- Always test security changes in a development environment first
- Keep backup access methods available during MFA setup
- Monitor security logs regularly for suspicious activities
- Review and update security policies periodically
- Consider implementing additional security measures like IP allowlisting for admin users

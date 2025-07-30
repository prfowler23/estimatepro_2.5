const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SECURITY_MONITORING_SQL = `
-- ============================================
-- SECURITY MONITORING SETUP
-- ============================================

-- 1. Create security events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access security events
CREATE POLICY "Service role only" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for efficient querying
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);

-- 2. Create failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  error_type TEXT,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only" ON failed_login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_locked ON failed_login_attempts(locked_until);

-- 3. Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  rate_limited BOOLEAN DEFAULT FALSE,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own usage
CREATE POLICY "Users can view own usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access" ON api_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_created_at ON api_usage_logs(created_at DESC);

-- 4. Create suspicious activity alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only service role and admins
CREATE POLICY "Service role and admin access" ON security_alerts
  FOR ALL USING (
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Create functions for security monitoring

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type, severity, user_id, ip_address, user_agent,
    endpoint, method, status_code, error_message, metadata
  ) VALUES (
    p_event_type, p_severity, p_user_id, p_ip_address, p_user_agent,
    p_endpoint, p_method, p_status_code, p_error_message, p_metadata
  ) RETURNING id INTO v_event_id;
  
  -- Create alert for high/critical events
  IF p_severity IN ('high', 'critical') THEN
    INSERT INTO security_alerts (
      alert_type, severity, title, description, user_id, ip_address, metadata
    ) VALUES (
      p_event_type, p_severity,
      'Security Event: ' || p_event_type,
      p_error_message,
      p_user_id, p_ip_address, p_metadata
    );
  END IF;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track failed login attempts
CREATE OR REPLACE FUNCTION track_failed_login(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_error_type TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_attempt_count INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Check if record exists
  SELECT attempt_count, locked_until 
  INTO v_attempt_count, v_locked_until
  FROM failed_login_attempts 
  WHERE email = p_email 
  AND ip_address = p_ip_address
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF FOUND THEN
    -- Update existing record
    UPDATE failed_login_attempts
    SET attempt_count = attempt_count + 1,
        updated_at = NOW(),
        locked_until = CASE 
          WHEN attempt_count >= 4 THEN NOW() + INTERVAL '15 minutes'
          ELSE locked_until
        END
    WHERE email = p_email 
    AND ip_address = p_ip_address
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Log security event if multiple attempts
    IF v_attempt_count >= 3 THEN
      PERFORM log_security_event(
        'multiple_failed_logins',
        CASE WHEN v_attempt_count >= 5 THEN 'high' ELSE 'medium' END,
        NULL,
        p_ip_address,
        p_user_agent,
        '/auth/login',
        'POST',
        401,
        'Multiple failed login attempts for ' || p_email,
        jsonb_build_object('email', p_email, 'attempts', v_attempt_count + 1)
      );
    END IF;
  ELSE
    -- Insert new record
    INSERT INTO failed_login_attempts (
      email, ip_address, user_agent, error_type
    ) VALUES (
      p_email, p_ip_address, p_user_agent, p_error_type
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create views for monitoring dashboards

-- Security overview
CREATE OR REPLACE VIEW security_overview AS
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
  COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_24h,
  COUNT(*) FILTER (WHERE severity = 'high' AND created_at > NOW() - INTERVAL '24 hours') as high_24h,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as affected_users_24h
FROM security_events;

-- Failed login summary
CREATE OR REPLACE VIEW failed_login_summary AS
SELECT 
  COUNT(*) as total_attempts,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) FILTER (WHERE locked_until > NOW()) as currently_locked
FROM failed_login_attempts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- API usage summary
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
  endpoint,
  method,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
  COUNT(*) FILTER (WHERE rate_limited = true) as rate_limited_count
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Grant access to views
GRANT SELECT ON security_overview TO authenticated;
GRANT SELECT ON failed_login_summary TO authenticated;
GRANT SELECT ON api_usage_summary TO authenticated;
`;

async function setupSecurityMonitoring() {
  console.log("🔒 Setting up security monitoring...\n");

  try {
    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", {
      query: SECURITY_MONITORING_SQL,
    });

    if (error) {
      // If exec_sql doesn't exist, we need to create the tables differently
      console.log(
        "exec_sql function not found, creating monitoring setup script instead...",
      );

      // Save SQL to file for manual execution
      const fs = require("fs");
      fs.writeFileSync(
        "./scripts/security-monitoring-tables.sql",
        SECURITY_MONITORING_SQL,
      );

      console.log(
        "✅ Security monitoring SQL saved to: scripts/security-monitoring-tables.sql",
      );
      console.log("\n📋 Please run this SQL in your Supabase dashboard:");
      console.log("   1. Go to the SQL Editor in Supabase");
      console.log(
        "   2. Paste the contents of scripts/security-monitoring-tables.sql",
      );
      console.log("   3. Execute the query");

      return;
    }

    console.log("✅ Security monitoring tables created successfully!");

    // Test the functions
    console.log("\n🧪 Testing security functions...");

    // Test logging a security event
    const { data: eventId, error: eventError } = await supabase.rpc(
      "log_security_event",
      {
        p_event_type: "setup_complete",
        p_severity: "low",
        p_endpoint: "/scripts/setup-security-monitoring",
        p_method: "SCRIPT",
        p_metadata: { message: "Security monitoring setup completed" },
      },
    );

    if (eventError) {
      console.log(
        "⚠️  Could not test security event logging:",
        eventError.message,
      );
    } else {
      console.log("✅ Security event logging tested successfully");
    }

    console.log("\n📊 Security Monitoring Setup Complete!");
    console.log("\nNext steps:");
    console.log("1. Update your API endpoints to log security events");
    console.log("2. Implement failed login tracking in your auth flow");
    console.log("3. Create a dashboard to view security metrics");
    console.log("4. Set up alerts for critical security events");
    console.log("5. Configure automated responses to threats");
  } catch (error) {
    console.error("❌ Error setting up security monitoring:", error);
    process.exit(1);
  }
}

// Run the setup
setupSecurityMonitoring();

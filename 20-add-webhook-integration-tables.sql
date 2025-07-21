-- Webhook Integration System Tables
-- Creates tables for comprehensive webhook management and delivery tracking

-- Webhook Configuration Table
CREATE TABLE IF NOT EXISTS webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    headers JSONB DEFAULT '{}',
    timeout_seconds INTEGER NOT NULL DEFAULT 10 CHECK (timeout_seconds BETWEEN 1 AND 30),
    retry_attempts INTEGER NOT NULL DEFAULT 3 CHECK (retry_attempts BETWEEN 0 AND 5),
    retry_delay_seconds INTEGER NOT NULL DEFAULT 5 CHECK (retry_delay_seconds BETWEEN 1 AND 300),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_triggered TIMESTAMPTZ,
    failure_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0
);

-- Webhook Delivery Tracking Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ
);

-- Webhook Logs for Incoming Webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    token TEXT,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form Submissions Table (for automation webhooks)
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_name TEXT NOT NULL,
    submission_data JSONB NOT NULL,
    source TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments Table (for payment webhooks)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_payment_id TEXT UNIQUE,
    quickbooks_payment_id TEXT,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    customer_email TEXT,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Alerts Table (for webhook security monitoring)
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(active);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_created_by ON webhook_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_events ON webhook_configs USING GIN(events);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_form_submissions_processed ON form_submissions(processed);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_estimate_id ON payments(estimate_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Enable Row Level Security
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Webhook Configs: Users can only access their own webhooks
CREATE POLICY "Users can view their own webhook configs" ON webhook_configs
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create webhook configs" ON webhook_configs
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own webhook configs" ON webhook_configs
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own webhook configs" ON webhook_configs
    FOR DELETE USING (created_by = auth.uid());

-- Webhook Deliveries: Users can only view deliveries for their webhooks
CREATE POLICY "Users can view webhook deliveries for their webhooks" ON webhook_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM webhook_configs 
            WHERE webhook_configs.id = webhook_deliveries.webhook_id 
            AND webhook_configs.created_by = auth.uid()
        )
    );

-- System can insert delivery records
CREATE POLICY "System can insert webhook deliveries" ON webhook_deliveries
    FOR INSERT WITH CHECK (true);

-- System can update delivery status
CREATE POLICY "System can update webhook deliveries" ON webhook_deliveries
    FOR UPDATE WITH CHECK (true);

-- Webhook Logs: Admins only (for incoming webhooks)
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert webhook logs" ON webhook_logs
    FOR INSERT WITH CHECK (true);

-- Form Submissions: Admins and sales can view
CREATE POLICY "Admins and sales can view form submissions" ON form_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'sales')
        )
    );

CREATE POLICY "System can insert form submissions" ON form_submissions
    FOR INSERT WITH CHECK (true);

-- Payments: Users can view payments for their estimates
CREATE POLICY "Users can view payments for their estimates" ON payments
    FOR SELECT USING (
        estimate_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = payments.estimate_id 
            AND estimates.created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage payments" ON payments
    FOR ALL WITH CHECK (true);

-- Security Alerts: Admins only
CREATE POLICY "Admins can view security alerts" ON security_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert security alerts" ON security_alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update security alerts" ON security_alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create functions for webhook statistics
CREATE OR REPLACE FUNCTION get_webhook_statistics(webhook_id UUID)
RETURNS TABLE (
    total_deliveries BIGINT,
    successful_deliveries BIGINT,
    failed_deliveries BIGINT,
    success_rate NUMERIC,
    average_response_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE status = 'delivered') as successful_deliveries,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_deliveries,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0 
        END as success_rate,
        COALESCE(AVG(
            CASE 
                WHEN status = 'delivered' AND delivered_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (delivered_at - created_at))
                ELSE NULL
            END
        ), 0) as average_response_time
    FROM webhook_deliveries 
    WHERE webhook_deliveries.webhook_id = get_webhook_statistics.webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious activity (for audit/security alerts)
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    target_user_id UUID DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    user_id UUID,
    event_count BIGINT,
    unique_ips BIGINT,
    failed_attempts BIGINT,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.user_id,
        COUNT(*) as event_count,
        COUNT(DISTINCT ae.ip_address) as unique_ips,
        COUNT(*) FILTER (WHERE ae.details->>'success' = 'false') as failed_attempts,
        MAX(ae.created_at) as last_activity
    FROM audit_events ae
    WHERE 
        ae.created_at >= NOW() - INTERVAL '1 hour' * hours_back
        AND (target_user_id IS NULL OR ae.user_id = target_user_id)
        AND ae.severity IN ('high', 'critical')
    GROUP BY ae.user_id
    HAVING 
        COUNT(*) >= 10 OR  -- High activity
        COUNT(DISTINCT ae.ip_address) >= 3 OR  -- Multiple IPs
        COUNT(*) FILTER (WHERE ae.details->>'success' = 'false') >= 5  -- Multiple failures
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize user details in audit events (for GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_user_details(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    anonymized_details JSONB;
BEGIN
    -- Return anonymized version of user details
    anonymized_details := jsonb_build_object(
        'anonymized', true,
        'user_id', '[ANONYMIZED]',
        'email', '[ANONYMIZED]',
        'name', '[ANONYMIZED]',
        'phone', '[ANONYMIZED]',
        'anonymized_at', NOW()
    );
    
    RETURN anonymized_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update webhook_configs updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_webhook_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_configs_updated_at
    BEFORE UPDATE ON webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_configs_updated_at();

-- Update payments updated_at timestamp automatically  
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON TABLE webhook_configs TO authenticated;
GRANT ALL ON TABLE webhook_deliveries TO authenticated;
GRANT ALL ON TABLE webhook_logs TO authenticated;
GRANT ALL ON TABLE form_submissions TO authenticated;
GRANT ALL ON TABLE payments TO authenticated;
GRANT ALL ON TABLE security_alerts TO authenticated;

GRANT EXECUTE ON FUNCTION get_webhook_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_user_details(UUID) TO authenticated;
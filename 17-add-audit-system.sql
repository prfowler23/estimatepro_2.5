-- Comprehensive Audit Trail and Compliance System
-- Database schema for audit logging, compliance reporting, and data governance

-- Drop existing tables if they exist
DROP TABLE IF EXISTS compliance_violations CASCADE;
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS audit_configurations CASCADE;

-- Create audit configurations table
CREATE TABLE audit_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    retention_days INTEGER DEFAULT 2555, -- 7 years
    auto_purge BOOLEAN DEFAULT true,
    compliance_standards TEXT[] DEFAULT ARRAY['gdpr'],
    sensitive_fields TEXT[] DEFAULT ARRAY['password', 'ssn', 'credit_card'],
    encryption_enabled BOOLEAN DEFAULT true,
    real_time_alerts BOOLEAN DEFAULT true,
    alert_thresholds JSONB DEFAULT '{
        "failed_logins": 5,
        "suspicious_activity": 3,
        "data_export_volume": 1000
    }',
    excluded_events TEXT[] DEFAULT ARRAY[]::TEXT[],
    anonymization_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Create audit events table
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    resource_type TEXT,
    resource_id TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    compliance_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    retention_period INTEGER DEFAULT 2555,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (retention_period > 0),
    CHECK (expires_at > created_at)
);

-- Create compliance reports table
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_events INTEGER DEFAULT 0,
    events_by_type JSONB DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL CHECK (status IN ('compliant', 'non_compliant', 'warning')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    report_data JSONB DEFAULT '{}',
    
    -- Constraints
    CHECK (period_end > period_start),
    CHECK (total_events >= 0),
    CHECK (violations_count >= 0)
);

-- Create compliance violations table
CREATE TABLE compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES compliance_reports(id) ON DELETE CASCADE,
    standard TEXT NOT NULL,
    rule TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    event_ids UUID[] DEFAULT ARRAY[]::UUID[],
    remediation_required BOOLEAN DEFAULT false,
    remediation_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Constraints
    CHECK (resolved_at IS NULL OR resolved_at >= detected_at)
);

-- Create audit search index for performance
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_severity ON audit_events(severity);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX idx_audit_events_expires_at ON audit_events(expires_at);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_user_created ON audit_events(user_id, created_at);
CREATE INDEX idx_audit_events_type_created ON audit_events(event_type, created_at);
CREATE INDEX idx_audit_events_compliance_tags ON audit_events USING GIN (compliance_tags);
CREATE INDEX idx_audit_events_details ON audit_events USING GIN (details);

-- Create compliance report indexes
CREATE INDEX idx_compliance_reports_standard ON compliance_reports(standard);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(period_start, period_end);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX idx_compliance_reports_generated_at ON compliance_reports(generated_at);

-- Create compliance violation indexes
CREATE INDEX idx_compliance_violations_report_id ON compliance_violations(report_id);
CREATE INDEX idx_compliance_violations_standard ON compliance_violations(standard);
CREATE INDEX idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX idx_compliance_violations_detected_at ON compliance_violations(detected_at);
CREATE INDEX idx_compliance_violations_resolved ON compliance_violations(resolved_at) WHERE resolved_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE audit_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit configurations
CREATE POLICY "Users can manage their own audit configurations" ON audit_configurations
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for audit events (admin and user access)
CREATE POLICY "Users can view their own audit events" ON audit_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit events" ON audit_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all audit events" ON audit_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create RLS policies for compliance reports
CREATE POLICY "Admins can manage compliance reports" ON compliance_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create RLS policies for compliance violations
CREATE POLICY "Admins can manage compliance violations" ON compliance_violations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create audit trigger functions
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    old_record JSONB;
    new_record JSONB;
    changes JSONB;
BEGIN
    -- Get current user ID
    audit_user_id := auth.uid();
    
    -- Convert records to JSONB
    IF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        new_record := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
    ELSE
        old_record := NULL;
        new_record := to_jsonb(NEW);
    END IF;
    
    -- Calculate changes for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        changes := jsonb_build_object();
        -- Add change detection logic here
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_events (
        event_type,
        severity,
        user_id,
        resource_type,
        resource_id,
        action,
        old_values,
        new_values,
        details,
        compliance_tags
    ) VALUES (
        TG_TABLE_NAME || '_' || LOWER(TG_OP),
        CASE 
            WHEN TG_OP = 'DELETE' THEN 'high'
            WHEN TG_OP = 'UPDATE' THEN 'medium'
            ELSE 'low'
        END,
        audit_user_id,
        TG_TABLE_NAME,
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        LOWER(TG_OP),
        old_record,
        new_record,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', NOW()
        ),
        ARRAY['data_modification']
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically purge expired audit events
CREATE OR REPLACE FUNCTION purge_expired_audit_events()
RETURNS INTEGER AS $$
DECLARE
    purged_count INTEGER;
BEGIN
    DELETE FROM audit_events
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS purged_count = ROW_COUNT;
    
    -- Log the purge operation
    INSERT INTO audit_events (
        event_type,
        severity,
        action,
        details,
        compliance_tags
    ) VALUES (
        'data_purged',
        'medium',
        'automatic_purge',
        jsonb_build_object(
            'purged_count', purged_count,
            'reason', 'retention_period_expired'
        ),
        ARRAY['data_retention', 'gdpr']
    );
    
    RETURN purged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user_audit_data(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    anonymized_count INTEGER;
BEGIN
    UPDATE audit_events
    SET 
        user_id = NULL,
        details = details || jsonb_build_object('anonymized', true, 'anonymized_at', NOW()),
        old_values = CASE 
            WHEN old_values IS NOT NULL THEN jsonb_build_object('anonymized', true)
            ELSE NULL
        END,
        new_values = CASE 
            WHEN new_values IS NOT NULL THEN jsonb_build_object('anonymized', true)
            ELSE NULL
        END
    WHERE user_id = target_user_id;
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
    
    -- Log the anonymization operation
    INSERT INTO audit_events (
        event_type,
        severity,
        action,
        details,
        compliance_tags
    ) VALUES (
        'data_anonymized',
        'high',
        'user_data_anonymization',
        jsonb_build_object(
            'anonymized_count', anonymized_count,
            'target_user_id', target_user_id,
            'reason', 'gdpr_right_to_be_forgotten'
        ),
        ARRAY['gdpr', 'data_subject_rights']
    );
    
    RETURN anonymized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate compliance statistics
CREATE OR REPLACE FUNCTION get_compliance_statistics(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_events BIGINT,
    events_by_type JSONB,
    events_by_severity JSONB,
    high_risk_events BIGINT,
    compliance_violations BIGINT,
    data_access_events BIGINT,
    data_modification_events BIGINT,
    security_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_events,
        jsonb_object_agg(event_type, event_count) as events_by_type,
        jsonb_object_agg(severity, severity_count) as events_by_severity,
        COUNT(*) FILTER (WHERE severity IN ('high', 'critical'))::BIGINT as high_risk_events,
        COUNT(*) FILTER (WHERE 'compliance_violation' = ANY(compliance_tags))::BIGINT as compliance_violations,
        COUNT(*) FILTER (WHERE event_type LIKE '%_read' OR event_type LIKE '%_view')::BIGINT as data_access_events,
        COUNT(*) FILTER (WHERE event_type LIKE '%_created' OR event_type LIKE '%_updated' OR event_type LIKE '%_deleted')::BIGINT as data_modification_events,
        COUNT(*) FILTER (WHERE 'security' = ANY(compliance_tags))::BIGINT as security_events
    FROM (
        SELECT 
            ae.event_type,
            ae.severity,
            ae.compliance_tags,
            COUNT(*) as event_count,
            COUNT(*) as severity_count
        FROM audit_events ae
        WHERE ae.created_at >= start_date
        AND ae.created_at <= end_date
        GROUP BY ae.event_type, ae.severity, ae.compliance_tags
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    target_user_id UUID DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    user_id UUID,
    suspicious_patterns JSONB,
    risk_score INTEGER,
    recommended_actions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH user_activity AS (
        SELECT 
            ae.user_id,
            COUNT(*) as total_events,
            COUNT(*) FILTER (WHERE severity = 'high') as high_severity_events,
            COUNT(*) FILTER (WHERE event_type LIKE '%_failed') as failed_events,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT resource_type) as resource_types_accessed,
            array_agg(DISTINCT event_type) as event_types
        FROM audit_events ae
        WHERE ae.created_at >= NOW() - INTERVAL '1 hour' * hours_back
        AND (target_user_id IS NULL OR ae.user_id = target_user_id)
        AND ae.user_id IS NOT NULL
        GROUP BY ae.user_id
    )
    SELECT 
        ua.user_id,
        jsonb_build_object(
            'total_events', ua.total_events,
            'high_severity_events', ua.high_severity_events,
            'failed_events', ua.failed_events,
            'unique_ips', ua.unique_ips,
            'resource_types_accessed', ua.resource_types_accessed,
            'unusual_activity_score', 
            CASE 
                WHEN ua.failed_events > 5 THEN 30
                ELSE 0
            END +
            CASE 
                WHEN ua.unique_ips > 3 THEN 20
                ELSE 0
            END +
            CASE 
                WHEN ua.high_severity_events > 10 THEN 25
                ELSE 0
            END
        ) as suspicious_patterns,
        (
            CASE WHEN ua.failed_events > 5 THEN 30 ELSE 0 END +
            CASE WHEN ua.unique_ips > 3 THEN 20 ELSE 0 END +
            CASE WHEN ua.high_severity_events > 10 THEN 25 ELSE 0 END +
            CASE WHEN ua.total_events > 100 THEN 15 ELSE 0 END
        ) as risk_score,
        CASE 
            WHEN ua.failed_events > 5 THEN ARRAY['Investigate failed login attempts', 'Consider temporary account lockout']
            ELSE ARRAY[]::TEXT[]
        END ||
        CASE 
            WHEN ua.unique_ips > 3 THEN ARRAY['Review IP address patterns', 'Verify user location']
            ELSE ARRAY[]::TEXT[]
        END ||
        CASE 
            WHEN ua.high_severity_events > 10 THEN ARRAY['Review high-severity events', 'Contact user for verification']
            ELSE ARRAY[]::TEXT[]
        END as recommended_actions
    FROM user_activity ua
    WHERE (
        ua.failed_events > 5 OR
        ua.unique_ips > 3 OR
        ua.high_severity_events > 10 OR
        ua.total_events > 100
    )
    ORDER BY risk_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic audit logging on key tables
-- Note: These would be applied to existing tables like estimates, customers, etc.

-- Create scheduled job for automatic purging (pseudo-code, would need pg_cron extension)
-- SELECT cron.schedule('purge-expired-audits', '0 2 * * *', 'SELECT purge_expired_audit_events();');

-- Create function to trigger setup for automatic audit triggers
CREATE OR REPLACE FUNCTION setup_audit_triggers()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
    trigger_sql TEXT;
BEGIN
    -- Apply audit triggers to key tables
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('estimates', 'customers', 'integrations', 'profiles')
    LOOP
        -- Create trigger for each table
        trigger_sql := format('
            CREATE OR REPLACE TRIGGER audit_trigger_%s
            AFTER INSERT OR UPDATE OR DELETE ON %s
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        ', table_record.table_name, table_record.table_name);
        
        EXECUTE trigger_sql;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Set up initial audit configuration for system
INSERT INTO audit_configurations (
    user_id,
    enabled,
    retention_days,
    compliance_standards,
    real_time_alerts
) 
SELECT 
    id,
    true,
    2555,
    ARRAY['gdpr', 'ccpa'],
    true
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_configurations TO authenticated;
GRANT SELECT, INSERT ON audit_events TO authenticated;
GRANT SELECT ON compliance_reports TO authenticated;
GRANT SELECT ON compliance_violations TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION audit_trigger_function TO authenticated;
GRANT EXECUTE ON FUNCTION purge_expired_audit_events TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_user_audit_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity TO authenticated;
GRANT EXECUTE ON FUNCTION setup_audit_triggers TO authenticated;

-- Create updated_at trigger for audit_configurations
CREATE TRIGGER set_timestamp_audit_configurations
    BEFORE UPDATE ON audit_configurations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Comments for documentation
COMMENT ON TABLE audit_configurations IS 'Audit system configuration per user/organization';
COMMENT ON TABLE audit_events IS 'Comprehensive audit log of all system events and user actions';
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports for various standards';
COMMENT ON TABLE compliance_violations IS 'Detected compliance violations requiring attention';

COMMENT ON FUNCTION audit_trigger_function IS 'Trigger function for automatic audit logging';
COMMENT ON FUNCTION purge_expired_audit_events IS 'Automated cleanup of expired audit events';
COMMENT ON FUNCTION anonymize_user_audit_data IS 'GDPR-compliant user data anonymization';
COMMENT ON FUNCTION get_compliance_statistics IS 'Generate compliance statistics for reporting';
COMMENT ON FUNCTION detect_suspicious_activity IS 'AI-powered suspicious activity detection';
COMMENT ON FUNCTION setup_audit_triggers IS 'Initialize audit triggers on key tables';
-- Enhanced Integration Framework Database Tables
-- Add comprehensive integration support with webhooks, events, and sync management

-- Drop existing tables if they exist
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS integration_sync_logs CASCADE;
DROP TABLE IF EXISTS integration_events CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- Create integrations table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN (
        'quickbooks',
        'sage',
        'xero',
        'salesforce',
        'hubspot',
        'zapier',
        'microsoft_dynamics',
        'stripe',
        'square',
        'buildium',
        'appfolio',
        'custom_webhook',
        'custom_api'
    )),
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    authentication JSONB NOT NULL DEFAULT '{}',
    webhooks JSONB DEFAULT '[]',
    sync_settings JSONB DEFAULT '{
        "auto_sync": true,
        "sync_frequency": "hourly",
        "sync_direction": "bidirectional",
        "last_sync": null
    }',
    field_mappings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE(created_by, provider, name)
);

-- Create integration events table
CREATE TABLE integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create integration sync logs table
CREATE TABLE integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    sync_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create webhook logs table
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    payload JSONB NOT NULL,
    response JSONB,
    status_code INTEGER,
    signature TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create integration field mappings table for complex mappings
CREATE TABLE integration_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    source_field TEXT NOT NULL,
    target_field TEXT NOT NULL,
    transformation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(integration_id, source_field, target_field)
);

-- Create integration credentials table for secure storage
CREATE TABLE integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(integration_id, credential_type)
);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for integrations
CREATE POLICY "Users can view their own integrations" ON integrations
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own integrations" ON integrations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own integrations" ON integrations
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own integrations" ON integrations
    FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for integration events
CREATE POLICY "Users can view events for their integrations" ON integration_events
    FOR SELECT USING (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert events for their integrations" ON integration_events
    FOR INSERT WITH CHECK (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update events for their integrations" ON integration_events
    FOR UPDATE USING (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

-- Create RLS policies for sync logs
CREATE POLICY "Users can view sync logs for their integrations" ON integration_sync_logs
    FOR SELECT USING (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert sync logs for their integrations" ON integration_sync_logs
    FOR INSERT WITH CHECK (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

-- Create RLS policies for webhook logs (service-level access)
CREATE POLICY "Service can access webhook logs" ON webhook_logs
    FOR ALL USING (true);

-- Create RLS policies for field mappings
CREATE POLICY "Users can manage field mappings for their integrations" ON integration_field_mappings
    FOR ALL USING (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

-- Create RLS policies for credentials
CREATE POLICY "Users can manage credentials for their integrations" ON integration_credentials
    FOR ALL USING (
        integration_id IN (
            SELECT id FROM integrations WHERE created_by = auth.uid()
        )
    );

-- Create functions for integration management
CREATE OR REPLACE FUNCTION update_integration_last_sync(integration_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE integrations 
    SET sync_settings = jsonb_set(
        sync_settings,
        '{last_sync}',
        to_jsonb(NOW()::text)
    ),
    updated_at = NOW()
    WHERE id = integration_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old webhook logs
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM webhook_logs
    WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old integration events
CREATE OR REPLACE FUNCTION cleanup_old_integration_events()
RETURNS VOID AS $$
BEGIN
    DELETE FROM integration_events
    WHERE status = 'completed' 
    AND processed_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM integration_events
    WHERE status = 'failed' 
    AND retries >= max_retries 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to retry failed events
CREATE OR REPLACE FUNCTION retry_failed_integration_events()
RETURNS TABLE(event_id UUID, integration_id UUID, event_type TEXT) AS $$
BEGIN
    RETURN QUERY
    UPDATE integration_events 
    SET status = 'pending', 
        retries = retries + 1,
        error_message = NULL
    WHERE status = 'failed' 
    AND retries < max_retries
    AND created_at > NOW() - INTERVAL '24 hours'
    RETURNING id, integration_events.integration_id, integration_events.event_type;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_integrations
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_integration_credentials
    BEFORE UPDATE ON integration_credentials
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Create indexes for performance
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_enabled ON integrations(enabled);
CREATE INDEX idx_integrations_created_by ON integrations(created_by);
CREATE INDEX idx_integration_events_integration_id ON integration_events(integration_id);
CREATE INDEX idx_integration_events_status ON integration_events(status);
CREATE INDEX idx_integration_events_event_type ON integration_events(event_type);
CREATE INDEX idx_integration_events_created_at ON integration_events(created_at);
CREATE INDEX idx_integration_events_status_created ON integration_events(status, created_at);
CREATE INDEX idx_integration_events_integration_status ON integration_events(integration_id, status, created_at);
CREATE INDEX idx_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON integration_sync_logs(started_at);
CREATE INDEX idx_sync_logs_integration_started ON integration_sync_logs(integration_id, status, started_at);
CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at);
CREATE INDEX idx_webhook_logs_provider_processed ON webhook_logs(provider, processed_at);
CREATE INDEX idx_field_mappings_integration_id ON integration_field_mappings(integration_id);
CREATE INDEX idx_credentials_integration_id ON integration_credentials(integration_id);
CREATE INDEX idx_credentials_credential_type ON integration_credentials(credential_type);
CREATE INDEX idx_credentials_expires_at ON integration_credentials(expires_at);

-- Insert sample integration providers data (only if users exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        INSERT INTO integrations (provider, name, enabled, settings, authentication, created_by)
        VALUES 
            ('quickbooks', 'QuickBooks Online Demo', false, '{"sandbox": true}', '{}', 
             (SELECT id FROM auth.users LIMIT 1)),
            ('salesforce', 'Salesforce CRM Demo', false, '{"sandbox": true}', '{}', 
             (SELECT id FROM auth.users LIMIT 1)),
            ('custom_webhook', 'Custom Webhook Demo', false, '{}', '{}', 
             (SELECT id FROM auth.users LIMIT 1))
        ON CONFLICT (created_by, provider, name) DO NOTHING;
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_field_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_credentials TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_integration_last_sync TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_integration_events TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_integration_events TO authenticated;

-- Create a view for integration health monitoring
CREATE VIEW integration_health_view AS
SELECT 
    i.id,
    i.provider,
    i.name,
    i.enabled,
    i.created_at,
    i.updated_at,
    (i.sync_settings->>'last_sync')::timestamp as last_sync,
    COALESCE(event_stats.total_events, 0) as total_events,
    COALESCE(event_stats.failed_events, 0) as failed_events,
    COALESCE(event_stats.pending_events, 0) as pending_events,
    COALESCE(sync_stats.total_syncs, 0) as total_syncs,
    COALESCE(sync_stats.failed_syncs, 0) as failed_syncs,
    CASE 
        WHEN i.enabled = false THEN 'disabled'
        WHEN COALESCE(event_stats.failed_events, 0) > 10 THEN 'unhealthy'
        WHEN COALESCE(event_stats.pending_events, 0) > 50 THEN 'backlogged'
        WHEN (i.sync_settings->>'last_sync')::timestamp < NOW() - INTERVAL '1 day' THEN 'stale'
        ELSE 'healthy'
    END as health_status
FROM integrations i
LEFT JOIN (
    SELECT 
        integration_id,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_events
    FROM integration_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY integration_id
) event_stats ON i.id = event_stats.integration_id
LEFT JOIN (
    SELECT 
        integration_id,
        COUNT(*) as total_syncs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs
    FROM integration_sync_logs
    WHERE started_at > NOW() - INTERVAL '7 days'
    GROUP BY integration_id
) sync_stats ON i.id = sync_stats.integration_id;

-- Grant access to the view
GRANT SELECT ON integration_health_view TO authenticated;

-- Create a function to get integration statistics
CREATE OR REPLACE FUNCTION get_integration_stats(user_id UUID)
RETURNS TABLE(
    provider TEXT,
    total_integrations BIGINT,
    enabled_integrations BIGINT,
    healthy_integrations BIGINT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.provider,
        COUNT(*) as total_integrations,
        COUNT(*) FILTER (WHERE i.enabled = true) as enabled_integrations,
        COUNT(*) FILTER (WHERE ihv.health_status = 'healthy') as healthy_integrations,
        MAX(i.updated_at) as last_updated
    FROM integrations i
    LEFT JOIN integration_health_view ihv ON i.id = ihv.id
    WHERE i.created_by = user_id
    GROUP BY i.provider;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_integration_stats TO authenticated;

COMMENT ON TABLE integrations IS 'Third-party system integration configurations';
COMMENT ON TABLE integration_events IS 'Event queue for integration processing';
COMMENT ON TABLE integration_sync_logs IS 'Synchronization history and status';
COMMENT ON TABLE webhook_logs IS 'Incoming webhook processing logs';
COMMENT ON TABLE integration_field_mappings IS 'Field mapping configurations for data transformation';
COMMENT ON TABLE integration_credentials IS 'Encrypted credential storage for integrations';
COMMENT ON VIEW integration_health_view IS 'Real-time integration health monitoring view';
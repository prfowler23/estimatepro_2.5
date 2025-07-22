-- EstimatePro Missing Tables Creation Script
-- Run this in Supabase Dashboard SQL Editor

-- Collaboration Tables
CREATE TABLE IF NOT EXISTS estimate_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estimate_id, user_id)
);

CREATE TABLE IF NOT EXISTS estimate_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  change_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('field_update', 'step_navigation', 'file_upload', 'calculation_update')),
  step_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  presence_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estimate_id, user_id)
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  step_name TEXT NOT NULL,
  duration_seconds INTEGER,
  completion_rate DECIMAL(5,2),
  error_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Tables
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_path TEXT
);

-- Enable RLS on all tables
ALTER TABLE estimate_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for authenticated users
CREATE POLICY "Authenticated users can read collaborators" ON estimate_collaborators FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create collaborators" ON estimate_collaborators FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update collaborators" ON estimate_collaborators FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read changes" ON estimate_changes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create changes" ON estimate_changes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read sessions" ON collaboration_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create sessions" ON collaboration_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sessions" ON collaboration_sessions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read analytics" ON workflow_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create analytics" ON workflow_analytics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read audit events" ON audit_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create audit events" ON audit_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read compliance reports" ON compliance_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create compliance reports" ON compliance_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_estimate_id ON estimate_collaborators(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_changes_estimate_id ON estimate_changes(estimate_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_estimate_id ON collaboration_sessions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_id ON workflow_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
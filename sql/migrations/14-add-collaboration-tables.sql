-- Add collaboration tables for multi-user real-time sync

-- Table for estimate collaborators and permissions
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

-- Table for tracking real-time changes
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (estimate_id, created_at DESC),
  INDEX (estimate_id, field_path, created_at DESC)
);

-- Table for collaboration sessions and presence
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

-- Table for conflict resolution tracking
CREATE TABLE IF NOT EXISTS collaboration_conflicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('concurrent_edit', 'version_mismatch', 'permission_conflict')),
  conflicting_changes JSONB NOT NULL,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT CHECK (resolution_method IN ('accept_incoming', 'keep_local', 'merge')),
  resolved_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  INDEX (estimate_id, created_at DESC),
  INDEX (estimate_id, field_path, created_at DESC)
);

-- Table for collaboration invitations
CREATE TABLE IF NOT EXISTS collaboration_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  invitation_token TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (invitation_token),
  INDEX (invited_email, created_at DESC)
);

-- Enable Row Level Security
ALTER TABLE estimate_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimate_collaborators
CREATE POLICY "Users can view collaborators for estimates they have access to" ON estimate_collaborators
  FOR SELECT USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Estimate owners can manage collaborators" ON estimate_collaborators
  FOR ALL USING (
    estimate_id IN (SELECT id FROM estimates WHERE user_id = auth.uid())
  );

CREATE POLICY "Collaborators can view their own access" ON estimate_collaborators
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for estimate_changes
CREATE POLICY "Users can view changes for estimates they have access to" ON estimate_changes
  FOR SELECT USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can create changes" ON estimate_changes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can manage their own sessions" ON collaboration_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view sessions for estimates they have access to" ON collaboration_sessions
  FOR SELECT USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for collaboration_conflicts
CREATE POLICY "Users can view conflicts for estimates they have access to" ON collaboration_conflicts
  FOR SELECT USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can create and resolve conflicts" ON collaboration_conflicts
  FOR ALL USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- RLS Policies for collaboration_invitations
CREATE POLICY "Estimate owners can manage invitations" ON collaboration_invitations
  FOR ALL USING (
    estimate_id IN (SELECT id FROM estimates WHERE user_id = auth.uid())
  );

CREATE POLICY "Invited users can view their invitations" ON collaboration_invitations
  FOR SELECT USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR accepted_by = auth.uid()
  );

-- Functions for collaboration features

-- Function to automatically add estimate owner as collaborator
CREATE OR REPLACE FUNCTION add_estimate_owner_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO estimate_collaborators (estimate_id, user_id, role, permissions)
  VALUES (
    NEW.id,
    NEW.user_id,
    'owner',
    '{"canEdit": true, "canComment": true, "canShare": true, "canDelete": true, "allowedSteps": [1,2,3,4,5,6,7,8,9], "restrictedFields": []}'::jsonb
  )
  ON CONFLICT (estimate_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner as collaborator when estimate is created
CREATE TRIGGER add_owner_collaborator_trigger
  AFTER INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION add_estimate_owner_as_collaborator();

-- Function to update session last_seen timestamp
CREATE OR REPLACE FUNCTION update_collaboration_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamps
CREATE TRIGGER update_session_timestamp_trigger
  BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_session_timestamp();

-- Function to clean up old changes (keep last 1000 per estimate)
CREATE OR REPLACE FUNCTION cleanup_old_estimate_changes()
RETURNS void AS $$
BEGIN
  DELETE FROM estimate_changes
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY estimate_id ORDER BY created_at DESC) as rn
      FROM estimate_changes
    ) ranked
    WHERE rn > 1000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up inactive sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM collaboration_sessions
  WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_estimate_id ON estimate_collaborators(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_user_id ON estimate_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_changes_estimate_field ON estimate_changes(estimate_id, field_path);
CREATE INDEX IF NOT EXISTS idx_estimate_changes_created_at ON estimate_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_estimate_id ON collaboration_sessions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_estimate_id ON collaboration_conflicts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_invitations_token ON collaboration_invitations(invitation_token);

-- Grant permissions for real-time subscriptions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable real-time for collaboration tables
ALTER publication supabase_realtime ADD TABLE estimate_collaborators;
ALTER publication supabase_realtime ADD TABLE estimate_changes;
ALTER publication supabase_realtime ADD TABLE collaboration_sessions;
ALTER publication supabase_realtime ADD TABLE collaboration_conflicts;
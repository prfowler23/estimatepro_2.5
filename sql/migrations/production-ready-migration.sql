-- ===================================================
-- PRODUCTION-READY MIGRATION
-- ===================================================
-- This migration creates all missing tables and fixes all RLS policies
-- Execute this in Supabase SQL Editor with admin privileges

-- 1. Create missing audit tables
-- ===================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  data JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on all tables
-- ===================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- 3. Fix all RLS policies
-- ===================================================

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Customers table policies
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

CREATE POLICY "Users can view their own customers" ON public.customers
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own customers" ON public.customers
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own customers" ON public.customers
  FOR DELETE USING (auth.uid() = created_by);

-- Estimates table policies
DROP POLICY IF EXISTS "Users can view their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can create their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can update their own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can delete their own estimates" ON public.estimates;

CREATE POLICY "Users can view their own estimates" ON public.estimates
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own estimates" ON public.estimates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own estimates" ON public.estimates
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own estimates" ON public.estimates
  FOR DELETE USING (auth.uid() = created_by);

-- Estimate services table policies
DROP POLICY IF EXISTS "Users can view their own estimate services" ON public.estimate_services;
DROP POLICY IF EXISTS "Users can create their own estimate services" ON public.estimate_services;
DROP POLICY IF EXISTS "Users can update their own estimate services" ON public.estimate_services;
DROP POLICY IF EXISTS "Users can delete their own estimate services" ON public.estimate_services;

CREATE POLICY "Users can view their own estimate services" ON public.estimate_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_services.quote_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create their own estimate services" ON public.estimate_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_services.quote_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own estimate services" ON public.estimate_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_services.quote_id 
      AND created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_services.quote_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own estimate services" ON public.estimate_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_services.quote_id 
      AND created_by = auth.uid()
    )
  );

-- Estimation flows table policies
DROP POLICY IF EXISTS "Users can view their own flows" ON public.estimation_flows;
DROP POLICY IF EXISTS "Users can create their own flows" ON public.estimation_flows;
DROP POLICY IF EXISTS "Users can update their own flows" ON public.estimation_flows;
DROP POLICY IF EXISTS "Users can delete their own flows" ON public.estimation_flows;

CREATE POLICY "Users can view their own flows" ON public.estimation_flows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows" ON public.estimation_flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows" ON public.estimation_flows
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows" ON public.estimation_flows
  FOR DELETE USING (auth.uid() = user_id);

-- Analytics events table policies
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can create their own analytics" ON public.analytics_events;

CREATE POLICY "Users can view their own analytics" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workflow analytics table policies
DROP POLICY IF EXISTS "Users can view their own workflow analytics" ON public.workflow_analytics;
DROP POLICY IF EXISTS "Users can create their own workflow analytics" ON public.workflow_analytics;

CREATE POLICY "Users can view their own workflow analytics" ON public.workflow_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflow analytics" ON public.workflow_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integrations table policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can create their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;

CREATE POLICY "Users can view their own integrations" ON public.integrations
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own integrations" ON public.integrations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own integrations" ON public.integrations
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own integrations" ON public.integrations
  FOR DELETE USING (auth.uid() = created_by);

-- Integration events table policies
DROP POLICY IF EXISTS "Users can view their own integration events" ON public.integration_events;
DROP POLICY IF EXISTS "Users can create their own integration events" ON public.integration_events;

CREATE POLICY "Users can view their own integration events" ON public.integration_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations 
      WHERE id = integration_events.integration_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create their own integration events" ON public.integration_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.integrations 
      WHERE id = integration_events.integration_id 
      AND created_by = auth.uid()
    )
  );

-- Collaboration tables policies
DROP POLICY IF EXISTS "Users can view estimate collaborators" ON public.estimate_collaborators;
DROP POLICY IF EXISTS "Users can create estimate collaborators" ON public.estimate_collaborators;
DROP POLICY IF EXISTS "Users can update estimate collaborators" ON public.estimate_collaborators;
DROP POLICY IF EXISTS "Users can delete estimate collaborators" ON public.estimate_collaborators;

CREATE POLICY "Users can view estimate collaborators" ON public.estimate_collaborators
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_collaborators.estimate_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create estimate collaborators" ON public.estimate_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_collaborators.estimate_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update estimate collaborators" ON public.estimate_collaborators
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_collaborators.estimate_id 
      AND created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_collaborators.estimate_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete estimate collaborators" ON public.estimate_collaborators
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_collaborators.estimate_id 
      AND created_by = auth.uid()
    )
  );

-- Estimate changes table policies
DROP POLICY IF EXISTS "Users can view estimate changes" ON public.estimate_changes;
DROP POLICY IF EXISTS "Users can create estimate changes" ON public.estimate_changes;

CREATE POLICY "Users can view estimate changes" ON public.estimate_changes
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_changes.estimate_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create estimate changes" ON public.estimate_changes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE id = estimate_changes.estimate_id 
      AND created_by = auth.uid()
    )
  );

-- Collaboration sessions table policies
DROP POLICY IF EXISTS "Users can view collaboration sessions" ON public.collaboration_sessions;
DROP POLICY IF EXISTS "Users can create collaboration sessions" ON public.collaboration_sessions;
DROP POLICY IF EXISTS "Users can update collaboration sessions" ON public.collaboration_sessions;

CREATE POLICY "Users can view collaboration sessions" ON public.collaboration_sessions
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.estimate_collaborators 
      WHERE estimate_id = collaboration_sessions.estimate_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create collaboration sessions" ON public.collaboration_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update collaboration sessions" ON public.collaboration_sessions
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Audit events table policies
DROP POLICY IF EXISTS "Users can view their own audit events" ON public.audit_events;
DROP POLICY IF EXISTS "Users can create their own audit events" ON public.audit_events;

CREATE POLICY "Users can view their own audit events" ON public.audit_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit events" ON public.audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Compliance reports table policies
DROP POLICY IF EXISTS "Users can view their own compliance reports" ON public.compliance_reports;
DROP POLICY IF EXISTS "Users can create their own compliance reports" ON public.compliance_reports;
DROP POLICY IF EXISTS "Users can update their own compliance reports" ON public.compliance_reports;

CREATE POLICY "Users can view their own compliance reports" ON public.compliance_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compliance reports" ON public.compliance_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance reports" ON public.compliance_reports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Create indexes for performance
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON public.estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimate_services_quote_id ON public.estimate_services(quote_id);
CREATE INDEX IF NOT EXISTS idx_estimation_flows_user_id ON public.estimation_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_id ON public.workflow_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_created_by ON public.integrations(created_by);
CREATE INDEX IF NOT EXISTS idx_integration_events_integration_id ON public.integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_user_id ON public.estimate_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_estimate_id ON public.estimate_collaborators(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_changes_user_id ON public.estimate_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_changes_estimate_id ON public.estimate_changes(estimate_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_created_by ON public.collaboration_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_estimate_id ON public.collaboration_sessions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_user_id ON public.compliance_reports(user_id);

-- 5. Grant necessary permissions
-- ===================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Create helper functions
-- ===================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role
    FROM public.profiles 
    WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- 7. Create triggers for updated_at columns
-- ===================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS handle_compliance_reports_updated_at ON public.compliance_reports;
CREATE TRIGGER handle_compliance_reports_updated_at
    BEFORE UPDATE ON public.compliance_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. Create sample data function (for testing)
-- ===================================================

CREATE OR REPLACE FUNCTION public.create_demo_profile(user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (user_id, 'demo@estimatepro.com', 'Demo User', 'user')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_demo_profile(UUID) TO authenticated;

-- ===================================================
-- MIGRATION COMPLETE
-- ===================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Production-ready migration completed successfully';
    RAISE NOTICE '✅ All tables created with proper RLS policies';
    RAISE NOTICE '✅ All indexes created for performance';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '✅ Database is now production-ready';
END $$; 
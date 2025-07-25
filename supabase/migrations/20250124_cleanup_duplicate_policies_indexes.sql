-- Clean up duplicate RLS policies on service_rates table
DROP POLICY IF EXISTS "Admins can manage service rates" ON public.service_rates;
DROP POLICY IF EXISTS "Authenticated users can view service rates" ON public.service_rates;

-- Create single consolidated policy for viewing service rates
CREATE POLICY "All authenticated users can view service rates" ON public.service_rates
    FOR SELECT USING (true);

-- Create admin-only policies for modifications
CREATE POLICY "Admins can insert service rates" ON public.service_rates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update service rates" ON public.service_rates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete service rates" ON public.service_rates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_quote_services_quote_id;  -- Keep idx_estimate_services_quote_id
DROP INDEX IF EXISTS idx_quotes_created_at;        -- Keep idx_estimates_created_at
DROP INDEX IF EXISTS idx_sync_logs_integration_id; -- Keep idx_integration_sync_logs_integration_id

-- Create missing indexes for foreign keys to improve performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_quote_id 
    ON public.ai_analysis_results(quote_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id 
    ON public.collaboration_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_resolved_by 
    ON public.compliance_violations(resolved_by);

CREATE INDEX IF NOT EXISTS idx_estimate_changes_user_id 
    ON public.estimate_changes(user_id);

CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_invited_by 
    ON public.estimate_collaborators(invited_by);

CREATE INDEX IF NOT EXISTS idx_estimate_collaborators_user_id 
    ON public.estimate_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_estimation_flow_conflicts_resolved_by 
    ON public.estimation_flow_conflicts(resolved_by);

CREATE INDEX IF NOT EXISTS idx_estimation_flows_customer_id 
    ON public.estimation_flows(customer_id);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved_by 
    ON public.performance_alerts(resolved_by);

-- Add primary key to estimation_flows_backup table
ALTER TABLE public.estimation_flows_backup 
    ADD PRIMARY KEY (id);
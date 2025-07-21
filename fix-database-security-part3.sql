-- EstimatePro Database Security Fixes - Part 3
-- Core Table RLS Policies

-- ===========================================
-- PART 5: Core Table RLS Policies
-- ===========================================

-- Enable RLS on core tables
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Estimates policies
DROP POLICY IF EXISTS "Users can manage their own estimates" ON public.estimates;
CREATE POLICY "Users can manage their own estimates"
    ON public.estimates
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Estimate services policies  
DROP POLICY IF EXISTS "Users can manage their estimate services" ON public.estimate_services;
CREATE POLICY "Users can manage their estimate services"
    ON public.estimate_services
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = estimate_services.quote_id 
            AND estimates.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = estimate_services.quote_id 
            AND estimates.created_by = auth.uid()
        )
    );

-- Estimation flows policies
DROP POLICY IF EXISTS "Users can manage their own flows" ON public.estimation_flows;
CREATE POLICY "Users can manage their own flows"
    ON public.estimation_flows
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Measurements policies
DROP POLICY IF EXISTS "Users can manage their measurements" ON public.measurements;
CREATE POLICY "Users can manage their measurements"
    ON public.measurements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = measurements.estimate_id 
            AND estimates.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM estimates 
            WHERE estimates.id = measurements.estimate_id 
            AND estimates.created_by = auth.uid()
        )
    );

-- Analytics events policies
DROP POLICY IF EXISTS "Users can manage their analytics" ON public.analytics_events;
CREATE POLICY "Users can manage their analytics"
    ON public.analytics_events
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
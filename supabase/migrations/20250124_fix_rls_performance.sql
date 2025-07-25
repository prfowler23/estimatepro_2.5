-- Fix RLS Policy Performance Issues
-- Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation for each row

-- Fix session_drafts policies
DROP POLICY IF EXISTS "Users can manage their own session drafts" ON public.session_drafts;
CREATE POLICY "Users can manage their own session drafts" ON public.session_drafts
    FOR ALL USING (user_id = (SELECT auth.uid()));

-- Fix estimates policies - need to consolidate duplicate policies first
-- Drop all existing policies on estimates table
DROP POLICY IF EXISTS "Allow individual read access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow individual insert access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow individual update access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow individual delete access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can view own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can insert estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON public.estimates;
DROP POLICY IF EXISTS "Users can delete own estimates" ON public.estimates;

-- Create consolidated policies with performance optimization
CREATE POLICY "Users can view own estimates" ON public.estimates
    FOR SELECT USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can insert own estimates" ON public.estimates
    FOR INSERT WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own estimates" ON public.estimates
    FOR UPDATE USING (created_by = (SELECT auth.uid()))
    WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete own estimates" ON public.estimates
    FOR DELETE USING (created_by = (SELECT auth.uid()));
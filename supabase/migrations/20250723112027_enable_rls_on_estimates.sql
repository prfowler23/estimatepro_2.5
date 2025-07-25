-- Enable Row Level Security for the estimates table
-- and add policies to restrict access to data.

-- 1. Enable RLS on the table
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy for SELECT (read) access
-- This allows users to see only their own estimates.
CREATE POLICY "Allow individual read access on estimates"
ON public.estimates
FOR SELECT
USING (auth.uid() = created_by);

-- 3. Create a policy for INSERT (create) access
-- This allows any authenticated user to create an estimate for themselves.
CREATE POLICY "Allow individual insert access on estimates"
ON public.estimates
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 4. Create a policy for UPDATE (modify) access
-- This allows users to update only their own estimates.
CREATE POLICY "Allow individual update access on estimates"
ON public.estimates
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 5. Create a policy for DELETE access
-- This allows users to delete only their own estimates.
CREATE POLICY "Allow individual delete access on estimates"
ON public.estimates
FOR DELETE
USING (auth.uid() = created_by);

-- Migration to create the session_drafts table for session recovery.

CREATE TABLE IF NOT EXISTS public.session_drafts (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    current_step TEXT NOT NULL,
    data JSONB NOT NULL,
    progress JSONB NOT NULL,
    metadata JSONB NOT NULL,
    recovery JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_drafts_user_id ON public.session_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_session_drafts_expires_at ON public.session_drafts(expires_at);

-- Enable Row Level Security
ALTER TABLE public.session_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_drafts
CREATE POLICY "Users can manage their own session drafts" ON public.session_drafts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.session_drafts IS 'Stores session drafts for user session recovery.';

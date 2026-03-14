-- Create life_scores table to store AI-generated holistic health grades
CREATE TABLE IF NOT EXISTS life_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score TEXT NOT NULL,
    summary TEXT NOT NULL,
    top_strengths JSONB NOT NULL,
    areas_for_improvement JSONB NOT NULL,
    metrics_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create composite index for efficient latest-score lookup per user
CREATE INDEX IF NOT EXISTS idx_life_scores_user_id_created_at ON life_scores(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE life_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own life scores
CREATE POLICY "Users can view their own life scores"
    ON life_scores
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own life scores
CREATE POLICY "Users can insert their own life scores"
    ON life_scores
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE life_scores IS 'Stores AI-generated holistic health grades (A+ through F) with summaries, strengths, and improvement areas';

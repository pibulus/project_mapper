-- Project Mapper Database Schema
--
-- This schema supports persistent project storage and collaboration
-- Run this in your Supabase SQL editor to set up the database

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Project metadata
  title TEXT NOT NULL,
  summary TEXT,

  -- Owner/collaborator info (future: link to auth.users)
  created_by TEXT,

  -- Project data (stored as JSONB for flexibility)
  transcript TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  topics JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,

  -- Settings
  is_public BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- =====================================================
-- AUDIO ARTIFACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audio_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Link to project
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Audio metadata
  filename TEXT,
  mime_type TEXT DEFAULT 'audio/webm',
  duration_seconds REAL,
  size_bytes INTEGER,

  -- Storage path (if using Supabase Storage)
  storage_path TEXT,

  -- Transcript for this audio clip
  transcript TEXT,

  -- Order in sequence
  sequence_number INTEGER DEFAULT 0
);

-- Index for faster project lookups
CREATE INDEX IF NOT EXISTS idx_audio_artifacts_project_id ON audio_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_artifacts_sequence ON audio_artifacts(project_id, sequence_number);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_artifacts ENABLE ROW LEVEL SECURITY;

-- Public projects can be read by anyone
CREATE POLICY "Public projects are viewable by everyone"
  ON projects FOR SELECT
  USING (is_public = TRUE);

-- For now, allow all inserts/updates (we'll add auth later)
CREATE POLICY "Anyone can create projects"
  ON projects FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can update projects"
  ON projects FOR UPDATE
  USING (TRUE);

-- Audio artifacts follow their project's permissions
CREATE POLICY "Audio artifacts are viewable if project is public"
  ON audio_artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = audio_artifacts.project_id
      AND projects.is_public = TRUE
    )
  );

CREATE POLICY "Anyone can insert audio artifacts"
  ON audio_artifacts FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTES
-- =====================================================
--
-- This schema is intentionally simple and flexible:
-- - Projects store their data as JSONB for easy evolution
-- - Audio artifacts are separate for better querying
-- - RLS is permissive for now (public by default)
-- - Future: Add auth.users integration for real ownership
--

-- Add icon column to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS icon TEXT;

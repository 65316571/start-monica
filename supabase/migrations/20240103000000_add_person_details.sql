
-- Add new fields to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS identity TEXT,
ADD COLUMN IF NOT EXISTS meet_date DATE,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Create an index for identity to speed up filtering if needed
CREATE INDEX IF NOT EXISTS idx_people_identity ON people(identity);

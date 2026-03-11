-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);

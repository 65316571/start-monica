-- Create image_tags table
CREATE TABLE IF NOT EXISTS image_tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create join table for images and tags
CREATE TABLE IF NOT EXISTS images_tags_map (
  image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES image_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (image_id, tag_id)
);

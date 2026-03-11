-- Create join table for images and tags (using the global tags table)
-- We need to drop the old images_tags_map if it references image_tags
DROP TABLE IF EXISTS images_tags_map;
DROP TABLE IF EXISTS image_tags;

-- Recreate images_tags_map referencing the global tags table
CREATE TABLE IF NOT EXISTS images_tags_map (
  image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (image_id, tag_id)
);

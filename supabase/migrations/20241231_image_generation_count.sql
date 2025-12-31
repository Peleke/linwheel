-- Add image_generation_count column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_generation_count INTEGER DEFAULT 0;

-- Create RPC function for incrementing image generation count
CREATE OR REPLACE FUNCTION increment_image_generation_count(user_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET image_generation_count = COALESCE(image_generation_count, 0) + increment_by
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

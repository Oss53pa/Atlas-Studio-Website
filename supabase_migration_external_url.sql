-- Add external_url column to apps table
-- When set, product card clicks redirect to this URL instead of /applications/:id
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS external_url TEXT DEFAULT NULL;

-- Fix: ensure RLS policies exist for public read access on apps and site_content
-- These policies were defined in supabase-schema.sql but may not have been applied

-- apps: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'apps' AND policyname = 'Anyone can read apps'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can read apps" ON public.apps FOR SELECT USING (true)';
  END IF;
END $$;

-- site_content: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'site_content' AND policyname = 'Anyone can read site content'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can read site content" ON public.site_content FOR SELECT USING (true)';
  END IF;
END $$;

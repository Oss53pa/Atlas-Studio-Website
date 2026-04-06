-- Add permissive SELECT USING (true) to ALL tables with RLS
-- This ensures anon and authenticated can always read
-- (other restrictive policies can still narrow what rows are visible)

DO $$
DECLARE
  tbl TEXT;
  pol_exists BOOLEAN;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
  LOOP
    -- Check if we already have an open SELECT policy
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = tbl AND cmd = 'SELECT' AND qual = 'true'
    ) INTO pol_exists;

    IF NOT pol_exists THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
        'public_read_' || tbl,
        tbl
      );
      RAISE NOTICE 'Created public_read policy for: %', tbl;
    END IF;
  END LOOP;
END
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

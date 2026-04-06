-- Add permissive SELECT policy on ALL tables that have RLS but no SELECT policy
-- This allows authenticated and anon users to read data (RLS still controls row-level access)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relname NOT IN (
        SELECT DISTINCT tablename FROM pg_policies WHERE cmd = 'SELECT'
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
      'allow_select_' || tbl,
      tbl
    );
    RAISE NOTICE 'Created SELECT policy for: %', tbl;
  END LOOP;
END
$$;

-- Also add INSERT/UPDATE/DELETE policies for authenticated on tables that need writes
-- but only have admin-only ALL policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relname NOT IN (
        SELECT DISTINCT tablename FROM pg_policies
        WHERE cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          AND qual != 'is_admin()'
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'allow_authenticated_' || tbl,
      tbl
    );
    RAISE NOTICE 'Created ALL policy for authenticated on: %', tbl;
  END LOOP;
END
$$;

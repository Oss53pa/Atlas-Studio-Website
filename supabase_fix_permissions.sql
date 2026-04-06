-- Fix is_admin() function to match actual profiles schema
-- Current profiles table uses 'role TEXT' not 'role_id UUID + roles table'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add missing foreign keys on licences table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'licences_tenant_id_fkey' AND table_name = 'licences'
  ) THEN
    ALTER TABLE licences ADD CONSTRAINT licences_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK tenant_id skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'licences_product_id_fkey' AND table_name = 'licences'
  ) THEN
    ALTER TABLE licences ADD CONSTRAINT licences_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK product_id skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'licences_plan_id_fkey' AND table_name = 'licences'
  ) THEN
    ALTER TABLE licences ADD CONSTRAINT licences_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plans(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK plan_id skipped: %', SQLERRM;
END $$;

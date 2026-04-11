-- ═══════════════════════════════════════════════════
-- SUPER ADMIN ROLE
-- Hierarchy: super_admin > admin > client
-- Only super_admin can manage other admins
-- ═══════════════════════════════════════════════════

-- Update profiles role check constraint to allow super_admin
DO $$
BEGIN
  -- Drop existing role check constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Drop constraint skipped: %', SQLERRM;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'admin', 'super_admin'));

-- Promote Pamela (the existing admin) to super_admin
UPDATE profiles
SET role = 'super_admin', updated_at = now()
WHERE email = 'pamela.atokouna@yahoo.com';

-- Update is_admin() function to recognize both admin and super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- New: is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

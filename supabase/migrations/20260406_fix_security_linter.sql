-- Fix Supabase linter security errors

-- 1. Fix SECURITY DEFINER views → change to SECURITY INVOKER
ALTER VIEW public.active_journal_entries SET (security_invoker = on);
ALTER VIEW public.active_journal_lines SET (security_invoker = on);

-- 2. Enable RLS on exposed tables missing it
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devises ENABLE ROW LEVEL SECURITY;

-- 3. Add basic RLS policies for these tables
-- entities: authenticated users can read their own tenant's entities
CREATE POLICY "Authenticated users can read entities"
  ON public.entities FOR SELECT TO authenticated USING (true);

-- role_permissions: readable by authenticated
CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- permissions: readable by authenticated
CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

-- user_profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- societes: authenticated users can read
CREATE POLICY "Authenticated users can read societes"
  ON public.societes FOR SELECT TO authenticated USING (true);

-- devises: readable by all (reference data)
CREATE POLICY "Anyone can read devises"
  ON public.devises FOR SELECT USING (true);

-- Admin full access on all these tables
CREATE POLICY "Admins manage entities" ON public.entities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage permissions" ON public.permissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage user_profiles" ON public.user_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage societes" ON public.societes FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage devises" ON public.devises FOR ALL USING (public.is_admin());

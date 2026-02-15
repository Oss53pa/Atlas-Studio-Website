-- ============================================================
-- Atlas Studio — Supabase Schema (safe re-run)
-- Run this SQL in Supabase SQL Editor to set up the database
-- ============================================================

-- Drop existing tables (order matters: children first)
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.apps CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS app_type CASCADE;
DROP TYPE IF EXISTS app_status CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE app_type AS ENUM ('Module ERP', 'App', 'App mobile');
CREATE TYPE app_status AS ENUM ('available', 'coming_soon', 'unavailable');
CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled', 'expired', 'trial');
CREATE TYPE invoice_status AS ENUM ('paid', 'pending', 'failed', 'refunded');

-- ============================================================
-- Tables
-- ============================================================

-- Profils utilisateurs (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Applications
CREATE TABLE public.apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type app_type NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  features TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  pricing JSONB NOT NULL DEFAULT '{}',
  status app_status NOT NULL DEFAULT 'available',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contenu du site (clé-valeur JSONB)
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Abonnements
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES public.apps(id),
  plan TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trial',
  price_at_subscription NUMERIC(10,2) NOT NULL DEFAULT 0,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, app_id)
);

-- Factures
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  app_id TEXT NOT NULL REFERENCES public.apps(id),
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  status invoice_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log d'activité
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Trigger : auto-création profil à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.admin_revenue_summary()
RETURNS JSON AS $$
  SELECT json_build_object(
    'monthly_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', now())), 0),
    'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'pending_payments', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)
  ) FROM public.invoices;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles WHERE role = 'client'),
    'active_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active', 'trial')),
    'popular_apps', (SELECT json_agg(row_to_json(t)) FROM (
      SELECT app_id, COUNT(*) as sub_count FROM subscriptions WHERE status IN ('active', 'trial')
      GROUP BY app_id ORDER BY sub_count DESC LIMIT 5) t)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Apps : lecture publique, écriture admin
CREATE POLICY "Anyone can read apps" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Admins can manage apps" ON public.apps FOR ALL USING (public.is_admin());

-- Site content : lecture publique, écriture admin
CREATE POLICY "Anyone can read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage site content" ON public.site_content FOR ALL USING (public.is_admin());

-- Profiles : lecture propre + admin full
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Subscriptions : propre + admin
CREATE POLICY "Users read own subs" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own subs" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage all subs" ON public.subscriptions FOR ALL USING (public.is_admin());

-- Invoices : propre + admin
CREATE POLICY "Users read own invoices" ON public.invoices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage all invoices" ON public.invoices FOR ALL USING (public.is_admin());

-- Activity log : admin read + anyone insert
CREATE POLICY "Admins read activity" ON public.activity_log FOR SELECT USING (public.is_admin());
CREATE POLICY "Anyone can insert activity" ON public.activity_log FOR INSERT WITH CHECK (true);

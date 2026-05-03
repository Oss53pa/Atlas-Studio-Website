-- ═══════════════════════════════════════════════════════════════════
-- ATLAS STUDIO — Policies admin manquantes pour le flow Grant licence
-- ═══════════════════════════════════════════════════════════════════
-- Bug constaté : depuis le panel admin, super_admin ne pouvait pas créer
-- de tenants ni insérer dans licences/licence_seats parce que les
-- policies existantes scopaient par tenant_id = get_user_company_id().
-- Or l'admin qui octroie n'est PAS dans le tenant du client cible.
--
-- Cette migration ajoute des policies "admin_all_*" basées sur is_admin()
-- (qui retourne true pour role IN ('admin', 'super_admin')) afin que
-- les admins puissent gérer ces tables peu importe le tenant.
--
-- 100% idempotent — DROP IF EXISTS puis CREATE.
-- ═══════════════════════════════════════════════════════════════════

-- ── tenants ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_tenants" ON public.tenants;
CREATE POLICY "admin_all_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── licences ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_licences" ON public.licences;
CREATE POLICY "admin_all_licences" ON public.licences
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── licence_seats ────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_licence_seats" ON public.licence_seats;
CREATE POLICY "admin_all_licence_seats" ON public.licence_seats
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── licence_activations ──────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_licence_activations" ON public.licence_activations;
CREATE POLICY "admin_all_licence_activations" ON public.licence_activations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── licence_audit_log ────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_licence_audit_log" ON public.licence_audit_log;
CREATE POLICY "admin_all_licence_audit_log" ON public.licence_audit_log
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── admin_delegate_links ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_admin_delegate_links" ON public.admin_delegate_links;
CREATE POLICY "admin_all_admin_delegate_links" ON public.admin_delegate_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── products / plans (lecture admin pour licenceGeneration.loadProductsMap) ──
DROP POLICY IF EXISTS "admin_all_products" ON public.products;
CREATE POLICY "admin_all_products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_plans" ON public.plans;
CREATE POLICY "admin_all_plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "admin_all_tenants" ON public.tenants IS
  'Permet à admin et super_admin de gérer tous les tenants (créer un tenant pour un client lors d''un grant licence)';
COMMENT ON POLICY "admin_all_licences" ON public.licences IS
  'Permet à admin et super_admin d''insérer/gérer des licences pour n''importe quel tenant (utilisé par createGrantedLicence)';

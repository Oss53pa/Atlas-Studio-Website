-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC v2.1 — RPCs helper pour scanner DB security depuis l'Edge Function
-- ═══════════════════════════════════════════════════════════════════════════
-- Utilisées par supabase/functions/_shared/asvc/tech-debt.ts (scanDbSecurity).
--
-- Conventions de sécurité :
--   - SECURITY DEFINER avec SET search_path = pg_catalog, public (pas pollué)
--   - Admin only (is_admin() guard)
--   - Retournent JSON pour faciliter le parsing côté Edge Function
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_scan_rls_missing
-- Liste les tables publiques sans Row Level Security activé.
-- Exclut les tables système, sequences, vues matérialisées.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_scan_rls_missing()
RETURNS TABLE (table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Autorise admin (JWT user) OU service_role (Edge Function asvc-tech-debt-scan)
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  SELECT c.relname::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'                 -- regular tables (pas seq/view)
    AND c.relrowsecurity = false        -- RLS pas activée
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
    AND c.relname NOT IN (              -- exceptions explicites tolérées
      'schema_migrations',
      'spatial_ref_sys'
    )
  ORDER BY c.relname;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_scan_rls_missing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_scan_rls_missing() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_scan_security_definer_search_path
-- Liste les fonctions SECURITY DEFINER du schema public qui n'ont pas de
-- SET search_path explicite dans leur définition.
-- Exclut les fonctions système et celles dont le search_path est défini via
-- proconfig (ex: 'search_path=public').
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_scan_security_definer_search_path()
RETURNS TABLE (function_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Autorise admin (JWT user) OU service_role (Edge Function asvc-tech-debt-scan)
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  SELECT p.proname::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true              -- SECURITY DEFINER
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
    )
  ORDER BY p.proname;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_scan_security_definer_search_path() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_scan_security_definer_search_path() TO authenticated, service_role;

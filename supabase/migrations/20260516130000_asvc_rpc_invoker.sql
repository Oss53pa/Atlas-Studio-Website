-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Hardening : switch RPCs admin de SECURITY DEFINER → SECURITY INVOKER
-- ═══════════════════════════════════════════════════════════════════════════
-- Résout les advisors `authenticated_security_definer_function_executable`
-- en passant à SECURITY INVOKER. Pré-conditions vérifiées :
--   1. is_admin() est STABLE SECURITY DEFINER → fonctionne en contexte INVOKER
--   2. Toutes les tables `asvc_*` ont une RLS policy "Admins read X" via is_admin()
--   3. profiles et subscriptions ont aussi des policies admin via is_admin()
-- Le guard `IF NOT public.is_admin() THEN RAISE EXCEPTION` reste en première
-- ligne pour rejeter explicitement les non-admins (sinon ils auraient juste
-- des résultats vides via RLS, sans message clair).
--
-- EXCEPTION : asvc_clients_lifecycle reste SECURITY DEFINER car elle référence
-- `organizations` et `societes` qui n'ont QUE des policies SELECT self-scope
-- (id = get_user_org_id() / get_user_company_id()). Sans admin SELECT policy
-- explicite sur ces deux tables, un passage en INVOKER renverrait NULL pour
-- tous les `company_name` (le COALESCE échouerait à résoudre pour les clients
-- hors de l'org/societe de l'admin lui-même). Le WARN advisor sur cette
-- fonction est accepté comme contrepartie d'un design RLS multi-tenant strict.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.asvc_action_stats(INT)                                    SECURITY INVOKER;
ALTER FUNCTION public.asvc_brief_stats(TIMESTAMPTZ, TIMESTAMPTZ)                SECURITY INVOKER;
ALTER FUNCTION public.asvc_finance_dashboard()                                  SECURITY INVOKER;
ALTER FUNCTION public.asvc_health_check()                                       SECURITY INVOKER;
ALTER FUNCTION public.asvc_leads_pipeline(INT)                                  SECURITY INVOKER;
ALTER FUNCTION public.asvc_overdue_invoices(INT)                                SECURITY INVOKER;
ALTER FUNCTION public.asvc_pipeline_summary()                                   SECURITY INVOKER;
ALTER FUNCTION public.asvc_verify_audit_chain(INT)                              SECURITY INVOKER;

-- Non modifié intentionnellement (voir commentaire en-tête) :
--   - public.asvc_clients_lifecycle(INT)                 SECURITY DEFINER
--   - public.asvc_log_audit(...)                         SECURITY DEFINER (helper service_role)
--   - public.asvc_audit_compute_hash()                   SECURITY DEFINER (trigger interne)
--   - public.is_admin() / public.asvc_set_updated_at()   (hors scope)

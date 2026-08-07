-- ============================================================================
-- Cortex — RPC de lecture agrégée (Vague 1).
-- Tous les calculs monétaires sont ici (Postgres), jamais côté client (RG-07).
-- SECURITY INVOKER : la RLS is_admin() s'applique (agrégats sur données admin).
-- Montants FCFA en arithmétique entière (BIGINT), aucune décimale.
-- ============================================================================

-- Snapshot des tuiles du dashboard exécutif (CPS-00)
CREATE OR REPLACE FUNCTION public.cps_dashboard()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'apps_total',    (SELECT count(*) FROM public.cps_apps),
    'apps_live',     (SELECT count(*) FROM public.cps_apps WHERE lifecycle_stage = 'live'),
    'apps_build',    (SELECT count(*) FROM public.cps_apps WHERE lifecycle_stage IN ('build','beta')),
    'apps_locomotive',(SELECT count(*) FROM public.cps_apps WHERE strategic_class = 'locomotive'),
    'pipeline_weighted_fcfa',
      coalesce((SELECT sum(expected_mrr_fcfa * probability_bp / 10000)
                FROM public.cps_deals WHERE stage NOT IN ('client','perdu')), 0),
    'pipeline_open_deals',
      (SELECT count(*) FROM public.cps_deals WHERE stage NOT IN ('client','perdu')),
    'milestones_due_30d',
      (SELECT count(*) FROM public.cps_milestones
        WHERE status IN ('a_venir','en_cours') AND target_date IS NOT NULL
          AND target_date <= current_date + 30),
    'assumptions_critical_open',
      (SELECT count(*) FROM public.cps_assumptions
        WHERE criticality = 'bloquante' AND status IN ('a_tester','en_test')),
    'costs_month_fcfa',
      coalesce((SELECT sum(amount_fcfa) FROM public.cps_costs
                WHERE period_month = date_trunc('month', current_date)::date), 0)
  );
$$;
GRANT EXECUTE ON FUNCTION public.cps_dashboard() TO authenticated;

-- Table d'arbitrage portefeuille (CPS-10) : apps + agrégats par app
CREATE OR REPLACE FUNCTION public.cps_arbitration()
RETURNS TABLE (
  id uuid, code text, name text, lifecycle_stage text, strategic_class text,
  priority_rank int, target_market text[], cosmos_leverage boolean,
  cj_project_ref text, notes text, created_at timestamptz, updated_at timestamptz,
  open_deals bigint, pipeline_weighted_fcfa bigint, open_critical_assumptions bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT a.*,
    coalesce(d.open_deals, 0)  AS open_deals,
    coalesce(d.pw, 0)          AS pipeline_weighted_fcfa,
    coalesce(x.crit, 0)        AS open_critical_assumptions
  FROM public.cps_apps a
  LEFT JOIN LATERAL (
    SELECT count(*) AS open_deals,
           sum(expected_mrr_fcfa * probability_bp / 10000) AS pw
    FROM public.cps_deals dd
    WHERE dd.app_id = a.id AND dd.stage NOT IN ('client','perdu')
  ) d ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS crit
    FROM public.cps_assumptions aa
    WHERE aa.app_id = a.id AND aa.criticality = 'bloquante'
      AND aa.status IN ('a_tester','en_test')
  ) x ON true
  ORDER BY a.priority_rank NULLS LAST, a.name;
$$;
GRANT EXECUTE ON FUNCTION public.cps_arbitration() TO authenticated;

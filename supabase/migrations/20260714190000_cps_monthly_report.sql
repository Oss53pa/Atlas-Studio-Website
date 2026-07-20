-- ============================================================================
-- Cortex — Rapport mensuel automatique (pg_cron), 100 % déterministe.
-- Ne dépend d'aucune Edge Function ni d'aucun LLM : la synthèse est calculée
-- en SQL à partir des tables cps_, puis déposée comme insight
-- « synthese_periodique » via la RPC d'écriture unique (RG-08).
-- Idempotent : deux exécutions pour le même mois ne créent qu'un insight.
-- ============================================================================

-- Formatage FCFA lisible (séparateur d'espace, pas de décimale).
CREATE OR REPLACE FUNCTION public.cps_fmt_fcfa(p BIGINT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(to_char(coalesce(p, 0), 'FM999,999,999,999'), ',', ' ') || ' FCFA';
$$;

CREATE OR REPLACE FUNCTION public.cps_monthly_report()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_month      DATE := date_trunc('month', now())::date;
  v_prev       DATE := (date_trunc('month', now()) - INTERVAL '1 month')::date;
  v_cost_now   BIGINT;
  v_cost_prev  BIGINT;
  v_mrr        BIGINT;
  v_clients    INT;
  v_pipeline   BIGINT;
  v_won        INT;
  v_ms_done    INT;
  v_ms_slipped INT;
  v_assum      INT;
  v_apps_live  INT;
  v_hash       TEXT;
  v_body       TEXT;
  v_delta      TEXT;
  v_id         UUID;
BEGIN
  SELECT coalesce(sum(amount_fcfa), 0) INTO v_cost_now
    FROM public.cps_costs WHERE period_month = v_month;
  SELECT coalesce(sum(amount_fcfa), 0) INTO v_cost_prev
    FROM public.cps_costs WHERE period_month = v_prev;

  SELECT coalesce(sum(mrr_fcfa), 0), coalesce(sum(active_clients), 0)
    INTO v_mrr, v_clients FROM public.cps_metrics_snapshot;

  -- Pipeline = affaires encore ouvertes uniquement ; les signées comptent à part.
  SELECT coalesce(sum((expected_mrr_fcfa * probability_bp) / 10000)
                  FILTER (WHERE stage NOT IN ('client', 'perdu')), 0),
         count(*) FILTER (WHERE stage = 'client' AND updated_at >= v_month)
    INTO v_pipeline, v_won
    FROM public.cps_deals;

  SELECT count(*) FILTER (WHERE status = 'atteint' AND updated_at >= v_month),
         count(*) FILTER (WHERE status = 'glisse')
    INTO v_ms_done, v_ms_slipped FROM public.cps_milestones;

  SELECT count(*) INTO v_assum FROM public.cps_assumptions
   WHERE criticality = 'bloquante' AND status IN ('a_tester', 'en_test');

  SELECT count(*) INTO v_apps_live FROM public.cps_apps WHERE lifecycle_stage = 'live';

  -- Empreinte des entrées : garantit l'idempotence mensuelle.
  v_hash := encode(digest(
    v_month::text || v_cost_now || v_mrr || v_clients || v_pipeline || v_won ||
    v_ms_done || v_ms_slipped || v_assum || v_apps_live, 'sha256'), 'hex');

  IF EXISTS (SELECT 1 FROM public.cps_proph3t_insights
              WHERE insight_type = 'synthese_periodique'
                AND scope ->> 'period' = v_month::text) THEN
    RETURN NULL;                                  -- rapport du mois déjà produit
  END IF;

  v_delta := CASE
    WHEN v_cost_prev = 0 THEN 'pas de comparaison possible (aucun coût le mois précédent)'
    WHEN v_cost_now > v_cost_prev THEN 'en hausse de ' || public.cps_fmt_fcfa(v_cost_now - v_cost_prev)
    WHEN v_cost_now < v_cost_prev THEN 'en baisse de ' || public.cps_fmt_fcfa(v_cost_prev - v_cost_now)
    ELSE 'stables' END;

  v_body :=
    'Situation au ' || to_char(now(), 'DD/MM/YYYY') || E'.\n\n' ||
    '• Revenu récurrent constaté : ' || public.cps_fmt_fcfa(v_mrr) ||
      ' pour ' || v_clients || ' client(s) actif(s).' || E'\n' ||
    '• Pipeline pondéré ouvert : ' || public.cps_fmt_fcfa(v_pipeline) ||
      CASE WHEN v_won > 0 THEN ' — ' || v_won || ' affaire(s) signée(s) ce mois-ci.' ELSE '.' END || E'\n' ||
    '• Coûts du mois : ' || public.cps_fmt_fcfa(v_cost_now) || ', ' || v_delta || '.' || E'\n' ||
    '• Applications en production : ' || v_apps_live || '.' || E'\n' ||
    '• Jalons atteints ce mois : ' || v_ms_done ||
      CASE WHEN v_ms_slipped > 0 THEN ' — ' || v_ms_slipped || ' jalon(s) en glissement.' ELSE '.' END || E'\n' ||
    CASE WHEN v_assum > 0
      THEN '• ' || v_assum || ' hypothèse(s) bloquante(s) encore non tranchée(s).'
      ELSE '• Aucune hypothèse bloquante en attente.' END ||
    E'\n\nSynthèse calculée à partir des données du module, sans interprétation.';

  v_id := public.cps_proph3t_insight_insert(
    'synthese_periodique',
    CASE WHEN v_assum > 0 OR v_ms_slipped > 0 THEN 'attention' ELSE 'info' END,
    -- Mois en français explicite : to_char/TMMonth dépendrait de la locale serveur.
    'Rapport mensuel — ' || (ARRAY['janvier','février','mars','avril','mai','juin',
      'juillet','août','septembre','octobre','novembre','décembre'])[extract(month from v_month)::int]
      || ' ' || extract(year from v_month)::text,
    v_body,
    jsonb_build_object('period', v_month::text, 'generated_by', 'cps_monthly_report'),
    v_hash,
    'deterministe/sql'
  );

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.cps_monthly_report() FROM public;
GRANT EXECUTE ON FUNCTION public.cps_monthly_report() TO authenticated;

-- ── Planification : le 1er de chaque mois à 06:00 UTC ───────────────────────
SELECT cron.unschedule('cortex-monthly-report')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cortex-monthly-report');

SELECT cron.schedule(
  'cortex-monthly-report', '0 6 1 * *',
  $cron$SELECT public.cps_monthly_report();$cron$
);

-- Détection déterministe des signaux, tous les lundis à 06:15 UTC.
SELECT cron.unschedule('cortex-detect-signals')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cortex-detect-signals');

SELECT cron.schedule(
  'cortex-detect-signals', '15 6 * * 1',
  $cron$SELECT public.cps_detect_signals();$cron$
);

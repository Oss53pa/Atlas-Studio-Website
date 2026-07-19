-- ============================================================================
-- Cortex — VAGUE 4 : PROPH3T Cortex Advisor.
-- cps_proph3t_insights = SEULE table où PROPH3T écrit (RG-08). Rôle Postgres
-- dédié proph3t_writer (INSERT limité à cette table, défense en profondeur).
-- Détecteur de signaux déterministe (cps_detect_signals) — insights « matière
-- à décision », validation humaine obligatoire. L'IA (Edge cortex-advisor-feed)
-- ajoute la synthèse narrative par-dessus (post-contrôle anti-hallucination).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cps_proph3t_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type  TEXT NOT NULL CHECK (insight_type IN ('alerte_derive','opportunite','arbitrage_portefeuille','hypothese_suggeree','risque','synthese_periodique')),
  severity      TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','attention','critique')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  scope         JSONB NOT NULL DEFAULT '{}'::jsonb,
  inputs_hash   TEXT,
  model_used    TEXT,
  status        TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','lu','accepte','rejete','converti_en_action')),
  human_note    TEXT,
  cj_task_created TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_insights_status ON public.cps_proph3t_insights(status, created_at DESC);

-- ── Rôle dédié proph3t_writer : ne peut QUE insérer des insights (RG-08) ────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'proph3t_writer') THEN
    CREATE ROLE proph3t_writer NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO proph3t_writer;
GRANT INSERT ON public.cps_proph3t_insights TO proph3t_writer;

-- Seul chemin d'écriture : fonction SECURITY DEFINER possédée par proph3t_writer.
-- Même en cas de bug, elle ne peut toucher que cps_proph3t_insights.
CREATE OR REPLACE FUNCTION public.cps_proph3t_insight_insert(
  p_type TEXT, p_severity TEXT, p_title TEXT, p_body TEXT,
  p_scope JSONB DEFAULT '{}'::jsonb, p_inputs_hash TEXT DEFAULT NULL, p_model TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.cps_proph3t_insights (insight_type, severity, title, body, scope, inputs_hash, model_used)
  VALUES (p_type, p_severity, p_title, p_body, coalesce(p_scope,'{}'::jsonb), p_inputs_hash, p_model)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.cps_proph3t_insight_insert(TEXT,TEXT,TEXT,TEXT,JSONB,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cps_proph3t_insight_insert(TEXT,TEXT,TEXT,TEXT,JSONB,TEXT,TEXT) TO service_role, authenticated;

-- ── Détecteur de signaux déterministe (sans IA) — analyses programmées ──────
CREATE OR REPLACE FUNCTION public.cps_detect_signals()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_loco INT; v_n INT := 0; r RECORD;
BEGIN
  -- On repart des signaux auto « non traités » (garde ceux acceptés/rejetés par l'humain)
  DELETE FROM public.cps_proph3t_insights
   WHERE model_used = 'rule-engine' AND status IN ('nouveau','lu');

  -- RG-01 : plus de 3 locomotives
  SELECT count(*) INTO v_loco FROM public.cps_apps WHERE strategic_class = 'locomotive';
  IF v_loco > 3 THEN
    PERFORM public.cps_proph3t_insight_insert('arbitrage_portefeuille','critique',
      'Trop de locomotives (' || v_loco || '/3)',
      'Constat : ' || v_loco || ' apps sont classées « locomotive » (max 3, RG-01). Lecture : le focus est dilué. Orientation proposée : rétrograder ' || (v_loco - 3) || ' app(s) en « pari » ou « support ». Ce que ça suppose : accepter de ralentir volontairement certaines pistes.',
      jsonb_build_object('rule','RG-01','locomotives',v_loco), NULL, 'rule-engine');
    v_n := v_n + 1;
  END IF;

  -- Hypothèses bloquantes non testées (Mur de vérité)
  FOR r IN SELECT id, statement, app_id FROM public.cps_assumptions
           WHERE criticality = 'bloquante' AND status = 'a_tester'
           ORDER BY created_at LIMIT 5 LOOP
    PERFORM public.cps_proph3t_insight_insert('risque','attention',
      'Hypothèse bloquante non testée',
      'Constat : « ' || left(r.statement, 160) || ' » est bloquante et toujours « à tester ». Lecture : un pan du plan repose sur un pari non validé. Orientation proposée : définir une méthode de test et lancer la validation. Ce que ça suppose : y consacrer du temps avant d''investir davantage.',
      jsonb_build_object('rule','mur_verite','assumption_id',r.id,'app_id',r.app_id), NULL, 'rule-engine');
    v_n := v_n + 1;
  END LOOP;

  -- RG-04 : deals « pilote » inactifs > 30 j
  FOR r IN SELECT id, prospect_name FROM public.cps_deals
           WHERE stage = 'pilote' AND last_activity_at < now() - interval '30 days'
           ORDER BY last_activity_at LIMIT 5 LOOP
    PERFORM public.cps_proph3t_insight_insert('alerte_derive','attention',
      'Pilote sans activité depuis 30 j',
      'Constat : le deal « ' || r.prospect_name || ' » (étape pilote) n''a aucune activité depuis plus de 30 jours (RG-04). Lecture : risque de refroidissement avant conversion. Orientation proposée : relancer ou requalifier. Ce que ça suppose : une action commerciale rapide.',
      jsonb_build_object('rule','RG-04','deal_id',r.id), NULL, 'rule-engine');
    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.cps_detect_signals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cps_detect_signals() TO service_role, authenticated;

-- ── updated_at + audit (RG-10) + RLS admin ──────────────────────────────────
DROP TRIGGER IF EXISTS trg_cps_proph3t_insights_updated_at ON public.cps_proph3t_insights;
CREATE TRIGGER trg_cps_proph3t_insights_updated_at BEFORE UPDATE ON public.cps_proph3t_insights
  FOR EACH ROW EXECUTE FUNCTION public.cps_set_updated_at();
DROP TRIGGER IF EXISTS trg_cps_proph3t_insights_audit ON public.cps_proph3t_insights;
CREATE TRIGGER trg_cps_proph3t_insights_audit AFTER INSERT OR UPDATE OR DELETE ON public.cps_proph3t_insights
  FOR EACH ROW EXECUTE FUNCTION public.cps_audit_trigger();

-- RLS : admins lisent + trient (UPDATE), mais N'INSÈRENT PAS directement
-- (les insights ne viennent que de la RPC contrôlée). RG-08.
ALTER TABLE public.cps_proph3t_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read cps_proph3t_insights" ON public.cps_proph3t_insights;
CREATE POLICY "Admins read cps_proph3t_insights" ON public.cps_proph3t_insights FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins triage cps_proph3t_insights" ON public.cps_proph3t_insights;
CREATE POLICY "Admins triage cps_proph3t_insights" ON public.cps_proph3t_insights
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

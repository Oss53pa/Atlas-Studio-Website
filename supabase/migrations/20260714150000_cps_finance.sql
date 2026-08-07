-- ============================================================================
-- Cortex — VAGUE 2 : Finance & scénarios.
-- Pricing, scénarios (hypothèses chiffrées), projections (générées serveur),
-- canaux GTM. Montants BIGINT FCFA, calculs 100% Postgres (RG-07).
-- RG-02 : projection = inputs_hash obligatoire. RG-03 : hypothèse invalidée
-- → scénarios liés marqués is_stale. Audit auto (RG-10) sur les tables métier.
-- ============================================================================

-- 1. cps_pricing_plans — grilles tarifaires par app
CREATE TABLE IF NOT EXISTS public.cps_pricing_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id       UUID NOT NULL REFERENCES public.cps_apps(id) ON DELETE CASCADE,
  plan_code    TEXT NOT NULL,
  model        TEXT NOT NULL DEFAULT 'subscription'
                 CHECK (model IN ('subscription','freemium','setup_fee','usage','license','service')),
  amount_fcfa  BIGINT NOT NULL DEFAULT 0,
  period       TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (period IN ('monthly','quarterly','yearly','one_off')),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_pricing_app ON public.cps_pricing_plans(app_id, status);

-- 2. cps_scenarios — jeu d'hypothèses chiffrées (drivers) d'une projection
CREATE TABLE IF NOT EXISTS public.cps_scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  kind                  TEXT NOT NULL DEFAULT 'realiste'
                          CHECK (kind IN ('pessimiste','realiste','optimiste','custom')),
  app_id                UUID REFERENCES public.cps_apps(id) ON DELETE CASCADE,  -- NULL = global
  horizon_months        INT NOT NULL DEFAULT 24 CHECK (horizon_months BETWEEN 1 AND 60),
  -- drivers (hypothèses chiffrées)
  start_customers       INT NOT NULL DEFAULT 0,
  new_per_month         INT NOT NULL DEFAULT 0,
  growth_bp             INT NOT NULL DEFAULT 0,      -- croissance mensuelle du recrutement (basis points)
  churn_monthly_bp      INT NOT NULL DEFAULT 0,      -- attrition mensuelle (bp)
  avg_mrr_fcfa          BIGINT NOT NULL DEFAULT 0,   -- revenu moyen / client / mois
  monthly_fixed_cost_fcfa BIGINT NOT NULL DEFAULT 0,
  linked_assumption_ids UUID[] NOT NULL DEFAULT '{}',
  inputs_hash           TEXT,        -- SHA-256 des drivers au moment de la génération
  is_stale              BOOLEAN NOT NULL DEFAULT TRUE,  -- projections à (re)générer
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_scenarios_app ON public.cps_scenarios(app_id);

-- 3. cps_projections — lignes mensuelles GÉNÉRÉES (jamais saisies à la main)
CREATE TABLE IF NOT EXISTS public.cps_projections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id      UUID NOT NULL REFERENCES public.cps_scenarios(id) ON DELETE CASCADE,
  app_id           UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,
  month_index      INT NOT NULL,       -- 0 = premier mois de l'horizon
  mrr_fcfa         BIGINT NOT NULL DEFAULT 0,
  new_customers    INT NOT NULL DEFAULT 0,
  active_customers INT NOT NULL DEFAULT 0,
  churn_rate_bp    INT NOT NULL DEFAULT 0,
  costs_fcfa       BIGINT NOT NULL DEFAULT 0,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  inputs_hash      TEXT NOT NULL,      -- RG-02 : traçabilité des hypothèses d'entrée
  UNIQUE (scenario_id, month_index)
);
CREATE INDEX IF NOT EXISTS idx_cps_proj_scenario ON public.cps_projections(scenario_id, month_index);

-- 4. cps_channels — canaux GTM par app
CREATE TABLE IF NOT EXISTS public.cps_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID NOT NULL REFERENCES public.cps_apps(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'a_tester' CHECK (status IN ('a_tester','actif','abandonne')),
  cost_fcfa   BIGINT NOT NULL DEFAULT 0,
  results     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_channels_app ON public.cps_channels(app_id);

-- ── Moteur de projections (serveur, bigint) — RG-07 ─────────────────────────
CREATE OR REPLACE FUNCTION public.cps_generate_projections(p_scenario UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions
AS $$
DECLARE
  s RECORD;
  v_hash TEXT;
  m INT;
  v_active NUMERIC;
  v_new NUMERIC;
  v_count INT := 0;
BEGIN
  SELECT * INTO s FROM public.cps_scenarios WHERE id = p_scenario;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scénario introuvable'; END IF;

  -- inputs_hash : empreinte des drivers (reproductibilité)
  v_hash := encode(digest(
    s.start_customers::text || '|' || s.new_per_month::text || '|' || s.growth_bp::text || '|' ||
    s.churn_monthly_bp::text || '|' || s.avg_mrr_fcfa::text || '|' || s.monthly_fixed_cost_fcfa::text || '|' ||
    s.horizon_months::text, 'sha256'), 'hex');

  DELETE FROM public.cps_projections WHERE scenario_id = p_scenario;

  v_new := s.new_per_month;
  v_active := 0;
  FOR m IN 0 .. (s.horizon_months - 1) LOOP
    IF m = 0 THEN
      v_active := s.start_customers + v_new;
    ELSE
      v_new := round(v_new * (1 + s.growth_bp / 10000.0));
      v_active := round(v_active * (1 - s.churn_monthly_bp / 10000.0) + v_new);
    END IF;
    IF v_active < 0 THEN v_active := 0; END IF;

    INSERT INTO public.cps_projections
      (scenario_id, app_id, month_index, mrr_fcfa, new_customers, active_customers, churn_rate_bp, costs_fcfa, inputs_hash)
    VALUES
      (p_scenario, s.app_id, m,
       (round(v_active) * s.avg_mrr_fcfa)::bigint,
       round(v_new)::int, round(v_active)::int, s.churn_monthly_bp, s.monthly_fixed_cost_fcfa, v_hash);
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.cps_scenarios SET inputs_hash = v_hash, is_stale = FALSE, updated_at = now()
  WHERE id = p_scenario;

  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cps_generate_projections(UUID) TO authenticated;

-- ── RG-03 : hypothèse invalidée → scénarios liés marqués is_stale ───────────
CREATE OR REPLACE FUNCTION public.cps_assumption_invalidation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'invalidee' AND OLD.status IS DISTINCT FROM 'invalidee' THEN
    UPDATE public.cps_scenarios SET is_stale = TRUE
     WHERE NEW.id = ANY(linked_assumption_ids);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_cps_assum_invalidation ON public.cps_assumptions;
CREATE TRIGGER trg_cps_assum_invalidation AFTER UPDATE ON public.cps_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.cps_assumption_invalidation();

-- ── updated_at + audit auto (RG-10) sur les nouvelles tables métier ─────────
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['cps_pricing_plans','cps_scenarios','cps_channels']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
      CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.cps_set_updated_at();', t, t, t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;
      CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.cps_audit_trigger();', t, t, t, t);
  END LOOP;
END $$;

-- ── RLS (admin) sur les nouvelles tables ────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['cps_pricing_plans','cps_scenarios','cps_projections','cps_channels']) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins read %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins read %I" ON public.%I FOR SELECT USING (public.is_admin());', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());', t, t);
  END LOOP;
END $$;

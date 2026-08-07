-- ============================================================================
-- Cortex — VAGUE 3 : Data Fabric temps réel.
-- Ingestion d'événements business signés HMAC (via Edge Function cortex-ingest),
-- idempotence, normalisation → snapshot temps réel (publié Realtime).
-- Montants BIGINT FCFA. RLS admin. RG-09 (idempotence). RG-06 (provenance auto).
-- ============================================================================

-- 1. cps_data_sources — registre des sources émettrices
CREATE TABLE IF NOT EXISTS public.cps_data_sources (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app         TEXT NOT NULL UNIQUE,          -- ex: 'atlas_fna'
  mode               TEXT NOT NULL DEFAULT 'push' CHECK (mode IN ('push','pull','manual')),
  hmac_secret        TEXT,                           -- secret HMAC (TODO Vault en prod)
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  last_seen_at       TIMESTAMPTZ,
  event_count        BIGINT NOT NULL DEFAULT 0,
  reject_count       BIGINT NOT NULL DEFAULT 0,
  last_reject_reason TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. cps_events_raw — événements bruts ingérés (append-only, idempotent RG-09)
CREATE TABLE IF NOT EXISTS public.cps_events_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app       TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key  TEXT NOT NULL UNIQUE,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_events_app ON public.cps_events_raw(source_app, occurred_at DESC);

-- 3. cps_metrics_snapshot — état courant par app (publié Realtime)
CREATE TABLE IF NOT EXISTS public.cps_metrics_snapshot (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code       TEXT NOT NULL UNIQUE,
  app_id         UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,
  mrr_fcfa       BIGINT NOT NULL DEFAULT 0,
  active_clients INT NOT NULL DEFAULT 0,
  trials         INT NOT NULL DEFAULT 0,
  signups        INT NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. cps_effort_log — effort par app (import CockpitJourney ; manuel pour l'instant)
CREATE TABLE IF NOT EXISTS public.cps_effort_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id           UUID REFERENCES public.cps_apps(id) ON DELETE CASCADE,
  period_month     DATE NOT NULL,
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','connector')),
  tasks_completed  INT NOT NULL DEFAULT 0,
  points           NUMERIC(10,2) NOT NULL DEFAULT 0,
  hours            NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_effort_app ON public.cps_effort_log(app_id, period_month DESC);

-- ── Normalisation : événement brut → snapshot (COUCHE 2) ────────────────────
CREATE OR REPLACE FUNCTION public.cps_normalize_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app_id UUID;
  v_amt BIGINT := coalesce((NEW.payload->>'amount_fcfa')::bigint, 0);
BEGIN
  SELECT id INTO v_app_id FROM public.cps_apps WHERE code = NEW.source_app;

  INSERT INTO public.cps_metrics_snapshot (app_code, app_id, updated_at)
  VALUES (NEW.source_app, v_app_id, now())
  ON CONFLICT (app_code) DO UPDATE SET app_id = coalesce(EXCLUDED.app_id, cps_metrics_snapshot.app_id), updated_at = now();

  UPDATE public.cps_metrics_snapshot s SET
    signups        = s.signups        + CASE WHEN NEW.event_type = 'signup' THEN 1 ELSE 0 END,
    trials         = s.trials
                       + CASE WHEN NEW.event_type = 'trial_started' THEN 1 ELSE 0 END
                       - CASE WHEN NEW.event_type = 'subscription_started' THEN 1 ELSE 0 END,
    active_clients = s.active_clients
                       + CASE WHEN NEW.event_type = 'subscription_started' THEN 1 ELSE 0 END
                       - CASE WHEN NEW.event_type = 'subscription_cancelled' THEN 1 ELSE 0 END,
    mrr_fcfa       = s.mrr_fcfa
                       + CASE WHEN NEW.event_type = 'subscription_started' THEN v_amt ELSE 0 END
                       - CASE WHEN NEW.event_type = 'subscription_cancelled' THEN v_amt ELSE 0 END,
    updated_at = now()
  WHERE s.app_code = NEW.source_app;

  -- garde-fous : jamais de négatif
  UPDATE public.cps_metrics_snapshot SET
    trials = GREATEST(trials, 0), active_clients = GREATEST(active_clients, 0), mrr_fcfa = GREATEST(mrr_fcfa, 0)
  WHERE app_code = NEW.source_app;

  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_cps_normalize ON public.cps_events_raw;
CREATE TRIGGER trg_cps_normalize AFTER INSERT ON public.cps_events_raw
  FOR EACH ROW EXECUTE FUNCTION public.cps_normalize_event();

-- ── updated_at sur data_sources ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_cps_data_sources_updated_at ON public.cps_data_sources;
CREATE TRIGGER trg_cps_data_sources_updated_at BEFORE UPDATE ON public.cps_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.cps_set_updated_at();

-- ── Realtime : publier le snapshot ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='cps_metrics_snapshot') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cps_metrics_snapshot;
  END IF;
END $$;

-- ── RLS (admin) ; events_raw : insert service_role (Edge Function) ──────────
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['cps_data_sources','cps_events_raw','cps_metrics_snapshot','cps_effort_log']) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins read %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins read %I" ON public.%I FOR SELECT USING (public.is_admin());', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());', t, t);
  END LOOP;
END $$;

-- ── Dashboard : intégrer le MRR réel (snapshot) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.cps_dashboard()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'apps_total',    (SELECT count(*) FROM public.cps_apps),
    'apps_live',     (SELECT count(*) FROM public.cps_apps WHERE lifecycle_stage = 'live'),
    'apps_build',    (SELECT count(*) FROM public.cps_apps WHERE lifecycle_stage IN ('build','beta')),
    'apps_locomotive',(SELECT count(*) FROM public.cps_apps WHERE strategic_class = 'locomotive'),
    'mrr_real_fcfa', coalesce((SELECT sum(mrr_fcfa) FROM public.cps_metrics_snapshot), 0),
    'active_clients', coalesce((SELECT sum(active_clients) FROM public.cps_metrics_snapshot), 0),
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

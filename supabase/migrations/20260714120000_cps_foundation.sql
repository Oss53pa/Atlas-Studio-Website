-- ============================================================================
-- Cortex — VAGUE 1 : socle (CDC v1.0)
-- Registre portefeuille, coûts, pipeline commercial, jalons, hypothèses
-- + audit SHA-256 immuable chaîné. Montants en BIGINT FCFA (jamais de float,
-- jamais de calcul côté client). RLS admin (public.is_admin()).
-- Cloné sur le blueprint asvc_ (asvc_audit_log / asvc_log_audit).
-- Préfixe cps_. À tester sur branche Supabase avant merge prod.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. cps_apps — registre stratégique des applications du portefeuille
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_apps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  lifecycle_stage  TEXT NOT NULL DEFAULT 'idea'
                     CHECK (lifecycle_stage IN ('idea','cdc','build','beta','live','frozen','sunset')),
  strategic_class  TEXT NOT NULL DEFAULT 'support'
                     CHECK (strategic_class IN ('locomotive','pari','support','dormant')),
  priority_rank    INT,
  target_market    TEXT[] NOT NULL DEFAULT '{}',
  cosmos_leverage  BOOLEAN NOT NULL DEFAULT FALSE,
  cj_project_ref   TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_apps_stage    ON public.cps_apps(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_cps_apps_class     ON public.cps_apps(strategic_class);
CREATE INDEX IF NOT EXISTS idx_cps_apps_priority  ON public.cps_apps(priority_rank);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. cps_app_stage_history — historisation des changements de stade/priorité
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_app_stage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id         UUID NOT NULL REFERENCES public.cps_apps(id) ON DELETE CASCADE,
  field_changed  TEXT NOT NULL CHECK (field_changed IN ('lifecycle_stage','strategic_class','priority_rank')),
  old_value      TEXT,
  new_value      TEXT,
  reason         TEXT,
  changed_by     TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_stage_hist_app ON public.cps_app_stage_history(app_id, changed_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. cps_costs — coûts réels (montants BIGINT FCFA)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL
                  CHECK (category IN ('infra','ai_tooling','marketing','legal','hardware','financement','other')),
  label         TEXT,
  amount_fcfa   BIGINT NOT NULL,
  period_month  DATE NOT NULL,
  app_id        UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,  -- NULL = transverse
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','connector')),
  owner_only    BOOLEAN NOT NULL DEFAULT FALSE,  -- ex: financement/salaire → owner uniquement
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_costs_period ON public.cps_costs(period_month DESC);
CREATE INDEX IF NOT EXISTS idx_cps_costs_app    ON public.cps_costs(app_id);
CREATE INDEX IF NOT EXISTS idx_cps_costs_cat    ON public.cps_costs(category);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. cps_deals — pipeline commercial
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_deals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id             UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,
  prospect_name      TEXT NOT NULL,
  segment            TEXT,
  stage              TEXT NOT NULL DEFAULT 'contact'
                       CHECK (stage IN ('contact','demo','pilote','negociation','client','perdu')),
  expected_mrr_fcfa  BIGINT NOT NULL DEFAULT 0,
  probability_bp     INT NOT NULL DEFAULT 0 CHECK (probability_bp BETWEEN 0 AND 10000),  -- basis points
  origin             TEXT NOT NULL DEFAULT 'autre'
                       CHECK (origin IN ('reseau_perso','cosmos_terrain','inbound','partenaire','autre')),
  next_action        TEXT,
  next_action_date   DATE,
  source             TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','connector')),
  last_activity_at   TIMESTAMPTZ NOT NULL DEFAULT now(),  -- pour RG-04 (pilote inactif 30 j)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_deals_app    ON public.cps_deals(app_id);
CREATE INDEX IF NOT EXISTS idx_cps_deals_stage  ON public.cps_deals(stage);
CREATE INDEX IF NOT EXISTS idx_cps_deals_origin ON public.cps_deals(origin);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. cps_deal_events — historique d'étapes d'un deal (temps par étape)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_deal_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      UUID NOT NULL REFERENCES public.cps_deals(id) ON DELETE CASCADE,
  from_stage   TEXT,
  to_stage     TEXT NOT NULL,
  note         TEXT,
  actor        TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_deal_events_deal ON public.cps_deal_events(deal_id, occurred_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. cps_milestones — jalons stratégiques
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  category          TEXT NOT NULL
                      CHECK (category IN ('juridique','produit','commercial','financier','equipe')),
  target_date       DATE,
  status            TEXT NOT NULL DEFAULT 'a_venir'
                      CHECK (status IN ('a_venir','en_cours','atteint','glisse','abandonne')),
  app_id            UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,
  success_criteria  TEXT,
  cj_task_ref       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_milestones_date   ON public.cps_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_cps_milestones_status ON public.cps_milestones(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. cps_assumptions — registre d'hypothèses (cœur du module)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_assumptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement          TEXT NOT NULL,
  app_id             UUID REFERENCES public.cps_apps(id) ON DELETE SET NULL,
  domain             TEXT NOT NULL
                       CHECK (domain IN ('pricing','demande','canal','cout','reglementaire','tech')),
  criticality        TEXT NOT NULL DEFAULT 'majeure'
                       CHECK (criticality IN ('bloquante','majeure','mineure')),
  status             TEXT NOT NULL DEFAULT 'a_tester'
                       CHECK (status IN ('a_tester','en_test','validee','invalidee')),
  test_method        TEXT,
  evidence           JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_projections BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_assum_crit   ON public.cps_assumptions(criticality, status);
CREATE INDEX IF NOT EXISTS idx_cps_assum_app    ON public.cps_assumptions(app_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. cps_audit_log — immuable, hash chain SHA-256 (RG-10 / OHADA 10 ans)
--    Cloné à l'identique du pattern asvc_audit_log.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cps_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq            BIGINT GENERATED ALWAYS AS IDENTITY,  -- ordre d'insertion strict (chaînage fiable même multi-insert/transaction)
  ts             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('owner','advisor','system','proph3t','external')),
  actor_id       TEXT NOT NULL,
  event_type     TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  payload        JSONB,
  prev_hash      TEXT,
  hash           TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cps_audit_seq ON public.cps_audit_log(seq);
CREATE INDEX IF NOT EXISTS idx_cps_audit_ts       ON public.cps_audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_cps_audit_actor    ON public.cps_audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_cps_audit_resource ON public.cps_audit_log(resource_type, resource_id);

CREATE OR REPLACE RULE cps_audit_no_update AS ON UPDATE TO public.cps_audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE cps_audit_no_delete AS ON DELETE TO public.cps_audit_log DO INSTEAD NOTHING;

CREATE OR REPLACE FUNCTION public.cps_audit_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions   -- pgcrypto.digest vit dans le schéma extensions (Supabase)
AS $$
DECLARE
  v_prev TEXT;
BEGIN
  SELECT hash INTO v_prev
  FROM public.cps_audit_log
  ORDER BY seq DESC
  LIMIT 1;

  NEW.prev_hash := v_prev;
  NEW.hash := encode(
    digest(
      coalesce(v_prev, '') ||
      NEW.actor_type || NEW.actor_id || NEW.event_type ||
      coalesce(NEW.resource_type, '') || coalesce(NEW.resource_id::text, '') ||
      coalesce(NEW.payload::text, '') ||
      NEW.ts::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cps_audit_hash ON public.cps_audit_log;
CREATE TRIGGER trg_cps_audit_hash
  BEFORE INSERT ON public.cps_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.cps_audit_compute_hash();

-- RPC d'insertion contrôlée (edge functions / actions serveur)
CREATE OR REPLACE FUNCTION public.cps_log_audit(
  p_actor_type    TEXT,
  p_actor_id      TEXT,
  p_event_type    TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id   UUID DEFAULT NULL,
  p_payload       JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.cps_audit_log (
    actor_type, actor_id, event_type, resource_type, resource_id, payload
  ) VALUES (
    p_actor_type, p_actor_id, p_event_type, p_resource_type, p_resource_id, p_payload
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cps_log_audit(TEXT,TEXT,TEXT,TEXT,UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cps_log_audit(TEXT,TEXT,TEXT,TEXT,UUID,JSONB) TO service_role;

-- Vérification d'intégrité de la chaîne (recalcule et compare)
CREATE OR REPLACE FUNCTION public.cps_verify_audit_chain(p_limit INT DEFAULT 1000)
RETURNS TABLE (checked INT, broken_at UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r RECORD;
  v_prev TEXT := NULL;
  v_calc TEXT;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.cps_audit_log ORDER BY seq ASC LIMIT p_limit
  LOOP
    v_calc := encode(digest(
      coalesce(v_prev,'') || r.actor_type || r.actor_id || r.event_type ||
      coalesce(r.resource_type,'') || coalesce(r.resource_id::text,'') ||
      coalesce(r.payload::text,'') || r.ts::text, 'sha256'), 'hex');
    v_count := v_count + 1;
    IF r.hash <> v_calc OR coalesce(r.prev_hash,'') <> coalesce(v_prev,'') THEN
      checked := v_count; broken_at := r.id; RETURN NEXT; RETURN;
    END IF;
    v_prev := r.hash;
  END LOOP;
  checked := v_count; broken_at := NULL; RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.cps_verify_audit_chain(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cps_verify_audit_chain(INT) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- updated_at automatique
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cps_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'cps_apps','cps_costs','cps_deals','cps_milestones','cps_assumptions'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.cps_set_updated_at();', t, t, t, t);
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- RLS — toutes les tables cps_ réservées aux admins (public.is_admin())
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'cps_apps','cps_app_stage_history','cps_costs','cps_deals','cps_deal_events',
    'cps_milestones','cps_assumptions','cps_audit_log'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins read %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Admins read %I" ON public.%I FOR SELECT USING (public.is_admin());', t, t);

    IF t = 'cps_audit_log' THEN
      -- Audit : insert autorisé (via RPC SECURITY DEFINER), jamais update/delete (RULES).
      EXECUTE format('DROP POLICY IF EXISTS "Service insert %I" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "Service insert %I" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Admins manage %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());',
        t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- FIN — cps_foundation (Vague 1). Migrations suivantes : cps_finance, cps_gtm,
-- cps_data_fabric, cps_proph3t, cps_canvas.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Atlas Studio Virtual Company
-- Sprint S0 : Foundation
-- 15 tables + RLS + audit log immutable + pgvector
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Convention: toutes les tables sont prefixees `asvc_` pour isoler le module
-- de la 13e app. RLS active partout : seuls les admins (public.is_admin())
-- ou le service_role peuvent acceder. L'audit log est protege par des RULES
-- contre UPDATE/DELETE (conformite OHADA, 10 ans retention).
--
-- pgvector dim 768 : cohérent avec le reste du projet (nomic-embed-text).
-- Si le LLM primaire bascule sur LLaMA 3.1 70B avec embeddings 1024, prevoir
-- une migration ALTER COLUMN ou une seconde colonne.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. asvc_agents — registre des 11 agents virtuels
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL CHECK (department IN ('direction','sav','marketing','ventes','finance')),
  role_description TEXT NOT NULL,
  system_prompt   TEXT NOT NULL,
  llm_primary     TEXT NOT NULL DEFAULT 'ollama:llama-3.1-70b',
  llm_fallback    TEXT NOT NULL DEFAULT 'anthropic:claude-sonnet-4',
  tools           JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_agents_dept ON public.asvc_agents(department);
CREATE INDEX IF NOT EXISTS idx_asvc_agents_active ON public.asvc_agents(is_active) WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. asvc_agent_sessions — un cycle de travail
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_agent_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES public.asvc_agents(id) ON DELETE CASCADE,
  trigger_type      TEXT NOT NULL,
  trigger_payload   JSONB,
  parent_session_id UUID REFERENCES public.asvc_agent_sessions(id),
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  tokens_used       INT NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_asvc_sessions_agent ON public.asvc_agent_sessions(agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_sessions_status ON public.asvc_agent_sessions(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. asvc_agent_actions — actions proposees / executees
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_agent_actions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         UUID REFERENCES public.asvc_agent_sessions(id) ON DELETE CASCADE,
  agent_id           UUID NOT NULL REFERENCES public.asvc_agents(id),
  action_type        TEXT NOT NULL,
  criticality        TEXT NOT NULL DEFAULT 'normal' CHECK (criticality IN ('low','normal','high','critical')),
  title              TEXT NOT NULL,
  description        TEXT,
  proposed_payload   JSONB NOT NULL,
  context            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
                       'proposed','consolidated','approved','modified',
                       'rejected','executed','failed','cancelled'
                     )),
  validated_by       TEXT,
  validated_at       TIMESTAMPTZ,
  validation_note    TEXT,
  modified_payload   JSONB,
  executed_at        TIMESTAMPTZ,
  execution_result   JSONB,
  execution_error    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_actions_status      ON public.asvc_agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_asvc_actions_criticality ON public.asvc_agent_actions(criticality);
CREATE INDEX IF NOT EXISTS idx_asvc_actions_agent       ON public.asvc_agent_actions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_actions_pending     ON public.asvc_agent_actions(created_at DESC)
  WHERE status IN ('proposed','consolidated');

-- ───────────────────────────────────────────────────────────────────────────
-- 4. asvc_coo_briefs — briefs COO -> CEO
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_coo_briefs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_type           TEXT NOT NULL CHECK (brief_type IN ('morning','evening','weekly','alert')),
  brief_date           DATE NOT NULL,
  summary              TEXT NOT NULL,
  details_markdown     TEXT,
  kpis                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  arbitrations_pending INT NOT NULL DEFAULT 0,
  arbitrations_urgent  INT NOT NULL DEFAULT 0,
  read_by_ceo          BOOLEAN NOT NULL DEFAULT FALSE,
  read_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_briefs_date ON public.asvc_coo_briefs(brief_date DESC, brief_type);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. asvc_agent_memory_long — memoire longue vectorielle
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_agent_memory_long (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID REFERENCES public.asvc_agents(id),
  memory_type       TEXT NOT NULL,
  content           TEXT NOT NULL,
  embedding         vector(768),
  source_action_id  UUID REFERENCES public.asvc_agent_actions(id),
  importance_score  NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_count      INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_asvc_memory_long_embedding
  ON public.asvc_agent_memory_long
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_asvc_memory_long_agent ON public.asvc_agent_memory_long(agent_id, memory_type);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. asvc_agent_memory_shared — KV partage inter-agents
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_agent_memory_shared (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                    TEXT UNIQUE NOT NULL,
  value                  JSONB NOT NULL,
  description            TEXT,
  updated_by_agent_id    UUID REFERENCES public.asvc_agents(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. asvc_tickets — SAV
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_tickets (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number            TEXT UNIQUE NOT NULL,
  source                   TEXT NOT NULL,
  source_message_id        TEXT,
  client_email             TEXT,
  client_name              TEXT,
  client_id                UUID,
  app_concerned            TEXT,
  subject                  TEXT,
  initial_message          TEXT NOT NULL,
  category                 TEXT,
  priority                 TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_client','resolved','closed')),
  assigned_agent_id        UUID REFERENCES public.asvc_agents(id),
  sentiment_score          NUMERIC(3,2),
  resolved_at              TIMESTAMPTZ,
  resolution_time_minutes  INT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_tickets_status   ON public.asvc_tickets(status);
CREATE INDEX IF NOT EXISTS idx_asvc_tickets_priority ON public.asvc_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_asvc_tickets_client   ON public.asvc_tickets(client_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. asvc_ticket_messages — fil de discussion par ticket
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_ticket_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID NOT NULL REFERENCES public.asvc_tickets(id) ON DELETE CASCADE,
  sender_type         TEXT NOT NULL CHECK (sender_type IN ('client','agent','ceo')),
  sender_id           TEXT,
  content             TEXT NOT NULL,
  attachments         JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_action_id   UUID REFERENCES public.asvc_agent_actions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_ticket_msg_ticket ON public.asvc_ticket_messages(ticket_id, created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. asvc_leads — Ventes
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source               TEXT NOT NULL,
  company_name         TEXT NOT NULL,
  contact_name         TEXT,
  contact_email        TEXT,
  contact_phone        TEXT,
  country              TEXT,
  sector               TEXT,
  size_estimate        TEXT,
  product_interest     TEXT[],
  stage                TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN (
                         'prospect','mql','sql','demo_scheduled','demo_done',
                         'proposal_sent','negotiation','won','lost'
                       )),
  score                INT NOT NULL DEFAULT 0,
  notes                TEXT,
  assigned_agent_id    UUID REFERENCES public.asvc_agents(id),
  last_touch_at        TIMESTAMPTZ,
  next_action_due_at   TIMESTAMPTZ,
  customer_id          UUID,
  contract_value_fcfa  BIGINT,
  closed_at            TIMESTAMPTZ,
  loss_reason          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_leads_stage ON public.asvc_leads(stage);
CREATE INDEX IF NOT EXISTS idx_asvc_leads_score ON public.asvc_leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_leads_next_action ON public.asvc_leads(next_action_due_at)
  WHERE next_action_due_at IS NOT NULL AND stage NOT IN ('won','lost');

-- ───────────────────────────────────────────────────────────────────────────
-- 10. asvc_lead_interactions — historique des touches
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_lead_interactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES public.asvc_leads(id) ON DELETE CASCADE,
  agent_id            UUID REFERENCES public.asvc_agents(id),
  channel             TEXT NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  content             TEXT,
  outcome             TEXT,
  related_action_id   UUID REFERENCES public.asvc_agent_actions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_lead_inter_lead ON public.asvc_lead_interactions(lead_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 11. asvc_content_calendar — Marketing
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_content_calendar (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID REFERENCES public.asvc_agents(id),
  channel             TEXT NOT NULL CHECK (channel IN ('linkedin','x','instagram','facebook','newsletter','blog')),
  content_type        TEXT NOT NULL,
  title               TEXT,
  content             TEXT NOT NULL,
  media_urls          TEXT[],
  hashtags            TEXT[],
  scheduled_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','scheduled','published','rejected')),
  related_action_id   UUID REFERENCES public.asvc_agent_actions(id),
  impressions         INT NOT NULL DEFAULT 0,
  engagements         INT NOT NULL DEFAULT 0,
  clicks              INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_content_channel ON public.asvc_content_calendar(channel, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_asvc_content_status ON public.asvc_content_calendar(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 12. asvc_invoices — Finance (lien Atlas Finance pour dogfooding)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_invoices (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number              TEXT UNIQUE NOT NULL,
  client_id                   UUID NOT NULL,
  client_name                 TEXT NOT NULL,
  atlas_finance_invoice_id    UUID,
  amount_ht_fcfa              BIGINT NOT NULL,
  amount_tva_fcfa             BIGINT NOT NULL,
  amount_ttc_fcfa             BIGINT NOT NULL,
  issued_date                 DATE NOT NULL,
  due_date                    DATE NOT NULL,
  paid_date                   DATE,
  status                      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                                'draft','pending_approval','sent','partially_paid','paid','overdue','cancelled'
                              )),
  payment_method              TEXT,
  payment_reference           TEXT,
  reminder_count              INT NOT NULL DEFAULT 0,
  last_reminder_at            TIMESTAMPTZ,
  related_action_id           UUID REFERENCES public.asvc_agent_actions(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_invoices_status ON public.asvc_invoices(status);
CREATE INDEX IF NOT EXISTS idx_asvc_invoices_due    ON public.asvc_invoices(due_date)
  WHERE status NOT IN ('paid','cancelled');

-- ───────────────────────────────────────────────────────────────────────────
-- 13. asvc_audit_log — immuable, hash chain (OHADA 10 ans)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('agent','ceo','system','external')),
  actor_id        TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  payload         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  prev_hash       TEXT,
  hash            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asvc_audit_ts       ON public.asvc_audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_audit_actor    ON public.asvc_audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_asvc_audit_resource ON public.asvc_audit_log(resource_type, resource_id);

-- Immuabilite : RULES bloquent UPDATE/DELETE meme pour le service_role.
-- Si une correction d'audit est necessaire un jour, il faudra creer une
-- table de "corrections" qui REFERENCE l'audit log original, sans le modifier.
CREATE OR REPLACE RULE asvc_audit_no_update AS ON UPDATE TO public.asvc_audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE asvc_audit_no_delete AS ON DELETE TO public.asvc_audit_log DO INSTEAD NOTHING;

-- Trigger : calcule hash = sha256(prev_hash || payload || ts) pour chainage.
CREATE OR REPLACE FUNCTION public.asvc_audit_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev TEXT;
BEGIN
  SELECT hash INTO v_prev
  FROM public.asvc_audit_log
  ORDER BY ts DESC, id DESC
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

DROP TRIGGER IF EXISTS trg_asvc_audit_hash ON public.asvc_audit_log;
CREATE TRIGGER trg_asvc_audit_hash
  BEFORE INSERT ON public.asvc_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.asvc_audit_compute_hash();

-- ───────────────────────────────────────────────────────────────────────────
-- 14. asvc_kill_switch — controle d'urgence
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_kill_switch (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope             TEXT NOT NULL CHECK (scope IN ('all','department','agent')),
  target            TEXT,
  is_active         BOOLEAN NOT NULL,
  reason            TEXT,
  activated_by      TEXT,
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_asvc_kill_active ON public.asvc_kill_switch(is_active) WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────────────
-- 15. asvc_ceo_preferences — apprentissage des gouts de la CEO
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_ceo_preferences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category                 TEXT NOT NULL,
  preference_key           TEXT NOT NULL,
  preference_value         JSONB NOT NULL,
  learned_from_action_ids  UUID[],
  confidence_score         NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, preference_key)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Helper : touched_at trigger commun (updated_at auto)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asvc_agents','asvc_agent_actions','asvc_tickets','asvc_leads',
    'asvc_invoices','asvc_ceo_preferences'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.asvc_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- RLS — toutes les tables ASVC reservees aux admins (CEO + super_admin)
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asvc_agents','asvc_agent_sessions','asvc_agent_actions','asvc_coo_briefs',
    'asvc_agent_memory_long','asvc_agent_memory_shared','asvc_tickets',
    'asvc_ticket_messages','asvc_leads','asvc_lead_interactions',
    'asvc_content_calendar','asvc_invoices','asvc_audit_log',
    'asvc_kill_switch','asvc_ceo_preferences'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- Drop puis recreate (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "Admins read %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins read %I" ON public.%I FOR SELECT USING (public.is_admin());',
      t, t
    );

    -- Sauf l'audit log (jamais d'UPDATE/DELETE meme pour admin)
    -- et le kill switch (admins peuvent l'activer)
    IF t = 'asvc_audit_log' THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS "Service insert %I" ON public.%I;
         CREATE POLICY "Service insert %I" ON public.%I FOR INSERT WITH CHECK (true);',
        t, t, t, t
      );
    ELSE
      EXECUTE format(
        'DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;
         CREATE POLICY "Admins manage %I" ON public.%I
           FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());',
        t, t, t, t
      );
    END IF;
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- Seed initial : 11 agents ASVC (system_prompt vide, sera rempli par migration suivante)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.asvc_agents (code, name, department, role_description, system_prompt, llm_primary) VALUES
  ('coo',               'COO Agent',                'direction', 'Orchestrateur, interface unique avec la CEO',                'TODO: voir migration system_prompts', 'anthropic:claude-sonnet-4'),
  ('support_n1',        'Support Agent N1',         'sav',       'Tickets N1-N2, FAQ, parametrage, how-to',                    'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('customer_success',  'Customer Success Agent',   'sav',       'Onboarding, prevention churn, upsell',                       'TODO: voir migration system_prompts', 'anthropic:claude-sonnet-4'),
  ('bug_triage',        'Bug Triage Agent',         'sav',       'Reproduction bugs, qualification P0-P3, GitHub Issues',      'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('content',           'Content Agent',            'marketing', 'Posts LinkedIn/X/IG/FB, newsletter, articles blog',          'TODO: voir migration system_prompts', 'anthropic:claude-sonnet-4'),
  ('community',         'Community Agent',          'marketing', 'Reponses commentaires/DMs, moderation',                      'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('prospection',       'Prospection Agent',        'ventes',    'Identification cibles, enrichissement leads',                'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('sdr',               'SDR Agent',                'ventes',    'Sequences outreach, qualification BANT, prise RDV',          'TODO: voir migration system_prompts', 'anthropic:claude-sonnet-4'),
  ('closer',            'Closer Agent',             'ventes',    'Propositions commerciales, devis, suivi closing',            'TODO: voir migration system_prompts', 'anthropic:claude-sonnet-4'),
  ('facturation',       'Facturation Agent',        'finance',   'Emission factures, relances, recouvrement amiable',          'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('compta',            'Compta Agent',             'finance',   'Saisie SYSCOHADA, TVA, declarations DGI',                    'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b'),
  ('tresorerie',        'Tresorerie Agent',         'finance',   'Cashflow previsionnel, runway, alertes seuils',              'TODO: voir migration system_prompts', 'ollama:llama-3.1-70b')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Memoire partagee initiale
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.asvc_agent_memory_shared (key, value, description) VALUES
  ('company_voice', '{"tone":"expert mais accessible","language":"fr","banned_words":["synergies","disruption"]}',
                    'Voix de marque Atlas Studio'),
  ('current_quarter', jsonb_build_object('year', extract(year from now()), 'quarter', ceil(extract(month from now())/3.0)),
                      'Trimestre courant'),
  ('pricing_grid', '{}', 'Grille tarifaire (a remplir par CEO)'),
  ('icp', '{"sectors":["cabinet_compta","pme_retail","industrie"],"countries":["CI","SN","CM","BF","TG","BJ"]}',
          'Ideal Customer Profile')
ON CONFLICT (key) DO NOTHING;

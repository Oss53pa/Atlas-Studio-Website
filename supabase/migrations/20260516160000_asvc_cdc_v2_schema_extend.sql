-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Schema extend CDC v2.0
-- ═══════════════════════════════════════════════════════════════════════════
-- Adopte les ajouts de l'Annexe B sans casser le schéma existant : toutes les
-- nouvelles colonnes sont AJOUTÉES (les anciennes restent en place pour ne
-- pas casser les Edge Functions qui les lisent). Migration de données :
-- backfill depuis les colonnes existantes vers les nouvelles.
--
-- Non adoptés intentionnellement (cf. analyse Annexe A vs B) :
--   - RLS atlas_ceo (on garde is_admin())
--   - vector(1536) (on garde 768, cohérent avec Proph3t)
--   - Drop cost_usd / metadata / ip_address (régressions)
--   - Cron pg_cron + pg_net (on garde edge functions externes)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. asvc_agents : extend LLM config + status enum + hiérarchie + versioning
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_agents
  ADD COLUMN IF NOT EXISTS llm_provider     TEXT,
  ADD COLUMN IF NOT EXISTS llm_model        TEXT,
  ADD COLUMN IF NOT EXISTS llm_temperature  NUMERIC(3,2) DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS llm_max_tokens   INTEGER DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS health_score     NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS reports_to       TEXT,
  ADD COLUMN IF NOT EXISTS version          TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS description      TEXT;

-- Backfill llm_provider/llm_model depuis llm_primary (format 'provider:model')
UPDATE public.asvc_agents
  SET llm_provider = split_part(llm_primary, ':', 1),
      llm_model    = substring(llm_primary FROM position(':' IN llm_primary) + 1)
  WHERE llm_provider IS NULL AND llm_primary LIKE '%:%';

-- Backfill status depuis is_active
UPDATE public.asvc_agents
  SET status = CASE WHEN is_active THEN 'active' ELSE 'disabled' END
  WHERE status = 'active' AND is_active = FALSE;

-- Backfill reports_to : tous remontent au COO (sauf COO lui-même)
UPDATE public.asvc_agents SET reports_to = 'coo' WHERE code != 'coo' AND reports_to IS NULL;

-- Backfill description depuis role_description (qui n'est pas dans Annexe B)
UPDATE public.asvc_agents SET description = role_description WHERE description IS NULL;

-- Contraintes après backfill
ALTER TABLE public.asvc_agents
  DROP CONSTRAINT IF EXISTS asvc_agents_status_check;
ALTER TABLE public.asvc_agents
  ADD CONSTRAINT asvc_agents_status_check
  CHECK (status IN ('active', 'paused', 'quarantine', 'disabled'));

ALTER TABLE public.asvc_agents
  DROP CONSTRAINT IF EXISTS asvc_agents_health_score_check;
ALTER TABLE public.asvc_agents
  ADD CONSTRAINT asvc_agents_health_score_check
  CHECK (health_score BETWEEN 0 AND 1);

ALTER TABLE public.asvc_agents
  DROP CONSTRAINT IF EXISTS asvc_agents_llm_temperature_check;
ALTER TABLE public.asvc_agents
  ADD CONSTRAINT asvc_agents_llm_temperature_check
  CHECK (llm_temperature BETWEEN 0 AND 2);

-- FK reports_to → asvc_agents.code (référence sur colonne UNIQUE)
ALTER TABLE public.asvc_agents
  DROP CONSTRAINT IF EXISTS asvc_agents_reports_to_fkey;
ALTER TABLE public.asvc_agents
  ADD CONSTRAINT asvc_agents_reports_to_fkey
  FOREIGN KEY (reports_to) REFERENCES public.asvc_agents(code);

CREATE INDEX IF NOT EXISTS idx_asvc_agents_status_v2 ON public.asvc_agents(status);
CREATE INDEX IF NOT EXISTS idx_asvc_agents_reports_to ON public.asvc_agents(reports_to);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. asvc_agent_sessions : granularité tokens + duration + erreur
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_agent_sessions
  ADD COLUMN IF NOT EXISTS tokens_input  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_output INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms   INTEGER,
  ADD COLUMN IF NOT EXISTS output        JSONB,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Backfill duration_ms depuis ended_at - started_at
UPDATE public.asvc_agent_sessions
  SET duration_ms = (EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000)::INT
  WHERE duration_ms IS NULL AND ended_at IS NOT NULL;

-- Note : tokens_used reste en place comme legacy. Les nouveaux writers
-- doivent peupler tokens_input + tokens_output (somme = tokens_used).
-- cost_usd reste en place (Annexe B le drop, on le préserve = tracking finance).

-- ───────────────────────────────────────────────────────────────────────────
-- 3. asvc_coo_briefs : weather + highlights + pending_decisions
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_coo_briefs
  ADD COLUMN IF NOT EXISTS weather           TEXT,
  ADD COLUMN IF NOT EXISTS highlights        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pending_decisions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.asvc_coo_briefs
  DROP CONSTRAINT IF EXISTS asvc_coo_briefs_weather_check;
ALTER TABLE public.asvc_coo_briefs
  ADD CONSTRAINT asvc_coo_briefs_weather_check
  CHECK (weather IS NULL OR weather IN ('green', 'yellow', 'red'));

-- Étendre brief_type pour 'incident' + 'special' (Annexe B)
ALTER TABLE public.asvc_coo_briefs
  DROP CONSTRAINT IF EXISTS asvc_coo_briefs_brief_type_check;
ALTER TABLE public.asvc_coo_briefs
  ADD CONSTRAINT asvc_coo_briefs_brief_type_check
  CHECK (brief_type IN ('morning', 'evening', 'weekly', 'alert', 'incident', 'special'));

-- ───────────────────────────────────────────────────────────────────────────
-- 4. asvc_audit_log : sequence_number BIGSERIAL + event_category
-- ───────────────────────────────────────────────────────────────────────────
-- Note : la table est protégée par RULES contre UPDATE/DELETE des données,
-- mais ALTER TABLE (DDL) passe outre. Audit log est vide (0 row) donc safe.

ALTER TABLE public.asvc_audit_log
  ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL,
  ADD COLUMN IF NOT EXISTS event_category  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS asvc_audit_log_sequence_number_uniq
  ON public.asvc_audit_log(sequence_number);

CREATE INDEX IF NOT EXISTS idx_asvc_audit_event_category
  ON public.asvc_audit_log(event_category)
  WHERE event_category IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. asvc_ceo_preferences : auto-approve patterns (apprentissage COO)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_ceo_preferences
  ADD COLUMN IF NOT EXISTS is_auto_approve_pattern    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pattern_match_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pattern_required_threshold INTEGER DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_asvc_ceo_prefs_auto_approve
  ON public.asvc_ceo_preferences(is_auto_approve_pattern)
  WHERE is_auto_approve_pattern = TRUE;

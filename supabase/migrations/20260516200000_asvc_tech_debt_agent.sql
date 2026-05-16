-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC v2.1 — Tech Debt Agent (20e agent) + code health audits + tech debt items
-- ═══════════════════════════════════════════════════════════════════════════
-- Comble les gaps identifiés dans le CDC v2.0 sur la maintenance des 14 apps
-- Atlas Studio existantes : audit proactif, refactoring planifié, perf audit
-- complet, mise à jour des dépendances.
--
-- L'agent fonctionne en CRON HEBDO (lundi 6h) et produit :
--   1. `asvc_code_health_audits` : 1 audit / app / run avec score 0-100 + métriques
--   2. `asvc_tech_debt_items` : items individuels détectés (catégorie, severity, priority)
--
-- Le Dev Agent pioche dans tech_debt_items en parallèle des specs (cf. extension
-- de son system_prompt dans la migration suivante).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. asvc_code_health_audits — snapshot par app par run
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_code_health_audits (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id               UUID REFERENCES public.asvc_agents(id),
  app_concerned          TEXT NOT NULL,
  audit_date             DATE NOT NULL DEFAULT current_date,
  score                  NUMERIC(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  metrics                JSONB NOT NULL DEFAULT '{}'::jsonb,
  items_detected_count   INT NOT NULL DEFAULT 0,
  items_critical_count   INT NOT NULL DEFAULT 0,
  trend                  TEXT CHECK (trend IS NULL OR trend IN ('improving','stable','degrading')),
  previous_score         NUMERIC(5,2),
  scan_tools_used        JSONB NOT NULL DEFAULT '[]'::jsonb,
  scan_duration_seconds  INT,
  related_action_id      UUID REFERENCES public.asvc_agent_actions(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_concerned, audit_date)
);

CREATE INDEX IF NOT EXISTS idx_asvc_health_audits_app_date
  ON public.asvc_code_health_audits(app_concerned, audit_date DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. asvc_tech_debt_items — items détectés
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_tech_debt_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_by_agent_id   UUID REFERENCES public.asvc_agents(id),
  audit_id               UUID REFERENCES public.asvc_code_health_audits(id) ON DELETE SET NULL,
  app_concerned          TEXT NOT NULL,
  category               TEXT NOT NULL CHECK (category IN (
                           'duplication','complexity','unused_code','outdated_dep',
                           'vulnerability','perf_regression','arch_smell','bundle_bloat',
                           'rls_missing','security_definer_search_path','i18n_missing'
                         )),
  title                  TEXT NOT NULL,
  description            TEXT,
  severity               TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  priority               TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  file_paths             TEXT[],
  detected_metric        JSONB,
  effort_estimate        TEXT CHECK (effort_estimate IS NULL OR effort_estimate IN ('XS','S','M','L','XL')),
  status                 TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
                           'detected','qualified','in_backlog','in_progress','fixed','wont_fix','duplicate'
                         )),
  related_pr_id          UUID REFERENCES public.asvc_code_pull_requests(id),
  related_action_id      UUID REFERENCES public.asvc_agent_actions(id),
  fix_branch             TEXT,
  resolved_at            TIMESTAMPTZ,
  resolution_notes       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asvc_tech_debt_app_priority
  ON public.asvc_tech_debt_items(app_concerned, priority, status);
CREATE INDEX IF NOT EXISTS idx_asvc_tech_debt_open
  ON public.asvc_tech_debt_items(priority, created_at DESC)
  WHERE status IN ('detected','qualified','in_backlog','in_progress');
CREATE INDEX IF NOT EXISTS idx_asvc_tech_debt_severity
  ON public.asvc_tech_debt_items(severity)
  WHERE severity IN ('high','critical');

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Trigger updated_at sur asvc_tech_debt_items
-- ───────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_asvc_tech_debt_items_updated_at ON public.asvc_tech_debt_items;
CREATE TRIGGER trg_asvc_tech_debt_items_updated_at
  BEFORE UPDATE ON public.asvc_tech_debt_items
  FOR EACH ROW EXECUTE FUNCTION public.asvc_set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. RLS — pattern is_admin() cohérent
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.asvc_code_health_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read asvc_code_health_audits" ON public.asvc_code_health_audits;
CREATE POLICY "Admins read asvc_code_health_audits"
  ON public.asvc_code_health_audits FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins manage asvc_code_health_audits" ON public.asvc_code_health_audits;
CREATE POLICY "Admins manage asvc_code_health_audits"
  ON public.asvc_code_health_audits FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.asvc_tech_debt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read asvc_tech_debt_items" ON public.asvc_tech_debt_items;
CREATE POLICY "Admins read asvc_tech_debt_items"
  ON public.asvc_tech_debt_items FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins manage asvc_tech_debt_items" ON public.asvc_tech_debt_items;
CREATE POLICY "Admins manage asvc_tech_debt_items"
  ON public.asvc_tech_debt_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Vue v_asvc_tech_debt_priority — backlog priorisé pour Dev Agent + cockpit
-- ───────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_asvc_tech_debt_priority;
CREATE VIEW public.v_asvc_tech_debt_priority
  WITH (security_invoker = true) AS
SELECT
  t.id,
  t.app_concerned,
  t.category,
  t.title,
  t.description,
  t.severity,
  t.priority,
  t.status,
  t.effort_estimate,
  t.file_paths,
  COALESCE(array_length(t.file_paths, 1), 0) AS files_count,
  t.detected_metric,
  t.fix_branch,
  t.created_at,
  t.updated_at,
  CASE t.priority
    WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 ELSE 4
  END AS sort_order
FROM public.asvc_tech_debt_items t
WHERE t.status IN ('detected','qualified','in_backlog','in_progress')
ORDER BY sort_order, t.created_at DESC;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Seed du 20e agent : tech_debt
-- ───────────────────────────────────────────────────────────────────────────
-- Note : system_prompt sera rempli par la migration suivante (asvc_v2_1_prompts).
-- On utilise un placeholder TODO ici pour respecter la contrainte NOT NULL.
INSERT INTO public.asvc_agents (
  code, name, department, role_description, system_prompt,
  llm_primary, llm_fallback,
  llm_provider, llm_model, llm_temperature, llm_max_tokens,
  status, health_score, version, description, reports_to
) VALUES (
  'tech_debt',
  'Tech Debt Agent',
  'production',
  'Audit code health hebdomadaire des 14 apps : duplications, complexité, deps obsolètes, vulnérabilités, perf. Backlog priorisé P0-P3.',
  'TODO: voir migration asvc_v2_1_system_prompts',
  'anthropic:claude-sonnet-4-6',
  'anthropic:claude-sonnet-4-6',
  'anthropic',
  'claude-sonnet-4-6',
  0.5,
  8192,
  'active',
  1.0,
  '1.0',
  'Senior Software Engineer virtuel dédié à la code health des apps existantes : audit proactif, dette technique, performance, dépendances.',
  'coo'
)
ON CONFLICT (code) DO NOTHING;

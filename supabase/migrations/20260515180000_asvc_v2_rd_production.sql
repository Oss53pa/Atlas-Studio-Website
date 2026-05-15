-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC v2.0 — R&D + Production
-- 9 nouvelles tables (16-24 du CDC v2) + RLS + seed 6 nouveaux agents
-- ═══════════════════════════════════════════════════════════════════════════
-- Ajoute le pipeline produit complet : opportunités → recherche → spec →
-- code (PR) → tests → déploiement → documentation.
-- Triple gate sur production : QA passed + preview approved + deploy approved.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 16. asvc_opportunities — détectées par Veille Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_opportunities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_by_agent_id     UUID REFERENCES public.asvc_agents(id),
  source                   TEXT NOT NULL,
  source_details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  category                 TEXT,
  market_size_estimate     TEXT CHECK (market_size_estimate IN ('small','medium','large') OR market_size_estimate IS NULL),
  effort_estimate          TEXT CHECK (effort_estimate IN ('XS','S','M','L','XL') OR effort_estimate IS NULL),
  strategic_fit_score      INT CHECK (strategic_fit_score BETWEEN 1 AND 10 OR strategic_fit_score IS NULL),
  urgency_score            INT CHECK (urgency_score BETWEEN 1 AND 10 OR urgency_score IS NULL),
  rice_score               NUMERIC(10,2),
  status                   TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
                             'detected','qualified','in_research','ready_for_decision',
                             'approved','rejected','in_development','shipped','archived'
                           )),
  related_action_id        UUID REFERENCES public.asvc_agent_actions(id),
  research_brief_url       TEXT,
  cdc_url                  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_opp_status ON public.asvc_opportunities(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_opp_rice ON public.asvc_opportunities(rice_score DESC NULLS LAST);

-- ───────────────────────────────────────────────────────────────────────────
-- 17. asvc_research_briefs — produits par User Research Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_research_briefs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id              UUID REFERENCES public.asvc_opportunities(id),
  agent_id                    UUID REFERENCES public.asvc_agents(id),
  title                       TEXT NOT NULL,
  problem_statement           TEXT NOT NULL,
  research_method             TEXT,
  sample_size                 INT,
  sample_description          TEXT,
  key_findings                JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_points                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_quotes                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations             TEXT,
  go_no_go_recommendation     TEXT CHECK (go_no_go_recommendation IN ('go','no_go','pivot','wait') OR go_no_go_recommendation IS NULL),
  markdown_content            TEXT,
  related_action_id           UUID REFERENCES public.asvc_agent_actions(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_research_opp ON public.asvc_research_briefs(opportunity_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 18. asvc_product_specs — produits par Product Designer Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_product_specs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id           UUID REFERENCES public.asvc_opportunities(id),
  agent_id                 UUID REFERENCES public.asvc_agents(id),
  spec_version             TEXT NOT NULL DEFAULT '1.0',
  title                    TEXT NOT NULL,
  vision                   TEXT,
  user_stories             JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria      JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_architecture   TEXT,
  wireframes_mermaid       TEXT,
  api_endpoints            JSONB NOT NULL DEFAULT '[]'::jsonb,
  database_schema          TEXT,
  story_points             INT,
  estimated_weeks          NUMERIC(3,1),
  markdown_content         TEXT NOT NULL,
  figma_url                TEXT,
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','pending_approval','approved','in_development','shipped','deprecated'
                           )),
  approved_by_ceo          BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at              TIMESTAMPTZ,
  related_action_id        UUID REFERENCES public.asvc_agent_actions(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_specs_status ON public.asvc_product_specs(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 19. asvc_code_pull_requests — produits par Dev Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_code_pull_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id                  UUID REFERENCES public.asvc_product_specs(id),
  agent_id                 UUID REFERENCES public.asvc_agents(id),
  github_pr_number         INT,
  github_pr_url            TEXT,
  repo                     TEXT NOT NULL,
  branch_name              TEXT NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  files_changed            INT NOT NULL DEFAULT 0,
  lines_added              INT NOT NULL DEFAULT 0,
  lines_removed            INT NOT NULL DEFAULT 0,
  qa_status                TEXT NOT NULL DEFAULT 'pending' CHECK (qa_status IN (
                             'pending','running','passed','failed','flaky'
                           )),
  qa_report_url            TEXT,
  tests_added              INT NOT NULL DEFAULT 0,
  test_coverage_percent    NUMERIC(5,2),
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','qa_running','qa_failed','qa_passed',
                             'preview_ready','preview_approved','merged','deployed','rolled_back'
                           )),
  preview_url              TEXT,
  approved_by_ceo          BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at              TIMESTAMPTZ,
  merged_at                TIMESTAMPTZ,
  related_action_id        UUID REFERENCES public.asvc_agent_actions(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_pr_status ON public.asvc_code_pull_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_pr_qa ON public.asvc_code_pull_requests(qa_status);

-- ───────────────────────────────────────────────────────────────────────────
-- 20. asvc_test_runs — produits par QA Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_test_runs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id                    UUID REFERENCES public.asvc_code_pull_requests(id) ON DELETE CASCADE,
  agent_id                 UUID REFERENCES public.asvc_agents(id),
  test_type                TEXT NOT NULL CHECK (test_type IN (
                             'static_analysis','unit','integration','e2e',
                             'syscohada_validation','security_scan','performance','accessibility'
                           )),
  framework                TEXT,
  total_tests              INT NOT NULL DEFAULT 0,
  passed                   INT NOT NULL DEFAULT 0,
  failed                   INT NOT NULL DEFAULT 0,
  skipped                  INT NOT NULL DEFAULT 0,
  duration_seconds         INT,
  status                   TEXT NOT NULL CHECK (status IN ('running','passed','failed','error')),
  failures                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  coverage_report          JSONB,
  artifacts_url            TEXT,
  syscohada_test_cases     JSONB,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at              TIMESTAMPTZ,
  related_action_id        UUID REFERENCES public.asvc_agent_actions(id)
);
CREATE INDEX IF NOT EXISTS idx_asvc_test_pr ON public.asvc_test_runs(pr_id, test_type);

-- ───────────────────────────────────────────────────────────────────────────
-- 21. asvc_deployments — produits par DevOps/Release Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_deployments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id                       UUID REFERENCES public.asvc_code_pull_requests(id),
  agent_id                    UUID REFERENCES public.asvc_agents(id),
  environment                 TEXT NOT NULL CHECK (environment IN ('preview','staging','production')),
  app_name                    TEXT NOT NULL,
  vercel_deployment_id        TEXT,
  deployment_url              TEXT,
  supabase_migrations         JSONB NOT NULL DEFAULT '[]'::jsonb,
  migration_dry_run_passed    BOOLEAN,
  migration_executed          BOOLEAN NOT NULL DEFAULT FALSE,
  rollback_plan               TEXT,
  rollback_tested             BOOLEAN NOT NULL DEFAULT FALSE,
  previous_version_tag        TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                                'pending','deploying','deployed','monitoring','success',
                                'failed','rolling_back','rolled_back'
                              )),
  error_rate_percent          NUMERIC(5,2),
  alerts_triggered            INT NOT NULL DEFAULT 0,
  monitoring_window_minutes   INT NOT NULL DEFAULT 30,
  approved_by_ceo             BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at                 TIMESTAMPTZ,
  deployed_at                 TIMESTAMPTZ,
  related_action_id           UUID REFERENCES public.asvc_agent_actions(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_dep_status ON public.asvc_deployments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_dep_env ON public.asvc_deployments(environment, app_name);

-- ───────────────────────────────────────────────────────────────────────────
-- 22. asvc_production_incidents — détectés par DevOps + monitoring
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_production_incidents (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_by_agent_id     UUID REFERENCES public.asvc_agents(id),
  app_concerned            TEXT NOT NULL,
  related_deployment_id    UUID REFERENCES public.asvc_deployments(id),
  severity                 TEXT NOT NULL CHECK (severity IN ('P0','P1','P2','P3')),
  title                    TEXT NOT NULL,
  description              TEXT,
  error_logs               JSONB,
  affected_users_estimate  INT,
  status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                             'open','investigating','mitigated','resolved','post_mortem'
                           )),
  rollback_triggered       BOOLEAN NOT NULL DEFAULT FALSE,
  rollback_successful      BOOLEAN,
  mitigation_action        TEXT,
  root_cause               TEXT,
  post_mortem_url          TEXT,
  resolved_at              TIMESTAMPTZ,
  resolution_time_minutes  INT,
  ceo_notified             BOOLEAN NOT NULL DEFAULT FALSE,
  ceo_notified_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_asvc_incident_status ON public.asvc_production_incidents(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_asvc_incident_severity ON public.asvc_production_incidents(severity);

-- ───────────────────────────────────────────────────────────────────────────
-- 23. asvc_documentation_artifacts — produits par Documentation Agent
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_documentation_artifacts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                 UUID REFERENCES public.asvc_agents(id),
  doc_type                 TEXT NOT NULL CHECK (doc_type IN (
                             'user_guide','api_reference','changelog','tutorial_script',
                             'release_notes','admin_guide','troubleshooting'
                           )),
  app_concerned            TEXT NOT NULL,
  language                 TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en')),
  version                  TEXT NOT NULL,
  title                    TEXT NOT NULL,
  content                  TEXT NOT NULL,
  related_spec_id          UUID REFERENCES public.asvc_product_specs(id),
  related_pr_id            UUID REFERENCES public.asvc_code_pull_requests(id),
  published_url            TEXT,
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                             'draft','pending_approval','approved','published','deprecated'
                           )),
  approved_by_ceo          BOOLEAN NOT NULL DEFAULT FALSE,
  published_at             TIMESTAMPTZ,
  related_action_id        UUID REFERENCES public.asvc_agent_actions(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_docs_app ON public.asvc_documentation_artifacts(app_concerned, doc_type, language);

-- ───────────────────────────────────────────────────────────────────────────
-- 24. asvc_product_backlog — vue consolidée pour le COO
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asvc_product_backlog (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type                TEXT NOT NULL CHECK (item_type IN ('opportunity','feature','bug','tech_debt')),
  source_id                UUID NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  app_concerned            TEXT,
  priority                 TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  estimated_effort_points  INT,
  status                   TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN (
                             'backlog','next_up','in_progress','in_review','done','cancelled'
                           )),
  assigned_to_sprint       TEXT,
  assigned_agent_id        UUID REFERENCES public.asvc_agents(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asvc_backlog_priority ON public.asvc_product_backlog(priority);
CREATE INDEX IF NOT EXISTS idx_asvc_backlog_status ON public.asvc_product_backlog(status);

-- ───────────────────────────────────────────────────────────────────────────
-- updated_at triggers sur les nouvelles tables mutables
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asvc_opportunities','asvc_product_specs','asvc_code_pull_requests',
    'asvc_deployments','asvc_product_backlog'
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
-- RLS sur toutes les nouvelles tables
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'asvc_opportunities','asvc_research_briefs','asvc_product_specs',
    'asvc_code_pull_requests','asvc_test_runs','asvc_deployments',
    'asvc_production_incidents','asvc_documentation_artifacts','asvc_product_backlog'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins read %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins read %I" ON public.%I FOR SELECT USING (public.is_admin());',
      t, t
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admins manage %I" ON public.%I;
       CREATE POLICY "Admins manage %I" ON public.%I
         FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- Seed des 6 nouveaux agents (v2.0)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.asvc_agents (code, name, department, role_description, system_prompt, llm_primary, llm_fallback) VALUES
  ('veille',
   'Veille Agent',
   'direction',
   'Détecte signaux faibles : concurrents, tendances SaaS Afrique, evolutions OHADA/SYSCOHADA, demandes clients récurrentes',
   'TODO: voir _shared/asvc/veille.ts',
   'ollama:llama-3.1-70b', 'anthropic:claude-sonnet-4-6'),

  ('user_research',
   'User Research Agent',
   'direction',
   'Approfondit opportunités qualifiées : analyse feedbacks SAV, simule personas, propose templates interviews',
   'TODO: voir _shared/asvc/user-research.ts',
   'anthropic:claude-sonnet-4-6', 'anthropic:claude-sonnet-4-6'),

  ('product_designer',
   'Product Designer Agent',
   'direction',
   'Rédige CDC complets : architecture, user stories, critères acceptation, wireframes Mermaid',
   'TODO: voir _shared/asvc/product-designer.ts',
   'anthropic:claude-sonnet-4-6', 'anthropic:claude-sonnet-4-6'),

  ('dev',
   'Dev Agent',
   'direction',
   'Code React 18 + TypeScript strict + Supabase, crée PRs GitHub, suit conventions Atlas Studio',
   'TODO: voir _shared/asvc/dev.ts',
   'anthropic:claude-sonnet-4-6', 'anthropic:claude-sonnet-4-6'),

  ('qa',
   'QA Agent',
   'direction',
   'Tests auto sur chaque PR : lint, type-check, unit, integration, E2E, SYSCOHADA si finance',
   'TODO: voir _shared/asvc/qa.ts',
   'anthropic:claude-sonnet-4-6', 'ollama:llama-3.1-70b'),

  ('devops_release',
   'DevOps/Release Agent',
   'direction',
   'Déploiements preview/staging/prod, migrations Supabase dry-run + exec, monitoring 30 min, rollback',
   'TODO: voir _shared/asvc/devops-release.ts',
   'anthropic:claude-sonnet-4-6', 'anthropic:claude-sonnet-4-6'),

  ('documentation',
   'Documentation Agent',
   'direction',
   'User guides, API docs, changelogs, release notes (FR + EN)',
   'TODO: voir _shared/asvc/documentation.ts',
   'anthropic:claude-sonnet-4-6', 'ollama:llama-3.1-70b')
ON CONFLICT (code) DO NOTHING;

-- Note: les nouveaux agents sont rattachés au département 'direction' parce que
-- le check constraint actuel n'autorise que 5 départements. La hiérarchie
-- métier (R&D / Production) est gérée côté UI via le code agent (préfixe).
-- Une migration future pourra étendre le CHECK pour ajouter 'rd' et 'production'.

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_pipeline_summary() — vue Kanban pour la page Pipeline Produit
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_pipeline_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'as_of', now(),

    'ideas', (
      SELECT coalesce(jsonb_agg(t ORDER BY (t->>'rice_score')::NUMERIC DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'title', title, 'category', category,
          'rice_score', rice_score, 'effort_estimate', effort_estimate,
          'created_at', created_at
        ) AS t
        FROM public.asvc_opportunities
        WHERE status IN ('detected','qualified')
        ORDER BY rice_score DESC NULLS LAST, created_at DESC
        LIMIT 20
      ) sub
    ),

    'research', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', o.id, 'title', o.title, 'opportunity_id', o.id,
          'created_at', o.updated_at,
          'has_brief', (rb.id IS NOT NULL)
        ) AS t
        FROM public.asvc_opportunities o
        LEFT JOIN public.asvc_research_briefs rb ON rb.opportunity_id = o.id
        WHERE o.status IN ('in_research','ready_for_decision')
        LIMIT 20
      ) sub
    ),

    'specs', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'title', title, 'spec_version', spec_version,
          'story_points', story_points, 'estimated_weeks', estimated_weeks,
          'status', status, 'created_at', created_at
        ) AS t
        FROM public.asvc_product_specs
        WHERE status IN ('pending_approval','approved')
        LIMIT 20
      ) sub
    ),

    'build', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'title', title, 'repo', repo, 'branch_name', branch_name,
          'github_pr_url', github_pr_url, 'qa_status', qa_status,
          'status', status, 'created_at', created_at
        ) AS t
        FROM public.asvc_code_pull_requests
        WHERE status IN ('draft','qa_running','qa_failed')
        LIMIT 20
      ) sub
    ),

    'qa', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'title', title, 'repo', repo,
          'qa_status', qa_status, 'test_coverage_percent', test_coverage_percent,
          'status', status, 'created_at', created_at
        ) AS t
        FROM public.asvc_code_pull_requests
        WHERE status = 'qa_passed' OR (status IN ('preview_ready','preview_approved') AND qa_status = 'passed')
        LIMIT 20
      ) sub
    ),

    'release', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'created_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', d.id, 'app_name', d.app_name, 'environment', d.environment,
          'deployment_url', d.deployment_url, 'status', d.status,
          'approved_by_ceo', d.approved_by_ceo, 'created_at', d.created_at,
          'pr_title', pr.title
        ) AS t
        FROM public.asvc_deployments d
        LEFT JOIN public.asvc_code_pull_requests pr ON pr.id = d.pr_id
        WHERE d.status IN ('pending','deploying','deployed','monitoring')
        LIMIT 20
      ) sub
    ),

    'recent_incidents', (
      SELECT coalesce(jsonb_agg(t ORDER BY t->>'detected_at' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'app_concerned', app_concerned, 'severity', severity,
          'title', title, 'status', status, 'detected_at', detected_at
        ) AS t
        FROM public.asvc_production_incidents
        WHERE status IN ('open','investigating','mitigated')
           OR detected_at >= now() - interval '7 days'
        LIMIT 10
      ) sub
    ),

    'counts', jsonb_build_object(
      'ideas', (SELECT count(*) FROM public.asvc_opportunities WHERE status IN ('detected','qualified')),
      'research', (SELECT count(*) FROM public.asvc_opportunities WHERE status IN ('in_research','ready_for_decision')),
      'specs', (SELECT count(*) FROM public.asvc_product_specs WHERE status IN ('pending_approval','approved')),
      'build', (SELECT count(*) FROM public.asvc_code_pull_requests WHERE status IN ('draft','qa_running','qa_failed')),
      'qa', (SELECT count(*) FROM public.asvc_code_pull_requests WHERE status IN ('qa_passed','preview_ready','preview_approved')),
      'release', (SELECT count(*) FROM public.asvc_deployments WHERE status IN ('pending','deploying','deployed','monitoring')),
      'open_incidents', (SELECT count(*) FROM public.asvc_production_incidents WHERE status IN ('open','investigating'))
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_pipeline_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_pipeline_summary() TO authenticated, service_role;

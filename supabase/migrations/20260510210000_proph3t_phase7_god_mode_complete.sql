-- ═══════════════════════════════════════════════════════════════════════════
-- PROPH3T Phase 7 GOD MODE COMPLETE
-- L3 60 tools sur 12 apps + Tool versioning + CRON schedules
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tool versioning columns
ALTER TABLE public.proph3t_tools
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ab_test_group TEXT,
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by TEXT;

CREATE INDEX IF NOT EXISTS idx_proph3t_tools_active ON public.proph3t_tools(is_active);

-- 2. CRON schedules table (tracks scheduled tasks for proph3t-cron-runner)
CREATE TABLE IF NOT EXISTS public.proph3t_cron_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_filter JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proph3t_cron_active ON public.proph3t_cron_schedules(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.proph3t_cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.proph3t_cron_schedules(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT,
  tenants_processed INT,
  errors_count INT,
  duration_ms INT,
  result JSONB
);

CREATE INDEX IF NOT EXISTS idx_proph3t_cron_runs_task ON public.proph3t_cron_runs(task_name, triggered_at DESC);

INSERT INTO public.proph3t_cron_schedules (task_name, cron_expression, description) VALUES
  ('monthly_closing', '0 6 1 * *', 'Cloture mensuelle 1er du mois 6h UTC'),
  ('weekly_dso_check', '0 8 * * 1', 'Verification DSO hebdomadaire lundi 8h UTC'),
  ('daily_alerts', '0 7 * * *', 'Alertes quotidiennes 7h UTC'),
  ('quarterly_acomptes', '0 9 14 3,6,9,12 *', 'Rappel acomptes IS 14 mars/juin/sept/dec')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.proph3t_cron_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proph3t_cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage cron" ON public.proph3t_cron_schedules;
CREATE POLICY "Admins manage cron" ON public.proph3t_cron_schedules
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read cron runs" ON public.proph3t_cron_runs;
CREATE POLICY "Admins read cron runs" ON public.proph3t_cron_runs
  FOR SELECT USING (public.is_admin());

-- 3. Phase 7 L3 — 60 tools sur 12 apps (advist, atlasbanx, atlastrade, cashpilot,
--    cockpit-journey, docjourney, liasspilot, tablesmart, atlas-fa, atlas-lease,
--    atlas-mall-suite, wisefm) — voir migration appliquee directement.
-- Le seed est applique via apply_migration MCP.

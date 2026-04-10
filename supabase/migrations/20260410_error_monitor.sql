-- ============================================================================
-- Module 16 — Atlas Error Monitor
-- Tracking d'erreurs maison pour les apps Atlas Studio
-- ============================================================================

-- Table principale
CREATE TABLE IF NOT EXISTS public.error_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id           TEXT NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  app_version      TEXT,
  environment      TEXT NOT NULL DEFAULT 'production'
                     CHECK (environment IN ('production','staging','dev')),
  severity         TEXT NOT NULL
                     CHECK (severity IN ('critical','error','warning','info')),
  message          TEXT NOT NULL,
  stack_trace      TEXT,
  component_name   TEXT,
  action_context   TEXT,
  fingerprint      TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id        UUID,
  url              TEXT,
  user_agent       TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','in_progress','resolved','ignored')),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON public.error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_app_id     ON public.error_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity   ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_status     ON public.error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen  ON public.error_logs(last_seen_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins : accès complet (read + write + resolve)
DROP POLICY IF EXISTS "admin_full_access_error_logs" ON public.error_logs;
CREATE POLICY "admin_full_access_error_logs" ON public.error_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert via la fonction SECURITY DEFINER (anonymes + authentifiés) :
-- on NE crée PAS de policy INSERT globale. L'ingestion passe exclusivement
-- par la fonction upsert_error_log qui bypass la RLS via SECURITY DEFINER.

-- ============================================================================
-- Fonction d'ingestion avec dédoublonnage par fingerprint
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_error_log(
  p_app_id       TEXT,
  p_fingerprint  TEXT,
  p_severity     TEXT,
  p_message      TEXT,
  p_stack_trace  TEXT DEFAULT NULL,
  p_component    TEXT DEFAULT NULL,
  p_context      TEXT DEFAULT NULL,
  p_metadata     JSONB DEFAULT '{}'::jsonb,
  p_environment  TEXT DEFAULT 'production',
  p_app_version  TEXT DEFAULT NULL,
  p_url          TEXT DEFAULT NULL,
  p_user_agent   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_id UUID;
BEGIN
  /* Garde-fous : l'app doit exister */
  IF NOT EXISTS (SELECT 1 FROM public.apps WHERE id = p_app_id) THEN
    RAISE EXCEPTION 'Unknown app_id: %', p_app_id;
  END IF;

  IF p_severity NOT IN ('critical','error','warning','info') THEN
    RAISE EXCEPTION 'Invalid severity: %', p_severity;
  END IF;

  INSERT INTO public.error_logs (
    app_id, fingerprint, severity, message, stack_trace,
    component_name, action_context, metadata, environment, app_version,
    url, user_agent
  ) VALUES (
    p_app_id, p_fingerprint, p_severity, p_message, p_stack_trace,
    p_component, p_context, COALESCE(p_metadata, '{}'::jsonb), p_environment, p_app_version,
    p_url, p_user_agent
  )
  ON CONFLICT (fingerprint) DO UPDATE SET
    occurrence_count = public.error_logs.occurrence_count + 1,
    last_seen_at     = now(),
    /* Une erreur résolue qui réapparaît repasse en open */
    status = CASE
      WHEN public.error_logs.status = 'resolved' THEN 'open'
      ELSE public.error_logs.status
    END,
    /* On rafraîchit stack/metadata/version au cas où le contexte évolue */
    stack_trace  = COALESCE(EXCLUDED.stack_trace,  public.error_logs.stack_trace),
    metadata     = COALESCE(EXCLUDED.metadata,     public.error_logs.metadata),
    app_version  = COALESCE(EXCLUDED.app_version,  public.error_logs.app_version)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$func$;

-- Les clients front (anon + authenticated) peuvent exécuter la fonction
REVOKE ALL ON FUNCTION public.upsert_error_log(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_error_log(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ============================================================================
-- Realtime
-- ============================================================================
-- Active la réplication pour que le dashboard reçoive les live updates
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'error_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
  END IF;
EXCEPTION WHEN OTHERS THEN
  /* La publication n'existe peut-être pas encore dans certains environnements */
  NULL;
END $do$;

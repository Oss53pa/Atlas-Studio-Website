-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Agent system prompts (versionnés, éditables en DB)
-- ═══════════════════════════════════════════════════════════════════════════
-- Permet à la CEO d'itérer sur les system prompts des 18 agents LLM sans
-- redéploiement. Chaque agent a 0..N versions ; exactement 1 active à la fois.
-- Si aucune version active : les edge functions retombent sur le prompt
-- hardcodé (fallback) — donc on peut pousser cette table vide et tout marche.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.asvc_agent_prompts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code   TEXT NOT NULL REFERENCES public.asvc_agents(code) ON DELETE CASCADE,
  version      INT NOT NULL,
  content      TEXT NOT NULL,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_code, version)
);

-- Garantit qu'au plus une version active par agent_code
CREATE UNIQUE INDEX IF NOT EXISTS asvc_agent_prompts_one_active
  ON public.asvc_agent_prompts (agent_code)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS asvc_agent_prompts_by_agent_version
  ON public.asvc_agent_prompts (agent_code, version DESC);

ALTER TABLE public.asvc_agent_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read agent_prompts" ON public.asvc_agent_prompts;
CREATE POLICY "admins read agent_prompts" ON public.asvc_agent_prompts
  FOR SELECT USING (public.is_admin());

-- Pas de policy INSERT/UPDATE/DELETE — toutes les écritures via RPC SECURITY DEFINER.

-- ───────────────────────────────────────────────────────────────────────────
-- RPC: récupère le prompt actif (utilisé par les edge functions)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_get_active_agent_prompt(p_agent_code TEXT)
RETURNS TABLE (id UUID, version INT, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, version, content, created_at
    FROM public.asvc_agent_prompts
   WHERE agent_code = p_agent_code AND is_active = true
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.asvc_get_active_agent_prompt(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_get_active_agent_prompt(TEXT) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- RPC: crée une nouvelle version + l'active (admin only)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_create_agent_prompt_version(
  p_agent_code TEXT,
  p_content    TEXT,
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INT;
  v_id           UUID;
  v_exists       BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF TRIM(COALESCE(p_content, '')) = '' THEN
    RAISE EXCEPTION 'content vide';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.asvc_agents WHERE code = p_agent_code) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'agent_code inconnu : %', p_agent_code;
  END IF;

  -- Désactive l'éventuelle version active courante
  UPDATE public.asvc_agent_prompts
     SET is_active = false
   WHERE agent_code = p_agent_code AND is_active = true;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.asvc_agent_prompts
   WHERE agent_code = p_agent_code;

  INSERT INTO public.asvc_agent_prompts (agent_code, version, content, notes, is_active, created_by)
  VALUES (p_agent_code, v_next_version, p_content, p_notes, true, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', COALESCE(auth.uid()::text, 'admin'), 'agent_prompt_created',
          'asvc_agent_prompts', v_id,
          jsonb_build_object('agent_code', p_agent_code, 'version', v_next_version, 'notes', p_notes));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_create_agent_prompt_version(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_create_agent_prompt_version(TEXT, TEXT, TEXT) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- RPC: réactive une version (revert) — admin only
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_activate_agent_prompt(p_prompt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_code TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT agent_code INTO v_agent_code
    FROM public.asvc_agent_prompts WHERE id = p_prompt_id;
  IF v_agent_code IS NULL THEN
    RAISE EXCEPTION 'prompt introuvable';
  END IF;

  UPDATE public.asvc_agent_prompts SET is_active = false
   WHERE agent_code = v_agent_code AND is_active = true;

  UPDATE public.asvc_agent_prompts SET is_active = true
   WHERE id = p_prompt_id;

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', COALESCE(auth.uid()::text, 'admin'), 'agent_prompt_activated',
          'asvc_agent_prompts', p_prompt_id,
          jsonb_build_object('agent_code', v_agent_code));
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_activate_agent_prompt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_activate_agent_prompt(UUID) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- RPC: désactive le prompt actif (retour au fallback codé) — admin only
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_deactivate_agent_prompt(p_agent_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.asvc_agent_prompts SET is_active = false
   WHERE agent_code = p_agent_code AND is_active = true;

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', COALESCE(auth.uid()::text, 'admin'), 'agent_prompt_deactivated',
          'asvc_agent_prompts', NULL,
          jsonb_build_object('agent_code', p_agent_code));
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_deactivate_agent_prompt(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_deactivate_agent_prompt(TEXT) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- RPC: liste les versions d'un agent (historique) — admin only
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_list_agent_prompt_versions(p_agent_code TEXT)
RETURNS TABLE (
  id UUID, version INT, content TEXT, notes TEXT, is_active BOOLEAN,
  created_by UUID, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  SELECT p.id, p.version, p.content, p.notes, p.is_active, p.created_by, p.created_at
    FROM public.asvc_agent_prompts p
   WHERE p.agent_code = p_agent_code
   ORDER BY p.version DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_list_agent_prompt_versions(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_list_agent_prompt_versions(TEXT) TO authenticated;

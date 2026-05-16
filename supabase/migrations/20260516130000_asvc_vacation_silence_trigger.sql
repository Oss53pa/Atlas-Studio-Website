-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Vacation silence trigger
-- ═══════════════════════════════════════════════════════════════════════════
-- Câble réellement le mode vacances dans le pipeline d'actions.
-- Trigger BEFORE INSERT sur asvc_agent_actions :
--   - Skip si criticality='critical' (jamais silencer un incident prod)
--   - Skip si NEW.status != 'proposed' (déjà décidé par autoapprove ou source)
--   - Sinon, asvc_should_silence_during_vacation(criticality) → si true,
--     status='cancelled' + audit log
--
-- Ordre des triggers BEFORE INSERT (ordre alphabétique des noms) :
--   1. trg_asvc_action_autoapprove        (peut set status='approved')
--   2. trg_asvc_action_vacation_silence   (peut set status='cancelled')
--
-- Autoapprove gagne sur vacation : si la CEO a explicitement auto-approuvé un
-- pattern, l'action passe même en vacances. C'est une instruction explicite.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.asvc_action_vacation_silence_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_silenced BOOLEAN;
BEGIN
  -- Skip critical : jamais silencer (incidents prod, sécurité, etc.)
  IF NEW.criticality = 'critical' THEN
    RETURN NEW;
  END IF;

  -- Skip si pas 'proposed' (déjà décidé : auto-approuvée, ou source l'a déjà cancel)
  IF NEW.status != 'proposed' THEN
    RETURN NEW;
  END IF;

  v_silenced := public.asvc_should_silence_during_vacation(NEW.criticality);
  IF NOT v_silenced THEN
    RETURN NEW;
  END IF;

  NEW.status := 'cancelled';
  NEW.execution_error := 'silenced_during_vacation';
  NEW.validation_note := COALESCE(NEW.validation_note, '') ||
    CASE WHEN COALESCE(NEW.validation_note, '') != '' THEN E'\n' ELSE '' END ||
    'Auto-cancelled — mode vacances actif. Action retenue sans notification CEO.';

  -- Audit log immutable
  INSERT INTO public.asvc_audit_log (
    actor_type, actor_id, event_type, resource_type, resource_id, payload
  )
  VALUES (
    'system',
    'vacation_silence_trigger',
    'action_silenced_during_vacation',
    'asvc_agent_actions',
    NEW.id,
    jsonb_build_object(
      'criticality', NEW.criticality,
      'action_type', NEW.action_type,
      'agent_id', NEW.agent_id,
      'original_title', NEW.title
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asvc_action_vacation_silence ON public.asvc_agent_actions;
CREATE TRIGGER trg_asvc_action_vacation_silence
  BEFORE INSERT ON public.asvc_agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.asvc_action_vacation_silence_trigger();

-- ───────────────────────────────────────────────────────────────────────────
-- RPC asvc_silenced_during_vacation_window : retourne les actions silenced
-- pendant la dernière période de vacances (utile pour brief de retour CEO)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_silenced_during_vacation_window(
  p_since TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_limit INT DEFAULT 200
)
RETURNS TABLE (
  action_id     UUID,
  agent_code    TEXT,
  action_type   TEXT,
  criticality   TEXT,
  title         TEXT,
  created_at    TIMESTAMPTZ
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
  SELECT
    a.id,
    ag.code,
    a.action_type,
    a.criticality,
    a.title,
    a.created_at
  FROM public.asvc_agent_actions a
  LEFT JOIN public.asvc_agents ag ON ag.id = a.agent_id
  WHERE a.execution_error = 'silenced_during_vacation'
    AND a.created_at >= p_since
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_silenced_during_vacation_window(TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_silenced_during_vacation_window(TIMESTAMPTZ, INT) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Mode vacances + Auto-approve patterns
-- ═══════════════════════════════════════════════════════════════════════════
-- Mode vacances: pendant la période, l'orchestrateur retient les actions
-- non-critiques et ne notifie que les critical (selon le mode strict/modéré).
--
-- Auto-approve patterns: après N approbations identiques (même action_type +
-- même agent + même criticality), le COO propose à la CEO d'auto-approuver
-- ce pattern à l'avenir. Si validé, les actions matching sont auto-approuvées
-- ET auto-exécutées si action_type est in-system.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- Helpers CEO preferences pour mode vacances
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.asvc_set_vacation_mode(
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_behavior       TEXT   -- 'strict' | 'moderate' | 'full_pause'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF p_behavior NOT IN ('strict','moderate','full_pause') THEN
    RAISE EXCEPTION 'behavior invalide (strict|moderate|full_pause)';
  END IF;

  INSERT INTO public.asvc_ceo_preferences (category, preference_key, preference_value)
  VALUES (
    'vacation',
    'mode',
    jsonb_build_object(
      'enabled', true,
      'start', p_start,
      'end', p_end,
      'behavior', p_behavior
    )
  )
  ON CONFLICT (category, preference_key) DO UPDATE SET
    preference_value = EXCLUDED.preference_value,
    updated_at = now();

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', 'pame', 'vacation_mode_enabled', null, null,
          jsonb_build_object('start', p_start, 'end', p_end, 'behavior', p_behavior));
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_set_vacation_mode(TIMESTAMPTZ,TIMESTAMPTZ,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_set_vacation_mode(TIMESTAMPTZ,TIMESTAMPTZ,TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.asvc_disable_vacation_mode()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.asvc_ceo_preferences
     SET preference_value = jsonb_set(preference_value, '{enabled}', 'false'::jsonb),
         updated_at = now()
   WHERE category = 'vacation' AND preference_key = 'mode';

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', 'pame', 'vacation_mode_disabled', null, null, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_disable_vacation_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_disable_vacation_mode() TO authenticated, service_role;

/**
 * Retourne TRUE si le mode vacances est actif maintenant ET que la criticality
 * donnée doit être SILENCIÉE pour la CEO (selon le behavior).
 *
 * Mapping behavior → niveau d'isolement:
 *   - strict     : seulement critical passent (high/normal/low → silence)
 *   - moderate   : critical + high passent (normal/low → silence)
 *   - full_pause : RIEN ne passe — tous agents en pause (utilisé par les
 *                  connecteurs : les actions ne sont même pas créées)
 *
 * Usage côté orchestrateur:
 *   const silenced = await rpc('asvc_should_silence_during_vacation',
 *                              { p_criticality: 'normal' });
 *   if (silenced) → ne pas créer/notifier l'action
 */
CREATE OR REPLACE FUNCTION public.asvc_should_silence_during_vacation(
  p_criticality TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT preference_value INTO v_cfg
  FROM public.asvc_ceo_preferences
  WHERE category = 'vacation' AND preference_key = 'mode';

  IF v_cfg IS NULL OR (v_cfg->>'enabled')::boolean = false THEN
    RETURN false;
  END IF;
  IF v_now < (v_cfg->>'start')::TIMESTAMPTZ OR v_now > (v_cfg->>'end')::TIMESTAMPTZ THEN
    RETURN false;
  END IF;

  CASE v_cfg->>'behavior'
    WHEN 'full_pause' THEN
      RETURN true;
    WHEN 'strict' THEN
      RETURN p_criticality IN ('low','normal','high');
    WHEN 'moderate' THEN
      RETURN p_criticality IN ('low','normal');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_should_silence_during_vacation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_should_silence_during_vacation(TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.asvc_get_vacation_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_now TIMESTAMPTZ := now();
  v_active BOOLEAN := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT preference_value INTO v_cfg
  FROM public.asvc_ceo_preferences
  WHERE category = 'vacation' AND preference_key = 'mode';

  IF v_cfg IS NULL THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  v_active := (v_cfg->>'enabled')::boolean
              AND v_now BETWEEN (v_cfg->>'start')::TIMESTAMPTZ AND (v_cfg->>'end')::TIMESTAMPTZ;

  RETURN jsonb_build_object(
    'enabled', (v_cfg->>'enabled')::boolean,
    'active_now', v_active,
    'start', v_cfg->>'start',
    'end', v_cfg->>'end',
    'behavior', v_cfg->>'behavior'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_get_vacation_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_get_vacation_status() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Auto-approve patterns
-- ───────────────────────────────────────────────────────────────────────────
-- Un pattern = combinaison (agent_code, action_type, criticality).
-- On compte le nombre d'approbations consécutives sans modification ni rejet
-- pour ce pattern. À partir d'un seuil (5 par défaut), le COO suggère
-- l'auto-approve.
--
-- L'auto-approve actif est stocké dans asvc_ceo_preferences (category=
-- 'auto_approve', preference_key='{agent}|{type}|{criticality}').
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.asvc_get_autoapprove_candidates(p_threshold INT DEFAULT 5)
RETURNS TABLE (
  agent_code   TEXT,
  action_type  TEXT,
  criticality  TEXT,
  consecutive_approvals INT,
  last_decision_at TIMESTAMPTZ,
  already_auto_approved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Compteur des approbations consécutives par pattern.
  -- On exclut les criticality 'critical' (ne peuvent jamais être auto-approuvées).
  RETURN QUERY
  WITH ranked AS (
    SELECT
      ag.code as ag_code,
      a.action_type as a_type,
      a.criticality as a_crit,
      a.status as a_status,
      a.validated_at as v_at,
      ROW_NUMBER() OVER (PARTITION BY ag.code, a.action_type, a.criticality ORDER BY a.validated_at DESC) AS rn
    FROM public.asvc_agent_actions a
    JOIN public.asvc_agents ag ON ag.id = a.agent_id
    WHERE a.validated_at IS NOT NULL
      AND a.criticality != 'critical'
  ),
  per_pattern AS (
    SELECT
      ag_code,
      a_type,
      a_crit,
      COUNT(*) FILTER (
        WHERE rn <= 50
          AND a_status IN ('approved','executed')
          AND NOT EXISTS (
            SELECT 1 FROM ranked r2
            WHERE r2.ag_code = ranked.ag_code
              AND r2.a_type = ranked.a_type
              AND r2.a_crit = ranked.a_crit
              AND r2.rn < ranked.rn
              AND r2.a_status NOT IN ('approved','executed')
          )
      ) AS consec,
      MAX(v_at) AS last_at
    FROM ranked
    GROUP BY ag_code, a_type, a_crit
  )
  SELECT
    pp.ag_code,
    pp.a_type,
    pp.a_crit,
    pp.consec::INT,
    pp.last_at,
    EXISTS (
      SELECT 1 FROM public.asvc_ceo_preferences cp
      WHERE cp.category = 'auto_approve'
        AND cp.preference_key = pp.ag_code || '|' || pp.a_type || '|' || pp.a_crit
        AND (cp.preference_value->>'enabled')::boolean = true
    )
  FROM per_pattern pp
  WHERE pp.consec >= p_threshold
  ORDER BY pp.consec DESC, pp.last_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_get_autoapprove_candidates(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_get_autoapprove_candidates(INT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.asvc_set_autoapprove_pattern(
  p_agent_code  TEXT,
  p_action_type TEXT,
  p_criticality TEXT,
  p_enabled     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF p_criticality = 'critical' THEN
    RAISE EXCEPTION 'Auto-approve interdit pour criticality=critical';
  END IF;

  INSERT INTO public.asvc_ceo_preferences (category, preference_key, preference_value)
  VALUES (
    'auto_approve',
    p_agent_code || '|' || p_action_type || '|' || p_criticality,
    jsonb_build_object(
      'enabled', p_enabled,
      'agent_code', p_agent_code,
      'action_type', p_action_type,
      'criticality', p_criticality,
      'set_at', now()
    )
  )
  ON CONFLICT (category, preference_key) DO UPDATE SET
    preference_value = EXCLUDED.preference_value,
    updated_at = now();

  INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
  VALUES ('ceo', 'pame',
          CASE WHEN p_enabled THEN 'auto_approve_enabled' ELSE 'auto_approve_disabled' END,
          null, null,
          jsonb_build_object('agent', p_agent_code, 'type', p_action_type, 'criticality', p_criticality));
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_set_autoapprove_pattern(TEXT,TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_set_autoapprove_pattern(TEXT,TEXT,TEXT,BOOLEAN) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.asvc_list_autoapprove_patterns()
RETURNS TABLE (
  agent_code   TEXT,
  action_type  TEXT,
  criticality  TEXT,
  enabled      BOOLEAN,
  set_at       TIMESTAMPTZ
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
    (preference_value->>'agent_code')::TEXT,
    (preference_value->>'action_type')::TEXT,
    (preference_value->>'criticality')::TEXT,
    (preference_value->>'enabled')::BOOLEAN,
    (preference_value->>'set_at')::TIMESTAMPTZ
  FROM public.asvc_ceo_preferences
  WHERE category = 'auto_approve'
  ORDER BY updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_list_autoapprove_patterns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_list_autoapprove_patterns() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Helper: vérifie si un pattern est auto-approuvé (utilisé par triggers /
-- code qui crée des actions)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.asvc_is_autoapproved(
  p_agent_code  TEXT,
  p_action_type TEXT,
  p_criticality TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asvc_ceo_preferences
    WHERE category = 'auto_approve'
      AND preference_key = p_agent_code || '|' || p_action_type || '|' || p_criticality
      AND (preference_value->>'enabled')::boolean = true
  );
$$;

REVOKE ALL ON FUNCTION public.asvc_is_autoapproved(TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asvc_is_autoapproved(TEXT,TEXT,TEXT) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Trigger : auto-approbation immédiate sur INSERT si pattern matched
-- ───────────────────────────────────────────────────────────────────────────
-- Quand un agent insère une action_proposed, on regarde si le pattern
-- (agent + type + criticality) est marqué auto-approuvé. Si oui:
--   - status passe de 'proposed' à 'approved'
--   - validated_by='pame_auto', validated_at=now()
--   - audit log dédié 'action_auto_approved'
--
-- L'exécution réelle (Gmail send, etc.) reste déclenchée par le cron
-- auto_execute_internal ou par CEO/orchestrator.

CREATE OR REPLACE FUNCTION public.asvc_action_autoapprove_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_code TEXT;
  v_auto_approved BOOLEAN;
BEGIN
  -- Skip si pas 'proposed' (déjà validé manuellement, etc.)
  IF NEW.status != 'proposed' THEN
    RETURN NEW;
  END IF;
  -- Skip si critical (jamais auto-approve)
  IF NEW.criticality = 'critical' THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_agent_code FROM public.asvc_agents WHERE id = NEW.agent_id;
  IF v_agent_code IS NULL THEN
    RETURN NEW;
  END IF;

  v_auto_approved := public.asvc_is_autoapproved(v_agent_code, NEW.action_type, NEW.criticality);

  IF v_auto_approved THEN
    NEW.status := 'approved';
    NEW.validated_by := 'pame_auto';
    NEW.validated_at := now();
    NEW.validation_note := 'Auto-approved via pattern preference';

    -- Audit log
    INSERT INTO public.asvc_audit_log (actor_type, actor_id, event_type, resource_type, resource_id, payload)
    VALUES ('ceo', 'pame_auto', 'action_auto_approved', 'asvc_agent_actions', NEW.id,
            jsonb_build_object(
              'agent_code', v_agent_code,
              'action_type', NEW.action_type,
              'criticality', NEW.criticality
            ));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asvc_action_autoapprove ON public.asvc_agent_actions;
CREATE TRIGGER trg_asvc_action_autoapprove
  BEFORE INSERT ON public.asvc_agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.asvc_action_autoapprove_trigger();

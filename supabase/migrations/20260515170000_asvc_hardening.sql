-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Sprint S12-S13 : Hardening + Production rollout
-- Vérification intégrité audit log + health check système
-- ═══════════════════════════════════════════════════════════════════════════

-- asvc_health_check()
-- Snapshot santé de l'ensemble du système ASVC pour la CEO.
CREATE OR REPLACE FUNCTION public.asvc_health_check()
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

    'agents', jsonb_build_object(
      'total', (SELECT count(*) FROM public.asvc_agents),
      'active', (SELECT count(*) FROM public.asvc_agents WHERE is_active = TRUE),
      'paused', (SELECT count(*) FROM public.asvc_agents WHERE is_active = FALSE),
      'by_department', (
        SELECT coalesce(jsonb_object_agg(department, c), '{}'::jsonb)
        FROM (
          SELECT department, count(*) AS c
          FROM public.asvc_agents
          WHERE is_active = TRUE
          GROUP BY department
        ) t
      )
    ),

    'sessions_24h', jsonb_build_object(
      'total', (
        SELECT count(*) FROM public.asvc_agent_sessions
        WHERE started_at >= now() - interval '24 hours'
      ),
      'completed', (
        SELECT count(*) FROM public.asvc_agent_sessions
        WHERE started_at >= now() - interval '24 hours' AND status = 'completed'
      ),
      'failed', (
        SELECT count(*) FROM public.asvc_agent_sessions
        WHERE started_at >= now() - interval '24 hours' AND status = 'failed'
      ),
      'total_tokens', (
        SELECT coalesce(sum(tokens_used), 0)::BIGINT FROM public.asvc_agent_sessions
        WHERE started_at >= now() - interval '24 hours'
      ),
      'total_cost_usd', (
        SELECT coalesce(sum(cost_usd), 0)::NUMERIC(10,4) FROM public.asvc_agent_sessions
        WHERE started_at >= now() - interval '24 hours'
      )
    ),

    'actions_24h', jsonb_build_object(
      'proposed', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE created_at >= now() - interval '24 hours'
      ),
      'approved', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE validated_at >= now() - interval '24 hours' AND status = 'approved'
      ),
      'rejected', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE validated_at >= now() - interval '24 hours' AND status = 'rejected'
      ),
      'pending_now', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE status IN ('proposed', 'consolidated')
      ),
      'pending_critical', (
        SELECT count(*) FROM public.asvc_agent_actions
        WHERE status IN ('proposed', 'consolidated') AND criticality = 'critical'
      )
    ),

    'kill_switches_active', (
      SELECT count(*) FROM public.asvc_kill_switch WHERE is_active = TRUE
    ),

    'audit_log', jsonb_build_object(
      'total_entries', (SELECT count(*) FROM public.asvc_audit_log),
      'last_entry_at', (SELECT max(ts) FROM public.asvc_audit_log),
      'entries_24h', (
        SELECT count(*) FROM public.asvc_audit_log
        WHERE ts >= now() - interval '24 hours'
      )
    ),

    'last_brief', (
      SELECT to_jsonb(t) FROM (
        SELECT brief_type, brief_date, created_at,
               arbitrations_pending, arbitrations_urgent
        FROM public.asvc_coo_briefs
        ORDER BY created_at DESC
        LIMIT 1
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_health_check() TO authenticated, service_role;


-- asvc_verify_audit_chain(p_limit)
-- Recalcule le hash chain des N dernières entrées d'audit pour détecter
-- une éventuelle altération. Retourne les éventuels mismatches.
-- Note: la fonction recalcule mais ne corrige PAS — un mismatch est un signal
-- d'incident sécurité qui doit être investigué manuellement.
CREATE OR REPLACE FUNCTION public.asvc_verify_audit_chain(p_limit INT DEFAULT 1000)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_prev_hash TEXT;
  v_expected_hash TEXT;
  v_mismatches JSONB := '[]'::jsonb;
  v_total INT := 0;
  v_checked INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  v_prev_hash := NULL;

  FOR v_row IN
    SELECT id, ts, actor_type, actor_id, event_type, resource_type, resource_id,
           payload, prev_hash, hash
    FROM public.asvc_audit_log
    ORDER BY ts ASC, id ASC
    LIMIT p_limit
  LOOP
    v_total := v_total + 1;
    v_expected_hash := encode(
      digest(
        coalesce(v_prev_hash, '') ||
        v_row.actor_type || v_row.actor_id || v_row.event_type ||
        coalesce(v_row.resource_type, '') || coalesce(v_row.resource_id::text, '') ||
        coalesce(v_row.payload::text, '') ||
        v_row.ts::text,
        'sha256'
      ),
      'hex'
    );

    IF v_row.hash != v_expected_hash OR
       coalesce(v_row.prev_hash, '') != coalesce(v_prev_hash, '') THEN
      v_mismatches := v_mismatches || jsonb_build_object(
        'id', v_row.id,
        'ts', v_row.ts,
        'event_type', v_row.event_type,
        'expected_hash', v_expected_hash,
        'actual_hash', v_row.hash,
        'expected_prev_hash', v_prev_hash,
        'actual_prev_hash', v_row.prev_hash
      );
    ELSE
      v_checked := v_checked + 1;
    END IF;

    v_prev_hash := v_row.hash;
  END LOOP;

  RETURN jsonb_build_object(
    'total_entries_scanned', v_total,
    'entries_valid', v_checked,
    'mismatch_count', jsonb_array_length(v_mismatches),
    'integrity_ok', jsonb_array_length(v_mismatches) = 0,
    'mismatches', v_mismatches,
    'verified_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_verify_audit_chain(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_verify_audit_chain(INT) TO authenticated, service_role;


-- asvc_action_stats(p_days)
-- Statistiques d'usage des actions sur p_days derniers jours (par agent + type).
CREATE OR REPLACE FUNCTION public.asvc_action_stats(p_days INT DEFAULT 7)
RETURNS TABLE (
  agent_code        TEXT,
  agent_name        TEXT,
  department        TEXT,
  total             BIGINT,
  approved          BIGINT,
  rejected          BIGINT,
  executed          BIGINT,
  failed            BIGINT,
  approval_rate     NUMERIC,
  avg_validation_minutes NUMERIC
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
    a.code,
    a.name,
    a.department,
    count(act.id) AS total,
    count(*) FILTER (WHERE act.status IN ('approved','executed','modified')) AS approved,
    count(*) FILTER (WHERE act.status = 'rejected') AS rejected,
    count(*) FILTER (WHERE act.status = 'executed') AS executed,
    count(*) FILTER (WHERE act.status = 'failed') AS failed,
    CASE
      WHEN count(act.id) FILTER (WHERE act.validated_at IS NOT NULL) = 0 THEN 0
      ELSE round(
        100.0 * count(*) FILTER (WHERE act.status IN ('approved','executed','modified'))
        / count(*) FILTER (WHERE act.validated_at IS NOT NULL),
        1
      )
    END AS approval_rate,
    coalesce(round(
      avg(
        EXTRACT(EPOCH FROM (act.validated_at - act.created_at)) / 60.0
      ) FILTER (WHERE act.validated_at IS NOT NULL),
      1
    ), 0) AS avg_validation_minutes
  FROM public.asvc_agents a
  LEFT JOIN public.asvc_agent_actions act
    ON act.agent_id = a.id
   AND act.created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY a.code, a.name, a.department
  ORDER BY total DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.asvc_action_stats(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asvc_action_stats(INT) TO authenticated, service_role;
